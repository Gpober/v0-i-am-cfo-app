"use client";

import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface CFEntry {
  name: string;
  total: number;
}

interface Transaction {
  date: string;
  account: string;
  memo: string | null;
  customer: string | null;
  amount: number;
  class: string | null;
}

function classifyTransaction(accountType: string | null, reportCategory: string | null) {
  const type = (accountType || "").toLowerCase();
  if (type.includes("income")) return "operating";
  if (reportCategory === "financing") return "financing";
  return "operating";
}

export default function MobileDashboard() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [cfData, setCfData] = useState<{ operating: CFEntry[]; financing: CFEntry[] }>({
    operating: [],
    financing: [],
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    loadCF();
  }, []);

  async function loadCF() {
    const { data } = await supabase
      .from("journal_entry_lines")
      .select("account, account_type, report_category, debit, credit");

    const op: Record<string, number> = {};
    const fin: Record<string, number> = {};
    const types: Record<string, string | null> = {};

    (data || []).forEach((row: any) => {
      const debit = Number(row.debit) || 0;
      const credit = Number(row.credit) || 0;
      const amount = row.report_category === "transfer" ? debit - credit : credit - debit;
      const classification = classifyTransaction(row.account_type, row.report_category);
      if (classification === "operating") {
        op[row.account] = (op[row.account] || 0) + amount;
        types[row.account] = row.account_type;
      } else if (classification === "financing") {
        fin[row.account] = (fin[row.account] || 0) + amount;
      }
    });

    const opEntries = Object.entries(op);
    const incomeOps = opEntries.filter(([name]) => (types[name] || "").toLowerCase().includes("income"));
    const otherOps = opEntries.filter(([name]) => !(types[name] || "").toLowerCase().includes("income"));

    setCfData({
      operating: [...incomeOps, ...otherOps].map(([name, total]) => ({ name, total })),
      financing: Object.entries(fin).map(([name, total]) => ({ name, total })),
    });
  }

  async function loadTransactions(account: string) {
    const { data } = await supabase
      .from("journal_entry_lines")
      .select("date, debit, credit, account, class, memo, customer, vendor, name")
      .eq("account", account);

    const list: Transaction[] = (data || []).map((row: any) => ({
      date: row.date,
      account: row.account,
      memo: row.memo,
      customer: row.customer || row.vendor || row.name,
      amount: (Number(row.credit) || 0) - (Number(row.debit) || 0),
      class: row.class,
    }));
    setTransactions(list);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="relative bg-blue-600 p-4 text-center">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white"
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
        <h1 className="text-white text-2xl font-bold">I AM CFO</h1>
      </header>

      <section className="p-4">
        <h2 className="font-semibold mb-2">Operating Activities</h2>
        <ul>
          {cfData.operating.map((entry) => (
            <li
              key={entry.name}
              className="flex justify-between py-1 cursor-pointer"
              onClick={() => loadTransactions(entry.name)}
            >
              <span>{entry.name}</span>
              <span>{entry.total.toFixed(2)}</span>
            </li>
          ))}
        </ul>
      </section>

      {transactions.length > 0 && (
        <section className="p-4">
          <h2 className="font-semibold mb-2">Transactions</h2>
          <ul className="space-y-2">
            {transactions.map((t, idx) => (
              <li key={idx} className="border-b pb-2">
                <div className="text-sm">{t.customer || "N/A"}</div>
                {t.memo && <div className="text-xs text-gray-600">{t.memo}</div>}
                <div className="text-xs text-gray-500">{t.date}</div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
