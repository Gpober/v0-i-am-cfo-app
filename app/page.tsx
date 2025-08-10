import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { DollarSign, TrendingUp, TrendingDown, FileText, CreditCard, Banknote } from "lucide-react"
import Link from "next/link"

export default function Dashboard() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
          <Button>Download Report</Button>
        </div>
      </div>
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$45,231.89</div>
                <p className="text-xs text-muted-foreground">+20.1% from last month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Expenses</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$12,234.56</div>
                <p className="text-xs text-muted-foreground">-4.3% from last month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$32,997.33</div>
                <p className="text-xs text-muted-foreground">+12.5% from last month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cash Flow</CardTitle>
                <Banknote className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$89,432.10</div>
                <p className="text-xs text-muted-foreground">+8.2% from last month</p>
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Access key financial areas</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <Link href="/financials">
                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    <FileText className="mr-2 h-4 w-4" />
                    Financial Statements
                  </Button>
                </Link>
                <Link href="/accounts-payable">
                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Accounts Payable
                  </Button>
                </Link>
                <Link href="/accounts-receivable">
                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    <DollarSign className="mr-2 h-4 w-4" />
                    Accounts Receivable
                  </Button>
                </Link>
                <Link href="/cash-flow">
                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Cash Flow
                  </Button>
                </Link>
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest financial transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className="ml-4 space-y-1">
                      <p className="text-sm font-medium leading-none">Payment received from Client A</p>
                      <p className="text-sm text-muted-foreground">$5,000.00</p>
                    </div>
                    <div className="ml-auto font-medium">+$5,000.00</div>
                  </div>
                  <div className="flex items-center">
                    <div className="ml-4 space-y-1">
                      <p className="text-sm font-medium leading-none">Office supplies expense</p>
                      <p className="text-sm text-muted-foreground">$234.56</p>
                    </div>
                    <div className="ml-auto font-medium">-$234.56</div>
                  </div>
                  <div className="flex items-center">
                    <div className="ml-4 space-y-1">
                      <p className="text-sm font-medium leading-none">Utility payment</p>
                      <p className="text-sm text-muted-foreground">$456.78</p>
                    </div>
                    <div className="ml-auto font-medium">-$456.78</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
