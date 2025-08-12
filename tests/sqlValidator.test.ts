import { describe, it, expect } from 'vitest';
import { validateSql } from '../src/lib/sqlValidator';

const ALLOW = ['transactions', 'accounts'];

describe('validateSql', () => {
  it('allows simple select on allowlisted table', () => {
    expect(() => validateSql('SELECT * FROM transactions', ALLOW)).not.toThrow();
  });

  it('blocks write operations', () => {
    expect(() => validateSql('DELETE FROM transactions', ALLOW)).toThrow();
  });

  it('blocks non-allowlisted tables', () => {
    expect(() => validateSql('SELECT * FROM secret_table', ALLOW)).toThrow();
  });
});
