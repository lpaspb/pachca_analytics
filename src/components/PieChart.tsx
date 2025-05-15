import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '@/contexts/ThemeContext';

interface PieChartProps {
  data: Array<{
    name: string;
    value: number;
    color?: string;
  }>;
  height?: number;
}

const PieChart: React.FC<PieChartProps> = ({ data, height = 350 }) => {
  const { chartColors, theme } = useTheme();
  const isLight = theme === 'light';
  const bgColor = isLight ? '#ffffff' : chartColors.background;
  const borderColor = isLight ? '#ffffff' : chartColors.background;

  const option = {
    backgroundColor: bgColor,
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      left: 10,
      top: 20,
      textStyle: { color: isLight ? '#333' : '#fff' },
      data: data.map(d => d.name),
    },
    series: [
      {
        name: '',
        type: 'pie',
        radius: '70%',
        center: ['55%', '55%'],
        itemStyle: {
          borderRadius: 8,
          borderColor: borderColor,
          borderWidth: 2,
        },
        label: {
          color: isLight ? '#333' : '#fff',
          fontSize: 14,
        },
        data: data.map(d => ({ ...d })),
      },
    ],
    color: data.map(d => d.color || undefined),
  };

  return <ReactECharts option={option} style={{ height, width: '100%' }} />;
};

export default PieChart;
