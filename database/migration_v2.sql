-- =============================================================================
-- UNLOCK — Migration v2
-- Adds unique constraints needed for Week 2 features
-- Run AFTER schema_v1.sql, BEFORE seed_quizzes_v2.sql
-- =============================================================================

-- Allow ON CONFLICT on quizzes by (title, year_group)
-- Prevents duplicate diagnostic quizzes if seed is re-run
ALTER TABLE quizzes
  ADD CONSTRAINT IF NOT EXISTS quizzes_title_year_unique
  UNIQUE (title, year_group);

-- Allow idempotent task completion tracking
-- Prevents a student completing the same task twice
ALTER TABLE task_completions
  ADD CONSTRAINT IF NOT EXISTS task_completions_unique
  UNIQUE (user_id, plan_id, day, task_index);
