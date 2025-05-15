import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '@/contexts/ThemeContext';

interface RoseChartProps {
  data: Array<{
    name: string;
    value: number;
    color?: string;
  }>;
  height?: number;
}

const RoseChart: React.FC<RoseChartProps> = ({ data, height = 350 }) => {
  const { chartColors, theme } = useTheme();

  // Явно задаём светлые цвета для светлой темы, чтобы избежать темного фона
  const isLight = theme === 'light';
  const bgColor = isLight ? '#ffffff' : chartColors.background;
  const borderColor = isLight ? '#ffffff' : chartColors.background;
  const textColor = isLight ? '#333' : chartColors.text;
  const tooltipBg = isLight ? '#fff' : chartColors.tooltip.background;
  const tooltipText = isLight ? '#333' : chartColors.tooltip.text;
  const tooltipBorder = isLight ? '#ddd' : chartColors.tooltip.border;
  const pieColors = chartColors.pieColors;

  const option = {
    backgroundColor: bgColor,
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
      backgroundColor: tooltipBg,
      borderColor: tooltipBorder,
      textStyle: { color: tooltipText },
    },
    legend: {
      orient: 'vertical',
      left: 10,
      top: 20,
      textStyle: { color: isLight ? '#333' : textColor },
      data: data.map(d => d.name),
    },
    // без title: не отображаем заголовок
    series: [
      {
        name: '',
        type: 'pie',
        radius: ['30%', '80%'],
        center: ['55%', '55%'],
        roseType: 'area',
        itemStyle: {
          borderRadius: 8,
          borderColor: borderColor,
          borderWidth: 2,
        },
        label: {
          color: isLight ? '#333' : textColor,
          fontSize: 14,
        },
        data: data.map((d, i) => ({ ...d, itemStyle: { color: d.color || pieColors[i % pieColors.length] } })),
      },
    ],
    color: data.map((d, i) => d.color || pieColors[i % pieColors.length]),
  };

  return <ReactECharts option={option} style={{ height, width: '100%' }} />;
};

export default RoseChart; // no visible title in UI
