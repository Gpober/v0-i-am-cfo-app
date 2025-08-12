"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar, Legend } from "recharts"
import Papa from "papaparse"

interface Row {
  weekStart: string
  inflow: number
  outflow: number
  net: number
  endingCash: number
}

export default function CashFlowPlanner() {
  const [startCash, setStartCash] = useState(10000)
  const [horizon, setHorizon] = useState(13)
  const [scope, setScope] = useState("All")
  const [revAdj, setRevAdj] = useState(0)
  const [opAdj, setOpAdj] = useState(0)
  const [arDelay, setArDelay] = useState(0)
  const [data, setData] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        scope,
        horizon: horizon.toString(),
        histWeeks: "12",
        revAdjPct: revAdj.toString(),
        opexAdjPct: opAdj.toString(),
        arDelayDays: arDelay.toString(),
        startCash: startCash.toString(),
      })
      const res = await fetch(`/api/cashflow?${params.toString()}`)
      const json = await res.json()
      setData(json)
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchData()
  }, [])

  const exportCSV = () => {
    const csv = Papa.unparse(data)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "cashflow.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const saveScenario = async () => {
    const name = prompt("Scenario name?")
    if (!name) return
    await fetch("/api/cashflow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, params: { startCash, horizon, scope, revAdj, opAdj, arDelay } }),
    })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow Planner</CardTitle>
        </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-2">
              <Input
                type="number"
                value={startCash}
                onChange={(e) => setStartCash(Number(e.target.value))}
                placeholder="Starting Cash"
              />
            <Input type="number" value={horizon} onChange={(e) => setHorizon(Number(e.target.value))} placeholder="Horizon" />
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Scope" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="Class">Class</SelectItem>
                <SelectItem value="Property">Property</SelectItem>
              </SelectContent>
            </Select>
            <div className="w-48">
              <label className="text-xs">Revenue % {revAdj}</label>
              <Slider value={[revAdj]} onValueChange={(v) => setRevAdj(v[0])} min={-50} max={50} step={1} />
            </div>
            <div className="w-48">
              <label className="text-xs">OpEx % {opAdj}</label>
              <Slider value={[opAdj]} onValueChange={(v) => setOpAdj(v[0])} min={-50} max={50} step={1} />
            </div>
            <div className="w-48">
              <label className="text-xs">AR Delay {arDelay}d</label>
              <Slider value={[arDelay]} onValueChange={(v) => setArDelay(v[0])} min={0} max={90} step={7} />
            </div>
              <Button onClick={fetchData} disabled={loading}>{loading ? "Loading" : "Refresh"}</Button>
              <Button className="bg-white text-black border" onClick={exportCSV}>Export CSV</Button>
              <Button className="bg-white text-black border" onClick={saveScenario}>Save Scenario</Button>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="weekStart" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="endingCash" stroke="#56B6E9" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="weekStart" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="inflow" stackId="a" fill="#56B6E9" />
                <Bar dataKey="outflow" stackId="a" fill="#E74C3C" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="p-2">Week</th>
                  <th className="p-2">Inflows</th>
                  <th className="p-2">Outflows</th>
                  <th className="p-2">Net</th>
                  <th className="p-2">Ending Cash</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.weekStart} className={`border-t ${row.endingCash < 0 ? "bg-red-100" : ""}`}>
                    <td className="p-2">{row.weekStart}</td>
                    <td className="p-2">{row.inflow.toFixed(2)}</td>
                    <td className="p-2">{row.outflow.toFixed(2)}</td>
                    <td className="p-2">{row.net.toFixed(2)}</td>
                    <td className="p-2">{row.endingCash.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

