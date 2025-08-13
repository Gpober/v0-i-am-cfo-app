"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Menu,
  X,
  ChevronLeft,
  TrendingUp,
  DollarSign,
  Award,
  AlertTriangle,
  CheckCircle,
  Target,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

// I AM CFO Brand Colors
const BRAND_COLORS = {
  primary: '#56B6E9',
  secondary: '#3A9BD1', 
  tertiary: '#7CC4ED',
  accent: '#2E86C1',
  success: '#27AE60',
  warning: '#F39C12',
  danger: '#E74C3C',
  gray: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0'
  }
};

interface PropertySummary {
@@ -336,68 +335,87 @@ export default function EnhancedMobileDashboard() {
    });
    setPlData({
      revenue: Object.entries(rev).map(([name, total]) => ({ name, total })),
      expenses: Object.entries(exp).map(([name, total]) => ({ name, total })),
    });
  };

  const loadCF = async (propertyName: string | null = selectedProperty) => {
    const { start, end } = getDateRange();
    let query = supabase
      .from("journal_entry_lines")
      .select(
        "account, account_type, report_category, normal_balance, debit, credit, class, date",
      )
      .gte("date", start)
      .lte("date", end);
    if (propertyName) {
      query =
        propertyName === "General"
          ? query.is("class", null)
          : query.eq("class", propertyName);
    }
    const { data } = await query;
    const op: Record<string, number> = {};
    const fin: Record<string, number> = {};
    const accountTypes: Record<string, string | null> = {};
    ((data as JournalRow[]) || []).forEach((row) => {
      const debit = Number(row.debit) || 0;
      const credit = Number(row.credit) || 0;
      const amount =
        row.report_category === "transfer" ? debit - credit : credit - debit;
      const classification = classifyTransaction(
        row.account_type,
        row.report_category,
      );
      if (classification === "operating") {
        op[row.account] = (op[row.account] || 0) + amount;
        accountTypes[row.account] = row.account_type;
      } else if (classification === "financing") {
        fin[row.account] = (fin[row.account] || 0) + amount;
        accountTypes[row.account] = row.account_type;
      }
    });
    const opEntries = Object.entries(op);
    const incomeOps = opEntries
      .filter(([name]) =>
        (accountTypes[name] || "").toLowerCase().includes("income"),
      )
      .sort((a, b) => a[0].localeCompare(b[0]));
    const otherOps = opEntries
      .filter(([name]) =>
        !(accountTypes[name] || "").toLowerCase().includes("income"),
      )
      .sort((a, b) => a[0].localeCompare(b[0]));
    const finEntries = Object.entries(fin)
      .sort((a, b) => a[0].localeCompare(b[0]));
    setCfData({
      operating: Object.entries(op).map(([name, total]) => ({ name, total })),
      financing: Object.entries(fin).map(([name, total]) => ({ name, total })),
      operating: [...incomeOps, ...otherOps].map(([name, total]) => ({
        name,
        total,
      })),
      financing: finEntries.map(([name, total]) => ({ name, total })),
    });
  };


  const handleCategory = async (
    account: string,
    type: "revenue" | "expense" | "operating" | "financing",
  ) => {
    const { start, end } = getDateRange();
    let query = supabase
      .from("journal_entry_lines")
      .select("date, debit, credit, account, class, report_category")
      .eq("account", account)
      .gte("date", start)
      .lte("date", end);
    if (selectedProperty) {
      query =
        selectedProperty === "General"
          ? query.is("class", null)
          : query.eq("class", selectedProperty);
    }
    const { data } = await query;
    const list: Transaction[] = ((data as JournalRow[]) || [])
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((row) => {
@@ -434,66 +452,66 @@ export default function EnhancedMobileDashboard() {
      background: BRAND_COLORS.gray[50],
      padding: '16px',
      position: 'relative'
    }}>
      <style jsx>{`
        @keyframes slideDown {
          0% {
            opacity: 0;
            transform: translateY(-10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      {/* Enhanced Header */}
      <header style={{
        background: `linear-gradient(135deg, ${BRAND_COLORS.primary}, ${BRAND_COLORS.secondary})`,
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
        color: 'white',
        boxShadow: `0 8px 32px ${BRAND_COLORS.primary}33`
      }}>
        <div className="flex items-center justify-between mb-4">
        <div className="relative flex items-center justify-center mb-4">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px',
              color: 'white'
            }}
            className="absolute left-0 top-1/2 -translate-y-1/2"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="flex items-center gap-2">
            <DollarSign size={32} />
            <span style={{ fontSize: '20px', fontWeight: 'bold' }}>I AM CFO</span>
          <div className="mx-auto">
            <span className="text-white text-4xl font-bold">I AM CFO</span>
          </div>
        </div>

        {/* Dashboard Summary */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
            {reportType === "pl" ? "P&L Dashboard" : "Cash Flow Dashboard"}
          </h1>
          <p style={{ fontSize: '14px', opacity: 0.9 }}>
            {getMonthName(month)} {year} • {properties.length} Properties
          </p>
        </div>

        {/* Company Total - Enhanced */}
        <div
          onClick={() => handlePropertySelect(null)}
          style={{
            background: 'rgba(255, 255, 255, 0.15)',
            borderRadius: '12px',
            padding: '20px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
