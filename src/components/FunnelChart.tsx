import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '@/contexts/ThemeContext';

interface FunnelChartProps {
  data: Array<{
    name: string;
    value: number;
    color?: string;
  }>;
  height?: number;
}

const FunnelChart: React.FC<FunnelChartProps> = ({ data, height = 380 }) => {
  const { chartColors, theme } = useTheme();
  const isLight = theme === 'light';
  const bgColor = isLight ? '#ffffff' : chartColors.background;
  const borderColor = isLight ? '#ffffff' : chartColors.background;

  const option = {
    backgroundColor: bgColor,
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}',
    },
    legend: {
      left: 'right',
      top: 'center',
      orient: 'vertical',
      textStyle: { color: '#fff', fontSize: 16 },
      itemWidth: 20,
      itemHeight: 16,
      data: data.map(d => d.name),
    },
    series: [
      {
        name: '',
        type: 'funnel',
        left: '10%',
        top: 10,
        bottom: 10,
        width: '60%',
        min: 0,
        max: Math.max(...data.map(d => d.value), 1),
        minSize: '20%',
        maxSize: '100%',
        sort: 'descending',
        gap: 6,
        label: {
          show: true,
          position: 'inside',
          color: '#fff',
          fontSize: 16,
          fontWeight: 400,
          formatter: '{c}',
        },
        labelLine: {
          length: 16,
          lineStyle: {
            width: 1,
            type: 'solid',
            color: '#fff',
          },
        },
        itemStyle: {
          borderColor: borderColor,
          borderWidth: 1,
        },
        emphasis: {
          label: {
            fontSize: 18,
            color: '#fff',
            fontWeight: 500,
          },
        },
        data: data.map(d => ({ ...d })),
        color: data.map(d => d.color || undefined),
      },
    ],
  };

  return <ReactECharts option={option} style={{ height, width: '100%', maxWidth: 520, margin: '0 auto', display: 'block' }} />;
};

export default FunnelChart;
