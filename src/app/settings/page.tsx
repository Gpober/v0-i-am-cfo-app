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
        if (type)
          typeMap[row.account] =
            type.charAt(0).toUpperCase() + type.slice(1)
      })

      entries.forEach((e) => {
        if (typeMap[e.account]) {
          e.accountType = typeMap[e.account]
        } else if (!e.accountType) {
          e.accountType = "Asset"
        }
      })
    } catch (err) {
      console.error("Error fetching account types", err)
      entries.forEach((e) => {
        if (!e.accountType) e.accountType = "Asset"
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

    const total = entries.reduce((sum, e) => sum + Number(e.balance || 0), 0)
    if (Math.abs(total) > 0.001) {
      alert(`Imported balances do not balance. Total: ${total}`)
    }

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
    const total = filtered.reduce((sum, e) => sum + Number(e.balance || 0), 0)
    if (Math.abs(total) > 0.001) {
      alert(`Balances do not balance. Total: ${total}`)
      return
    }
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
        <h2 className="text-xl font-semibold mb-2">Beginning Balances</h2>
        {balances.map((row, idx) => (
          <div key={idx} className="flex space-x-2 mb-2">
            <input
              className="flex-1 border rounded p-2"
              placeholder="Account"
              value={row.account}
              onChange={(e) =>
                handleBalanceChange(idx, "account", e.target.value)
              }
            />
            <select
              className="w-40 border rounded p-2"
              value={row.accountType}
              onChange={(e) =>
                handleBalanceChange(idx, "accountType", e.target.value)
              }
            >
              <option value="">Type</option>
              <option value="Asset">Asset</option>
              <option value="Liability">Liability</option>
              <option value="Equity">Equity</option>
              <option value="Revenue">Revenue</option>
              <option value="Expense">Expense</option>
              <option value="Bank">Bank</option>
            </select>
            <input
              className="w-40 border rounded p-2"
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
          className="text-sm text-blue-600"
          type="button"
        >
          + Add account
        </button>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Upload Balance Sheet CSV</h2>
        <input
          type="file"
          accept="text/csv,application/vnd.ms-excel"
          onChange={handleFileUpload}
        />
      </div>

      <button
        onClick={handleSave}
        className="px-4 py-2 bg-blue-600 text-white rounded"
        type="button"
      >
        Save Balances
      </button>
    </div>
  )
}
