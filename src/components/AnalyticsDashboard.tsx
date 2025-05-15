import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AnalyticsResult, ChatData, ChatMessage } from '@/types/api';
import { getMessageReadsCount, getMessageReactionsCount, getThreadMessagesCount, calculateMessageER } from '@/utils/analyticsUtils';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Progress } from '@/components/ui/progress';
import { useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import EmployeesReactionChart from './EmployeesReactionChart';
import EChartsBar from './EChartsBar';
import DarkBarChartBlue from './DarkBarChartBlue';
import StackedAreaStatsChart from './StackedAreaStatsChart';
import RoseChart from './RoseChart';
import PieChart from './PieChart';
import FunnelChart from './FunnelChart';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DateRange } from 'react-day-picker';
import { Badge } from '@/components/ui/badge';
import { exportToExcel } from '@/utils/excelExport';
import { toast } from '@/hooks/use-toast';
import { 
  Minus, 
  ArrowUp, 
  ArrowDown, 
  Loader, 
  Calendar, 
  ArrowUpDown, 
  Download, 
  MessageSquare, 
  Eye, 
  ThumbsUp, 
  MessageCircle, 
  Gauge, 
  Percent, 
  BarChart3, 
  PieChart as PieChartIcon, 
  Trophy 
} from 'lucide-react';
import { ThemeAwareBarChart, ThemeAwarePieChart } from './ThemeAwareChart';
import { Line, Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  TimeScale,
  Tooltip as ChartTooltip,
  Legend,
  Filler
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import type { ChartData, ChartDataset } from 'chart.js';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from '@/components/ui/pagination';

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, TimeScale, ChartTooltip, Legend, Filler);

/**
 * Пропсы для AnalyticsDashboard
 */
interface AnalyticsDashboardProps {
  analytics: AnalyticsResult | null;
  isLoading: boolean;
  loadingProgress?: number;
  chats?: ChatData[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  searchStarted?: boolean;
  isComparisonLoading?: boolean;
  onCompareWithPreviousPeriod?: () => void;
  enableComparison?: boolean;
  onComparisonEnableChange?: (enabled: boolean) => void;
  comparisonDateRange?: DateRange;
  onComparisonDateRangeChange?: (range: DateRange | undefined) => void;
}

interface AnalyticsDashboardPropsExt extends AnalyticsDashboardProps {
  /** Флаг поиска по сообщениям */
  isMessageSearch?: boolean;
}

export default function AnalyticsDashboard({ 
  analytics, 
  isLoading, 
  loadingProgress = 0,
  chats = [], 
  dateRange,
  searchStarted = false,
  isComparisonLoading = false,
  onCompareWithPreviousPeriod,
  enableComparison = false,
  onComparisonEnableChange = () => {},
  comparisonDateRange,
  onComparisonDateRangeChange = () => {},
  isMessageSearch = false
}: AnalyticsDashboardPropsExt) {
  const { chartColors } = useTheme();

  const formatEngagementRate = (rate: number | undefined): string => {
    if (rate === undefined) return '0.00';
    return rate.toFixed(2);
  };
  
  const engagementRate = analytics ? analytics.engagementRate ?? 0 : 0;

  // --- ДАННЫЕ ДЛЯ ГРАФИКА ---
  let erChartData: ChartData<'scatter' | 'line'> | null = null;
  if (isMessageSearch && analytics?.messageStats && analytics.messageStats.length > 0) {
    erChartData = {
      datasets: [
        {
          type: 'scatter' as const,
          label: 'ER сообщений',
          data: analytics.messageStats.map(msg => ({
            x: new Date(msg.date).getTime(),
            y: msg.er,
            id: msg.id,
            text: msg.text,
          })),
          backgroundColor: '#f59e42',
          borderColor: '#f59e42',
          pointRadius: 4,
          pointHoverRadius: 7,
          showLine: false,
          order: 2,
        }
      ]
    };
  } else if ((analytics?.daysStats && analytics.daysStats.length > 0) ||
             (analytics?.messageStats && analytics.messageStats.length > 0)) {
    erChartData = {
      datasets: [
        ...(analytics.daysStats && analytics.daysStats.length > 0
          ? [
              {
                type: 'line' as const,
                label: 'ER (%)',
                data: analytics.daysStats.map(d => ({
                  x: new Date(d.date).getTime(),
                  y: d.er
                })),
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37,99,235,0.1)',
                fill: true,
                tension: 0.3,
                pointRadius: 0,
                pointHoverRadius: 0,
                order: 1,
              },
            ]
          : []),
        ...(analytics.messageStats && analytics.messageStats.length > 0
          ? [
              {
                type: 'scatter' as const,
                label: 'ER сообщений',
                data: analytics.messageStats.map(msg => ({
                  x: new Date(msg.date).getTime(),
                  y: msg.er,
                  id: msg.id,
                  text: msg.text,
                })),
                backgroundColor: '#f59e42',
                borderColor: '#f59e42',
                pointRadius: 4,
                pointHoverRadius: 7,
                showLine: false,
                order: 2,
              },
            ]
          : []),
      ],
    };
  }

  // --- СТЕЙТЫ ДЛЯ ПАГИНАЦИИ И СОРТИРОВКИ ---
  const [page, setPage] = React.useState(1);
  const pageSize = 10;
  const [sort, setSort] = React.useState<{column: string, direction: 'asc' | 'desc'}>({column: 'id', direction: 'desc'});

  // --- СОРТИРОВКА ---
  const sortedStats = React.useMemo(() => {
    if (!analytics?.messageStats) return [];
    const arr = [...analytics.messageStats];
    arr.sort((a, b) => {
      const col = sort.column as keyof typeof a;
      let av = a[col];
      let bv = b[col];
      if (typeof av === 'string' && typeof bv === 'string') {
        av = av.toLowerCase();
        bv = bv.toLowerCase();
      }
      if (av === undefined || av === null) return 1;
      if (bv === undefined || bv === null) return -1;
      if (av < bv) return sort.direction === 'asc' ? -1 : 1;
      if (av > bv) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [analytics?.messageStats, sort]);

  const totalPages = Math.ceil(sortedStats.length / pageSize);
  const pagedStats = sortedStats.slice((page - 1) * pageSize, page * pageSize);

  // --- ВЫГРУЗКА В EXCEL ---
  const handleExportExcel = () => {
    const messages = sortedStats.map(msg => ({
      id: msg.id.toString(),
      content: msg.text,
      created_at: msg.date,
      reads_count: msg.readers,
      reactions_count: msg.reactions,
      thread: { id: 0, messages_count: msg.threadComments, chat_id: 0 },
      chat_id: '',
      readBy: [],
      reactions: [],
      user_id: undefined,
      createdAt: msg.date,
    }));
    try {
      exportToExcel(messages, {} as any);
    } catch (e) {
      console.error('Ошибка при экспорте в Excel');
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {( !isLoading && loadingProgress >= 100 ) && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">Коэффициент вовлеченности (ER):</span>
            <span className="text-4xl font-bold">{formatEngagementRate(engagementRate)}</span>
            <span className="text-xl font-semibold text-muted-foreground">%</span>
          </div>
        </div>
      )}
      {erChartData && (
        <div className="mt-4">
          <h3 className="text-base font-semibold mb-2">
            {isMessageSearch ? 'ER по сообщениям' : 'ER по дням'}
          </h3>
          <Scatter data={erChartData as any} options={{
            responsive: true,
            plugins: { 
              legend: { display: true },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    const d: any = context.raw;
                    if (context.dataset.type === 'scatter' && d) {
                      return `ID: ${d.id} | ER: ${d.y}% | ${d.text?.slice(0, 40)}`;
                    }
                    return `ER: ${d.y ?? context.parsed.y}%`;
                  }
                }
              }
            },
            scales: {
              y: { beginAtZero: true, max: 100, title: { display: true, text: 'ER (%)' } },
              x: { title: { display: true, text: 'Дата' }, type: 'time', time: { unit: 'day', tooltipFormat: 'yyyy-MM-dd HH:mm' } }
            }
          }} />
        </div>
      )}
      {analytics?.topUsers && analytics.topUsers.length > 0 && (
        <div className="mt-6">
          <h3 className="text-base font-semibold mb-2">Топ-10 самых активных пользователей</h3>
          <div className="overflow-x-auto rounded-lg shadow-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">Пользователь</TableHead>
                  <TableHead className="text-center">Сообщений</TableHead>
                  <TableHead className="text-center">В тредах</TableHead>
                  <TableHead className="text-center">Реакций</TableHead>
                  <TableHead className="text-center">Баллы</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.topUsers.map((user, idx) => (
                  <TableRow key={user.user_id} className="hover:bg-primary/5 transition">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover border" />
                        ) : (
                          <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold uppercase">
                            {user.name && user.name.trim() !== ''
                              ? user.name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .slice(0, 2)
                              : user.user_id?.toString() || '—'}
                          </span>
                        )}
                        <span className="font-medium">
                          {user.name && user.name.trim() !== ''
                            ? user.name
                            : user.user_id?.toString() || '—'}
                        </span>
                        </div>
                      </TableCell>
                    <TableCell className="text-center">{user.messages}</TableCell>
                    <TableCell className="text-center">{user.threadMessages}</TableCell>
                    <TableCell className="text-center">{user.reactions}</TableCell>
                    <TableCell className="text-center font-bold text-primary">{user.score.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
                        </div>
      )}

      {/* Таблица по каждому сообщению за период */}
      {analytics?.messageStats && analytics.messageStats.length > 0 && (
        <div className="mt-8">
          <h3 className="text-base font-semibold mb-2 flex items-center gap-4">
            ER по каждому сообщению за период
            <Button size="sm" variant="outline" onClick={handleExportExcel} className="ml-auto flex gap-2">
              <Download className="w-4 h-4" />
              Excel
            </Button>
          </h3>
          <div className="overflow-x-auto rounded-lg shadow-md">
            <Table>
              <TableHeader>
                <TableRow>
                  {['id','text','date','readers','reactions','threadComments','er'].map(col => (
                    <TableHead
                      key={col}
                      className="text-center cursor-pointer select-none group"
                      onClick={() => setSort(s => ({
                        column: col,
                        direction: s.column === col ? (s.direction === 'asc' ? 'desc' : 'asc') : 'desc',
                      }))}
                    >
                      {col === 'id' && 'ID'}
                      {col === 'text' && 'Сообщение'}
                      {col === 'date' && 'Дата'}
                      {col === 'readers' && 'Просмотры'}
                      {col === 'reactions' && 'Реакции'}
                      {col === 'threadComments' && 'Комментарии'}
                      {col === 'er' && 'ER (%)'}
                      <span className="inline-block align-middle ml-1">
                        {sort.column === col ? (
                          sort.direction === 'asc' ? <ArrowUp className="inline w-3 h-3" /> : <ArrowDown className="inline w-3 h-3" />
                          ) : (
                          <ArrowUpDown className="inline w-3 h-3 opacity-30 group-hover:opacity-60" />
                        )}
                      </span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedStats.map(msg => (
                  <TableRow key={msg.id} className="hover:bg-primary/5 transition">
                    <TableCell className="text-center">{msg.id}</TableCell>
                    <TableCell title={msg.text} className="max-w-[300px] truncate">{msg.text?.slice(0, 60) || msg.id}</TableCell>
                    <TableCell className="text-center">{msg.date?.slice(0, 16)}</TableCell>
                    <TableCell className="text-center">{msg.readers}</TableCell>
                    <TableCell className="text-center">{msg.reactions}</TableCell>
                    <TableCell className="text-center">{msg.threadComments}</TableCell>
                    <TableCell className="text-center font-bold text-primary">{msg.er}</TableCell>
                    </TableRow>
                ))}
                {pagedStats.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">Нет данных</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {/* Пагинация только стрелки */}
            {totalPages > 1 && (
              <Pagination className="mt-2">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
