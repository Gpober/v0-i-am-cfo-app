import { ArrowUpIcon, ArrowDownIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string;
  change: string;
  positive: boolean;
}

export function KPICard({ title, value, change, positive }: KPICardProps) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
      <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-xl font-bold">{value}</span>
        <span className={`text-xs flex items-center ${positive ? 'text-green-500' : 'text-red-500'}`}>
          {positive ? <ArrowUpIcon className="h-3 w-3 mr-0.5" /> : <ArrowDownIcon className="h-3 w-3 mr-0.5" />}
          {change}
        </span>
      </div>
    </div>
  );
}
