"use client"

import React, { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface Message {
  role: "user" | "assistant"
  content: string
}

interface GradeData {
  grade: string
  reasoning: string
  insights: string[]
}

export default function AISection() {
  const [grade, setGrade] = useState<GradeData | null>(null)
  const [loadingGrade, setLoadingGrade] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [question, setQuestion] = useState("")
  const [loadingChat, setLoadingChat] = useState(false)

  useEffect(() => {
    const fetchGrade = async () => {
      setLoadingGrade(true)
      try {
        const res = await fetch("/api/ai/grade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        })
        const data = await res.json()
        if (data.error) throw new Error(data.details || data.error)
        setGrade(data.data)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error"
        setGrade({
          grade: "N/A",
          reasoning: message,
          insights: [],
        })
      } finally {
        setLoadingGrade(false)
      }
    }
    fetchGrade()
  }, [])

  const sendQuestion = async () => {
    if (!question.trim()) return
    const newMessages = [...messages, { role: "user" as const, content: question }]
    setMessages(newMessages)
    setQuestion("")
    setLoadingChat(true)
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.details || data.error)
      setMessages([...newMessages, { role: "assistant", content: data.data.answer }])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error"
      setMessages([...newMessages, { role: "assistant", content: `Error: ${message}` }])
    } finally {
      setLoadingChat(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-t-4 border-blue-400">
        <CardHeader>
          <CardTitle>AI CFO Grade Analysis &amp; Insights</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingGrade && (
            <div className="flex items-center">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span>Analyzing financial data...</span>
            </div>
          )}
          {!loadingGrade && grade && (
            <div>
              <div className="text-4xl font-bold mb-2 text-blue-600">{grade.grade}</div>
              <p className="mb-2">{grade.reasoning}</p>
              {grade.insights.length > 0 && (
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {grade.insights.map((insight, idx) => (
                    <li key={idx}>{insight}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ask the AI CFO</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-64 overflow-y-auto space-y-2 border p-3 rounded-md bg-gray-50">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`p-2 rounded-md max-w-[80%] ${
                  m.role === "user"
                    ? "bg-blue-100 ml-auto text-right"
                    : "bg-white mr-auto"
                }`}
              >
                {m.content}
              </div>
            ))}
            {loadingChat && (
              <div className="flex items-center">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span>Thinking...</span>
              </div>
            )}
          </div>
          <div className="flex">
            <input
              className="flex-1 border p-2 rounded-l-md"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question about your finances"
            />
            <Button onClick={sendQuestion} disabled={loadingChat} className="rounded-l-none">
              Send
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
