import React, { useState, useEffect } from 'react';
import SearchPanel from '@/components/SearchPanel';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import { SearchFilters, AnalyticsResult, ChatData, ChatMessage } from '@/types/api';
import { pachkaApi } from '@/services/api';
import { toast } from 'sonner';
import HeaderIcons from '@/components/HeaderIcons';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertCircle } from 'lucide-react';
import { addDays, subDays } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter
} from '@/components/ui/dialog';

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [searchStarted, setSearchStarted] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsResult | null>(null);
  const [chats, setChats] = useState<ChatData[]>([]);
  const [currentFilters, setCurrentFilters] = useState<SearchFilters | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isComparisonLoading, setIsComparisonLoading] = useState(false);
  const [enableComparison, setEnableComparison] = useState(false);
  const [comparisonDateRange, setComparisonDateRange] = useState<DateRange | undefined>(undefined);
  const navigate = useNavigate();

  const handleSearch = async (filters: SearchFilters) => {
    setIsLoading(true);
    setLoadingProgress(0);
    setCurrentFilters(filters);
    setSearchStarted(true);
    setAnalytics(null);

    let loadingToastId = toast.loading("Поиск...");
    
    try {
      setComparisonDateRange(undefined);

      if (filters.messageId) {
        console.log('Analyzing single message:', filters.messageId);
        const analyticsData = await pachkaApi.getAnalyticsForSingleMessage(filters.messageId);
        setAnalytics(analyticsData);
        toast.success(`ER: ${analyticsData.engagementRate?.toFixed(2) ?? 0}%`);
        setLoadingProgress(100);
        toast.dismiss(loadingToastId);
        return;
      }
      
      if (filters.messageIds && filters.messageIds.length > 0) {
        const uniqueMessageIds = Array.from(new Set(filters.messageIds));
        console.log('Analyzing multiple messages:', uniqueMessageIds);
        let combinedAnalytics: AnalyticsResult = { engagementRate: 0, messageStats: [] };
        let sumER = 0;
        let count = 0;
        const analyticsResults = await Promise.all(
          uniqueMessageIds.map(messageId => pachkaApi.getAnalyticsForSingleMessage(messageId))
        );
        for (const messageAnalytics of analyticsResults) {
          if (typeof messageAnalytics.engagementRate === 'number') {
            sumER += messageAnalytics.engagementRate;
            count++;
          }
          if (messageAnalytics && messageAnalytics.messageStats && messageAnalytics.messageStats.length > 0) {
            combinedAnalytics.messageStats.push(...messageAnalytics.messageStats);
          }
        }
        combinedAnalytics.engagementRate = count > 0 ? sumER / count : 0;
        setAnalytics(combinedAnalytics);
        toast.success(`Средний ER: ${combinedAnalytics.engagementRate?.toFixed(2) ?? 0}%`);
        setLoadingProgress(100);
        toast.dismiss(loadingToastId);
        return;
      }

      const chatIds = Array.from(new Set(filters.chatIds || (filters.chatId ? [filters.chatId] : [])));
      if (chatIds.length > 0) {
        const chatResponses = await Promise.all(
          chatIds.map(chatId => pachkaApi.searchChats({
            ...filters,
            chatId: String(chatId)
          }))
        );
        const allChats: ChatData[] = [];
        for (const response of chatResponses) {
          if (response.success && response.data) {
            const chatsWithStringIds = response.data.map(chat => ({
              ...chat,
              id: String(chat.id)
            }));
            allChats.push(...chatsWithStringIds);
          }
        }
        setChats(allChats);
        if (allChats.length > 0) {
          toast.loading(`Найдено чатов: ${allChats.length}. Загрузка сообщений...`, { id: loadingToastId });
          setLoadingProgress(20);
          const analyticsData = await pachkaApi.getAnalytics(
            allChats, 
            filters.dateRange,
            (progress) => {
              setLoadingProgress(20 + Math.floor(progress * 0.8));
            }
          );
          setAnalytics(analyticsData);
          toast.dismiss(loadingToastId);
          toast.success(`ER: ${analyticsData.engagementRate?.toFixed(2) ?? 0}%`);
        } else {
          toast.dismiss(loadingToastId);
          toast.warning("Чаты не найдены");
          setAnalytics(null);
        }
        return;
      }

      const response = await pachkaApi.searchChats({
        ...filters,
        chatId: filters.chatId ? String(filters.chatId) : undefined
      });
      if (response.success && response.data) {
        setChats(response.data);
        toast.success(`Найдено чатов: ${response.data.length}`);
      } else {
        toast.dismiss(loadingToastId);
        toast.error(response.error || 'Ошибка при поиске');
        setChats([]);
        setAnalytics(null);
      }
    } catch (error) {
      toast.dismiss(loadingToastId);
      toast.error('Произошла ошибка при загрузке данных');
      console.error(error);
      setChats([]);
      setAnalytics(null);
    } finally {
      setLoadingProgress(100);
      setIsLoading(false);
    }
  };

  const loadComparisonData = async (currentAnalytics: AnalyticsResult) => {
    if (!currentFilters) {
      return;
    }
    
    setIsComparisonLoading(true);
    const comparisonToastId = toast.loading("Загрузка данных для сравнения...");
    
    try {
      if (!comparisonDateRange?.from && currentFilters.dateRange?.from) {
        const currentFrom = currentFilters.dateRange.from;
        const currentTo = currentFilters.dateRange.to || currentFilters.dateRange.from;
        
        const daysDiff = Math.round((currentTo.getTime() - currentFrom.getTime()) / (1000 * 60 * 60 * 24));
        
        const to = subDays(currentFrom, 1);
        const from = subDays(to, daysDiff);
        
        setComparisonDateRange({ from, to });
        
        const comparisonFilters = {
          ...currentFilters,
          dateRange: {
            from,
            to
          }
        };
        
        await fetchComparisonData(comparisonFilters, currentAnalytics, comparisonToastId);
      } else if (comparisonDateRange?.from) {
        const comparisonFilters = {
          ...currentFilters,
          dateRange: {
            from: comparisonDateRange.from,
            to: comparisonDateRange.to || comparisonDateRange.from
          }
        };
        
        await fetchComparisonData(comparisonFilters, currentAnalytics, comparisonToastId);
      } else {
        toast.dismiss(comparisonToastId);
        toast.error("Не удалось определить период для сравнения");
        setIsComparisonLoading(false);
      }
    } catch (error) {
      toast.dismiss(comparisonToastId);
      toast.error("Ошибка при загрузке данных для сравнения");
      console.error("Comparison error:", error);
      setIsComparisonLoading(false);
    }
  };
  
  const fetchComparisonData = async (
    comparisonFilters: SearchFilters, 
    currentAnalytics: AnalyticsResult, 
    toastId: string | number
  ) => {
    try {
      const chatIds = Array.from(new Set(comparisonFilters.chatIds || (comparisonFilters.chatId ? [comparisonFilters.chatId] : [])));
      
      if (chatIds.length === 0) {
        toast.dismiss(toastId);
        toast.error("Не указаны ID чатов для сравнения");
        return;
      }

      const chatResponses = await Promise.all(
        chatIds.map(chatId => pachkaApi.searchChats({
          ...comparisonFilters,
          chatId: String(chatId)
        }))
      );
      const comparisonChats: ChatData[] = [];
      for (const chatResponse of chatResponses) {
        if (chatResponse.success && chatResponse.data) {
          const chatsWithStringIds = chatResponse.data.map(chat => ({
            ...chat,
            id: String(chat.id)
          }));
          comparisonChats.push(...chatsWithStringIds);
        }
      }
      
      if (comparisonChats.length === 0) {
        toast.dismiss(toastId);
        toast.warning("Не найдены чаты для периода сравнения");
        return;
      }
      
      const comparisonAnalytics = await pachkaApi.getAnalytics(
        comparisonChats,
        comparisonFilters.dateRange,
        () => {}
      );
      
      const currentER = currentAnalytics.engagementRate || 0;
      
      const comparisonER = comparisonAnalytics.engagementRate || 0;
      
      const percentageDifferences = {
        engagementRate: calculatePercentageDifference(currentER, comparisonER)
      };
      
      const absoluteDifferences = {
        engagementRate: currentER - comparisonER
      };
      
      setAnalytics({
        ...currentAnalytics,
        engagementRate: currentER,
        comparison: {
          dateRange: comparisonFilters.dateRange,
          ...comparisonAnalytics,
          engagementRate: comparisonER,
          percentageDifferences,
          absoluteDifferences
        }
      });
      
      toast.dismiss(toastId);
      toast.success("Данные сравнения успешно загружены");
    } catch (error) {
      toast.dismiss(toastId);
      toast.error("Ошибка при загрузке данных для сравнения");
      console.error("Error fetching comparison data:", error);
    } finally {
      setIsComparisonLoading(false);
    }
  };

  const calculatePercentageDifference = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const handleCompareWithPreviousPeriod = () => {
    if (analytics) {
      loadComparisonData(analytics);
    }
  };

  const handleLogout = () => {
    pachkaApi.clearApiKey();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <div className="container max-w-6xl mx-auto p-4">
        <div className="flex items-center justify-between mb-6 animate-slide-up">
          <h1 className="text-2xl font-bold">Аналитика активности</h1>
          <div className="flex items-center gap-3">
            <HeaderIcons onLogout={handleLogout} />
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
            <SearchPanel 
              onSearch={handleSearch}
              enableComparison={enableComparison}
              onComparisonEnableChange={setEnableComparison}
              comparisonDateRange={comparisonDateRange}
              onComparisonDateChange={setComparisonDateRange}
              isLoading={isLoading}
            />
          </div>
          
          {(searchStarted && (isLoading || loadingProgress < 100)) && (
            <div className="mb-4">
              <div className="flex items-center gap-4 mb-1">
                <Progress value={loadingProgress} className="flex-1 h-3" />
                <span className="text-sm font-mono w-12 text-right">{loadingProgress}%</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {loadingProgress < 20 && 'Поиск чатов...'}
                {loadingProgress >= 20 && loadingProgress < 40 && 'Загрузка сообщений...'}
                {loadingProgress >= 40 && loadingProgress < 99 && 'Расчёт аналитики...'}
                {loadingProgress >= 99 && 'Завершение...'}
              </div>
            </div>
          )}
          
          <Collapsible open={true}>
            <CollapsibleContent className="transition-all">
              <AnalyticsDashboard 
                analytics={analytics} 
                isLoading={isLoading} 
                loadingProgress={loadingProgress}
                chats={chats}
                dateRange={currentFilters?.dateRange}
                searchStarted={searchStarted}
                isComparisonLoading={isComparisonLoading}
                onCompareWithPreviousPeriod={handleCompareWithPreviousPeriod}
                enableComparison={enableComparison}
                onComparisonEnableChange={setEnableComparison}
                comparisonDateRange={comparisonDateRange}
                onComparisonDateRangeChange={setComparisonDateRange}
                isMessageSearch={!!(currentFilters?.messageIds && currentFilters.messageIds.length > 0)}
              />
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </div>
  );
};

export default Index;
