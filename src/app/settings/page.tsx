"use client"

import { useState } from "react"
import Papa from "papaparse"
import { supabase } from "@/lib/supabaseClient"

interface ManualBalance {
  account: string
  accountType: string
  balance: string
}

// Map common account labels from CSVs to standardized account names
const accountMappings: Record<string, string> = {
  cash: "Cash",
  checking: "Checking",
  "checking account": "Checking",
  savings: "Savings",
  "savings account": "Savings",
  bank: "Bank",
  "accounts receivable": "Accounts Receivable",
  "accounts payable": "Accounts Payable",
  inventory: "Inventory",
}

// Balance Sheet Account Types Only (no P&L accounts)
const balanceSheetAccountTypes = [
  "Bank",
  "Accounts receivable (A/R)",
  "Other Current Assets", 
  "Fixed Assets",
  "Other Assets",
  "Accounts payable (A/P)",
  "Credit Card",
  "Other Current Liabilities",
  "Long Term Liabilities", 
  "Equity"
]

export default function SettingsPage() {
  const [date, setDate] = useState("")
  const [balances, setBalances] = useState<ManualBalance[]>([
    { account: "", accountType: "", balance: "" },
  ])

  const applyAccountTypes = async (entries: ManualBalance[]) => {
    const accountNames = entries.map((e) => e.account)
    if (!accountNames.length) return entries
    try {
      const { data } = await supabase
        .from("balance_sheet_accounts")
        .select("account, account_type")
        .in("account", accountNames)

      const typeMap: Record<string, string> = {}
      data?.forEach((row: any) => {
        const type = row.account_type
        if (type) {
          typeMap[row.account] = type // Keep exact QB account type format
        }
      })

      entries.forEach((e) => {
        if (typeMap[e.account]) {
          e.accountType = typeMap[e.account]
        } else if (!e.accountType) {
          e.accountType = "Other Current Assets" // Default to a QB account type
        }
      })
    } catch (err) {
      console.error("Error fetching account types", err)
      entries.forEach((e) => {
        if (!e.accountType) e.accountType = "Other Current Assets"
      })
    }
    return entries
  }

  const handleBalanceChange = (
    index: number,
    field: keyof ManualBalance,
    value: string,
  ) => {
    const updated = [...balances]
    updated[index] = { ...updated[index], [field]: value }
    setBalances(updated)
  }

  const addBalanceRow = () =>
    setBalances([...balances, { account: "", accountType: "", balance: "" }])

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!date) {
      alert("Please select a balance date before uploading.")
      e.target.value = ""
      return
    }
    const file = e.target.files?.[0]
    if (!file) return

    const text = await file.text()
    const parsed = Papa.parse(text, {
      skipEmptyLines: true,
    })

    const entries: ManualBalance[] = []
    parsed.data.forEach((row: any) => {
      const [rawAccount, rawType, rawAmount] = row
      if (!rawAccount || !rawAmount) return

      const cleanAccount = rawAccount.toString().replace(/^"|"$/g, "").trim()
      const mapped =
        accountMappings[cleanAccount.toLowerCase()] || cleanAccount

      const cleanType = rawType?.toString().replace(/^"|"$/g, "").trim() || ""

      const amountStr = rawAmount.toString().replace(/[$,()"\s]/g, "")
      let amt = parseFloat(amountStr)
      if (rawAmount.toString().includes("(") && rawAmount.toString().includes(")"))
        amt *= -1

      if (!isNaN(amt))
        entries.push({ account: mapped, accountType: cleanType, balance: amt.toString() })
    })

    if (!entries.length) alert("No balances found in uploaded CSV.")
    await applyAccountTypes(entries)

    setBalances(
      entries.length
        ? entries
        : [{ account: "", accountType: "", balance: "" }],
    )
  }

  const handleSave = async () => {
    if (!date) {
      alert("Please select a balance date before saving.")
      return
    }
    const filtered = balances.filter((b) => b.account && b.balance)
    if (!filtered.length) {
      alert("Please enter at least one balance before saving.")
      return
    }
    await applyAccountTypes(filtered)
    const data = {
      date,
      balances: filtered.map((b) => ({
        account: b.account,
        balance: Number(b.balance),
        accountType: b.accountType,
      })),
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("beginningBalances", JSON.stringify(data))
      alert("Balances saved")
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="date">
          Balance Date
        </label>
        <input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border rounded p-2"
        />
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Beginning Balance Sheet Balances</h2>
        <div className="mb-3 text-sm text-gray-600">
          Enter beginning balances for balance sheet accounts only (Assets, Liabilities, Equity)
        </div>
        {balances.map((row, idx) => (
          <div key={idx} className="flex space-x-2 mb-2">
            <input
              className="flex-1 border rounded p-2"
              placeholder="Account Name"
              value={row.account}
              onChange={(e) =>
                handleBalanceChange(idx, "account", e.target.value)
              }
            />
            <select
              className="w-60 border rounded p-2 text-sm"
              value={row.accountType}
              onChange={(e) =>
                handleBalanceChange(idx, "accountType", e.target.value)
              }
            >
              <option value="">Select Balance Sheet Account Type</option>
              <optgroup label="Assets">
                <option value="Bank">Bank</option>
                <option value="Accounts receivable (A/R)">Accounts receivable (A/R)</option>
                <option value="Other Current Assets">Other Current Assets</option>
                <option value="Fixed Assets">Fixed Assets</option>
                <option value="Other Assets">Other Assets</option>
              </optgroup>
              <optgroup label="Liabilities">
                <option value="Accounts payable (A/P)">Accounts payable (A/P)</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Other Current Liabilities">Other Current Liabilities</option>
                <option value="Long Term Liabilities">Long Term Liabilities</option>
              </optgroup>
              <optgroup label="Equity">
                <option value="Equity">Equity</option>
              </optgroup>
            </select>
            <input
              className="w-32 border rounded p-2"
              placeholder="Balance"
              type="number"
              value={row.balance}
              onChange={(e) =>
                handleBalanceChange(idx, "balance", e.target.value)
              }
            />
          </div>
        ))}
        <button
          onClick={addBalanceRow}
          className="text-sm text-blue-600 hover:text-blue-800"
          type="button"
        >
          + Add account
        </button>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Upload Balance Sheet CSV</h2>
        <div className="mb-2 text-sm text-gray-600">
          CSV format: Account Name, Balance Sheet Account Type, Balance Amount
        </div>
        <input
          type="file"
          accept="text/csv,application/vnd.ms-excel"
          onChange={handleFileUpload}
          className="border rounded p-2"
        />
      </div>

      <button
        onClick={handleSave}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        type="button"
      >
        Save Beginning Balances
      </button>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-medium mb-2">Balance Sheet Account Types Reference</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-green-700 mb-1">Assets</h4>
            <ul className="space-y-1 text-gray-600">
              <li>• Bank</li>
              <li>• Accounts receivable (A/R)</li>
              <li>• Other Current Assets</li>
              <li>• Fixed Assets</li>
              <li>• Other Assets</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-red-700 mb-1">Liabilities</h4>
            <ul className="space-y-1 text-gray-600">
              <li>• Accounts payable (A/P)</li>
              <li>• Credit Card</li>
              <li>• Other Current Liabilities</li>
              <li>• Long Term Liabilities</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-blue-700 mb-1">Equity</h4>
            <ul className="space-y-1 text-gray-600">
              <li>• Equity</li>
            </ul>
            <div className="mt-3 text-xs text-gray-500">
              <strong>Note:</strong> Income and expense accounts are not included as they belong on the P&L statement, not the balance sheet.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
