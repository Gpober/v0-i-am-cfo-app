'use client';

import { useState } from 'react';
import ChartRenderer, { ChartSpec } from '@/components/ChartRenderer';

interface CompileResult {
  sql: string;
  params: Record<string, any>;
  explanation: string;
  chart: ChartSpec | null;
}

interface RunResult {
  rows: any[];
  nextCursor: any;
}

export default function AICFOPage() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [compile, setCompile] = useState<CompileResult | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [cursor, setCursor] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    setRows([]);
    setCursor(null);
    try {
      const res = await fetch('/api/ai/compile-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error('Failed to compile');
      const compiled: CompileResult = await res.json();
      setCompile(compiled);
      const runRes = await fetch('/api/ai/run-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: compiled.sql, params: compiled.params }),
      });
      if (!runRes.ok) throw new Error('Failed to run');
      const runData: RunResult = await runRes.json();
      setRows(runData.rows);
      setCursor(runData.nextCursor);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!compile) return;
    const res = await fetch('/api/ai/run-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: compile.sql, params: compile.params, cursor }),
    });
    if (!res.ok) return;
    const data: RunResult = await res.json();
    setRows(r => [...r, ...data.rows]);
    setCursor(data.nextCursor);
  };

  const exportCsv = () => {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(',')]
      .concat(rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(',')))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'report.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">AI CFO – Report Builder</h1>
      <div className="space-y-2">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full p-2 border rounded"
          rows={4}
          placeholder="Describe the report you want..."
        />
        <button
          onClick={generate}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate'}
        </button>
      </div>

      {error && <div className="text-red-600">{error}</div>}

      {compile && (
        <details className="bg-gray-50 p-4 rounded">
          <summary className="cursor-pointer font-medium">How this was calculated</summary>
          <pre className="overflow-x-auto text-xs mt-2 bg-black text-white p-2 rounded">{compile.sql}</pre>
          <p className="mt-2 text-sm text-gray-700">{compile.explanation}</p>
        </details>
      )}

      {compile && <ChartRenderer spec={compile.chart} data={rows} />}

      {rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                {Object.keys(rows[0]).map((h) => (
                  <th key={h} className="border px-2 py-1 text-left bg-gray-100">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx} className="border-b">
                  {Object.keys(row).map((h) => (
                    <td key={h} className="px-2 py-1">{String(row[h])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {cursor && (
            <button onClick={loadMore} className="mt-2 px-3 py-1 border rounded">
              Load more
            </button>
          )}
        </div>
      ) : (
        compile && !loading && (
          <div className="text-sm text-gray-500">No results.</div>
        )
      )}

      {compile && (
        <div className="flex gap-2">
          <button onClick={() => alert('Template saved')} className="px-3 py-1 border rounded">
            Save as Template
          </button>
          <button onClick={exportCsv} className="px-3 py-1 border rounded">
            Export CSV
          </button>
        </div>
      )}
    </div>
  );
}
