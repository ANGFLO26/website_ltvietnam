import { createPoolFrom } from '@ltv/db';
import { Argon2Hasher } from '../src/shared/crypto/argon2.hasher.js';

const action = process.argv[2];
if (action !== 'create' && action !== 'cleanup') {
  throw new Error('Dung: admin-e2e-fixture.ts <create|cleanup>');
}
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('Thieu DATABASE_URL.');
const email = process.env.ADMIN_SMOKE_EMAIL?.trim() || 'a5-e2e@ltvietnam.local';
const password = process.env.ADMIN_SMOKE_PASSWORD;
if (action === 'create' && !password) throw new Error('Thieu ADMIN_SMOKE_PASSWORD.');

const pool = createPoolFrom({
  connectionString,
  schema: process.env.DATABASE_SCHEMA?.trim() || 'ltv',
  max: 1,
  statementTimeoutMs: 10_000,
});
try {
  await cleanup(email);
  if (action === 'create') {
    const passwordHash = await new Argon2Hasher().hash(password!);
    const user = await pool.query<{ id: string }>(
      `INSERT INTO ltv.users (name, email, password_hash, role, status)
       VALUES ('A5 E2E Admin', $1, $2, 'admin', 'active') RETURNING id`,
      [email, passwordHash],
    );
    const inquiry = await pool.query<{ id: string }>(
      `INSERT INTO ltv.inquiries
        (inquiry_type, full_name, phone, email, message, locale, privacy_consent_at,
         idempotency_key, email_status, created_at)
       VALUES
        ('quotation', 'A5 E2E Inquiry', '0900000000', $1,
         'Du lieu kiem thu A5 - co the xoa.', 'vi', now(), 'a5-admin-e2e',
         'email_failed', now()) RETURNING id`,
      [email],
    );
    process.stdout.write(
      `${JSON.stringify({ action, email, user_id: user.rows[0]!.id, inquiry_id: inquiry.rows[0]!.id })}\n`,
    );
  } else {
    process.stdout.write(`${JSON.stringify({ action, email })}\n`);
  }
} finally {
  await pool.end();
}

async function cleanup(userEmail: string): Promise<void> {
  await pool.query('BEGIN');
  try {
    const user = await pool.query<{ id: string }>('SELECT id FROM ltv.users WHERE email = $1', [
      userEmail,
    ]);
    const userId = user.rows[0]?.id;
    await pool.query("DELETE FROM ltv.inquiries WHERE idempotency_key = 'a5-admin-e2e'");
    if (userId) {
      await pool.query('DELETE FROM ltv.products WHERE created_by = $1', [userId]);
      await pool.query('DELETE FROM ltv.pages WHERE created_by = $1', [userId]);
      await pool.query('DELETE FROM ltv.services WHERE created_by = $1', [userId]);
      await pool.query('DELETE FROM ltv.projects WHERE created_by = $1', [userId]);
      await pool.query('DELETE FROM ltv.posts WHERE author_id = $1', [userId]);
      await pool.query('DELETE FROM ltv.users WHERE id = $1', [userId]);
    }
    await pool.query('COMMIT');
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }
}
