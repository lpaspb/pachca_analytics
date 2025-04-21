import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';

interface ThemeAwareBarChartProps {
  data: Array<any>;
  dataKey: string;
  xAxisDataKey: string;
  height?: number;
  layout?: 'horizontal' | 'vertical';
  barRadius?: [number, number, number, number];
  name?: string;
}

export const ThemeAwareBarChart: React.FC<ThemeAwareBarChartProps> = ({
  data,
  dataKey,
  xAxisDataKey,
  height = 300,
  layout = 'horizontal',
  barRadius = [4, 4, 0, 0],
  name = 'Значение'
}) => {
  const { chartColors } = useTheme();
  
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart 
          data={data} 
          layout={layout} 
          margin={{ top: 20, right: 30, left: layout === 'vertical' ? 40 : 20, bottom: layout === 'vertical' ? 40 : 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
          
          {layout === 'horizontal' ? (
            <>
              <XAxis 
                dataKey={xAxisDataKey} 
                stroke={chartColors.text} 
                tick={{ fill: chartColors.text }}
              />
              <YAxis
                stroke={chartColors.text} 
                tick={{ fill: chartColors.text }}
              />
            </>
          ) : (
            <>
              <XAxis 
                type="number" 
                stroke={chartColors.text} 
                tick={{ fill: chartColors.text }}
              />
              <YAxis
                dataKey={xAxisDataKey}
                type="category"
                stroke={chartColors.text} 
                tick={{ fill: chartColors.text, fontSize: 12 }}
                width={100}
              />
            </>
          )}
          
          <Tooltip 
            contentStyle={{ 
              backgroundColor: chartColors.tooltip.background,
              border: `1px solid ${chartColors.tooltip.border}`,
              borderRadius: '4px',
              color: chartColors.tooltip.text
            }}
            cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
          />
          
          <Legend />
          
          <Bar 
            dataKey={dataKey} 
            name={name}
            fill={chartColors.primary} 
            radius={layout === 'horizontal' ? barRadius : [0, 4, 4, 0]} 
            animationDuration={1000}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color || (chartColors.barColors[index % chartColors.barColors.length])}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

interface ThemeAwarePieChartProps {
  data: Array<any>;
  dataKey: string;
  nameKey: string;
  height?: number;
  outerRadius?: number;
  label?: boolean | Function;
}

export const ThemeAwarePieChart: React.FC<ThemeAwarePieChartProps> = ({
  data,
  dataKey,
  nameKey,
  height = 300,
  outerRadius = 80,
  label = ({name, percent}: any) => `${name}: ${(percent * 100).toFixed(0)}%`
}) => {
  const { chartColors } = useTheme();
  
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={outerRadius}
            fill="#8884d8"
            dataKey={dataKey}
            nameKey={nameKey}
            label={label}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color || chartColors.pieColors[index % chartColors.pieColors.length]} 
              />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: any) => {
              if (typeof value === 'number') {
                return [`${value.toFixed(2)}%`];
              }
              return [`${value}%`];
            }}
            contentStyle={{ 
              backgroundColor: chartColors.tooltip.background,
              border: `1px solid ${chartColors.tooltip.border}`,
              borderRadius: '4px',
              color: chartColors.tooltip.text
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
