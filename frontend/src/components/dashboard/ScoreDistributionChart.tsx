import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

const TIER_COLORS: Record<string, string> = {
  STRONG: '#059669',
  ADEQUATE: '#3b82f6',
  WATCH: '#f59e0b',
  HIGH_RISK: '#dc2626',
};

interface Props {
  data: { tier: string; count: number }[];
  height?: number;
}

export default function ScoreDistributionChart({ data, height = 260 }: Props) {
  if (!data.length || data.every(d => d.count === 0)) {
    return (
      <div className="flex flex-col items-center justify-center h-[260px] text-slate-400">
        <p className="text-sm">No score data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis 
          dataKey="tier" 
          tick={{ fontFamily: 'JetBrains Mono', fontSize: 12, fill: '#64748b' }} 
          axisLine={{ stroke: '#e2e8f0' }}
          tickLine={false}
        />
        <YAxis 
          tick={{ fontFamily: 'JetBrains Mono', fontSize: 12, fill: '#64748b' }} 
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ fill: '#f8fafc' }}
          contentStyle={{ 
            borderRadius: 8, 
            border: '1px solid #e2e8f0', 
            fontSize: 12,
            fontFamily: 'Inter',
            boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.07)'
          }}
          formatter={(value: any) => [`${value} applicants`, 'Count']}
        />
        <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={60}>
          {data.map((d) => (
            <Cell key={d.tier} fill={TIER_COLORS[d.tier] || '#94a3b8'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
