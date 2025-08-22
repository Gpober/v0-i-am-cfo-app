create or replace view cash_related_offsets as
with cash_entries as (
  select distinct entry_number, entry_bank_account, date
  from journal_entry_lines
  where is_cash_account = true
)
select
  o.id,
  o.entry_number,
  o.line_sequence,
  o.date,
  o.class,
  o.account,
  o.account_type,
  o.report_category,
  o.debit,
  o.credit,
  (coalesce(o.credit,0) - coalesce(o.debit,0)) as cash_effect,
  c.entry_bank_account as cash_bank_account
from journal_entry_lines o
join cash_entries c on c.entry_number = o.entry_number
where o.is_cash_account = false;

