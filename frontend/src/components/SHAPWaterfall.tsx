import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';

interface SHAPWaterfallProps {
  factors: { feature: string; shap_value: number }[];
}

export default function SHAPWaterfall({ factors }: SHAPWaterfallProps) {
  const data = factors.map((f) => ({
    name: f.feature.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    value: f.shap_value,
    color: f.shap_value > 0 ? '#10B981' : '#F43F5E',
  }));

  const maxAbs = Math.max(...data.map((d) => Math.abs(d.value)), 0.01);

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 160, right: 30, top: 10, bottom: 10 }}>
          <XAxis
            type="number"
            domain={[-maxAbs * 1.2, maxAbs * 1.2]}
            tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'JetBrains Mono' }}
            axisLine={{ stroke: '#334155' }}
            tickLine={{ stroke: '#334155' }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={150}
            tick={{ fill: '#cbd5e1', fontSize: 11 }}
            axisLine={{ stroke: '#334155' }}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.02)' }}
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              fontSize: 12,
              color: '#f8fafc',
            }}
          />
          <ReferenceLine x={0} stroke="#475569" strokeDasharray="3 3" />
          <Bar dataKey="value" radius={[4, 4, 4, 4]} animationDuration={800} animationBegin={200}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
