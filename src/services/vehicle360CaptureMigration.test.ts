import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260812_add_360_capture_sessions.sql'),
  'utf8',
);

const grantsSql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260812_fix_capture_service_role_grants.sql'),
  'utf8',
);

describe('vehicle 360 capture migration contract', () => {
  it('is transactional and reloads the PostgREST schema', () => {
    expect(sql.trimStart().startsWith('BEGIN;')).toBe(true);
    expect(sql).toMatch(/COMMIT;\s*NOTIFY pgrst, 'reload schema';/);
  });

  it('inserts only columns that exist in vehicle_360_frames', () => {
    expect(sql).not.toMatch(/is_processed|is_sharp/);
    expect(sql).toMatch(/original_filename,\s*width,\s*height/);
  });

  it('allows finalization only through service_role', () => {
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.finalize_vehicle_360_capture\(UUID\) FROM authenticated/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.finalize_vehicle_360_capture\(UUID\) TO service_role/);
  });

  it('locks the session and accepts only the active state', () => {
    expect(sql).toMatch(/WHERE id = p_session_id\s+FOR UPDATE/);
    expect(sql).toMatch(/v_session\.status != 'active'/);
  });

  it('uses the exterior and interior final limits', () => {
    expect(sql).toMatch(/v_max_frames := 96/);
    expect(sql).toMatch(/v_max_frames := 48/);
  });

  it('does not attempt to persist an expired status before raising and rolling back', () => {
    const expirationBlock = sql.match(/IF v_session\.expires_at < NOW\(\) THEN([\s\S]*?)END IF;/)?.[1] ?? '';
    expect(expirationBlock).not.toContain('UPDATE');
    expect(expirationBlock).toContain("RAISE EXCEPTION 'Session is expired'");
  });
});

describe('vehicle 360 capture service role privileges', () => {
  it('allows the Edge Function to validate real administrators', () => {
    expect(grantsSql).toMatch(/GRANT SELECT ON TABLE public\.admins TO service_role/);
  });

  it('grants only the capture table operations used by the Edge Function', () => {
    expect(grantsSql).toMatch(/GRANT SELECT, INSERT, UPDATE ON TABLE public\.vehicle_360_capture_sessions TO service_role/);
    expect(grantsSql).toMatch(/GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public\.vehicle_360_capture_frames TO service_role/);
  });

  it('keeps anonymous clients away from temporary capture tables', () => {
    expect(grantsSql).toMatch(/REVOKE ALL ON TABLE public\.vehicle_360_capture_sessions FROM anon/);
    expect(grantsSql).toMatch(/REVOKE ALL ON TABLE public\.vehicle_360_capture_frames FROM anon/);
  });
});
