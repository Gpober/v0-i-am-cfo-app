interface SummaryItemProps {
  label: string
  value: string
  trend?: "up" | "down" | "neutral"
}

export function SummaryItem({ label, value, trend }: SummaryItemProps) {
  const getTrendColor = () => {
    switch (trend) {
      case "up":
        return "text-green-600"
      case "down":
        return "text-red-600"
      default:
        return "text-gray-900"
    }
  }

  return (
    <div className="flex justify-between items-center py-2">
      <span className="text-gray-600">{label}</span>
      <span className={`font-semibold ${getTrendColor()}`}>{value}</span>
    </div>
  )
}
