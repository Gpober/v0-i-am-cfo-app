interface SummaryItemProps {
  label: string;
  value: string;
}

export function SummaryItem({ label, value }: SummaryItemProps) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
