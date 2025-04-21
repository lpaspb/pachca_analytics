import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '@/contexts/ThemeContext';

interface StackedAreaStatsChartProps {
  data: Array<{
    day: string;
    reads: number;
    reactions: number;
    comments: number;
  }>;
  height?: number;
}

const StackedAreaStatsChart: React.FC<StackedAreaStatsChartProps> = ({ data, height = 350 }) => {
  const { chartColors, theme } = useTheme();
  const isLight = theme === 'light';
  const bgColor = isLight ? '#ffffff' : chartColors.background;
  const gridColor = chartColors.grid;
  const axisColor = chartColors.text;

  const option = {
    backgroundColor: bgColor,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross', label: { backgroundColor: '#6a7985' } },
    },
    legend: {
      data: ['Прочтения', 'Реакции', 'Комментарии'],
      textStyle: { color: axisColor },
      top: 15,
    },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: [
      {
        type: 'category',
        boundaryGap: false,
        data: data.map(d => d.day),
        axisLabel: { color: isLight ? '#333' : axisColor },
        axisLine: { lineStyle: { color: '#555' } },
      },
    ],
    yAxis: [
      {
        type: 'value',
        axisLabel: { color: isLight ? '#333' : axisColor },
        axisLine: { lineStyle: { color: gridColor } },
        splitLine: { lineStyle: { color: gridColor } },
      },
    ],
    series: [
      {
        name: 'Прочтения',
        type: 'line',
        stack: 'Total',
        areaStyle: {},
        emphasis: { focus: 'series' },
        data: data.map(d => d.reads),
        color: '#60a5fa',
      },
      {
        name: 'Реакции',
        type: 'line',
        stack: 'Total',
        areaStyle: {},
        emphasis: { focus: 'series' },
        data: data.map(d => d.reactions),
        color: '#818cf8',
      },
      {
        name: 'Комментарии',
        type: 'line',
        stack: 'Total',
        areaStyle: {},
        emphasis: { focus: 'series' },
        data: data.map(d => d.comments),
        color: '#38bdf8',
      },
    ],
  };

  return <ReactECharts option={option} style={{ height, width: '100%' }} />;
};

export default StackedAreaStatsChart;
