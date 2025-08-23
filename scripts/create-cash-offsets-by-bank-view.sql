CREATE OR REPLACE VIEW public.cash_offsets_by_bank AS
WITH cash_banks AS (
  SELECT
    l.entry_number,
    ARRAY_AGG(DISTINCT l.entry_bank_account)
      FILTER (WHERE l.is_cash_account = true AND l.entry_bank_account IS NOT NULL) AS banks,
    (
      SELECT x.entry_bank_account
      FROM public.journal_entry_lines x
      WHERE x.entry_number = l.entry_number
        AND x.is_cash_account = true
        AND x.entry_bank_account IS NOT NULL
      ORDER BY ABS(COALESCE(x.credit,0) - COALESCE(x.debit,0)) DESC, x.line_sequence
      LIMIT 1
    ) AS primary_bank
  FROM public.journal_entry_lines l
  WHERE l.is_cash_account = true
  GROUP BY l.entry_number
)
SELECT
  o.entry_number,
  o.line_sequence,
  o.date::date AS date,
  o.class,
  o.account,
  o.account_type,
  o.detail_type,
  o.debit,
  o.credit,
  LOWER(COALESCE(o.report_category,'')) AS report_category,
  (COALESCE(o.credit,0) - COALESCE(o.debit,0)) AS cash_effect,
  COALESCE(
    CASE WHEN CARDINALITY(cb.banks) = 1 THEN cb.banks[1] ELSE cb.primary_bank END,
    NULL
  ) AS entry_bank_account
FROM public.journal_entry_lines o
JOIN cash_banks cb USING (entry_number)
WHERE o.is_cash_account = false;

COMMENT ON VIEW public.cash_offsets_by_bank IS
'Offset lines from entries that touched cash, attributed to a bank (primary bank if multiple cash lines). cash_effect = credit - debit.';
