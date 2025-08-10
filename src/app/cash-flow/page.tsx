"use client"

import { useState } from "react"
import { format } from "date-fns"

const CashFlowPage = () => {
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [selectedMonth, setSelectedMonth] = useState(new Date())

  // Dummy data for demonstration purposes
  const accounts = [
    {
      account: "Account 1",
      amount: 1200,
      transactions: [
        {
          memo: "Transaction 1",
          bank_account: "Bank A",
          account_type: "Income",
          report_category: "Sales",
          amount: 500,
        },
        {
          memo: "Transaction 2",
          bank_account: "Bank B",
          account_type: "Expense",
          report_category: "Marketing",
          amount: -300,
        },
      ],
    },
    {
      account: "Account 2",
      amount: -800,
      transactions: [
        {
          memo: "Transaction 3",
          bank_account: "Bank C",
          account_type: "Income",
          report_category: "Services",
          amount: 200,
        },
        {
          memo: "Transaction 4",
          bank_account: "Bank D",
          account_type: "Expense",
          report_category: "Operations",
          amount: -1000,
        },
      ],
    },
  ]

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Cash Flow</h1>

      <div className="grid grid-cols-1 gap-4">
        {accounts.map((account, index) => (
          <div key={index} className="bg-white rounded-lg p-6 shadow-md">
            <h2 className="text-xl font-semibold mb-2">{account.account}</h2>
            <p className="text-gray-600 mb-4">${account.amount.toLocaleString()}</p>

            <button onClick={() => setSelectedAccount(account)} className="bg-blue-500 text-white px-4 py-2 rounded">
              View Transactions
            </button>
          </div>
        ))}
      </div>

      {/* Transaction Details Modal */}
      {selectedAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-center flex-1">
                  {selectedAccount.account} - {format(new Date(selectedMonth), "MMMM yyyy")} Operating Cash Flows
                </h3>
                <button onClick={() => setSelectedAccount(null)} className="text-gray-500 hover:text-gray-700 ml-4">
                  ✕
                </button>
              </div>

              <div className="text-sm text-gray-600 text-center mb-4">
                {selectedAccount.transactions?.length || 0} cash flow transactions
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-1 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-sm text-gray-600">Cash Flow Impact</div>
                  <div
                    className={`text-2xl font-bold ${selectedAccount.amount >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    ${Math.abs(selectedAccount.amount).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-auto max-h-[60vh]">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Memo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bank Account
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Account Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Report Category
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Impact
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedAccount.transactions?.map((transaction: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{transaction.memo || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{transaction.bank_account || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            transaction.account_type === "Income"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {transaction.account_type || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{transaction.report_category || "-"}</td>
                      <td className="px-4 py-3 text-sm text-right">
                        <span className={`font-medium ${transaction.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {transaction.amount >= 0 ? "+" : ""}${Math.abs(transaction.amount).toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CashFlowPage
