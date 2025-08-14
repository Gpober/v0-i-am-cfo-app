"use client"

import { useState } from "react"

interface ManualBalance {
  account: string
  balance: string
}

// Map common account labels from PDFs to standardized account names
const accountMappings: Record<string, string> = {
  cash: "Cash",
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
    const file = e.target.files?.[0]
    if (!file) return

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: pdfjs-dist legacy build lacks type definitions
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf")
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

    const buffer = await file.arrayBuffer()
    const pdf = await pdfjs.getDocument({ data: buffer }).promise
    let text = ""
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      text +=
        content.items
          .map((item: { str: string }) => item.str)
          .join(" ") + "\n"
    }
    const lines = text.split(/\r?\n/)
    const entries: ManualBalance[] = []
    lines.forEach((line) => {
      const match = line.match(/(.+?)\s+(-?\$?[0-9,.,\-]+)/)
      if (match) {
        const rawAccount = match[1].trim()
        const mapped =
          accountMappings[rawAccount.toLowerCase()] || rawAccount
        const amt = parseFloat(match[2].replace(/[^0-9.-]/g, ""))
        if (!isNaN(amt))
          entries.push({ account: mapped, balance: amt.toString() })
      }
    })
    setBalances(entries.length ? entries : [{ account: "", balance: "" }])
  }

  const handleSave = () => {
    const data = {
      date,
      balances: balances
        .filter((b) => b.account && b.balance)
        .map((b) => ({ account: b.account, balance: Number(b.balance) })),
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
        <h2 className="text-xl font-semibold mb-2">Upload Balance Sheet PDF</h2>
        <input type="file" accept="application/pdf" onChange={handleFileUpload} />
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
