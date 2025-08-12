export const FORBIDDEN_KEYWORDS = [
  'insert',
  'update',
  'delete',
  'drop',
  'alter',
  'create',
  'grant',
  'revoke',
  'truncate'
];

export function validateSql(sql: string, allowlist: string[]) {
  const lowered = sql.toLowerCase();
  for (const keyword of FORBIDDEN_KEYWORDS) {
    if (lowered.includes(keyword)) {
      throw new Error(`SQL contains forbidden keyword: ${keyword}`);
    }
  }

  const regex = /\bfrom\s+([a-zA-Z_][a-zA-Z0-9_]*)|\bjoin\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(sql)) !== null) {
    const table = match[1] || match[2];
    if (!allowlist.includes(table)) {
      throw new Error(`SQL uses non-allowlisted identifier: ${table}`);
    }
  }
}

export default validateSql;
