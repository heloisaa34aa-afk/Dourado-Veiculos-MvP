import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260812_allow_partial_capture_finalize.sql'),
  'utf8',
);

describe('partial capture finalization migration', () => {
  it('keeps the safe minimum for each view type', () => {
    expect(sql).toMatch(/view_type = 'exterior' THEN 24/);
    expect(sql).toMatch(/view_type = 'interior' THEN 8/);
  });

  it('requires a continuous sequence from slot zero', () => {
    expect(sql).toMatch(/FOR v_slot IN 0\.\.\(v_confirmed_count - 1\)/);
    expect(sql).toMatch(/slot_number = v_slot/);
  });

  it('keeps finalization restricted to service_role', () => {
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.finalize_vehicle_360_capture\(UUID\) FROM PUBLIC, anon, authenticated/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.finalize_vehicle_360_capture\(UUID\) TO service_role/);
  });
});
