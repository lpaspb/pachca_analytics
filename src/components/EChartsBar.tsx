import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '@/contexts/ThemeContext';

interface EChartsBarProps {
  data: { name: string; value: number; color?: string }[];
  height?: number;
  title?: string;
  type?: 'bar' | 'pie';
}

const EChartsBar: React.FC<EChartsBarProps> = ({ data, height = 300, title, type = 'bar' }) => {
  const { chartColors, theme } = useTheme();
  const isLight = theme === 'light';

  const bgColor = type === 'bar' ? (isLight ? '#fff' : chartColors.background) : (isLight ? '#fff' : chartColors.background);
  const textColor = isLight ? '#333' : chartColors.text;
  const gridColor = chartColors.grid;
  const pieColors = chartColors.pieColors;
  const barColors = chartColors.barColors;
  const barGradient = [
    { offset: 0, color: barColors[0] },
    { offset: 1, color: barColors[1] || barColors[0] }
  ];

  let option;
  if (type === 'pie') {
    option = {
      backgroundColor: bgColor,
      title: title ? { text: title, left: 'center', textStyle: { fontWeight: 'bold', fontSize: 16, color: textColor } } : undefined,
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)', backgroundColor: chartColors.tooltip.background, borderColor: chartColors.tooltip.border, textStyle: { color: chartColors.tooltip.text } },
      legend: { orient: 'vertical', left: 'left', textStyle: { color: textColor } },
      series: [
        {
          name: title || '',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 8, borderColor: bgColor, borderWidth: 2 },
          label: { show: false, position: 'center' },
          emphasis: { label: { show: true, fontSize: 18, fontWeight: 'bold', color: textColor } },
          labelLine: { show: false },
          data: data.map((item, i) => ({ value: item.value, name: item.name, itemStyle: { color: item.color || pieColors[i % pieColors.length] } })),
        }
      ]
    };
  } else {
    option = {
      backgroundColor: bgColor,
      title: title ? { text: title, left: 'center', textStyle: { fontWeight: 'bold', fontSize: 16, color: textColor } } : undefined,
      tooltip: { trigger: 'axis', backgroundColor: chartColors.tooltip.background, borderColor: chartColors.tooltip.border, textStyle: { color: textColor } },
      grid: { left: 40, right: 20, bottom: 30, top: title ? 40 : 20 },
      legend: { textStyle: { color: textColor } },
      xAxis: {
        type: 'category',
        data: data.map((item) => item.name),
        axisLabel: { fontSize: 12, color: textColor },
        axisLine: { lineStyle: { color: gridColor } },
        splitLine: { lineStyle: { color: gridColor } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { fontSize: 12, color: textColor },
        axisLine: { lineStyle: { color: gridColor } },
        splitLine: { lineStyle: { color: gridColor } },
      },
      series: [
        {
          data: data.map((item, i) => ({ value: item.value, itemStyle: { color: item.color || barColors[i % barColors.length] } })),
          type: 'bar',
          itemStyle: {
            borderRadius: [6, 6, 0, 0],
          },
          barWidth: '60%',
        }
      ]
    };
  }

  return <ReactECharts option={option} style={{ height }} />;
};

export default EChartsBar;
