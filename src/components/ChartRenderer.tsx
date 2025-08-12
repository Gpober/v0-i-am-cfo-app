'use client';

import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export interface ChartSpec {
  type: 'line' | 'bar' | 'pie';
  xKey: string;
  yKey: string;
  aggregate?: 'month';
}

function aggregateMonthly(data: any[], xKey: string, yKey: string) {
  const map = new Map<string, number>();
  for (const row of data) {
    const date = new Date(row[xKey]);
    if (isNaN(date.getTime())) continue;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    map.set(key, (map.get(key) || 0) + Number(row[yKey]));
  }
  return Array.from(map.entries()).map(([month, value]) => ({ [xKey]: month, [yKey]: value }));
}

export function ChartRenderer({ spec, data }: { spec: ChartSpec | null; data: any[] }) {
  if (!spec) return <div className="text-sm text-gray-500">No chart available.</div>;

  const chartData = spec.aggregate === 'month' ? aggregateMonthly(data, spec.xKey, spec.yKey) : data;

  switch (spec.type) {
    case 'line':
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={spec.xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey={spec.yKey} stroke="#8884d8" />
          </LineChart>
        </ResponsiveContainer>
      );
    case 'bar':
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={spec.xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey={spec.yKey} fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      );
    case 'pie':
      return (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={chartData} dataKey={spec.yKey} nameKey={spec.xKey} outerRadius={80} fill="#8884d8" label>
              {chartData.map((_, idx) => (
                <Cell key={idx} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      );
    default:
      return null;
  }
}

export default ChartRenderer;
