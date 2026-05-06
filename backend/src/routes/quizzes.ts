import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../services/db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// =============================================================================
// GET /api/quizzes
// List available quizzes filtered by year group, subject, and/or type
// =============================================================================
router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const yearGroup = req.query.yearGroup ? Number(req.query.yearGroup) : undefined;
  const subject   = req.query.subject   as string | undefined;
  const quizType  = req.query.type      as string | undefined;

  // Also fetch user's year_group from DB if not supplied in query
  let effectiveYear = yearGroup;

  try {
    if (!effectiveYear) {
      const userResult = await query<{ year_group: number }>(
        'SELECT year_group FROM users WHERE azure_user_id = $1',
        [req.user!.azureUserId]
      );
      effectiveYear = userResult.rows[0]?.year_group ?? undefined;
    }

    const conditions: string[] = [];
    const values: unknown[]    = [];
    let   idx = 1;

    if (effectiveYear) {
      conditions.push(`q.year_group = $${idx++}`);
      values.push(effectiveYear);
    }
    if (subject) {
      conditions.push(`q.subject = $${idx++}`);
      values.push(subject);
    }
    if (quizType) {
      conditions.push(`q.quiz_type = $${idx++}`);
      values.push(quizType);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query<{
      quiz_id:        string;
      title:          string;
      subject:        string;
      topic:          string;
      quiz_type:      string;
      year_group:     number;
      question_count: number;
      created_at:     string;
      attempts:       string;
      best_score:     string | null;
    }>(
      `SELECT
         q.quiz_id, q.title, q.subject, q.topic, q.quiz_type,
         q.year_group, q.question_count, q.created_at,
         COUNT(sqr.result_id)              AS attempts,
         MAX(sqr.score_percent)::text      AS best_score
       FROM quizzes q
       LEFT JOIN student_quiz_results sqr
              ON sqr.quiz_id = q.quiz_id
             AND sqr.user_id = (SELECT user_id FROM users WHERE azure_user_id = $${idx})
       ${whereClause}
       GROUP BY q.quiz_id
       ORDER BY q.subject, q.quiz_type DESC, q.year_group`,
      [...values, req.user!.azureUserId]
    );

    res.json({
      quizzes: result.rows.map((q) => ({
        quizId:        q.quiz_id,
        title:         q.title,
        subject:       q.subject,
        topic:         q.topic,
        quizType:      q.quiz_type,
        yearGroup:     q.year_group,
        questionCount: q.question_count,
        attempts:      Number(q.attempts),
        bestScore:     q.best_score !== null ? Number(q.best_score) : null,
        createdAt:     q.created_at,
      })),
    });
  } catch (error) {
    console.error('[GET /quizzes]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================================================
// GET /api/quizzes/:quizId
// Get a single quiz with its questions — correct_answer and explanation are
// intentionally OMITTED so students can't read them from the API response.
// =============================================================================
router.get('/:quizId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { quizId } = req.params;

  try {
    // Fetch quiz metadata
    const quizResult = await query<{
      quiz_id:        string;
      title:          string;
      subject:        string;
      topic:          string;
      quiz_type:      string;
      year_group:     number;
      question_count: number;
    }>(
      'SELECT quiz_id, title, subject, topic, quiz_type, year_group, question_count FROM quizzes WHERE quiz_id = $1',
      [quizId]
    );

    if (quizResult.rowCount === 0) {
      res.status(404).json({ error: 'Quiz not found' });
      return;
    }

    // Fetch questions — DO NOT include correct_answer or explanation
    const questionsResult = await query<{
      question_id:    string;
      question_order: number;
      question_text:  string;
      question_type:  string;
      options:        string[] | null;
      nesa_outcome_id: string | null;
    }>(
      `SELECT question_id, question_order, question_text, question_type, options, nesa_outcome_id
       FROM quiz_questions
       WHERE quiz_id = $1
       ORDER BY question_order`,
      [quizId]
    );

    const quiz = quizResult.rows[0];

    res.json({
      quizId:        quiz.quiz_id,
      title:         quiz.title,
      subject:       quiz.subject,
      topic:         quiz.topic,
      quizType:      quiz.quiz_type,
      yearGroup:     quiz.year_group,
      questionCount: quiz.question_count,
      questions:     questionsResult.rows.map((q) => ({
        questionId:    q.question_id,
        questionOrder: q.question_order,
        questionText:  q.question_text,
        questionType:  q.question_type,
        options:       q.options ?? [],
        nesaOutcomeId: q.nesa_outcome_id,
      })),
    });
  } catch (error) {
    console.error('[GET /quizzes/:id]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================================================
// POST /api/quizzes/:quizId/submit
// Grade a completed quiz, save result, update gamification + student_progress
// =============================================================================
const SubmitSchema = z.object({
  answers: z.array(z.object({
    questionId:    z.string().uuid(),
    studentAnswer: z.string().min(0).max(1000),
  })).min(1),
});

router.post('/:quizId/submit', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { quizId } = req.params;
  const parsed = SubmitSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const { answers } = parsed.data;
  const azureUserId = req.user!.azureUserId;

  try {
    // 1. Fetch quiz + all questions with correct answers
    const quizResult = await query<{ quiz_id: string; subject: string; quiz_type: string }>(
      'SELECT quiz_id, subject, quiz_type FROM quizzes WHERE quiz_id = $1',
      [quizId]
    );
    if (quizResult.rowCount === 0) {
      res.status(404).json({ error: 'Quiz not found' });
      return;
    }

    const questionsResult = await query<{
      question_id:    string;
      question_type:  string;
      correct_answer: string;
      explanation:    string;
      nesa_outcome_id: string | null;
    }>(
      `SELECT question_id, question_type, correct_answer, explanation, nesa_outcome_id
       FROM quiz_questions
       WHERE quiz_id = $1`,
      [quizId]
    );

    const questionMap = new Map(questionsResult.rows.map((q) => [q.question_id, q]));

    // 2. Get user_id
    const userResult = await query<{ user_id: string }>(
      'SELECT user_id FROM users WHERE azure_user_id = $1',
      [azureUserId]
    );
    if (userResult.rowCount === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const userId = userResult.rows[0].user_id;

    // 3. Grade each answer
    const gradedAnswers: Array<{
      questionId:    string;
      studentAnswer: string;
      correctAnswer: string;
      isCorrect:     boolean;
      explanation:   string;
      outcomeId:     string | null;
    }> = [];

    const outcomeScores: Record<string, { correct: number; total: number }> = {};

    for (const submission of answers) {
      const question = questionMap.get(submission.questionId);
      if (!question) continue;

      // Normalise comparison — case insensitive, trim whitespace
      const isCorrect =
        submission.studentAnswer.trim().toLowerCase() ===
        question.correct_answer.trim().toLowerCase();

      gradedAnswers.push({
        questionId:    submission.questionId,
        studentAnswer: submission.studentAnswer,
        correctAnswer: question.correct_answer,
        isCorrect,
        explanation:   question.explanation,
        outcomeId:     question.nesa_outcome_id,
      });

      // Track per-outcome scores
      if (question.nesa_outcome_id) {
        if (!outcomeScores[question.nesa_outcome_id]) {
          outcomeScores[question.nesa_outcome_id] = { correct: 0, total: 0 };
        }
        outcomeScores[question.nesa_outcome_id].total++;
        if (isCorrect) outcomeScores[question.nesa_outcome_id].correct++;
      }
    }

    const correctCount  = gradedAnswers.filter((a) => a.isCorrect).length;
    const totalAnswered = gradedAnswers.length;
    const scorePercent  = totalAnswered > 0
      ? Math.round((correctCount / totalAnswered) * 100)
      : 0;

    // Outcome breakdown as percentage
    const outcomeBreakdown: Record<string, number> = {};
    for (const [outcomeId, counts] of Object.entries(outcomeScores)) {
      outcomeBreakdown[outcomeId] = Math.round((counts.correct / counts.total) * 100);
    }

    // 4. Calculate XP: 10 base + 2 per correct answer + 20 bonus for 100%
    const xpAwarded = 10 + (correctCount * 2) + (scorePercent === 100 ? 20 : 0);

    // 5. Persist everything in a transaction
    await withTransaction(async (client) => {
      // Save quiz result
      await client.query(
        `INSERT INTO student_quiz_results
           (user_id, quiz_id, answers, score_percent, outcome_breakdown, xp_awarded)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          userId,
          quizId,
          JSON.stringify(gradedAnswers.map((a) => ({
            question_id:    a.questionId,
            student_answer: a.studentAnswer,
            correct_answer: a.correctAnswer,
            is_correct:     a.isCorrect,
            outcome_id:     a.outcomeId,
          }))),
          scorePercent,
          JSON.stringify(outcomeBreakdown),
          xpAwarded,
        ]
      );

      // Update gamification: add XP, check streak, possibly level up
      await client.query(
        `UPDATE gamification
         SET xp_total           = xp_total + $1,
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
             level              = LEAST(10, 1 + (xp_total + $1) / 100),
             updated_at         = NOW()
         WHERE user_id = $2`,
        [xpAwarded, userId]
      );

      // Update student_progress mastery per outcome
      for (const [outcomeId, pct] of Object.entries(outcomeBreakdown)) {
        // Get the subject for this outcome
        const outcomeRow = await client.query<{ subject: string }>(
          'SELECT subject FROM nesa_outcomes WHERE outcome_id = $1',
          [outcomeId]
        );
        if (outcomeRow.rowCount === 0) continue;
        const subject = outcomeRow.rows[0].subject;

        // Upsert progress row, updating just this outcome's mastery
        await client.query(
          `INSERT INTO student_progress (user_id, subject, outcome_mastery)
           VALUES ($1, $2, $3::jsonb)
           ON CONFLICT (user_id, subject) DO UPDATE
           SET outcome_mastery = student_progress.outcome_mastery || $3::jsonb,
               last_updated    = NOW()`,
          [userId, subject, JSON.stringify({ [outcomeId]: pct })]
        );

        // Recompute mastery_percent as avg of all outcome values for this subject
        await client.query(
          `UPDATE student_progress
           SET mastery_percent = (
             SELECT ROUND(AVG(value::numeric))
             FROM jsonb_each_text(outcome_mastery)
           ),
           last_updated = NOW()
           WHERE user_id = $1 AND subject = $2`,
          [userId, subject]
        );
      }

      // Audit log
      await client.query(
        `INSERT INTO audit_log (user_id, action, details)
         VALUES ($1, 'quiz_submit', $2)`,
        [userId, JSON.stringify({ quiz_id: quizId, score_percent: scorePercent, xp_awarded: xpAwarded })]
      );
    });

    // 6. Fetch updated gamification for response
    const gameResult = await query<{ xp_total: number; level: number; current_streak: number }>(
      'SELECT xp_total, level, current_streak FROM gamification WHERE user_id = $1',
      [userId]
    );

    res.status(201).json({
      score: {
        correct:       correctCount,
        total:         totalAnswered,
        scorePercent,
        xpAwarded,
      },
      outcomeBreakdown,
      answers: gradedAnswers,   // includes explanations
      gamification: gameResult.rows[0] ?? null,
    });
  } catch (error) {
    console.error('[POST /quizzes/:id/submit]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
