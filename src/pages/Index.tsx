import React, { useState, useEffect } from 'react';
import SearchPanel from '@/components/SearchPanel';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import { SearchFilters, AnalyticsResult, ChatData, ChatMessage } from '@/types/api';
import { pachkaApi } from '@/services/api';
import { toast } from 'sonner';
import SettingsMenu from '@/components/SettingsMenu';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { KeyRound, AlertCircle } from 'lucide-react';
import { addDays, subDays } from 'date-fns';
import { DateRange } from 'react-day-picker';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter
} from '@/components/ui/dialog';

const Index = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [searchStarted, setSearchStarted] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsResult | null>(null);
  const [chats, setChats] = useState<ChatData[]>([]);
  const [currentFilters, setCurrentFilters] = useState<SearchFilters | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [apiToken, setApiToken] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [isValidatingToken, setIsValidatingToken] = useState(false);
  const [skipAuth, setSkipAuth] = useState(true);
  const [connectionIssue, setConnectionIssue] = useState(false);
  const [isComparisonLoading, setIsComparisonLoading] = useState(false);
  const [enableComparison, setEnableComparison] = useState(false);
  const [comparisonDateRange, setComparisonDateRange] = useState<DateRange | undefined>(undefined);
  const [apiValidationAttempted, setApiValidationAttempted] = useState(false);

  useEffect(() => {
    if (apiValidationAttempted) {
      setIsCheckingAuth(false);
      return;
    }

    const apiKey = pachkaApi.getApiKey();
    if (apiKey) {
      setIsCheckingAuth(true);
      pachkaApi.validateApiKey(apiKey)
        .then((result) => {
          if (result.success) {
            setIsAuthenticated(true);
            if (!apiValidationAttempted) {
              toast.success('Авторизация успешна');
            }
            setConnectionIssue(false);
          } else {
            console.error('Auth validation failed:', result.error);
            pachkaApi.clearApiKey();
            
            if (!apiValidationAttempted) {
              toast.error(result.error || 'Ошибка авторизации');
            }
            
            if (result.error && (
                result.error.includes('Ошибка соединения с сервером') || 
                result.error.includes('VPN') || 
                result.error.includes('Получен неверный формат')
              )) {
              setConnectionIssue(true);
            }
          }
        })
        .catch(error => {
          console.error('Auth validation error:', error);
          
          if (!apiValidationAttempted) {
            toast.error('Не удалось подключиться к API Pachka. Пожалуйста, проверьте подключение к интернету.');
          }
          
          setConnectionIssue(true);
          pachkaApi.clearApiKey();
        })
        .finally(() => {
          setIsCheckingAuth(false);
          setApiValidationAttempted(true);
        });
    } else {
      setIsCheckingAuth(false);
      setApiValidationAttempted(true);
    }
  }, []);

  const handleTokenSubmit = async () => {
    if (!apiToken.trim()) {
      toast.error('Введите токен API');
      return;
    }

    setIsValidatingToken(true);
    setTokenError('');
    setConnectionIssue(false);

    try {
      const result = await pachkaApi.setApiKey(apiToken);
      if (result.success) {
        toast.success('Авторизация успешна');
        setIsAuthenticated(true);
      } else {
        setTokenError(result.error || 'Неверный токен API');
        toast.error(result.error || 'Ошибка авторизации');
        
        if (result.error && (
            result.error.includes('Ошибка соединения с сервером') || 
            result.error.includes('VPN') || 
            result.error.includes('Получен неверный формат')
          )) {
          setConnectionIssue(true);
        }
      }
    } catch (error) {
      console.error('Token validation error:', error);
      setTokenError('Ошибка при проверке токена');
      setConnectionIssue(true);
      toast.error('Не удалось проверить токен');
    } finally {
      setIsValidatingToken(false);
    }
  };

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
        
        if (!analyticsData.topMessages || analyticsData.topMessages.length === 0) {
          const messageData: ChatMessage = {
            id: filters.messageId,
            content: "Сообщение",
            createdAt: new Date().toISOString(),
            readBy: [],
            reactions: {},
            reads_count: analyticsData.totalReads,
            reactions_count: analyticsData.totalReactions,
            thread: {
              id: 0,
              chat_id: 0,
              messages_count: analyticsData.totalThreadMessages || 0
            }
          };
          
          analyticsData.topMessages = [messageData];
          console.log('Created synthetic message data for statistics table:', analyticsData.topMessages);
        }
        
        setAnalytics(analyticsData);
        
        if (analyticsData.totalReads > 0 || analyticsData.totalReactions > 0) {
          toast.success(
            `Анализ сообщения: ${analyticsData.totalReads} прочтений, ` +
            `${analyticsData.totalReactions} реакций, ` +
            `${analyticsData.totalThreadMessages || 0} комментариев в треде`
          );
        } else {
          toast.warning("Сообщение не найдено или нет данных для анализа");
        }
        
        setLoadingProgress(100);
        toast.dismiss(loadingToastId);
        return;
      }
      
      if (filters.messageIds && filters.messageIds.length > 0) {
        console.log('Analyzing multiple messages:', filters.messageIds);
        
        let combinedAnalytics: AnalyticsResult = {
          totalMessages: filters.messageIds.length,
          totalReads: 0,
          totalReactions: 0,
          messagesWithReactions: 0,
          totalThreadMessages: 0,
          topReactions: [],
          topMessages: []
        };
        
        const reactionMap: Record<string, number> = {};
        
        let processedCount = 0;
        
        for (const messageId of filters.messageIds) {
          const messageAnalytics = await pachkaApi.getAnalyticsForSingleMessage(messageId);
          
          combinedAnalytics.totalReads += messageAnalytics.totalReads;
          combinedAnalytics.totalReactions += messageAnalytics.totalReactions;
          combinedAnalytics.totalThreadMessages += messageAnalytics.totalThreadMessages || 0;
          
          if (messageAnalytics.totalReactions > 0) {
            combinedAnalytics.messagesWithReactions++;
          }
          
          const messageData: ChatMessage = {
            id: messageId,
            content: messageAnalytics.topMessages?.[0]?.content || "Сообщение",
            createdAt: messageAnalytics.topMessages?.[0]?.createdAt || new Date().toISOString(),
            readBy: [],
            reactions: {},
            reads_count: messageAnalytics.totalReads,
            reactions_count: messageAnalytics.totalReactions,
            reaction_types: messageAnalytics.topReactions?.map(r => r.emoji),
            thread: {
              id: 0,
              chat_id: 0,
              messages_count: messageAnalytics.totalThreadMessages || 0
            }
          };
          
          combinedAnalytics.topMessages.push(messageData);
          
          messageAnalytics.topReactions.forEach(reaction => {
            reactionMap[reaction.emoji] = (reactionMap[reaction.emoji] || 0) + reaction.count;
          });
          
          processedCount++;
          setLoadingProgress(5 + Math.floor((processedCount / filters.messageIds.length) * 95));
        }
        
        combinedAnalytics.topReactions = Object.entries(reactionMap)
          .map(([emoji, count]) => ({ emoji, count }))
          .sort((a, b) => b.count - a.count);
        
        if (combinedAnalytics.totalReads > 0) {
          combinedAnalytics.engagementRate = ((combinedAnalytics.totalThreadMessages + combinedAnalytics.totalReactions) / 
                                          combinedAnalytics.totalReads) * 100;
        } else {
          combinedAnalytics.engagementRate = 0;
        }
        
        setAnalytics(combinedAnalytics);
        
        toast.success(
          `Анализ ${filters.messageIds.length} сообщений: ${combinedAnalytics.totalReads} прочтений, ` +
          `${combinedAnalytics.totalReactions} реакций, ` +
          `${combinedAnalytics.messagesWithReactions} сообщений с реакциями, ` +
          `${combinedAnalytics.totalThreadMessages} комментариев в тредах`
        );
        
        setLoadingProgress(100);
        toast.dismiss(loadingToastId);
        return;
      }

      const chatIds = filters.chatIds || (filters.chatId ? [filters.chatId] : []);
      if (chatIds.length > 0) {
        const allChats: ChatData[] = [];
        
        for (const chatId of chatIds) {
          const response = await pachkaApi.searchChats({
            ...filters,
            chatId: chatId.toString()
          });
          
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
              
              if (progress >= 20 && progress < 40) {
                toast.loading(`Загрузка сообщений из ${allChats.length} чатов...`, { id: loadingToastId });
              } else if (progress >= 40 && progress < 60) {
                toast.loading(`Обработка сообщений чатов...`, { id: loadingToastId });
              } else if (progress >= 60 && progress < 80) {
                toast.loading(`Анализ прочтений...`, { id: loadingToastId });
              } else if (progress >= 80) {
                toast.loading(`Подсчет реакций и комментариев...`, { id: loadingToastId });
              }
            }
          );
          
          setAnalytics(analyticsData);
          toast.dismiss(loadingToastId);
          
          if (analyticsData.totalMessages > 0) {
            const messagesWithReactionsPercent = analyticsData.messagesWithReactions 
              ? Math.round((analyticsData.messagesWithReactions / analyticsData.totalMessages) * 100) 
              : 0;
              
            toast.success(
              `Загружена аналитика: ${analyticsData.totalMessages} сообщений, ${analyticsData.totalReads} прочтений, ` + 
              `${analyticsData.totalReactions} реакций (${messagesWithReactionsPercent}% сообщений с реакциями), ` +
              `${analyticsData.totalThreadMessages || 0} комментариев в тредах`
            );
            
            if (enableComparison) {
              loadComparisonData(analyticsData);
            }
          } else {
            toast.warning("Сообщений за указанный период не найдено");
            setAnalytics(null);
          }
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
        const foundChats = response.data;
        setChats(foundChats);
        
        toast.loading(`Найдено чатов: ${foundChats.length}. Загрузка сообщений...`, { id: loadingToastId });
        
        setLoadingProgress(20);
        
        if (foundChats.length > 0) {
          toast.loading(`Анализ данных для ${foundChats.length} чатов...`, { id: loadingToastId });
          
          const analyticsData = await pachkaApi.getAnalytics(
            foundChats, 
            filters.dateRange,
            (progress) => {
              setLoadingProgress(20 + Math.floor(progress * 0.8));
              
              if (progress >= 20 && progress < 40) {
                toast.loading(`Загрузка сообщений из ${foundChats.length} чатов...`, { id: loadingToastId });
              } else if (progress >= 40 && progress < 60) {
                toast.loading(`Обработка сообщений чатов...`, { id: loadingToastId });
              } else if (progress >= 60 && progress < 80) {
                toast.loading(`Анализ прочтений...`, { id: loadingToastId });
              } else if (progress >= 80) {
                toast.loading(`Подсчет реакций и комментариев...`, { id: loadingToastId });
              }
            }
          );
          
          setAnalytics(analyticsData);
          toast.dismiss(loadingToastId);
          
          if (analyticsData.totalMessages > 0) {
            const messagesWithReactionsPercent = analyticsData.messagesWithReactions 
              ? Math.round((analyticsData.messagesWithReactions / analyticsData.totalMessages) * 100) 
              : 0;
              
            toast.success(
              `Загружена аналитика: ${analyticsData.totalMessages} сообщений, ${analyticsData.totalReads} прочтений, ` + 
              `${analyticsData.totalReactions} реакций (${messagesWithReactionsPercent}% сообщений с реакциями), ` +
              `${analyticsData.totalThreadMessages || 0} комментариев в тредах`
            );
            
            if (enableComparison) {
              loadComparisonData(analyticsData);
            }
          } else {
            toast.warning("Сообщений за указанный период не найдено");
            setAnalytics(null);
          }
        } else {
          toast.dismiss(loadingToastId);
          toast.warning("Чаты не найдены");
          setAnalytics(null);
        }
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
    toastId: string
  ) => {
    try {
      const chatIds = comparisonFilters.chatIds || (comparisonFilters.chatId ? [comparisonFilters.chatId] : []);
      
      if (chatIds.length === 0) {
        toast.dismiss(toastId);
        toast.error("Не указаны ID чатов для сравнения");
        return;
      }

      const comparisonChats: ChatData[] = [];
      
      for (const chatId of chatIds) {
        const chatResponse = await pachkaApi.searchChats({
          ...comparisonFilters,
          chatId: String(chatId)
        });
        
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
      
      const currentER = currentAnalytics.totalReads > 0 ? 
        ((currentAnalytics.totalThreadMessages || 0) + currentAnalytics.totalReactions) / 
        currentAnalytics.totalReads * 100 : 0;
      
      const comparisonER = comparisonAnalytics.totalReads > 0 ? 
        ((comparisonAnalytics.totalThreadMessages || 0) + comparisonAnalytics.totalReactions) / 
        comparisonAnalytics.totalReads * 100 : 0;
      
      const percentageDifferences = {
        totalMessages: calculatePercentageDifference(currentAnalytics.totalMessages, comparisonAnalytics.totalMessages),
        totalReads: calculatePercentageDifference(currentAnalytics.totalReads, comparisonAnalytics.totalReads),
        totalReactions: calculatePercentageDifference(currentAnalytics.totalReactions, comparisonAnalytics.totalReactions),
        messagesWithReactions: calculatePercentageDifference(currentAnalytics.messagesWithReactions, comparisonAnalytics.messagesWithReactions),
        totalThreadMessages: calculatePercentageDifference(
          currentAnalytics.totalThreadMessages || 0, 
          comparisonAnalytics.totalThreadMessages || 0
        ),
        engagementRate: calculatePercentageDifference(currentER, comparisonER)
      };
      
      const absoluteDifferences = {
        totalMessages: currentAnalytics.totalMessages - comparisonAnalytics.totalMessages,
        totalReads: currentAnalytics.totalReads - comparisonAnalytics.totalReads,
        totalReactions: currentAnalytics.totalReactions - comparisonAnalytics.totalReactions,
        messagesWithReactions: currentAnalytics.messagesWithReactions - comparisonAnalytics.messagesWithReactions,
        totalThreadMessages: (currentAnalytics.totalThreadMessages || 0) - (comparisonAnalytics.totalThreadMessages || 0),
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
    setIsAuthenticated(false);
    setAnalytics(null);
    setChats([]);
    setSearchStarted(false);
    setSkipAuth(true);
  };

  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center h-screen animate-fade-in">
        <div className="w-8 h-8 border-t-2 border-b-2 border-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      {(!isAuthenticated && !isCheckingAuth) && (
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogContent hideCloseButton>
            <DialogHeader>
              <div className="flex flex-col items-center gap-2">
                <KeyRound className="w-8 h-8 text-primary mb-1" />
                <h2 className="text-lg font-semibold">Введите API токен Пачки</h2>
                <p className="text-sm text-muted-foreground text-center">
                  Для доступа к аналитике требуется ваш персональный API токен. Получить его можно в настройках Пачки.
                </p>
              </div>
            </DialogHeader>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setIsValidatingToken(true);
                setTokenError('');
                const result = await pachkaApi.validateApiKey(apiToken.trim());
                setIsValidatingToken(false);
                if (result.success) {
                  setIsAuthenticated(true);
                  pachkaApi.setApiKey(apiToken.trim());
                  toast.success('Авторизация успешна');
                } else {
                  setTokenError(result.error || 'Некорректный токен');
                }
              }}
              className="space-y-4 mt-2"
            >
              <Input
                autoFocus
                placeholder="API токен"
                value={apiToken}
                onChange={e => setApiToken(e.target.value)}
                className="w-full"
                disabled={isValidatingToken}
              />
              {tokenError && (
                <div className="text-sm text-destructive text-center flex items-center gap-1 justify-center">
                  <AlertCircle className="w-4 h-4" />
                  {tokenError}
                </div>
              )}
              <DialogFooter>
                <Button
                  type="submit"
                  className="w-full bg-gradient-primary"
                  disabled={!apiToken.trim() || isValidatingToken}
                  loading={isValidatingToken}
                >
                  Войти
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
      
      <div className="container max-w-6xl mx-auto p-4">
        <div className="flex items-center justify-between mb-6 animate-slide-up">
          <h1 className="text-2xl font-bold">Аналитика чатов</h1>
          <div className="flex items-center gap-3">
            <SettingsMenu onLogout={handleLogout} />
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
            />
          </div>
          
          <Collapsible open={true}>
            <CollapsibleContent className="transition-all">
              <AnalyticsDashboard 
                analytics={analytics} 
                isLoading={isLoading} 
                loadingProgress={loadingProgress}
                chats={chats}
                dateRange={currentFilters?.dateRange}
                searchStarted={searchStarted || skipAuth || isAuthenticated}
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
