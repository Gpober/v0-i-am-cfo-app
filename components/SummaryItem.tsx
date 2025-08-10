interface SummaryItemProps {
  label: string
  value: string
  trend?: string
  trendDirection?: "up" | "down" | "neutral"
}

export function SummaryItem({ label, value, trend, trendDirection = "neutral" }: SummaryItemProps) {
  const trendColor = {
    up: "text-green-600",
    down: "text-red-600",
    neutral: "text-gray-600",
  }[trendDirection]

  return (
    <div className="flex justify-between items-center py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="text-right">
        <span className="font-medium">{value}</span>
        {trend && <div className={`text-xs ${trendColor}`}>{trend}</div>}
      </div>
    </div>
  )
}
