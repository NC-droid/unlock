import { Router, Request, Response } from 'express';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { query, withTransaction } from '../services/db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// =============================================================================
// Helpers
// =============================================================================

function getCurrentWeekNumber(): number {
  const now  = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff  = now.getTime() - start.getTime();
  return Math.ceil((diff / 86_400_000 + start.getDay() + 1) / 7);
}

// =============================================================================
// GET /api/study-plans/current
// Returns the current week's study plan for the authenticated user.
// If none exists, returns 404 (frontend should prompt to generate).
// =============================================================================
router.get('/current', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const azureUserId   = req.user!.azureUserId;
  const weekNumber    = getCurrentWeekNumber();

  try {
    const result = await query<{
      plan_id:     string;
      week_number: number;
      tasks:       object;
      generated_by: string;
      created_at:  string;
      updated_at:  string;
    }>(
      `SELECT sp.plan_id, sp.week_number, sp.tasks, sp.generated_by, sp.created_at, sp.updated_at
       FROM study_plans sp
       JOIN users u ON u.user_id = sp.user_id
       WHERE u.azure_user_id = $1 AND sp.week_number = $2`,
      [azureUserId, weekNumber]
    );

    if (result.rowCount === 0) {
      res.status(404).json({
        error:      'No study plan for this week',
        weekNumber,
        hint:       'POST /api/study-plans/generate to create one',
      });
      return;
    }

    // Fetch task completion statuses for this plan
    const completionsResult = await query<{ day: string; task_index: number }>(
      `SELECT tc.day, tc.task_index
       FROM task_completions tc
       JOIN study_plans sp ON sp.plan_id = tc.plan_id
       JOIN users u ON u.user_id = sp.user_id
       WHERE u.azure_user_id = $1 AND sp.plan_id = $2`,
      [azureUserId, result.rows[0].plan_id]
    );

    const completed = new Set(
      completionsResult.rows.map((c) => `${c.day}:${c.task_index}`)
    );

    const plan = result.rows[0];

    res.json({
      planId:      plan.plan_id,
      weekNumber:  plan.week_number,
      generatedBy: plan.generated_by,
      createdAt:   plan.created_at,
      tasks:       plan.tasks,
      completions: Array.from(completed),
    });
  } catch (error) {
    console.error('[GET /study-plans/current]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================================================
// POST /api/study-plans/generate
// Generate a new AI study plan for the current week using Claude.
// Uses the student's year, enrolled subjects, confidence levels, and most
// recent quiz results as context.
// =============================================================================
router.post('/generate', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const azureUserId = req.user!.azureUserId;
  const weekNumber  = getCurrentWeekNumber();

  try {
    // 1. Fetch user profile
    const userResult = await query<{
      user_id:                string;
      name:                   string;
      year_group:             number;
      enrolled_subjects:      string[];
      confidence_per_subject: Record<string, number>;
    }>(
      `SELECT user_id, name, year_group, enrolled_subjects, confidence_per_subject
       FROM users WHERE azure_user_id = $1`,
      [azureUserId]
    );

    if (userResult.rowCount === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = userResult.rows[0];

    if (!user.year_group || !user.enrolled_subjects?.length) {
      res.status(400).json({ error: 'Complete onboarding before generating a study plan' });
      return;
    }

    // 2. Fetch recent quiz results (last 10)
    const quizResults = await query<{
      subject:       string;
      topic:         string;
      score_percent: number;
      completed_at:  string;
      outcome_breakdown: Record<string, number>;
    }>(
      `SELECT q.subject, q.topic, sqr.score_percent, sqr.completed_at, sqr.outcome_breakdown
       FROM student_quiz_results sqr
       JOIN quizzes q ON q.quiz_id = sqr.quiz_id
       JOIN users u ON u.user_id = sqr.user_id
       WHERE u.azure_user_id = $1
       ORDER BY sqr.completed_at DESC
       LIMIT 10`,
      [azureUserId]
    );

    // 3. Fetch current mastery per subject
    const progressResult = await query<{ subject: string; mastery_percent: number }>(
      `SELECT sp.subject, sp.mastery_percent
       FROM student_progress sp
       JOIN users u ON u.user_id = sp.user_id
       WHERE u.azure_user_id = $1`,
      [azureUserId]
    );

    // 4. Build Claude prompt
    const subjects        = Array.isArray(user.enrolled_subjects)
      ? user.enrolled_subjects
      : JSON.parse(user.enrolled_subjects as unknown as string);

    const confidence      = user.confidence_per_subject ?? {};
    const mastery         = Object.fromEntries(
      progressResult.rows.map((p) => [p.subject, p.mastery_percent])
    );

    const quizSummary = quizResults.rows.length
      ? quizResults.rows
          .map((r) => `- ${r.subject} / ${r.topic}: ${r.score_percent}% (${new Date(r.completed_at).toLocaleDateString('en-AU')})`)
          .join('\n')
      : 'No quiz results yet.';

    const prompt = `You are an expert NSW curriculum tutor generating a personalised 5-day study plan.

STUDENT PROFILE:
- Name: ${user.name}
- Year Group: Year ${user.year_group} (NSW Australia)
- Enrolled Subjects: ${subjects.join(', ')}
- Self-reported confidence (1=low, 5=high): ${JSON.stringify(confidence)}
- Measured subject mastery (%): ${JSON.stringify(mastery)}

RECENT QUIZ PERFORMANCE:
${quizSummary}

TASK:
Create a 5-day (Monday–Friday) study plan for Week ${weekNumber}. For each day, provide 2–3 focused study tasks.

Each task must have:
- subject (one of the enrolled subjects)
- topic (specific topic to study, aligned to NSW NESA curriculum)
- activity (what exactly to do — e.g. "Complete 10 practice questions on fractions", "Read Chapter 4 and write a summary")
- estimated_minutes (15–45 minutes per task)
- priority ("high" | "medium" | "low") — prioritise weaker subjects based on mastery and confidence

RULES:
- Spread subjects evenly across the week
- Put higher priority/harder topics earlier in the week
- Keep daily study time to 45–90 minutes total
- Use NSW NESA terminology for topics
- Don't repeat the same activity twice

Respond with ONLY valid JSON in this exact structure (no markdown, no explanation):
{
  "days": [
    {
      "day": "Monday",
      "tasks": [
        {
          "subject": "Maths",
          "topic": "Fractions & Decimals",
          "activity": "Complete 10 practice questions on adding fractions with unlike denominators",
          "estimated_minutes": 30,
          "priority": "high"
        }
      ]
    }
  ]
}`;

    // 5. Call Claude API
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    let planJson: { days: Array<{
      day: string;
      tasks: Array<{
        subject: string;
        topic: string;
        activity: string;
        estimated_minutes: number;
        priority: string;
      }>;
    }> };

    try {
      const message = await anthropic.messages.create({
        model:      'claude-3-5-haiku-20241022',  // Fast + cheap for structured output
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = message.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      // Strip any accidental markdown code fences
      const jsonText = content.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      planJson = JSON.parse(jsonText);
    } catch (aiError) {
      console.error('[study-plans/generate] Claude API error:', aiError);
      // Fallback: generate a basic plan without AI
      planJson = buildFallbackPlan(subjects, weekNumber);
    }

    // 6. Save plan (upsert for this week)
    const saveResult = await query<{ plan_id: string }>(
      `INSERT INTO study_plans (user_id, week_number, tasks, generated_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, week_number) DO UPDATE
       SET tasks        = EXCLUDED.tasks,
           generated_by = EXCLUDED.generated_by,
           updated_at   = NOW()
       RETURNING plan_id`,
      [user.user_id, weekNumber, JSON.stringify(planJson.days), 'claude-3-5-haiku-20241022']
    );

    res.status(201).json({
      planId:      saveResult.rows[0].plan_id,
      weekNumber,
      generatedBy: 'claude-3-5-haiku-20241022',
      tasks:       planJson.days,
      completions: [],
    });
  } catch (error) {
    console.error('[POST /study-plans/generate]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================================================
// PATCH /api/study-plans/tasks/:day/:taskIndex
// Toggle a task as complete / incomplete
// =============================================================================
const TaskCompleteSchema = z.object({
  completed: z.boolean(),
});

router.patch('/tasks/:day/:taskIndex', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { day, taskIndex } = req.params;
  const idx = Number(taskIndex);

  if (isNaN(idx) || idx < 0) {
    res.status(400).json({ error: 'Invalid task index' });
    return;
  }

  const parsed = TaskCompleteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const azureUserId = req.user!.azureUserId;
  const weekNumber  = getCurrentWeekNumber();

  try {
    // Get the current plan
    const planResult = await query<{ plan_id: string; user_id: string }>(
      `SELECT sp.plan_id, sp.user_id
       FROM study_plans sp
       JOIN users u ON u.user_id = sp.user_id
       WHERE u.azure_user_id = $1 AND sp.week_number = $2`,
      [azureUserId, weekNumber]
    );

    if (planResult.rowCount === 0) {
      res.status(404).json({ error: 'No study plan found for this week' });
      return;
    }

    const { plan_id: planId, user_id: userId } = planResult.rows[0];

    if (parsed.data.completed) {
      // Mark complete — insert only if not already recorded
      await query(
        `INSERT INTO task_completions (user_id, plan_id, day, task_index)
         SELECT $1, $2, $3, $4
         WHERE NOT EXISTS (
           SELECT 1 FROM task_completions
           WHERE user_id = $1 AND plan_id = $2 AND day = $3 AND task_index = $4
         )`,
        [userId, planId, day, idx]
      );

      // Award small XP for task completion (5 XP)
      await query(
        `UPDATE gamification
         SET xp_total           = xp_total + 5,
             last_activity_date = CURRENT_DATE,
             current_streak     = CASE
               WHEN last_activity_date = CURRENT_DATE - INTERVAL '1 day' THEN current_streak + 1
               WHEN last_activity_date = CURRENT_DATE THEN current_streak
               ELSE 1
             END,
             longest_streak     = GREATEST(
               longest_streak,
               CASE
                 WHEN last_activity_date = CURRENT_DATE - INTERVAL '1 day' THEN current_streak + 1
                 WHEN last_activity_date = CURRENT_DATE THEN current_streak
                 ELSE 1
               END
             ),
             updated_at = NOW()
         WHERE user_id = $1`,
        [userId]
      );
    } else {
      // Mark incomplete — delete the completion record
      await query(
        `DELETE FROM task_completions
         WHERE user_id = $1 AND plan_id = $2 AND day = $3 AND task_index = $4`,
        [userId, planId, day, idx]
      );
    }

    res.json({ success: true, day, taskIndex: idx, completed: parsed.data.completed });
  } catch (error) {
    console.error('[PATCH /study-plans/tasks]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================================================
// Fallback plan generator (used when Claude API is unavailable)
// =============================================================================
function buildFallbackPlan(subjects: string[], weekNumber: number) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const topicsBySubject: Record<string, string[]> = {
    English:   ['Reading & Comprehension', 'Writing Skills', 'Grammar & Vocabulary'],
    Maths:     ['Number & Algebra', 'Measurement & Geometry', 'Statistics & Probability'],
    Science:   ['Working Scientifically', 'Cells & Life', 'Matter & Materials'],
    History:   ['Source Analysis', 'Historical Skills', 'Modern History'],
    Geography: ['Map Skills', 'Environmental Change', 'Place & Liveability'],
  };

  return {
    days: days.map((day, dayIdx) => ({
      day,
      tasks: subjects.slice(0, 2).map((subject, subjIdx) => ({
        subject,
        topic:              topicsBySubject[subject]?.[dayIdx % 3] ?? 'Review',
        activity:           `Review your notes and complete practice questions on ${topicsBySubject[subject]?.[dayIdx % 3] ?? 'this topic'}`,
        estimated_minutes:  30,
        priority:           subjIdx === 0 ? 'high' : 'medium',
      })),
    })),
  };
}

export default router;
