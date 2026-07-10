import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { tierColor } from '@/lib/tierColors';

interface Props {
  data: { tier: string; count: number }[];
  height?: number;
}

export default function ScoreDistributionChart({ data, height = 260 }: Props) {
  if (!data.length || data.every(d => d.count === 0)) {
    return (
      <div className="flex flex-col items-center justify-center h-[260px] text-[var(--text-secondary)] font-medium">
        <p className="text-sm">No score data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.5} />
        <XAxis 
          dataKey="tier" 
          tick={{ fontFamily: 'JetBrains Mono', fontSize: 12, fill: 'var(--text-secondary)' }} 
          axisLine={{ stroke: 'var(--border)' }}
          tickLine={false}
        />
        <YAxis 
          tick={{ fontFamily: 'JetBrains Mono', fontSize: 12, fill: 'var(--text-secondary)' }} 
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ fill: 'var(--surface)', opacity: 0.3 }}
          contentStyle={{ 
            borderRadius: 8, 
            border: '1px solid var(--border)', 
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-primary)',
            fontSize: 12,
            fontFamily: 'Inter',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)'
          }}
          formatter={(value: any) => [`${value} applicants`, 'Count']}
        />
        <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={60}>
          {data.map((d) => (
            <Cell key={d.tier} fill={tierColor(d.tier)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
