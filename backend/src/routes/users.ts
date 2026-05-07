import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../services/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// =============================================================================
// POST /api/users/register
// Called after Azure Entra External ID auth — creates or updates user record
// =============================================================================
const RegisterSchema = z.object({
  name:          z.string().min(1).max(255),
  email:         z.string().email(),
  yearGroup:     z.number().int().min(7).max(10).optional(),
  parentalConsent: z.boolean().default(false),
});

router.post('/register', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const { name, email, yearGroup, parentalConsent } = parsed.data;
  const azureUserId = req.user!.azureUserId;

  try {
    // Upsert: create if not exists, update name/email if already exists
    const result = await query<{
      user_id: string;
      onboarding_complete: boolean;
      year_group: number | null;
    }>(
      `INSERT INTO users (azure_user_id, email, name, year_group, parental_consent)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (azure_user_id) DO UPDATE SET
         email = EXCLUDED.email,
         name = EXCLUDED.name,
         updated_at = NOW()
       RETURNING user_id, onboarding_complete, year_group`,
      [azureUserId, email, name, yearGroup ?? null, parentalConsent]
    );

    const user = result.rows[0];

    res.status(201).json({
      userId: user.user_id,
      onboardingComplete: user.onboarding_complete,
      yearGroup: user.year_group,
    });
  } catch (error) {
    console.error('[POST /users/register]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================================================
// GET /api/users/me  — Fetch current user profile
// =============================================================================
router.get('/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const azureUserId = req.user!.azureUserId;

  try {
    const result = await query<{
      user_id: string;
      email: string;
      name: string;
      year_group: number;
      enrolled_subjects: string[];
      confidence_per_subject: Record<string, number>;
      parental_consent: boolean;
      onboarding_complete: boolean;
      created_at: string;
    }>(
      `SELECT u.user_id, u.email, u.name, u.year_group,
              u.enrolled_subjects, u.confidence_per_subject,
              u.parental_consent, u.onboarding_complete, u.created_at,
              g.xp_total, g.current_streak, g.level, g.badges
       FROM users u
       LEFT JOIN gamification g ON g.user_id = u.user_id
       WHERE u.azure_user_id = $1`,
      [azureUserId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[GET /users/me]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================================================
// PATCH /api/users/me  — Update user profile (onboarding step 2)
// =============================================================================
const UpdateProfileSchema = z.object({
  name:                 z.string().min(1).max(255).optional(),
  yearGroup:            z.number().int().min(7).max(10).optional(),
  enrolledSubjects:     z.array(z.enum(['English', 'Maths', 'Science', 'History', 'Geography'])).optional(),
  confidencePerSubject: z.record(z.string(), z.number().min(1).max(5)).optional(),
  onboardingComplete:   z.boolean().optional(),
});

router.patch('/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const parsed = UpdateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const azureUserId = req.user!.azureUserId;
  const updates = parsed.data;

  // Build dynamic SET clause
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIdx = 1;

  if (updates.name !== undefined) {
    setClauses.push(`name = $${paramIdx++}`);
    values.push(updates.name);
  }
  if (updates.yearGroup !== undefined) {
    setClauses.push(`year_group = $${paramIdx++}`);
    values.push(updates.yearGroup);
  }
  if (updates.enrolledSubjects !== undefined) {
    setClauses.push(`enrolled_subjects = $${paramIdx++}`);
    values.push(JSON.stringify(updates.enrolledSubjects));
  }
  if (updates.confidencePerSubject !== undefined) {
    setClauses.push(`confidence_per_subject = $${paramIdx++}`);
    values.push(JSON.stringify(updates.confidencePerSubject));
  }
  if (updates.onboardingComplete !== undefined) {
    setClauses.push(`onboarding_complete = $${paramIdx++}`);
    values.push(updates.onboardingComplete);
  }

  if (setClauses.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  setClauses.push('updated_at = NOW()');
  values.push(azureUserId);

  try {
    const result = await query(
      `UPDATE users SET ${setClauses.join(', ')}
       WHERE azure_user_id = $${paramIdx}
       RETURNING user_id, name, year_group, enrolled_subjects,
                 confidence_per_subject, onboarding_complete`,
      values
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // If subjects changed, ensure student_progress rows exist
    if (updates.enrolledSubjects) {
      const userId = (result.rows[0] as { user_id: string }).user_id;
      for (const subject of updates.enrolledSubjects) {
        await query(
          `INSERT INTO student_progress (user_id, subject)
           VALUES ($1, $2)
           ON CONFLICT (user_id, subject) DO NOTHING`,
          [userId, subject]
        );
      }
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[PATCH /users/me]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================================================
// DELETE /api/users/me  — Account deletion (GDPR/Privacy Act compliance)
// =============================================================================
router.delete('/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const azureUserId = req.user!.azureUserId;

  try {
    await withTransaction(async (client) => {
      // Get the user_id first
      const userResult = await client.query(
        'SELECT user_id FROM users WHERE azure_user_id = $1',
        [azureUserId]
      );
      if (userResult.rowCount === 0) return;

      const userId = (userResult.rows[0] as { user_id: string }).user_id;

      // Log the deletion before removing the user
      await client.query(
        `INSERT INTO audit_log (user_id, action, details)
         VALUES ($1, 'account_deleted', '{}')`,
        [userId]
      );

      // Cascade delete handles all child records
      await client.query('DELETE FROM users WHERE user_id = $1', [userId]);
    });

    res.status(204).send();
  } catch (error) {
    console.error('[DELETE /users/me]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
