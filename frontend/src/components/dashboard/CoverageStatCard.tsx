import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  title: string;
  value: string | number;
  subtitle?: string;
}

export default function CoverageStatCard({ title, value, subtitle }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-[var(--text-secondary)]">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-mono text-[var(--text-primary)]">{value}</div>
        {subtitle && <p className="text-xs text-[var(--text-secondary)] font-medium mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}
