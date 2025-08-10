import type { ReactNode } from "react"

interface SectionProps {
  title: string
  children: ReactNode
  className?: string
}

export function Section({ title, children, className = "" }: SectionProps) {
  return (
    <section className={`space-y-4 ${className}`}>
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      {children}
    </section>
  )
}
