-- Indexes to speed up journal_entry_lines queries
CREATE INDEX IF NOT EXISTS jel_date_idx ON public.journal_entry_lines (date);
CREATE INDEX IF NOT EXISTS jel_class_idx ON public.journal_entry_lines (class);
CREATE INDEX IF NOT EXISTS jel_vendor_idx ON public.journal_entry_lines (vendor);
CREATE INDEX IF NOT EXISTS jel_account_type_idx ON public.journal_entry_lines (account_type);
CREATE INDEX IF NOT EXISTS jel_entry_number_idx ON public.journal_entry_lines (entry_number);

-- Materialized view for monthly rollups used by AI and charts
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_jel_monthly_class AS
SELECT
  date_trunc('month', date)::date AS month,
  COALESCE(class, 'Unassigned') AS class,
  SUM(CASE WHEN report_category = 'Income' OR account_type = 'Income' THEN amount ELSE 0 END) AS revenue,
  SUM(CASE WHEN report_category = 'Expense' OR account_type = 'Expense' THEN amount ELSE 0 END) AS expenses,
  COUNT(*) AS rows
FROM public.journal_entry_lines
GROUP BY 1,2;

CREATE INDEX IF NOT EXISTS mv_jel_monthly_class_idx ON mv_jel_monthly_class (month, class);

-- Function and cron job to refresh the materialized view hourly
CREATE OR REPLACE FUNCTION refresh_ai_rollups() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_jel_monthly_class;
END $$;

SELECT cron.schedule('refresh_ai_rollups_hourly', '0 * * * *', $$SELECT refresh_ai_rollups();$$);
