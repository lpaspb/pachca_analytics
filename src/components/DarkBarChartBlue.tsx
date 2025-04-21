import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '@/contexts/ThemeContext';

interface DarkBarChartBlueProps {
  data: { name: string; value: number }[];
  height?: number;
  title?: string;
}

const DarkBarChartBlue: React.FC<DarkBarChartBlueProps> = ({ data, height = 300, title = 'Топ реакций' }) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const bgColor = isLight ? '#fff' : '#232324';
  const textColor = isLight ? '#333' : '#fff';
  const axisLineColor = isLight ? '#ccc' : '#555';
  const splitLineColor = isLight ? '#eee' : '#333';

  const option = {
    backgroundColor: bgColor,
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: data.map(d => d.name),
      axisLabel: { color: textColor },
      axisLine: { lineStyle: { color: axisLineColor } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: textColor },
      axisLine: { lineStyle: { color: axisLineColor } },
      splitLine: { lineStyle: { color: splitLineColor } },
    },
    series: [
      {
        name: 'Реакции',
        type: 'bar',
        data: data.map(d => d.value),
        itemStyle: { color: '#4f8cff' },
        label: { show: true, color: '#4f8cff', position: 'top' },
        barWidth: '40%',
      }
    ],
  };

  return <ReactECharts option={option} style={{ height, width: '100%' }} />;
};

export default DarkBarChartBlue;

