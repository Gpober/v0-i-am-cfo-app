"use client"

import { useState } from "react"
import Papa from "papaparse"

interface ManualBalance {
  account: string
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
    { account: "", balance: "" },
  ])

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
    setBalances([...balances, { account: "", balance: "" }])

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
      const [rawAccount, rawAmount] = row
      if (!rawAccount || !rawAmount) return

      const cleanAccount = rawAccount.toString().replace(/^"|"$/g, "").trim()
      const mapped =
        accountMappings[cleanAccount.toLowerCase()] || cleanAccount

      const amountStr = rawAmount.toString().replace(/[$,()"\s]/g, "")
      let amt = parseFloat(amountStr)
      if (rawAmount.toString().includes("(") && rawAmount.toString().includes(")"))
        amt *= -1

      if (!isNaN(amt)) entries.push({ account: mapped, balance: amt.toString() })
    })

    if (!entries.length) alert("No balances found in uploaded CSV.")
    setBalances(entries.length ? entries : [{ account: "", balance: "" }])
  }

  const handleSave = () => {
    if (!date) {
      alert("Please select a balance date before saving.")
      return
    }
    const filtered = balances
      .filter((b) => b.account && b.balance)
      .map((b) => ({ account: b.account, balance: Number(b.balance) }))
    if (!filtered.length) {
      alert("Please enter at least one balance before saving.")
      return
    }
    const data = {
      date,
      balances: filtered,
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
              onChange={(e) => handleBalanceChange(idx, "account", e.target.value)}
            />
            <input
              className="w-40 border rounded p-2"
              placeholder="Balance"
              type="number"
              value={row.balance}
              onChange={(e) => handleBalanceChange(idx, "balance", e.target.value)}
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
