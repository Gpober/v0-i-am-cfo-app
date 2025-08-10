interface SectionProps {
  title: string;
  children: React.ReactNode;
}

export function Section({ title, children }: SectionProps) {
  return (
    <div className="space-y-2">
      <h2 className="text-lg font-medium text-gray-800">{title}</h2>
      {children}
    </div>
  );
}
