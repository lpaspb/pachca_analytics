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

  // --- commentsCount calculation for topUsers ---
  const topUsersWithCommentsCount = React.useMemo(() => {
    if (!analytics?.topUsers || !analytics?.topMessages) return analytics?.topUsers || [];
    // Считаем количество комментариев для каждого пользователя
    const userComments: Record<number, number> = {};
    analytics.topMessages.forEach(msg => {
      if (msg.user_id && msg.thread) {
        userComments[msg.user_id] = (userComments[msg.user_id] || 0) + 1;
      }
    });
    return analytics.topUsers.map(user => ({
      ...user,
      commentsCount: userComments[user.id] || 0,
    }));
  }, [analytics?.topUsers, analytics?.topMessages]);
  

  const renderChangeIndicator = (
    percentage: number | undefined, 
    absolute: number | undefined, 
    positiveIsGood = true
  ) => {
    if (percentage === undefined || absolute === undefined) return null;
    
    const isPositive = percentage > 0;
    const isNeutral = percentage === 0;
    
    let colorClass = "text-muted-foreground";
    let icon = <Minus className="h-3 w-3" />;
    
    if (!isNeutral) {
      if ((isPositive && positiveIsGood) || (!isPositive && !positiveIsGood)) {
        colorClass = "text-green-500";
        icon = <ArrowUp className="h-3 w-3" />;
      } else {
        colorClass = "text-red-500";
        icon = <ArrowDown className="h-3 w-3" />;
      }
    }
    
    return (
      <div className={`flex items-center gap-1 text-xs ${colorClass}`}>
        {icon}
        <span>{Math.abs(absolute).toFixed(2)} ({percentage > 0 ? "+" : ""}{percentage.toFixed(2)}%)</span>
      </div>
    );
  };
  
  // Формируем данные для StackedAreaStatsChart (по дням)
  const stackedAreaData = React.useMemo(() => {
    if (!analytics?.daysStats || !Array.isArray(analytics.daysStats)) return [];
    return analytics.daysStats.map(day => ({
      day: day.label || day.date || '',
      reads: day.totalReads || 0,
      reactions: day.totalReactions || 0,
      comments: day.totalThreadMessages || 0,
    }));
  }, [analytics?.daysStats]);

  const pieData = useMemo(() => {
    if (!analytics || analytics.totalMessages === 0) return [];
    
    const messagesWithReactions = analytics.messagesWithReactions || 0;
    const totalMessages = analytics.totalMessages || 1;
    
    const withReactions = Math.min((messagesWithReactions / totalMessages) * 100, 100);
    const withoutReactions = Math.max(100 - withReactions, 0);
    
    return [
      { 
        name: 'С реакцией', 
        value: withReactions, 
        color: chartColors.primary 
      },
      { 
        name: 'Без реакции', 
        value: withoutReactions, 
        color: '#d1d5db' 
      },
    ];
  }, [analytics, chartColors]);

  const pieChartLabel = (props: any) => {
    return null;
  };

  const topReactionsData = useMemo(() => {
    if (!analytics?.topReactions || analytics.topReactions.length === 0) {
      return [];
    }
    
    const top5Reactions = analytics.topReactions.slice(0, 5);
    
    return top5Reactions.map((reaction, index) => ({
      name: reaction.emoji,
      value: reaction.count,
      label: `${reaction.emoji} (${reaction.count})`,
      color: chartColors.barColors[index % chartColors.barColors.length]
    }));
  }, [analytics?.topReactions, chartColors]);

  const formatEngagementRate = (rate: number | undefined): string => {
    if (rate === undefined) return '0.00';
    
    return rate.toFixed(2);
  };
  
  const calculateEngagementRate = (data: AnalyticsResult | null): number => {
    if (!data || !data.totalReads) return 0;
    
    const numerator = (data.totalThreadMessages || 0) + (data.totalReactions || 0);
    const denominator = data.totalReads;
    
    return (numerator / denominator) * 100;
  };
  
  const engagementRate = analytics ? calculateEngagementRate(analytics) : 0; // Только обычный ER, без уникальных пользователей
  // const comparisonEngagementRate = analytics?.comparison?.engagementRate;

  // Сортировка и пагинация для таблицы сообщений
  const [currentPage, setCurrentPage] = useState(1);
  const messagesPerPage = 10;
  const [sortBy, setSortBy] = useState<'reads' | 'reactions' | 'comments' | 'er' | 'date'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const allMessages = useMemo(() => {
    if (!analytics?.topMessages) return [];
    const arr = [...analytics.topMessages];
    arr.sort((a, b) => {
      let aValue, bValue;
      switch (sortBy) {
        case 'reads':
          aValue = getMessageReadsCount(a); bValue = getMessageReadsCount(b); break;
        case 'reactions':
          aValue = getMessageReactionsCount(a); bValue = getMessageReactionsCount(b); break;
        case 'comments':
          aValue = getThreadMessagesCount(a); bValue = getThreadMessagesCount(b); break;
        case 'er':
          aValue = calculateMessageER(a); bValue = calculateMessageER(b); break;
        case 'date':
        default:
          aValue = new Date(a.created_at || a.createdAt || 0).getTime();
          bValue = new Date(b.created_at || b.createdAt || 0).getTime();
      }
      if (aValue === undefined) aValue = 0;
      if (bValue === undefined) bValue = 0;
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [analytics?.topMessages, sortBy, sortDirection]);

  const totalPages = Math.ceil(allMessages.length / messagesPerPage);
  const paginatedMessages = allMessages.slice((currentPage - 1) * messagesPerPage, currentPage * messagesPerPage);

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection(field === 'date' ? 'desc' : 'asc');
    }
    setCurrentPage(1);
  };

  if (searchStarted && isLoading) {
    return (
      <div className="flex flex-col gap-4 animate-fade-in">
        <Card className="bg-secondary/30">
          <CardContent className="pt-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Loader className="h-4 w-4 animate-spin" />
                <span className="text-sm font-medium">Загрузка аналитики</span>
              </div>
              <Progress value={loadingProgress} className="h-2 transition-all" />
              <p className="text-xs text-muted-foreground">
                {loadingProgress < 100 
                  ? `Обработано ${loadingProgress}% сообщений...` 
                  : "Подготовка результатов..."}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="stat-card animate-pulse animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg opacity-30">Загрузка...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col">
                  <div className="h-6 w-16 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <Card className="p-4 bg-card h-[300px] animate-pulse animate-fade-in animate-delay-300 flex items-center justify-center">
          <p className="text-muted-foreground">Загрузка данных...</p>
        </Card>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center p-8 animate-fade-in">
        <p className="text-muted-foreground text-center">
          {searchStarted ? "Нет данных для отображения" : "Выполните поиск, чтобы увидеть аналитику"}
        </p>
      </div>
    );
  }

  const handleExportToExcel = () => {
    if (!analytics?.topMessages || analytics.topMessages.length === 0) {
      toast({
        title: "Ошибка экспорта",
        description: "Нет данных для экспорта",
        variant: "destructive"
      });
      return;
    }
    try {
      console.log('Analytics object for export:', JSON.stringify(analytics));
      console.log('Exporting messages:', JSON.stringify(analytics.topMessages));
      
      if (analytics.topMessages.some(msg => msg.reads_count === undefined && msg.readBy === undefined)) {
        console.warn('Some messages are missing read counts. This might result in incomplete data in the export.');
      }
      
      const fileName = exportToExcel(analytics.topMessages, analytics);
      toast({
        title: "Экспорт завершен",
        description: `Файл Excel "${fileName}" успешно создан`
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        title: "Ошибка экспорта",
        description: "Ошибка при создании Excel файла", 
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {dateRange && (
        <Card className="bg-secondary/30 animate-slide-up">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4" />
                <span>
                  Период анализа: {dateRange.from && format(dateRange.from, 'dd.MM.yyyy', { locale: ru })} - 
                  {dateRange.to && format(dateRange.to, 'dd.MM.yyyy', { locale: ru })}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {!isMessageSearch && !analytics?.comparison && onCompareWithPreviousPeriod && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 gap-1"
                          onClick={onCompareWithPreviousPeriod}
                          disabled={isComparisonLoading}
                        >
                          <ArrowUpDown className="h-4 w-4" />
                          <span className="hidden sm:inline">Сравнить с прошлым периодом</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Сравнить с предыдущим периодом той же длительности</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                
                {analytics && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 gap-1"
                          onClick={handleExportToExcel}
                        >
                          <Download className="h-4 w-4" />
                          <span className="hidden sm:inline">Экспорт в Excel</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Скачать данные в формате Excel</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
            
            {chats && chats.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium mb-1">Анализируемые беседы ({chats.length}):</p>
                <ul className="text-sm text-muted-foreground">
                  {chats.slice(0, 3).map((chat) => (
                    <li key={chat.id} className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-primary flex items-center justify-center text-[10px] text-white">
                        {chat.isChannel ? 'К' : 'Б'}
                      </span>
                      <span>{chat.name || `Беседа #${chat.id}`}</span>
                    </li>
                  ))}
                  {chats.length > 3 && (
                    <li className="text-xs opacity-70 mt-1">+ еще {chats.length - 3}</li>
                  )}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { 
            title: 'Сообщения', 
            value: analytics?.totalMessages, 
            subtitle: 'проанализировано', 
            icon: <MessageSquare className="h-4 w-4" />,
            comparison: analytics?.comparison ? {
              percentage: analytics.comparison.percentageDifferences.totalMessages,
              absolute: analytics.comparison.absoluteDifferences.totalMessages
            } : undefined
          },
          { 
            title: 'Прочтения', 
            value: analytics?.totalReads, 
            subtitle: 'всех сообщений', 
            icon: <Eye className="h-4 w-4" />,
            comparison: analytics?.comparison ? {
              percentage: analytics.comparison.percentageDifferences.totalReads,
              absolute: analytics.comparison.absoluteDifferences.totalReads
            } : undefined
          },
          { 
            title: 'Реакции', 
            value: analytics?.totalReactions, 
            subtitle: 'на сообщения', 
            icon: <ThumbsUp className="h-4 w-4" />,
            comparison: analytics?.comparison ? {
              percentage: analytics.comparison.percentageDifferences.totalReactions,
              absolute: analytics.comparison.absoluteDifferences.totalReactions
            } : undefined
          },
          { 
            title: 'Комментарии', 
            value: analytics?.totalThreadMessages || 0, 
            subtitle: 'в тредах', 
            icon: <MessageCircle className="h-4 w-4" />,
            comparison: analytics?.comparison ? {
              percentage: analytics.comparison.percentageDifferences.totalThreadMessages,
              absolute: analytics.comparison.absoluteDifferences.totalThreadMessages
            } : undefined
          }
        ].map((stat, i) => (
          <Card 
            key={i} 
            className="stat-card animate-scale-in hover:shadow-md transition-all"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                {stat.icon}
                {stat.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col">
                <span className="text-3xl font-bold">{stat.value}</span>
                <span className="text-muted-foreground text-sm">
                  {stat.subtitle}
                </span>
                {analytics?.comparison && stat.comparison && (
                  <div className="mt-2">
                    {renderChangeIndicator(
                      stat.comparison.percentage,
                      stat.comparison.absolute
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="p-4 bg-card animate-slide-up animate-delay-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Статистика по сообщениям
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead onClick={() => handleSort('date')} style={{cursor:'pointer'}}>
                    <div className="flex items-center gap-1">
                      Дата
                      {sortBy === 'date' && (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                    </div>
                  </TableHead>
                  <TableHead>Сообщение</TableHead>
                  <TableHead className="text-right" onClick={() => handleSort('reads')} style={{cursor:'pointer'}}>
                    <div className="flex items-center justify-end gap-1">
                      <Eye className="h-4 w-4" />
                      Прочтения
                      {sortBy === 'reads' && (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                    </div>
                  </TableHead>
                  <TableHead className="text-right" onClick={() => handleSort('reactions')} style={{cursor:'pointer'}}>
                    <div className="flex items-center justify-end gap-1">
                      <ThumbsUp className="h-4 w-4" />
                      Реакции
                      {sortBy === 'reactions' && (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                    </div>
                  </TableHead>
                  <TableHead className="text-right" onClick={() => handleSort('comments')} style={{cursor:'pointer'}}>
                    <div className="flex items-center justify-end gap-1">
                      <MessageCircle className="h-4 w-4" />
                      Комментарии
                      {sortBy === 'comments' && (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                    </div>
                  </TableHead>
                  <TableHead className="text-right" onClick={() => handleSort('er')} style={{cursor:'pointer'}}>
                    <div className="flex items-center justify-end gap-1">
                      <Gauge className="h-4 w-4" />
                      ER (%)
                      {sortBy === 'er' && (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                    </div>
                  </TableHead>
                  
                </TableRow>
              </TableHeader>
              <TableBody>
                {console.log('allMessages for table:', allMessages)}
                {paginatedMessages.map((message) => {
                  const readsCount = getMessageReadsCount(message);
                  // Исправлено: используем message.reactions_count, если есть, иначе getMessageReactionsCount
                  const reactionsCount = (typeof message.reactions_count === 'number') ? message.reactions_count : getMessageReactionsCount(message);
                  const commentsCount = getThreadMessagesCount(message);
                  const er = calculateMessageER(message);

                  return (
                    <TableRow key={message.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium whitespace-nowrap">
                        {message.created_at && format(new Date(message.created_at), 'dd.MM.yyyy HH:mm')}
                        {message.createdAt && !message.created_at && format(new Date(message.createdAt), 'dd.MM.yyyy HH:mm')}
                        {!message.created_at && !message.createdAt && '-'}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {message.content || "Нет текста"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        <div className="flex items-center justify-end">
                          {isLoading ? (
                            <Loader className="h-4 w-4 animate-spin opacity-50" />
                          ) : (
                            <span>{readsCount}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end">
                          {isLoading ? (
                            <Loader className="h-4 w-4 animate-spin opacity-50" />
                          ) : (
                            <span>{reactionsCount}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end">
                          {isLoading ? (
                            <Loader className="h-4 w-4 animate-spin opacity-50" />
                          ) : (
                            <span>{commentsCount}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        <div className="flex items-center justify-end">
                          {isLoading ? (
                            <Loader className="h-4 w-4 animate-spin opacity-50" />
                          ) : (
                            <span>{er.toFixed(2)}</span>
                          )}
                        </div>
                      </TableCell>
                      
                    </TableRow>
                  );
                })}
                {(!allMessages || allMessages.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Нет данных для отображения
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {/* Пагинация */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-4">
                <Button 
                  variant="outline"
                  size="sm"
                  className="mx-2"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Назад
                </Button>
                <span className="px-2 py-1 text-sm text-muted-foreground">
                  Страница {currentPage} из {totalPages}
                </span>
                <Button 
                  variant="outline"
                  size="sm"
                  className="mx-2"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Вперед
                </Button>
              </div>
            )}
          </div>
          
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 animate-scale-in animate-delay-400">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            Коэффициент вовлеченности (ER)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            {/* Обычный ER */}
            <div className="flex items-center gap-2">
              <span className="text-4xl font-bold">{formatEngagementRate(engagementRate)}</span>
              <span className="text-xl font-semibold text-muted-foreground"><Percent className="h-4 w-4 inline" /></span>
              {analytics?.comparison && analytics.comparison.absoluteDifferences.engagementRate !== undefined && (
                <div className={`flex items-center gap-1 text-xs ${
                  analytics.comparison.absoluteDifferences.engagementRate > 0 
                    ? "text-green-500" 
                    : analytics.comparison.absoluteDifferences.engagementRate < 0 
                      ? "text-red-500" 
                      : "text-muted-foreground"
                }`}>
                  {analytics.comparison.absoluteDifferences.engagementRate > 0 ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : analytics.comparison.absoluteDifferences.engagementRate < 0 ? (
                    <ArrowDown className="h-3 w-3" />
                  ) : (
                    <Minus className="h-3 w-3" />
                  )}
                  <span>
                    {Math.abs(analytics.comparison.absoluteDifferences.engagementRate).toFixed(2)} 
                    ({analytics.comparison.percentageDifferences.engagementRate > 0 ? "+" : ""}
                    {analytics.comparison.percentageDifferences.engagementRate.toFixed(2)}%)
                  </span>
                </div>
              )}
            </div>
            <span className="text-muted-foreground text-sm mt-1">
              (комментарии + реакции) / прочтения
            </span>
            <div className="text-xs text-muted-foreground mt-1 mb-4">
              <span>Формула: ({analytics?.totalThreadMessages || 0} + {analytics?.totalReactions || 0}) / {analytics?.totalReads || 0} × 100%</span>
            </div>
            {/* Разделитель */}
            <div className="muted-foreground/10 my-1" />
            
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 bg-card animate-slide-up animate-delay-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChartIcon className="h-4 w-4" />
              Общая статистика
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <FunnelChart
                data={[
                  { name: 'Прочтения', value: analytics?.totalReads || 0, color: '#60a5fa' },
                  { name: 'Реакции', value: analytics?.totalReactions || 0, color: '#818cf8' },
                  { name: 'Комментарии', value: analytics?.totalThreadMessages || 0, color: '#38bdf8' },
                ]}
                height={300}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="p-4 bg-card animate-slide-up animate-delay-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChartIcon className="h-4 w-4" />
              Соотношение реакций (%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <EChartsBar
                type="pie"
                data={pieData}
                height={300}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 bg-card animate-slide-up animate-delay-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <ThumbsUp className="h-4 w-4" />
              Самые частые реакции
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topReactionsData.length > 0 ? (
              <div className="h-[300px]">
                <DarkBarChartBlue data={topReactionsData} />
              </div>
            ) : (
              <div className="flex items-center justify-center h-[300px]">
                <p className="text-muted-foreground">Нет данных о реакциях</p>
              </div>
            )}
          </CardContent>
        </Card>
        {!isMessageSearch && (
          <EmployeesReactionChart 
            users={topUsersWithCommentsCount} 
            isLoading={isLoading} 
          />
        )}
      </div>

    </div>
  );
}
