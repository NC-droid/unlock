-- =============================================================================
-- UNLOCK — Diagnostic Quiz Seed Data v2
-- Adds diagnostic quizzes for all 5 subjects across Year 7-10
-- Run AFTER schema_v1.sql (quizzes + quiz_questions tables must exist)
-- =============================================================================

-- =============================================================================
-- YEAR 7 ENGLISH — Reading & Comprehension
-- =============================================================================
DO $$
DECLARE v_quiz_id UUID;
BEGIN
  INSERT INTO quizzes (title, subject, topic, quiz_type, year_group, nesa_outcome_id, question_count)
  VALUES ('Year 7 English Diagnostic — Reading & Comprehension', 'English', 'Reading & Comprehension', 'diagnostic', 7, 'NESA_ENG_7_1_1', 5)
  ON CONFLICT (title, year_group) DO NOTHING
  RETURNING quiz_id INTO v_quiz_id;

  IF v_quiz_id IS NOT NULL THEN
    INSERT INTO quiz_questions (quiz_id, question_order, question_text, question_type, options, correct_answer, explanation, nesa_outcome_id) VALUES
    (v_quiz_id, 1, 'What does "explicit information" in a text mean?', 'multiple_choice',
     '["Information directly stated in the text","Information you have to guess","Information hidden between the lines","The author''s personal opinion"]',
     'Information directly stated in the text',
     'Explicit information is clearly and directly written in the text — you don''t need to guess or infer it.',
     'NESA_ENG_7_1_1'),
    (v_quiz_id, 2, 'A student reads: "Maya ran inside as soon as the first drops fell." What can you infer?', 'multiple_choice',
     '["It started raining","Maya was tired","Maya was late for dinner","It was very hot"]',
     'It started raining',
     'The phrase "first drops fell" implies rain starting — this is an inference because the word "rain" isn''t explicitly used.',
     'NESA_ENG_7_1_2'),
    (v_quiz_id, 3, 'Which text structure lists events in the order they happened?', 'multiple_choice',
     '["Chronological","Cause and effect","Compare and contrast","Problem and solution"]',
     'Chronological',
     'Chronological structure organises events by time order — from first to last. It''s common in narratives and recounts.',
     'NESA_ENG_7_1_3'),
    (v_quiz_id, 4, 'What is the purpose of a topic sentence in a paragraph?', 'multiple_choice',
     '["To introduce the main idea of the paragraph","To summarise the whole text","To provide evidence","To conclude the argument"]',
     'To introduce the main idea of the paragraph',
     'A topic sentence states the central point of a paragraph. Everything else in the paragraph supports it.',
     'NESA_ENG_7_1_3'),
    (v_quiz_id, 5, 'Read this sentence: "The ancient castle loomed over the village, its crumbling walls whispering stories of battles long forgotten." What language technique is used?', 'multiple_choice',
     '["Personification","Simile","Alliteration","Hyperbole"]',
     'Personification',
     'Personification gives human qualities to non-human things. Here, the "walls whispering" gives human ability to castle walls.',
     'NESA_ENG_7_3_2');
  END IF;
END $$;

-- =============================================================================
-- YEAR 8 ENGLISH — Analytical Writing
-- =============================================================================
DO $$
DECLARE v_quiz_id UUID;
BEGIN
  INSERT INTO quizzes (title, subject, topic, quiz_type, year_group, nesa_outcome_id, question_count)
  VALUES ('Year 8 English Diagnostic — Analytical Writing', 'English', 'Writing', 'diagnostic', 8, 'NESA_ENG_8_2_1', 5)
  ON CONFLICT (title, year_group) DO NOTHING
  RETURNING quiz_id INTO v_quiz_id;

  IF v_quiz_id IS NOT NULL THEN
    INSERT INTO quiz_questions (quiz_id, question_order, question_text, question_type, options, correct_answer, explanation, nesa_outcome_id) VALUES
    (v_quiz_id, 1, 'In an analytical essay, the TEEL paragraph structure stands for:', 'multiple_choice',
     '["Topic, Evidence, Explanation, Link","Text, Evaluate, Examine, List","Topic, Example, Elaborate, Link","Theme, Evidence, Explanation, List"]',
     'Topic, Evidence, Explanation, Link',
     'TEEL is a paragraph structure where you: state your Topic sentence, provide Evidence, Explain how the evidence supports your topic, then Link back to the thesis.',
     'NESA_ENG_8_2_1'),
    (v_quiz_id, 2, 'Which of the following is the best thesis statement for an essay about social media?', 'multiple_choice',
     '["Social media is used by many teenagers.","Although social media connects people, its negative effects on mental health and academic performance outweigh its benefits.","I think social media is bad.","Social media has both good and bad effects."]',
     'Although social media connects people, its negative effects on mental health and academic performance outweigh its benefits.',
     'A strong thesis makes a clear, specific, arguable claim. It acknowledges complexity ("although") and states a position with supporting reasons.',
     'NESA_ENG_8_2_1'),
    (v_quiz_id, 3, 'What is "connotation"?', 'multiple_choice',
     '["The literal dictionary meaning of a word","The emotional association or implied meaning of a word","The opposite meaning of a word","A word that sounds like what it describes"]',
     'The emotional association or implied meaning of a word',
     'Connotation refers to the feelings and ideas associated with a word beyond its literal meaning. E.g. "home" connotes warmth and safety, not just a building.',
     'NESA_ENG_8_3_1'),
    (v_quiz_id, 4, 'Which word has the most negative connotation?', 'multiple_choice',
     '["Slender","Skinny","Slim","Lean"]',
     'Skinny',
     '"Skinny" often implies being unhealthily thin and can carry negative judgement, while "slender", "slim" and "lean" are more neutral or positive.',
     'NESA_ENG_8_3_1'),
    (v_quiz_id, 5, 'What is the purpose of a counter-argument in a persuasive essay?', 'multiple_choice',
     '["To admit you are wrong","To strengthen your argument by acknowledging and refuting opposing views","To confuse the reader","To provide extra examples"]',
     'To strengthen your argument by acknowledging and refuting opposing views',
     'Including and refuting a counter-argument shows you understand the issue deeply and makes your overall argument more convincing.',
     'NESA_ENG_8_2_1');
  END IF;
END $$;

-- =============================================================================
-- YEAR 7 MATHS — Fractions & Decimals (already have Integers from schema_v1)
-- =============================================================================
DO $$
DECLARE v_quiz_id UUID;
BEGIN
  INSERT INTO quizzes (title, subject, topic, quiz_type, year_group, nesa_outcome_id, question_count)
  VALUES ('Year 7 Maths Diagnostic — Fractions & Decimals', 'Maths', 'Number & Algebra', 'diagnostic', 7, 'NESA_MATH_7_1_2', 5)
  ON CONFLICT (title, year_group) DO NOTHING
  RETURNING quiz_id INTO v_quiz_id;

  IF v_quiz_id IS NOT NULL THEN
    INSERT INTO quiz_questions (quiz_id, question_order, question_text, question_type, options, correct_answer, explanation, nesa_outcome_id) VALUES
    (v_quiz_id, 1, 'What is 3/4 + 1/3?', 'multiple_choice',
     '["13/12","4/7","1/2","4/12"]',
     '13/12',
     'Find a common denominator: 3/4 = 9/12, 1/3 = 4/12. So 9/12 + 4/12 = 13/12.',
     'NESA_MATH_7_1_2'),
    (v_quiz_id, 2, 'Convert 0.65 to a fraction in simplest form.', 'multiple_choice',
     '["65/100","13/20","6/10","7/10"]',
     '13/20',
     '0.65 = 65/100. Simplify by dividing both by 5: 65÷5 = 13, 100÷5 = 20. So 13/20.',
     'NESA_MATH_7_1_2'),
    (v_quiz_id, 3, 'What is 25% of 80?', 'multiple_choice',
     '["25","20","40","15"]',
     '20',
     '25% = 25/100 = 1/4. So 1/4 × 80 = 20.',
     'NESA_MATH_7_1_2'),
    (v_quiz_id, 4, 'Arrange in order from smallest to largest: 0.7, 3/5, 2/3, 0.65', 'multiple_choice',
     '["3/5, 0.65, 2/3, 0.7","0.65, 2/3, 3/5, 0.7","2/3, 3/5, 0.7, 0.65","0.7, 2/3, 0.65, 3/5"]',
     '3/5, 0.65, 2/3, 0.7',
     'Convert all to decimals: 3/5=0.6, 0.65=0.65, 2/3≈0.667, 0.7=0.7. Order: 0.6 < 0.65 < 0.667 < 0.7.',
     'NESA_MATH_7_1_2'),
    (v_quiz_id, 5, 'A jacket costs $120. It is on sale for 15% off. What is the sale price?', 'multiple_choice',
     '["$18","$105","$102","$108"]',
     '$102',
     '15% of $120 = 0.15 × 120 = $18 discount. Sale price = $120 − $18 = $102.',
     'NESA_MATH_7_1_2');
  END IF;
END $$;

-- =============================================================================
-- YEAR 8 MATHS — Linear Equations & Graphing
-- =============================================================================
DO $$
DECLARE v_quiz_id UUID;
BEGIN
  INSERT INTO quizzes (title, subject, topic, quiz_type, year_group, nesa_outcome_id, question_count)
  VALUES ('Year 8 Maths Diagnostic — Equations & Graphing', 'Maths', 'Number & Algebra', 'diagnostic', 8, 'NESA_MATH_8_1_1', 5)
  ON CONFLICT (title, year_group) DO NOTHING
  RETURNING quiz_id INTO v_quiz_id;

  IF v_quiz_id IS NOT NULL THEN
    INSERT INTO quiz_questions (quiz_id, question_order, question_text, question_type, options, correct_answer, explanation, nesa_outcome_id) VALUES
    (v_quiz_id, 1, 'Solve: 3x + 7 = 22', 'multiple_choice',
     '["x = 5","x = 6","x = 4","x = 7"]',
     'x = 5',
     '3x + 7 = 22 → 3x = 22 − 7 = 15 → x = 15 ÷ 3 = 5.',
     'NESA_MATH_8_1_1'),
    (v_quiz_id, 2, 'What is the gradient of the line y = 3x − 4?', 'multiple_choice',
     '["−4","3","4","−3"]',
     '3',
     'In y = mx + b, m is the gradient. Here y = 3x − 4, so m = 3.',
     'NESA_MATH_8_1_2'),
    (v_quiz_id, 3, 'Solve: 2(x − 3) = 10', 'multiple_choice',
     '["x = 8","x = 2","x = 7","x = 5"]',
     'x = 8',
     'Expand: 2x − 6 = 10. Add 6: 2x = 16. Divide: x = 8.',
     'NESA_MATH_8_1_1'),
    (v_quiz_id, 4, 'Simplify: x³ × x⁴', 'multiple_choice',
     '["x⁷","x¹²","x","2x⁷"]',
     'x⁷',
     'Index law: when multiplying same base, add exponents. x³ × x⁴ = x^(3+4) = x⁷.',
     'NESA_MATH_8_1_3'),
    (v_quiz_id, 5, 'A line passes through (0, 2) and has gradient −1. What is its equation?', 'multiple_choice',
     '["y = −x + 2","y = x + 2","y = −x − 2","y = 2x − 1"]',
     'y = −x + 2',
     'Using y = mx + b with m = −1 and b = 2 (y-intercept from point (0,2)): y = −x + 2.',
     'NESA_MATH_8_1_2');
  END IF;
END $$;

-- =============================================================================
-- YEAR 9 MATHS — Trigonometry
-- =============================================================================
DO $$
DECLARE v_quiz_id UUID;
BEGIN
  INSERT INTO quizzes (title, subject, topic, quiz_type, year_group, nesa_outcome_id, question_count)
  VALUES ('Year 9 Maths Diagnostic — Trigonometry', 'Maths', 'Measurement & Geometry', 'diagnostic', 9, 'NESA_MATH_9_2_1', 5)
  ON CONFLICT (title, year_group) DO NOTHING
  RETURNING quiz_id INTO v_quiz_id;

  IF v_quiz_id IS NOT NULL THEN
    INSERT INTO quiz_questions (quiz_id, question_order, question_text, question_type, options, correct_answer, explanation, nesa_outcome_id) VALUES
    (v_quiz_id, 1, 'In a right-angled triangle, which ratio defines sin(θ)?', 'multiple_choice',
     '["opposite/hypotenuse","adjacent/hypotenuse","opposite/adjacent","hypotenuse/opposite"]',
     'opposite/hypotenuse',
     'SOH-CAH-TOA: Sin = Opposite/Hypotenuse, Cos = Adjacent/Hypotenuse, Tan = Opposite/Adjacent.',
     'NESA_MATH_9_2_1'),
    (v_quiz_id, 2, 'In a right triangle, the side opposite is 6cm and the hypotenuse is 10cm. What is sin(θ)?', 'multiple_choice',
     '["0.6","0.8","0.75","1.67"]',
     '0.6',
     'sin(θ) = opposite/hypotenuse = 6/10 = 0.6.',
     'NESA_MATH_9_2_1'),
    (v_quiz_id, 3, 'A ladder 5m long leans against a wall. The angle with the ground is 60°. How high up the wall does it reach? (sin 60° ≈ 0.87)', 'multiple_choice',
     '["4.35m","2.5m","3.5m","5.77m"]',
     '4.35m',
     'Height = hypotenuse × sin(angle) = 5 × 0.87 = 4.35m.',
     'NESA_MATH_9_2_1'),
    (v_quiz_id, 4, 'Which of these correctly applies Pythagoras'' theorem?', 'multiple_choice',
     '["a² + b² = c² (where c is hypotenuse)","a + b = c","a² − b² = c²","a × b = c²"]',
     'a² + b² = c² (where c is hypotenuse)',
     'Pythagoras'' theorem: the square of the hypotenuse equals the sum of the squares of the other two sides.',
     'NESA_MATH_9_2_1'),
    (v_quiz_id, 5, 'tan(θ) = 1. What is θ?', 'multiple_choice',
     '["45°","30°","60°","90°"]',
     '45°',
     'tan(45°) = 1 because in a 45-45-90 triangle, opposite = adjacent.',
     'NESA_MATH_9_2_1');
  END IF;
END $$;

-- =============================================================================
-- YEAR 7 SCIENCE — Cells & Life
-- =============================================================================
DO $$
DECLARE v_quiz_id UUID;
BEGIN
  INSERT INTO quizzes (title, subject, topic, quiz_type, year_group, nesa_outcome_id, question_count)
  VALUES ('Year 7 Science Diagnostic — Cells & Life', 'Science', 'Cells & Life', 'diagnostic', 7, 'NESA_SCI_7_2_1', 5)
  ON CONFLICT (title, year_group) DO NOTHING
  RETURNING quiz_id INTO v_quiz_id;

  IF v_quiz_id IS NOT NULL THEN
    INSERT INTO quiz_questions (quiz_id, question_order, question_text, question_type, options, correct_answer, explanation, nesa_outcome_id) VALUES
    (v_quiz_id, 1, 'Which organelle controls what enters and leaves the cell?', 'multiple_choice',
     '["Cell membrane","Cell wall","Nucleus","Mitochondria"]',
     'Cell membrane',
     'The cell membrane is a flexible layer that controls what substances enter and exit the cell through a process called selective permeability.',
     'NESA_SCI_7_2_1'),
    (v_quiz_id, 2, 'What structure do plant cells have that animal cells do NOT?', 'multiple_choice',
     '["Cell wall and chloroplasts","Nucleus","Cell membrane","Mitochondria"]',
     'Cell wall and chloroplasts',
     'Plant cells have a rigid cell wall for support and chloroplasts for photosynthesis — neither is found in animal cells.',
     'NESA_SCI_7_2_1'),
    (v_quiz_id, 3, 'Which organelle is known as the "powerhouse of the cell"?', 'multiple_choice',
     '["Mitochondria","Nucleus","Vacuole","Ribosome"]',
     'Mitochondria',
     'Mitochondria produce ATP (energy) through cellular respiration, earning the nickname "powerhouse of the cell".',
     'NESA_SCI_7_2_1'),
    (v_quiz_id, 4, 'What is the correct order from smallest to largest in biology?', 'multiple_choice',
     '["Cell → Tissue → Organ → Organ system → Organism","Tissue → Cell → Organ → Organism","Organ → Cell → Tissue → Organism","Organism → Cell → Tissue → Organ"]',
     'Cell → Tissue → Organ → Organ system → Organism',
     'The hierarchy of life: cells group to form tissues, tissues form organs, organs form organ systems, and organ systems make up an organism.',
     'NESA_SCI_7_2_2'),
    (v_quiz_id, 5, 'A dichotomous key is used to:', 'multiple_choice',
     '["Identify and classify living organisms","Measure cell size","Draw cell diagrams","Count organisms in an ecosystem"]',
     'Identify and classify living organisms',
     'A dichotomous key uses a series of yes/no questions based on observable features to identify and classify organisms.',
     'NESA_SCI_7_2_2');
  END IF;
END $$;

-- =============================================================================
-- YEAR 8 SCIENCE — Chemistry
-- =============================================================================
DO $$
DECLARE v_quiz_id UUID;
BEGIN
  INSERT INTO quizzes (title, subject, topic, quiz_type, year_group, nesa_outcome_id, question_count)
  VALUES ('Year 8 Science Diagnostic — Chemistry', 'Science', 'Chemistry', 'diagnostic', 8, 'NESA_SCI_8_2_1', 5)
  ON CONFLICT (title, year_group) DO NOTHING
  RETURNING quiz_id INTO v_quiz_id;

  IF v_quiz_id IS NOT NULL THEN
    INSERT INTO quiz_questions (quiz_id, question_order, question_text, question_type, options, correct_answer, explanation, nesa_outcome_id) VALUES
    (v_quiz_id, 1, 'What is the difference between an element and a compound?', 'multiple_choice',
     '["An element is made of one type of atom; a compound is made of two or more different elements chemically combined","A compound is pure; an element is mixed","Elements are liquids; compounds are solids","An element has more atoms than a compound"]',
     'An element is made of one type of atom; a compound is made of two or more different elements chemically combined',
     'Elements consist of only one type of atom (e.g. oxygen O₂). Compounds have two or more different elements chemically bonded (e.g. water H₂O).',
     'NESA_SCI_8_2_1'),
    (v_quiz_id, 2, 'Which of the following is evidence that a chemical reaction has occurred?', 'multiple_choice',
     '["Production of gas, colour change, or temperature change","The substances just change state","The mass increases","The container gets heavier"]',
     'Production of gas, colour change, or temperature change',
     'Signs of a chemical reaction include: gas production, colour change, temperature change, formation of a precipitate, or a new smell.',
     'NESA_SCI_8_2_2'),
    (v_quiz_id, 3, 'What is the word equation for burning magnesium in air?', 'multiple_choice',
     '["Magnesium + oxygen → magnesium oxide","Magnesium oxide → magnesium + oxygen","Magnesium + hydrogen → magnesium hydroxide","Magnesium → magnesium oxide"]',
     'Magnesium + oxygen → magnesium oxide',
     'When magnesium burns in air it reacts with oxygen (combustion reaction): Mg + O₂ → MgO.',
     'NESA_SCI_8_2_2'),
    (v_quiz_id, 4, 'Salt water is an example of a:', 'multiple_choice',
     '["Mixture","Compound","Element","Pure substance"]',
     'Mixture',
     'Salt water contains salt (NaCl) dissolved in water — the components are not chemically bonded and can be separated (e.g. by evaporation), so it is a mixture.',
     'NESA_SCI_8_2_1'),
    (v_quiz_id, 5, 'How are igneous rocks formed?', 'multiple_choice',
     '["From cooled magma or lava","From layers of sediment","From extreme heat and pressure on existing rocks","From living organisms"]',
     'From cooled magma or lava',
     'Igneous rocks form when magma (underground) or lava (above ground) cools and solidifies. Examples: granite, basalt.',
     'NESA_SCI_8_3_1');
  END IF;
END $$;

-- =============================================================================
-- YEAR 7 HISTORY — Ancient History & Source Analysis
-- =============================================================================
DO $$
DECLARE v_quiz_id UUID;
BEGIN
  INSERT INTO quizzes (title, subject, topic, quiz_type, year_group, nesa_outcome_id, question_count)
  VALUES ('Year 7 History Diagnostic — Ancient History', 'History', 'Ancient History', 'diagnostic', 7, 'NESA_HIST_7_1_1', 5)
  ON CONFLICT (title, year_group) DO NOTHING
  RETURNING quiz_id INTO v_quiz_id;

  IF v_quiz_id IS NOT NULL THEN
    INSERT INTO quiz_questions (quiz_id, question_order, question_text, question_type, options, correct_answer, explanation, nesa_outcome_id) VALUES
    (v_quiz_id, 1, 'The Neolithic Revolution refers to:', 'multiple_choice',
     '["The shift from hunting-gathering to farming","The invention of writing","The fall of the Roman Empire","The building of the pyramids"]',
     'The shift from hunting-gathering to farming',
     'The Neolithic Revolution (~10,000 BCE) marked humanity''s transition from nomadic hunter-gatherers to settled agricultural communities.',
     'NESA_HIST_7_1_1'),
    (v_quiz_id, 2, 'A primary source is:', 'multiple_choice',
     '["An original document or artefact from the time being studied","A book written by a historian about the past","A documentary about ancient history","A textbook chapter"]',
     'An original document or artefact from the time being studied',
     'Primary sources are first-hand evidence from the historical period — e.g. diaries, letters, photographs, artefacts. Secondary sources interpret or analyse primary sources.',
     'NESA_HIST_7_1_2'),
    (v_quiz_id, 3, 'Which of the following was a feature of ancient Mesopotamian civilisation?', 'multiple_choice',
     '["Writing system (cuneiform) and city-states","A democratic government like ancient Athens","The construction of the Great Wall","The development of Buddhism"]',
     'Writing system (cuneiform) and city-states',
     'Ancient Mesopotamia (modern Iraq) developed one of the earliest writing systems (cuneiform), complex city-states, and law codes (e.g. Hammurabi''s Code).',
     'NESA_HIST_7_1_1'),
    (v_quiz_id, 4, 'On a timeline, BCE means:', 'multiple_choice',
     '["Before Common Era (before year 1)","British Colonial Era","Before Christian Europe","Before Calendar Era"]',
     'Before Common Era (before year 1)',
     'BCE (Before Common Era) replaces the older "BC" (Before Christ). Years count backwards before year 1 CE.',
     'NESA_HIST_7_2_1'),
    (v_quiz_id, 5, 'Why might a source''s usefulness as historical evidence be limited?', 'multiple_choice',
     '["It was created close to the event being described","It shows only one perspective or may be biased","It is a physical artefact","It is very old"]',
     'It shows only one perspective or may be biased',
     'A source''s usefulness is limited if it reflects bias, shows only one viewpoint, is incomplete, or was created for propaganda purposes.',
     'NESA_HIST_7_1_2');
  END IF;
END $$;

-- =============================================================================
-- YEAR 9 HISTORY — World War I
-- =============================================================================
DO $$
DECLARE v_quiz_id UUID;
BEGIN
  INSERT INTO quizzes (title, subject, topic, quiz_type, year_group, nesa_outcome_id, question_count)
  VALUES ('Year 9 History Diagnostic — World War I', 'History', 'Modern History', 'diagnostic', 9, 'NESA_HIST_9_1_2', 5)
  ON CONFLICT (title, year_group) DO NOTHING
  RETURNING quiz_id INTO v_quiz_id;

  IF v_quiz_id IS NOT NULL THEN
    INSERT INTO quiz_questions (quiz_id, question_order, question_text, question_type, options, correct_answer, explanation, nesa_outcome_id) VALUES
    (v_quiz_id, 1, 'Which event is considered the immediate trigger of World War I?', 'multiple_choice',
     '["Assassination of Archduke Franz Ferdinand","Germany invading Belgium","The sinking of the Lusitania","The signing of the Treaty of Versailles"]',
     'Assassination of Archduke Franz Ferdinand',
     'The assassination of Austro-Hungarian heir Archduke Franz Ferdinand in Sarajevo on 28 June 1914 triggered the chain of events that led to WWI.',
     'NESA_HIST_9_1_2'),
    (v_quiz_id, 2, 'The MAIN causes of WWI are often remembered using the acronym MAIN. What does it stand for?', 'multiple_choice',
     '["Militarism, Alliances, Imperialism, Nationalism","Military, Arms, Invasion, Nationalism","Monarchy, Alliances, Industry, Nations","Militarism, Assassination, Imperialism, Nations"]',
     'Militarism, Alliances, Imperialism, Nationalism',
     'MAIN: Militarism (arms race), Alliances (Triple Entente vs Triple Alliance), Imperialism (competition for colonies), Nationalism (pride and ethnic tensions).',
     'NESA_HIST_9_1_2'),
    (v_quiz_id, 3, 'ANZAC Day on April 25 commemorates:', 'multiple_choice',
     '["The landing of Australian and NZ troops at Gallipoli in 1915","The end of World War I","The signing of the ANZUS Treaty","Australia''s Federation in 1901"]',
     'The landing of Australian and NZ troops at Gallipoli in 1915',
     'ANZAC Day honours Australian and New Zealand Army Corps soldiers who landed at Gallipoli, Turkey on 25 April 1915 during WWI.',
     'NESA_HIST_9_1_2'),
    (v_quiz_id, 4, 'The Treaty of Versailles (1919) was significant because:', 'multiple_choice',
     '["It officially ended WWI and imposed harsh penalties on Germany","It started WWI","It created the United Nations","It divided Europe into NATO and Warsaw Pact countries"]',
     'It officially ended WWI and imposed harsh penalties on Germany',
     'The Treaty of Versailles ended WWI. It blamed Germany (War Guilt Clause), demanded reparations, reduced Germany''s military, and redrew European borders.',
     'NESA_HIST_9_1_2'),
    (v_quiz_id, 5, 'What was "trench warfare"?', 'multiple_choice',
     '["A type of combat where armies dug defensive trenches and faced each other across No Man''s Land","Naval battles in narrow sea channels","Guerrilla warfare in forests","Air combat using early aircraft"]',
     'A type of combat where armies dug defensive trenches and faced each other across No Man''s Land',
     'WWI was characterised by trench warfare — soldiers lived in trenches facing the enemy across No Man''s Land. It led to enormous casualties with little territorial gain.',
     'NESA_HIST_9_1_2');
  END IF;
END $$;

-- =============================================================================
-- YEAR 7 GEOGRAPHY — Landscapes & Map Skills
-- =============================================================================
DO $$
DECLARE v_quiz_id UUID;
BEGIN
  INSERT INTO quizzes (title, subject, topic, quiz_type, year_group, nesa_outcome_id, question_count)
  VALUES ('Year 7 Geography Diagnostic — Landscapes & Map Skills', 'Geography', 'Landscapes & Landforms', 'diagnostic', 7, 'NESA_GEO_7_1_2', 5)
  ON CONFLICT (title, year_group) DO NOTHING
  RETURNING quiz_id INTO v_quiz_id;

  IF v_quiz_id IS NOT NULL THEN
    INSERT INTO quiz_questions (quiz_id, question_order, question_text, question_type, options, correct_answer, explanation, nesa_outcome_id) VALUES
    (v_quiz_id, 1, 'On a topographic map, what do contour lines show?', 'multiple_choice',
     '["Lines of equal elevation (height above sea level)","Rivers and water bodies","Political boundaries","Roads and tracks"]',
     'Lines of equal elevation (height above sea level)',
     'Contour lines connect all points at the same elevation. Closely spaced lines = steep slope; widely spaced lines = gentle slope.',
     'NESA_GEO_7_1_2'),
    (v_quiz_id, 2, 'What does the scale 1:50,000 on a map mean?', 'multiple_choice',
     '["1cm on the map = 50,000cm (500m) in real life","1 metre on the map = 50,000 metres in real life","The map covers 50,000 square kilometres","There are 50,000 contour lines"]',
     '1cm on the map = 50,000cm (500m) in real life',
     'Scale ratio means 1 unit on the map equals 50,000 of the same units in reality. So 1cm = 50,000cm = 500m = 0.5km.',
     'NESA_GEO_7_1_2'),
    (v_quiz_id, 3, 'Which process forms river valleys?', 'multiple_choice',
     '["Erosion by water over thousands of years","Volcanic activity","Earthquake movement","Wind deposition"]',
     'Erosion by water over thousands of years',
     'Rivers erode rock and soil over long periods of time, gradually cutting deeper and wider channels to form valleys.',
     'NESA_GEO_7_1_1'),
    (v_quiz_id, 4, 'What are the four cardinal directions on a compass?', 'multiple_choice',
     '["North, South, East, West","Up, Down, Left, Right","Northeast, Southeast, Northwest, Southwest","Forward, Back, Left, Right"]',
     'North, South, East, West',
     'The four cardinal (main) compass directions are North, South, East and West. These are the basis for all navigation and map reading.',
     'NESA_GEO_7_1_2'),
    (v_quiz_id, 5, 'Which factors make a place more "liveable"?', 'multiple_choice',
     '["Access to services, safety, good environment, employment","Proximity to volcanoes","High population density","Distance from the coast"]',
     'Access to services, safety, good environment, employment',
     'Liveability measures quality of life including: access to healthcare, education, transport, employment, safety, and environmental quality.',
     'NESA_GEO_7_2_1');
  END IF;
END $$;

-- =============================================================================
-- YEAR 9 GEOGRAPHY — Biomes & Food Security
-- =============================================================================
DO $$
DECLARE v_quiz_id UUID;
BEGIN
  INSERT INTO quizzes (title, subject, topic, quiz_type, year_group, nesa_outcome_id, question_count)
  VALUES ('Year 9 Geography Diagnostic — Biomes & Food Security', 'Geography', 'Biomes & Food Security', 'diagnostic', 9, 'NESA_GEO_9_1_1', 5)
  ON CONFLICT (title, year_group) DO NOTHING
  RETURNING quiz_id INTO v_quiz_id;

  IF v_quiz_id IS NOT NULL THEN
    INSERT INTO quiz_questions (quiz_id, question_order, question_text, question_type, options, correct_answer, explanation, nesa_outcome_id) VALUES
    (v_quiz_id, 1, 'Which biome is characterised by very low rainfall, extreme temperatures and sparse vegetation?', 'multiple_choice',
     '["Desert","Tropical rainforest","Temperate grassland","Boreal forest"]',
     'Desert',
     'Deserts receive less than 250mm of rain per year and experience extreme temperature ranges. Vegetation is sparse and adapted to drought.',
     'NESA_GEO_9_1_1'),
    (v_quiz_id, 2, 'Tropical rainforests are mainly found:', 'multiple_choice',
     '["Near the equator where it is hot and wet year-round","Near the poles","In the middle latitudes","In the Sahara Desert"]',
     'Near the equator where it is hot and wet year-round',
     'Tropical rainforests occur near the equator (0-10° latitude) where high temperatures and abundant rainfall (>2000mm/year) support dense vegetation.',
     'NESA_GEO_9_1_1'),
    (v_quiz_id, 3, 'Food security means:', 'multiple_choice',
     '["All people have reliable access to enough nutritious food","A country produces all its own food","Food is stored safely in warehouses","There are no food imports"]',
     'All people have reliable access to enough nutritious food',
     'Food security (UN definition): when all people, at all times, have physical, social and economic access to sufficient, safe and nutritious food.',
     'NESA_GEO_9_1_2'),
    (v_quiz_id, 4, 'Which of the following is a human factor affecting food security?', 'multiple_choice',
     '["Conflict and war disrupting food supply chains","El Niño drought","Soil exhaustion","Flooding"]',
     'Conflict and war disrupting food supply chains',
     'Human factors affecting food security include: conflict, poverty, poor governance, trade policies, and unequal distribution. Climate and natural disasters are physical factors.',
     'NESA_GEO_9_1_2'),
    (v_quiz_id, 5, 'Which biome stores the most carbon and is being rapidly deforested?', 'multiple_choice',
     '["Tropical rainforest","Arctic tundra","Temperate grassland","Mediterranean shrubland"]',
     'Tropical rainforest',
     'Tropical rainforests contain enormous amounts of carbon in their biomass. Deforestation (mainly in Amazon, Congo, and SE Asia) releases this carbon as CO₂.',
     'NESA_GEO_9_1_1');
  END IF;
END $$;
