import { RequireIAMCFOLogin } from "@/components/RequireIAMCFOLogin"
import { KPICard } from "@/components/KPICard"
import { Section } from "@/components/Section"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function HomePage() {
  return (
    <RequireIAMCFOLogin>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome to your financial overview</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard title="Total Revenue" value="$125,430" change="+12.5%" trend="up" />
          <KPICard title="Total Expenses" value="$89,240" change="-3.2%" trend="down" />
          <KPICard title="Net Profit" value="$36,190" change="+8.7%" trend="up" />
          <KPICard title="Cash Flow" value="$42,580" change="+15.3%" trend="up" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Section title="Recent Transactions">
            <Card>
              <CardHeader>
                <CardTitle>Latest Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Office Supplies</p>
                      <p className="text-sm text-gray-500">Dec 15, 2023</p>
                    </div>
                    <span className="text-red-600">-$245.00</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Client Payment</p>
                      <p className="text-sm text-gray-500">Dec 14, 2023</p>
                    </div>
                    <span className="text-green-600">+$2,500.00</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Software License</p>
                      <p className="text-sm text-gray-500">Dec 13, 2023</p>
                    </div>
                    <span className="text-red-600">-$99.00</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Section>

          <Section title="Quick Actions">
            <Card>
              <CardHeader>
                <CardTitle>Financial Tools</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <button className="p-4 border rounded-lg hover:bg-gray-50 text-left">
                    <h3 className="font-medium">Add Transaction</h3>
                    <p className="text-sm text-gray-500">Record new income or expense</p>
                  </button>
                  <button className="p-4 border rounded-lg hover:bg-gray-50 text-left">
                    <h3 className="font-medium">Generate Report</h3>
                    <p className="text-sm text-gray-500">Create financial reports</p>
                  </button>
                  <button className="p-4 border rounded-lg hover:bg-gray-50 text-left">
                    <h3 className="font-medium">View Analytics</h3>
                    <p className="text-sm text-gray-500">Analyze spending patterns</p>
                  </button>
                  <button className="p-4 border rounded-lg hover:bg-gray-50 text-left">
                    <h3 className="font-medium">Export Data</h3>
                    <p className="text-sm text-gray-500">Download financial data</p>
                  </button>
                </div>
              </CardContent>
            </Card>
          </Section>
        </div>
      </div>
    </RequireIAMCFOLogin>
  )
}
