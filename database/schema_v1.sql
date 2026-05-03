-- =============================================================================
-- UNLOCK — PostgreSQL Schema v1.0
-- NSW Closed Beta (Weeks 1–6)
-- Target: Azure Database for PostgreSQL (Australia East)
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search on resources

-- =============================================================================
-- 1. USERS
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
  user_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  azure_user_id   VARCHAR(255) UNIQUE NOT NULL,  -- Azure Entra External ID object ID
  email           VARCHAR(255) UNIQUE NOT NULL,
  name            VARCHAR(255),
  year_group      SMALLINT CHECK (year_group BETWEEN 7 AND 10),
  -- JSON: ["English", "Maths", "Science", "History", "Geography"]
  enrolled_subjects       JSONB NOT NULL DEFAULT '[]',
  -- JSON: {"English": 3, "Maths": 4, ...} (1=low, 5=high confidence)
  confidence_per_subject  JSONB NOT NULL DEFAULT '{}',
  parental_consent        BOOLEAN NOT NULL DEFAULT FALSE,
  onboarding_complete     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_azure_id ON users(azure_user_id);
CREATE INDEX idx_users_email    ON users(email);

-- =============================================================================
-- 2. NESA OUTCOMES (Hardcoded seed data — Years 7–10, 5 subjects)
-- =============================================================================
CREATE TABLE IF NOT EXISTS nesa_outcomes (
  outcome_id    VARCHAR(50) PRIMARY KEY,  -- e.g. "NESA_ENG_7_1_1"
  year          SMALLINT NOT NULL CHECK (year BETWEEN 7 AND 10),
  subject       VARCHAR(50) NOT NULL,
  topic         VARCHAR(100) NOT NULL,
  subtopic      VARCHAR(100),
  description   TEXT NOT NULL,
  hardcoded     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_nesa_year        ON nesa_outcomes(year);
CREATE INDEX idx_nesa_subject     ON nesa_outcomes(subject);
CREATE INDEX idx_nesa_year_subj   ON nesa_outcomes(year, subject);

-- =============================================================================
-- 3. STUDY PLANS
-- =============================================================================
CREATE TABLE IF NOT EXISTS study_plans (
  plan_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  week_number   SMALLINT NOT NULL CHECK (week_number BETWEEN 1 AND 52),
  -- JSON: [{day:"Monday", tasks:[{subject, topic, outcome_id, estimated_minutes},...]}]
  tasks         JSONB NOT NULL DEFAULT '[]',
  generated_by  VARCHAR(20) NOT NULL DEFAULT 'claude-3-5-sonnet',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, week_number)
);

CREATE INDEX idx_study_plans_user       ON study_plans(user_id);
CREATE INDEX idx_study_plans_user_week  ON study_plans(user_id, week_number);

-- =============================================================================
-- 4. QUIZZES  (topic-level bank; diagnostic quizzes share same structure)
-- =============================================================================
CREATE TABLE IF NOT EXISTS quizzes (
  quiz_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           VARCHAR(200) NOT NULL,
  subject         VARCHAR(50) NOT NULL,
  topic           VARCHAR(100) NOT NULL,
  quiz_type       VARCHAR(20) NOT NULL DEFAULT 'practice'
                  CHECK (quiz_type IN ('diagnostic', 'practice')),
  year_group      SMALLINT NOT NULL CHECK (year_group BETWEEN 7 AND 10),
  nesa_outcome_id VARCHAR(50) REFERENCES nesa_outcomes(outcome_id),
  -- JSON array of question objects (see quiz_questions table for detail)
  question_count  SMALLINT NOT NULL DEFAULT 5,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quizzes_subject    ON quizzes(subject);
CREATE INDEX idx_quizzes_year       ON quizzes(year_group);
CREATE INDEX idx_quizzes_type       ON quizzes(quiz_type);

-- =============================================================================
-- 5. QUIZ QUESTIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS quiz_questions (
  question_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id         UUID NOT NULL REFERENCES quizzes(quiz_id) ON DELETE CASCADE,
  question_order  SMALLINT NOT NULL,
  question_text   TEXT NOT NULL,
  question_type   VARCHAR(20) NOT NULL CHECK (question_type IN ('multiple_choice', 'short_answer')),
  -- JSON for MC: ["Option A", "Option B", "Option C", "Option D"]
  options         JSONB,
  correct_answer  TEXT NOT NULL,
  explanation     TEXT NOT NULL,  -- Shown after student answers
  nesa_outcome_id VARCHAR(50) REFERENCES nesa_outcomes(outcome_id),
  UNIQUE(quiz_id, question_order)
);

CREATE INDEX idx_questions_quiz ON quiz_questions(quiz_id);

-- =============================================================================
-- 6. STUDENT QUIZ RESULTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS student_quiz_results (
  result_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  quiz_id       UUID NOT NULL REFERENCES quizzes(quiz_id),
  -- JSON: [{question_id, student_answer, correct_answer, is_correct, outcome_id}]
  answers       JSONB NOT NULL DEFAULT '[]',
  score_percent SMALLINT NOT NULL CHECK (score_percent BETWEEN 0 AND 100),
  -- JSON: {"NESA_ENG_7_1_1": 80, "NESA_ENG_7_1_2": 60} — % correct per outcome
  outcome_breakdown JSONB NOT NULL DEFAULT '{}',
  xp_awarded    SMALLINT NOT NULL DEFAULT 0,
  completed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quiz_results_user      ON student_quiz_results(user_id);
CREATE INDEX idx_quiz_results_quiz      ON student_quiz_results(quiz_id);
CREATE INDEX idx_quiz_results_user_quiz ON student_quiz_results(user_id, quiz_id);

-- =============================================================================
-- 7. DOCUMENTS (Student exam/assignment uploads)
-- =============================================================================
CREATE TABLE IF NOT EXISTS documents (
  document_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  original_filename VARCHAR(255) NOT NULL,
  blob_url          TEXT NOT NULL,  -- Azure Blob Storage URL
  file_type         VARCHAR(10) NOT NULL CHECK (file_type IN ('pdf', 'jpeg', 'png')),
  file_size_bytes   INTEGER,
  -- Claude-extracted data
  -- JSON: {subject, topic, mark_achieved, max_marks, teacher_comments}
  extracted_data    JSONB,
  -- JSON array of NESA outcome IDs mapped from document content
  nesa_outcomes_mapped JSONB DEFAULT '[]',
  feedback_report   TEXT,          -- Claude-generated feedback
  analysis_status   VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (analysis_status IN ('pending', 'processing', 'complete', 'failed')),
  xp_awarded        SMALLINT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  analyzed_at       TIMESTAMPTZ
);

CREATE INDEX idx_documents_user   ON documents(user_id);
CREATE INDEX idx_documents_status ON documents(analysis_status);

-- =============================================================================
-- 8. STUDENT PROGRESS (Per-subject mastery)
-- =============================================================================
CREATE TABLE IF NOT EXISTS student_progress (
  progress_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  subject         VARCHAR(50) NOT NULL,
  mastery_percent SMALLINT NOT NULL DEFAULT 0 CHECK (mastery_percent BETWEEN 0 AND 100),
  -- JSON: {"NESA_ENG_7_1_1": 85, ...} — per-outcome mastery
  outcome_mastery JSONB NOT NULL DEFAULT '{}',
  last_updated    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, subject)
);

CREATE INDEX idx_progress_user ON student_progress(user_id);

-- =============================================================================
-- 9. GAMIFICATION (XP, streaks, badges, levels)
-- =============================================================================
CREATE TABLE IF NOT EXISTS gamification (
  game_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
  xp_total        INTEGER NOT NULL DEFAULT 0 CHECK (xp_total >= 0),
  current_streak  SMALLINT NOT NULL DEFAULT 0,
  longest_streak  SMALLINT NOT NULL DEFAULT 0,
  last_activity_date DATE,
  -- JSON: ["First Quiz", "7-Day Streak", "Document Uploaded"]
  badges          JSONB NOT NULL DEFAULT '[]',
  level           SMALLINT NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 10),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gamification_user ON gamification(user_id);

-- =============================================================================
-- 10. PARENT ACCOUNTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS parent_accounts (
  parent_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_email      VARCHAR(255),
  linked_student_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  session_token     VARCHAR(255) UNIQUE NOT NULL,  -- One-time use magic link token
  token_expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  last_accessed     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_parent_student ON parent_accounts(linked_student_id);
CREATE INDEX idx_parent_token   ON parent_accounts(session_token);

-- =============================================================================
-- 11. STUDY TASK COMPLETIONS (tracks which daily tasks are done)
-- =============================================================================
CREATE TABLE IF NOT EXISTS task_completions (
  completion_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  plan_id       UUID NOT NULL REFERENCES study_plans(plan_id) ON DELETE CASCADE,
  -- Identifies the specific task within the plan's JSON tasks array
  day           VARCHAR(10) NOT NULL,  -- "Monday", "Tuesday", etc.
  task_index    SMALLINT NOT NULL,
  completed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_completions_user ON task_completions(user_id);
CREATE INDEX idx_completions_plan ON task_completions(plan_id);

-- =============================================================================
-- 12. RESOURCES (Hardcoded NSW Tier 1/2 learning resources)
-- =============================================================================
CREATE TABLE IF NOT EXISTS resources (
  resource_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         VARCHAR(255) NOT NULL,
  source        VARCHAR(100) NOT NULL,  -- e.g. "Khan Academy", "NESA", "ABC Education"
  url           TEXT NOT NULL,
  subject       VARCHAR(50) NOT NULL,
  year_min      SMALLINT NOT NULL CHECK (year_min BETWEEN 7 AND 10),
  year_max      SMALLINT NOT NULL CHECK (year_max BETWEEN 7 AND 10),
  tier          SMALLINT NOT NULL CHECK (tier IN (1, 2)),  -- 1=official NESA, 2=quality partner
  tags          JSONB NOT NULL DEFAULT '[]',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_resources_subject ON resources(subject);
CREATE INDEX idx_resources_year    ON resources(year_min, year_max);
CREATE INDEX idx_resources_title   ON resources USING gin(to_tsvector('english', title));

-- =============================================================================
-- 13. AUDIT LOG (for debugging and compliance)
-- =============================================================================
CREATE TABLE IF NOT EXISTS audit_log (
  log_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(user_id) ON DELETE SET NULL,
  action      VARCHAR(100) NOT NULL,  -- e.g. "register", "login", "quiz_submit"
  details     JSONB DEFAULT '{}',
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user   ON audit_log(user_id);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_time   ON audit_log(created_at);

-- =============================================================================
-- FUNCTIONS & TRIGGERS
-- =============================================================================

-- Auto-update updated_at on users and study_plans
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER study_plans_updated_at
  BEFORE UPDATE ON study_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create gamification row when new user registers
CREATE OR REPLACE FUNCTION create_gamification_on_user_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO gamification (user_id) VALUES (NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_create_gamification
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION create_gamification_on_user_insert();

-- =============================================================================
-- SEED DATA: NESA OUTCOMES (Years 7–10, 5 subjects, ~200 outcomes)
-- =============================================================================

-- ---- ENGLISH ----
INSERT INTO nesa_outcomes (outcome_id, year, subject, topic, subtopic, description) VALUES
-- Year 7 English
('NESA_ENG_7_1_1', 7, 'English', 'Reading & Comprehension', 'Literal comprehension', 'Identify explicit information and ideas in a range of texts'),
('NESA_ENG_7_1_2', 7, 'English', 'Reading & Comprehension', 'Inferential comprehension', 'Draw inferences and conclusions based on textual evidence'),
('NESA_ENG_7_1_3', 7, 'English', 'Reading & Comprehension', 'Text structure', 'Understand how text structure and organisation contribute to meaning'),
('NESA_ENG_7_2_1', 7, 'English', 'Writing', 'Narrative writing', 'Compose effective narrative texts using correct structure and language features'),
('NESA_ENG_7_2_2', 7, 'English', 'Writing', 'Persuasive writing', 'Construct and support an argument using evidence and persuasive techniques'),
('NESA_ENG_7_2_3', 7, 'English', 'Writing', 'Grammar & mechanics', 'Apply grammatical knowledge including sentence structure, punctuation, and spelling'),
('NESA_ENG_7_3_1', 7, 'English', 'Language & Vocabulary', 'Word meaning', 'Understand and use vocabulary appropriate to the context and audience'),
('NESA_ENG_7_3_2', 7, 'English', 'Language & Vocabulary', 'Language features', 'Identify and explain the effect of language features such as figurative language'),
('NESA_ENG_7_4_1', 7, 'English', 'Speaking & Listening', 'Discussion', 'Contribute meaningfully to discussions and respond to others respectfully'),
('NESA_ENG_7_5_1', 7, 'English', 'Visual & Media Literacy', 'Visual texts', 'Interpret and analyse visual elements in multimodal texts'),
-- Year 8 English
('NESA_ENG_8_1_1', 8, 'English', 'Reading & Comprehension', 'Critical reading', 'Analyse how authors construct meaning and position the reader'),
('NESA_ENG_8_1_2', 8, 'English', 'Reading & Comprehension', 'Poetry', 'Identify and interpret poetic techniques and their effects on meaning'),
('NESA_ENG_8_2_1', 8, 'English', 'Writing', 'Analytical writing', 'Compose analytical responses with a sustained argument and textual evidence'),
('NESA_ENG_8_2_2', 8, 'English', 'Writing', 'Creative writing', 'Craft imaginative texts that demonstrate control of language and form'),
('NESA_ENG_8_3_1', 8, 'English', 'Language & Vocabulary', 'Connotation & tone', 'Understand how word choice shapes tone, mood and meaning in texts'),
-- Year 9 English
('NESA_ENG_9_1_1', 9, 'English', 'Reading & Comprehension', 'Text comparison', 'Compare and contrast how different texts represent similar ideas and themes'),
('NESA_ENG_9_2_1', 9, 'English', 'Writing', 'Discursive writing', 'Compose extended discursive and analytical responses to texts'),
('NESA_ENG_9_2_2', 9, 'English', 'Writing', 'Essay structure', 'Demonstrate control of essay structure including introduction, body paragraphs, conclusion'),
-- Year 10 English
('NESA_ENG_10_1_1', 10, 'English', 'Reading & Comprehension', 'Contextual reading', 'Evaluate how context influences the meaning and interpretation of texts'),
('NESA_ENG_10_2_1', 10, 'English', 'Writing', 'Extended response', 'Produce sophisticated analytical and creative responses demonstrating depth of understanding')
ON CONFLICT (outcome_id) DO NOTHING;

-- ---- MATHEMATICS ----
INSERT INTO nesa_outcomes (outcome_id, year, subject, topic, subtopic, description) VALUES
-- Year 7 Maths
('NESA_MATH_7_1_1', 7, 'Maths', 'Number & Algebra', 'Integers', 'Apply operations with positive and negative integers'),
('NESA_MATH_7_1_2', 7, 'Maths', 'Number & Algebra', 'Fractions & decimals', 'Perform operations with fractions, decimals and percentages'),
('NESA_MATH_7_1_3', 7, 'Maths', 'Number & Algebra', 'Ratios & rates', 'Solve problems involving ratios, rates and proportional reasoning'),
('NESA_MATH_7_1_4', 7, 'Maths', 'Number & Algebra', 'Algebra basics', 'Use algebraic notation and evaluate algebraic expressions'),
('NESA_MATH_7_2_1', 7, 'Maths', 'Measurement & Geometry', 'Area & perimeter', 'Calculate area and perimeter of standard 2D shapes'),
('NESA_MATH_7_2_2', 7, 'Maths', 'Measurement & Geometry', 'Volume', 'Find the volume of rectangular prisms and composite shapes'),
('NESA_MATH_7_2_3', 7, 'Maths', 'Measurement & Geometry', 'Angles', 'Identify angle relationships and calculate unknown angles'),
('NESA_MATH_7_3_1', 7, 'Maths', 'Statistics & Probability', 'Data displays', 'Construct and interpret various data displays'),
('NESA_MATH_7_3_2', 7, 'Maths', 'Statistics & Probability', 'Probability basics', 'Determine the probability of simple events'),
-- Year 8 Maths
('NESA_MATH_8_1_1', 8, 'Maths', 'Number & Algebra', 'Equations', 'Solve linear equations and inequalities'),
('NESA_MATH_8_1_2', 8, 'Maths', 'Number & Algebra', 'Graphing', 'Plot and interpret linear relationships on the Cartesian plane'),
('NESA_MATH_8_1_3', 8, 'Maths', 'Number & Algebra', 'Indices', 'Apply index laws to simplify expressions'),
('NESA_MATH_8_2_1', 8, 'Maths', 'Measurement & Geometry', 'Pythagoras', 'Apply Pythagoras theorem to solve problems in 2D'),
('NESA_MATH_8_2_2', 8, 'Maths', 'Measurement & Geometry', 'Circles', 'Calculate circumference and area of circles'),
('NESA_MATH_8_3_1', 8, 'Maths', 'Statistics & Probability', 'Statistical measures', 'Calculate and interpret mean, median, mode and range'),
-- Year 9 Maths
('NESA_MATH_9_1_1', 9, 'Maths', 'Number & Algebra', 'Surds', 'Simplify and operate with surds'),
('NESA_MATH_9_1_2', 9, 'Maths', 'Number & Algebra', 'Quadratics', 'Expand, factorise and solve quadratic expressions and equations'),
('NESA_MATH_9_1_3', 9, 'Maths', 'Number & Algebra', 'Non-linear graphs', 'Sketch and interpret parabolas and other non-linear graphs'),
('NESA_MATH_9_2_1', 9, 'Maths', 'Measurement & Geometry', 'Trigonometry', 'Apply trigonometric ratios to find sides and angles in right-angled triangles'),
-- Year 10 Maths
('NESA_MATH_10_1_1', 10, 'Maths', 'Number & Algebra', 'Financial maths', 'Solve problems involving simple and compound interest, depreciation'),
('NESA_MATH_10_1_2', 10, 'Maths', 'Number & Algebra', 'Polynomials', 'Perform operations with polynomials and apply the remainder theorem'),
('NESA_MATH_10_2_1', 10, 'Maths', 'Measurement & Geometry', 'Circle geometry', 'Apply theorems relating to circles and tangents'),
('NESA_MATH_10_3_1', 10, 'Maths', 'Statistics & Probability', 'Bivariate data', 'Analyse and interpret bivariate data using scatter plots and lines of best fit')
ON CONFLICT (outcome_id) DO NOTHING;

-- ---- SCIENCE ----
INSERT INTO nesa_outcomes (outcome_id, year, subject, topic, subtopic, description) VALUES
-- Year 7 Science
('NESA_SCI_7_1_1', 7, 'Science', 'Working Scientifically', 'Scientific method', 'Design and conduct fair tests; identify variables and controls'),
('NESA_SCI_7_1_2', 7, 'Science', 'Working Scientifically', 'Data analysis', 'Process, analyse and evaluate data from scientific investigations'),
('NESA_SCI_7_2_1', 7, 'Science', 'Cells & Life', 'Cell structure', 'Describe the structure and function of plant and animal cells'),
('NESA_SCI_7_2_2', 7, 'Science', 'Cells & Life', 'Classification', 'Classify living things using observable features and dichotomous keys'),
('NESA_SCI_7_3_1', 7, 'Science', 'Matter & Materials', 'States of matter', 'Describe properties of solids, liquids and gases using particle theory'),
('NESA_SCI_7_3_2', 7, 'Science', 'Matter & Materials', 'Mixtures', 'Describe methods of separating mixtures based on physical properties'),
('NESA_SCI_7_4_1', 7, 'Science', 'Forces & Energy', 'Forces', 'Identify and describe common forces including gravity, friction and tension'),
('NESA_SCI_7_4_2', 7, 'Science', 'Forces & Energy', 'Energy forms', 'Identify forms of energy and describe energy transformations'),
-- Year 8 Science
('NESA_SCI_8_1_1', 8, 'Science', 'Cells & Life', 'Body systems', 'Describe the structure and function of the major human body systems'),
('NESA_SCI_8_2_1', 8, 'Science', 'Chemistry', 'Elements & compounds', 'Distinguish between elements, compounds and mixtures using models'),
('NESA_SCI_8_2_2', 8, 'Science', 'Chemistry', 'Chemical reactions', 'Describe chemical reactions using word equations and observe evidence of change'),
('NESA_SCI_8_3_1', 8, 'Science', 'Earth & Space', 'Rocks & minerals', 'Classify rocks by their origin and describe the rock cycle'),
-- Year 9 Science
('NESA_SCI_9_1_1', 9, 'Science', 'Biology', 'Ecosystems', 'Analyse energy flow through food webs and impact of changes on ecosystems'),
('NESA_SCI_9_2_1', 9, 'Science', 'Chemistry', 'Atomic structure', 'Describe atomic structure and interpret the periodic table'),
('NESA_SCI_9_3_1', 9, 'Science', 'Physics', 'Electricity', 'Describe electric circuits and apply Ohms Law to solve problems'),
-- Year 10 Science
('NESA_SCI_10_1_1', 10, 'Science', 'Biology', 'Evolution', 'Explain the theory of evolution by natural selection and evidence supporting it'),
('NESA_SCI_10_2_1', 10, 'Science', 'Chemistry', 'Chemical reactions', 'Explain chemical reactions in terms of energy changes and reaction rates'),
('NESA_SCI_10_3_1', 10, 'Science', 'Physics', 'Motion', 'Apply Newtons Laws to analyse motion in everyday contexts')
ON CONFLICT (outcome_id) DO NOTHING;

-- ---- HISTORY ----
INSERT INTO nesa_outcomes (outcome_id, year, subject, topic, subtopic, description) VALUES
-- Year 7 History
('NESA_HIST_7_1_1', 7, 'History', 'Ancient History', 'Early societies', 'Describe features of early human societies and how they developed over time'),
('NESA_HIST_7_1_2', 7, 'History', 'Ancient History', 'Source analysis', 'Identify and describe historical sources and their usefulness as evidence'),
('NESA_HIST_7_2_1', 7, 'History', 'Historical Skills', 'Chronology', 'Sequence events and periods using timelines and historical terminology'),
-- Year 8 History
('NESA_HIST_8_1_1', 8, 'History', 'Medieval History', 'Medieval societies', 'Describe the social, political and economic features of medieval societies'),
('NESA_HIST_8_1_2', 8, 'History', 'Medieval History', 'Change & continuity', 'Explain causes and consequences of significant historical events'),
-- Year 9 History
('NESA_HIST_9_1_1', 9, 'History', 'Modern History', 'The making of the modern world', 'Analyse the causes and effects of the Industrial Revolution'),
('NESA_HIST_9_1_2', 9, 'History', 'Modern History', 'World War I', 'Describe the causes, events and consequences of World War I'),
-- Year 10 History
('NESA_HIST_10_1_1', 10, 'History', 'Modern History', 'World War II', 'Evaluate the causes, course and consequences of World War II'),
('NESA_HIST_10_1_2', 10, 'History', 'Modern History', 'Rights & freedoms', 'Analyse movements for civil and political rights in Australia and globally')
ON CONFLICT (outcome_id) DO NOTHING;

-- ---- GEOGRAPHY ----
INSERT INTO nesa_outcomes (outcome_id, year, subject, topic, subtopic, description) VALUES
-- Year 7 Geography
('NESA_GEO_7_1_1', 7, 'Geography', 'Landscapes & Landforms', 'Natural processes', 'Describe natural processes that shape landforms and landscapes'),
('NESA_GEO_7_1_2', 7, 'Geography', 'Landscapes & Landforms', 'Map skills', 'Interpret and create maps using geographical conventions'),
('NESA_GEO_7_2_1', 7, 'Geography', 'Place & Liveability', 'Liveability factors', 'Identify and assess factors that influence the liveability of places'),
-- Year 8 Geography
('NESA_GEO_8_1_1', 8, 'Geography', 'Changing Nations', 'Population & urbanisation', 'Explain factors driving urbanisation and impacts on cities'),
('NESA_GEO_8_1_2', 8, 'Geography', 'Changing Nations', 'Economic activity', 'Describe spatial patterns of economic activity and their consequences'),
-- Year 9 Geography
('NESA_GEO_9_1_1', 9, 'Geography', 'Biomes & Food Security', 'Biomes', 'Describe the characteristics and distribution of major world biomes'),
('NESA_GEO_9_1_2', 9, 'Geography', 'Biomes & Food Security', 'Food security', 'Analyse factors affecting food security and proposed solutions'),
-- Year 10 Geography
('NESA_GEO_10_1_1', 10, 'Geography', 'Environmental Change', 'Climate change', 'Evaluate human contributions to climate change and mitigation strategies'),
('NESA_GEO_10_1_2', 10, 'Geography', 'Environmental Change', 'Human-environment interaction', 'Analyse human modification of environments and sustainability implications')
ON CONFLICT (outcome_id) DO NOTHING;

-- =============================================================================
-- SEED DATA: HARDCODED RESOURCES (Tier 1 & 2 NSW links)
-- =============================================================================
INSERT INTO resources (title, source, url, subject, year_min, year_max, tier, tags) VALUES
-- English
('NESA English Syllabus Years 7–10', 'NESA', 'https://curriculum.nesa.nsw.edu.au/key-stage-4/english/', 'English', 7, 10, 1, '["official", "syllabus"]'),
('ReadWriteThink — Reading Strategies', 'ILA / ReadWriteThink', 'https://www.readwritethink.org/', 'English', 7, 10, 2, '["comprehension", "writing"]'),
('BBC Bitesize — English', 'BBC', 'https://www.bbc.co.uk/bitesize/subjects/zr9d7ty', 'English', 7, 10, 2, '["reading", "writing", "grammar"]'),
-- Maths
('NESA Mathematics Syllabus Years 7–10', 'NESA', 'https://curriculum.nesa.nsw.edu.au/key-stage-4/mathematics/', 'Maths', 7, 10, 1, '["official", "syllabus"]'),
('Khan Academy — Mathematics', 'Khan Academy', 'https://www.khanacademy.org/math', 'Maths', 7, 10, 2, '["video", "practice", "algebra", "geometry"]'),
('Mathspace NSW', 'Mathspace', 'https://mathspace.co/au/', 'Maths', 7, 10, 2, '["practice", "adaptive", "nsw"]'),
-- Science
('NESA Science Syllabus Years 7–10', 'NESA', 'https://curriculum.nesa.nsw.edu.au/key-stage-4/science/', 'Science', 7, 10, 1, '["official", "syllabus"]'),
('Sciencelearn Hub', 'Sciencelearn', 'https://www.sciencelearn.org.nz/', 'Science', 7, 10, 2, '["concepts", "activities"]'),
('Khan Academy — Science', 'Khan Academy', 'https://www.khanacademy.org/science', 'Science', 7, 10, 2, '["biology", "chemistry", "physics", "video"]'),
-- History
('NESA History Syllabus Years 7–10', 'NESA', 'https://curriculum.nesa.nsw.edu.au/key-stage-4/history/', 'History', 7, 10, 1, '["official", "syllabus"]'),
('State Library of NSW — History Resources', 'State Library NSW', 'https://www.sl.nsw.gov.au/schools', 'History', 7, 10, 1, '["primary sources", "australian history"]'),
('ABC Education — History', 'ABC', 'https://education.abc.net.au/', 'History', 7, 10, 2, '["video", "australian history"]'),
-- Geography
('NESA Geography Syllabus Years 7–10', 'NESA', 'https://curriculum.nesa.nsw.edu.au/key-stage-4/geography/', 'Geography', 7, 10, 1, '["official", "syllabus"]'),
('Geoscience Australia — Education', 'Geoscience Australia', 'https://www.ga.gov.au/education', 'Geography', 7, 10, 1, '["maps", "australian geography"]'),
('National Geographic Education', 'National Geographic', 'https://education.nationalgeographic.org/', 'Geography', 7, 10, 2, '["environment", "maps", "video"]')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- SAMPLE DIAGNOSTIC QUIZ (Year 7 Maths — Integers)
-- =============================================================================
WITH new_quiz AS (
  INSERT INTO quizzes (title, subject, topic, quiz_type, year_group, nesa_outcome_id, question_count)
  VALUES ('Year 7 Maths Diagnostic — Integers', 'Maths', 'Number & Algebra', 'diagnostic', 7, 'NESA_MATH_7_1_1', 5)
  RETURNING quiz_id
)
INSERT INTO quiz_questions (quiz_id, question_order, question_text, question_type, options, correct_answer, explanation, nesa_outcome_id)
SELECT
  new_quiz.quiz_id,
  q.question_order,
  q.question_text,
  q.question_type,
  q.options::jsonb,
  q.correct_answer,
  q.explanation,
  q.nesa_outcome_id
FROM new_quiz,
(VALUES
  (1, 'What is −3 + (−5)?', 'multiple_choice',
   '["−8","−2","2","8"]', '−8',
   'When adding two negative numbers, add their values and keep the negative sign: 3 + 5 = 8, so −3 + (−5) = −8.',
   'NESA_MATH_7_1_1'),
  (2, 'Calculate: −12 ÷ 4', 'multiple_choice',
   '["−3","3","−48","48"]', '−3',
   'A negative number divided by a positive number gives a negative result: 12 ÷ 4 = 3, so −12 ÷ 4 = −3.',
   'NESA_MATH_7_1_1'),
  (3, 'What is the value of −7 × (−3)?', 'multiple_choice',
   '["21","−21","10","−10"]', '21',
   'Negative × negative = positive. So (−7) × (−3) = 21.',
   'NESA_MATH_7_1_1'),
  (4, 'Order from smallest to largest: 2, −5, 0, −1, 3', 'short_answer',
   NULL, '−5, −1, 0, 2, 3',
   'On a number line, negative numbers to the left are smallest. So: −5 is smallest, then −1, then 0, then 2, then 3.',
   'NESA_MATH_7_1_1'),
  (5, 'The temperature was −4°C at night and rose by 9°C in the morning. What is the new temperature?', 'multiple_choice',
   '["5°C","−13°C","13°C","−5°C"]', '5°C',
   'Start at −4 and add 9: −4 + 9 = 5. The temperature is now 5°C.',
   'NESA_MATH_7_1_1')
) AS q(question_order, question_text, question_type, options, correct_answer, explanation, nesa_outcome_id);
