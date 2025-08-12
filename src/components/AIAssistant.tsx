'use client'

import { useState } from 'react'
import jsPDF from 'jspdf'
import { Send, FileText } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const sendMessage = async () => {
    if (!input.trim()) return
    const newMessages: Message[] = [...messages, { role: 'user' as const, content: input }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })
      const data = await res.json()
      setMessages([...newMessages, { role: 'assistant' as const, content: data.reply }])
    } catch {
      setMessages([...newMessages, { role: 'assistant' as const, content: 'Sorry, something went wrong.' }])
    } finally {
      setLoading(false)
    }
  }

  const downloadReport = () => {
    const doc = new jsPDF()
    let y = 10
    messages.forEach((m) => {
      const lines = doc.splitTextToSize(`${m.role === 'user' ? 'You' : 'AI'}: ${m.content}`, 180)
      doc.text(lines, 10, y)
      y += lines.length * 10
    })
    doc.save('ai-report.pdf')
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">AI Financial Assistant</h3>
        <div className="text-sm text-gray-600 mt-1">Ask questions to gain CFO-level insights</div>
      </div>
      <div className="flex-1 p-6 space-y-4 overflow-y-auto">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`p-3 rounded-lg max-w-[80%] whitespace-pre-wrap ${m.role === 'user' ? 'bg-blue-50 ml-auto' : 'bg-gray-100 mr-auto'}`}
          >
            {m.content}
          </div>
        ))}
        {loading && <div className="text-gray-500 text-sm">Thinking...</div>}
      </div>
      <div className="p-4 border-t border-gray-200">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            sendMessage()
          }}
          className="flex items-center space-x-2"
        >
          <input
            className="flex-1 border rounded px-3 py-2 text-sm"
            placeholder="Ask a question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="submit"
            className="p-2 bg-blue-600 text-white rounded disabled:opacity-50"
            disabled={loading}
          >
            <Send className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={downloadReport}
            className="p-2 border rounded"
          >
            <FileText className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  )
}

