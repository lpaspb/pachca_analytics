import { useState, useMemo, useRef, useEffect } from 'react';
import { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { DateRangePicker } from '@/components/DateRangePicker';
import { SearchFilters } from '@/types/api';
import { addDays } from 'date-fns';
import { Search, Filter, BarChart, MessageSquare, Globe, Users, Lock, MessagesSquare } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { extractMessageId, handleDateRangeChange } from '@/utils/searchUtils';

/**
 * Пропсы для SearchPanel
 */
interface SearchPanelProps {
  onSearch: (filters: SearchFilters) => void;
  additionalControls?: React.ReactNode;
  enableComparison?: boolean;
  onComparisonEnableChange?: (enabled: boolean) => void;
  comparisonDateRange?: DateRange;
  onComparisonDateChange?: (range: DateRange | undefined) => void;
  isLoading?: boolean;
}

export default function SearchPanel({ 
  onSearch, 
  additionalControls,
  enableComparison,
  onComparisonEnableChange,
  comparisonDateRange,
  onComparisonDateChange,
  isLoading = false
}: SearchPanelProps) {
  const [searchMode, setSearchMode] = useState('simple');
  const chatIdInputRef = useRef<HTMLInputElement>(null);
  const messageIdsInputRef = useRef<HTMLTextAreaElement>(null);
  
  // Автофокус на поля ввода при переключении табов
  useEffect(() => {
    if (searchMode === 'simple' && chatIdInputRef.current) {
      chatIdInputRef.current.focus();
    } else if (searchMode === 'messages' && messageIdsInputRef.current) {
      messageIdsInputRef.current.focus();
    }
  }, [searchMode]);

  // Загрузка последнего поиска из localStorage
  useEffect(() => {
    try {
      const savedSearch = localStorage.getItem('lastSearch');
      if (savedSearch) {
        const parsed = JSON.parse(savedSearch);
        if (parsed.type === 'chatId' && parsed.value) {
          setSimpleSearch(prev => ({ ...prev, chatIds: parsed.value }));
          setSearchMode('simple');
        } else if (parsed.type === 'messageIds' && parsed.value) {
          setMessagesSearch(prev => ({ ...prev, messageIds: parsed.value }));
          setSearchMode('messages');
        }
      }
    } catch (error) {
      console.error('Error loading saved search:', error);
    }
  }, []);

  const defaultFrom = addDays(new Date(), -7);
  const defaultTo = new Date();
  
  const [simpleSearch, setSimpleSearch] = useState({
    dateRange: {
      from: defaultFrom,
      to: defaultTo,
    },
    chatIds: '',
  });
  
  const [filterSearch, setFilterSearch] = useState({
    dateRange: {
      from: defaultFrom,
      to: defaultTo,
    },
    channel: undefined as boolean | undefined,
    public: undefined as boolean | undefined,
  });

  const [messagesSearch, setMessagesSearch] = useState({
    dateRange: {
      from: defaultFrom,
      to: defaultTo,
    },
    messageIds: '',
  });
  
  // Распознавание ID сообщений из введенного текста
  const extractedMessageIds = useMemo(() => {
    if (!messagesSearch.messageIds) return [];
    
    return messagesSearch.messageIds
      .split(/[\n,\s]+/)
      .map(id => id.trim())
      .map(id => extractMessageId(id))
      .filter((id): id is string => !!id);
  }, [messagesSearch.messageIds]);
  
  const handleSimpleSearch = () => {
    const chatIds = simpleSearch.chatIds
      .split(/[\n,\s]+/)
      .map(id => id.trim())
      .filter(id => /^\d+$/.test(id));
      
    if (chatIds.length > 0) {
      // Сохраняем поиск в localStorage
      try {
        localStorage.setItem('lastSearch', JSON.stringify({
          type: 'chatId',
          value: simpleSearch.chatIds
        }));
      } catch (error) {
        console.error('Error saving search:', error);
      }
      
      onSearch({
        dateRange: {
          from: simpleSearch.dateRange.from || defaultFrom,
          to: simpleSearch.dateRange.to || defaultTo,
        },
        chatIds: chatIds
      });
    }
  };
  
  const handleFilterSearch = () => {
    onSearch({
      dateRange: {
        from: filterSearch.dateRange.from || defaultFrom,
        to: filterSearch.dateRange.to || defaultTo,
      },
      channel: filterSearch.channel,
      public: filterSearch.public,
    });
  };

  const handleMessagesSearch = () => {
    const messageIds = messagesSearch.messageIds
      .split(/[\n,\s]+/)
      .map(id => id.trim())
      .map(id => extractMessageId(id))
      .filter((id): id is string => !!id);

    if (messageIds.length > 0) {
      // Сохраняем поиск в localStorage
      try {
        localStorage.setItem('lastSearch', JSON.stringify({
          type: 'messageIds',
          value: messagesSearch.messageIds
        }));
      } catch (error) {
        console.error('Error saving search:', error);
      }
      
      onSearch({
        dateRange: {
          from: messagesSearch.dateRange.from || defaultFrom,
          to: messagesSearch.dateRange.to || defaultTo,
        },
        messageIds: messageIds
      });
    }
  };

  const handleSimpleDateRangeChange = (range: { from: Date; to: Date }) => {
    setSimpleSearch(prev => ({ ...prev, dateRange: range }));
  };

  const handleFilterDateRangeChange = (range: { from: Date; to: Date }) => {
    setFilterSearch(prev => ({ ...prev, dateRange: range }));
  };
  const handleMessagesDateRangeChange = (range: { from: Date; to: Date }) => {
    setMessagesSearch(prev => ({ ...prev, dateRange: range }));
  };
  
  // Обработка нажатия Enter в поле ввода ID чата
  const handleChatIdKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && simpleSearch.chatIds.trim() && !isLoading) {
      e.preventDefault();
      handleSimpleSearch();
    }
  };

  // Обработка Ctrl+Enter в поле ввода ID сообщений
  const handleMessageIdsKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey && messagesSearch.messageIds.trim() && !isLoading && extractedMessageIds.length > 0) {
      e.preventDefault();
      handleMessagesSearch();
    }
  };

  return (
    <div className="search-container bg-card/50 p-4 rounded-lg border border-border shadow-sm transition-all duration-300 hover:shadow-md">
      <Tabs defaultValue="simple" className="w-full" onValueChange={setSearchMode}>
        <TabsList className="grid grid-cols-2 bg-secondary w-full overflow-hidden rounded-md">
          <TabsTrigger value="simple" className="flex items-center gap-2 w-full justify-center text-center transition-all duration-200">
            <Search className="h-4 w-4" />
            <span>По чату за период</span>
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2 w-full justify-center text-center transition-all duration-200">
            <MessagesSquare className="h-4 w-4" />
            <span>По сообщению</span>
          </TabsTrigger>
        </TabsList>
        
        <div className="relative">
          <TabsContent value="simple" className="space-y-4 mt-2 block animate-fade-in">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="chatId" className="flex items-center gap-1.5">
                  <span>ID чата</span>
                  {simpleSearch.chatIds && <span className="text-xs text-primary">✓ Введен ID</span>}
                </Label>
                <div className="relative">
                  <Input
                    id="chatId"
                    placeholder="Введите ID чата"
                    value={simpleSearch.chatIds}
                    ref={chatIdInputRef}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 20);
                      setSimpleSearch({ ...simpleSearch, chatIds: value });
                      e.target.classList.toggle('input-has-value', value.length > 0);
                    }}
                    onKeyDown={handleChatIdKeyDown}
                    className={`bg-secondary/70 focus:bg-background border-border focus:border-primary pr-8 h-9 ${simpleSearch.chatIds ? 'input-has-value' : ''}`}
                  />
                  {simpleSearch.chatIds && (
                    <button 
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-secondary"
                      onClick={() => setSimpleSearch({...simpleSearch, chatIds: ''})}
                      aria-label="Очистить"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                      </svg>
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Введите только один ID чата. Его можно скопировать, нажав на три точки справа вверху чата → «Скопировать ID чата».
                </p>
              </div>
              
              <div className="border p-3 rounded-md bg-secondary/30 transition-all duration-300 hover:bg-secondary/50">
                <h3 className="text-sm font-medium flex items-center gap-2 mb-2">
                  <BarChart className="h-4 w-4" />
                  Период для аналитики сообщений
                </h3>
                <DateRangePicker
                  dateRange={simpleSearch.dateRange}
                  onDateRangeChange={handleSimpleDateRangeChange}
                />
              </div>
              
              {additionalControls && (
                <div className="mt-4">
                  {additionalControls}
                </div>
              )}
              
              <Button 
                onClick={handleSimpleSearch} 
                className="w-full bg-primary text-primary-foreground hover:bg-primary-accent focus:ring-2 focus:ring-primary/50 disabled:bg-muted disabled:text-muted-foreground disabled:border disabled:border-muted/30 transition-all duration-200 flex items-center justify-center"
                disabled={!simpleSearch.chatIds.trim() || isLoading}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Начать
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Начать
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
          
          {/*
          <TabsContent value="filter" className="space-y-4 mt-2">
            ...
          </TabsContent>
          */}

          <TabsContent value="messages" className="space-y-4 mt-2 block animate-fade-in">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="messageIds" className="flex items-center gap-1.5">
                  <span>ID сообщений или ссылки на сообщения</span>
                  {messagesSearch.messageIds && <span className="text-xs text-primary">✓ Введены ID</span>}
                </Label>
                <div className="relative h-[140px] border rounded-md border-border bg-secondary/70 focus-within:border-primary overflow-hidden">
                  <Textarea
                    id="messageIds"
                    placeholder="ID сообщения или ссылка на https://app.pachca.com/chats/2258174?message=482982137"
                    value={messagesSearch.messageIds}
                    ref={messageIdsInputRef}
                    onChange={(e) => {
                      const value = e.target.value;
                      setMessagesSearch({ ...messagesSearch, messageIds: value });
                      e.target.classList.toggle('input-has-value', value.length > 0);
                    }}
                    onKeyDown={handleMessageIdsKeyDown}
                    className={`bg-transparent focus:bg-background border-none h-full resize-none focus-visible:ring-0 focus-visible:ring-offset-0 ${messagesSearch.messageIds ? 'input-has-value' : ''}`}
                  />
                  {messagesSearch.messageIds && (
                    <button 
                      className="absolute right-2 top-2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-secondary"
                      onClick={() => setMessagesSearch({...messagesSearch, messageIds: ''})}
                      aria-label="Очистить"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                      </svg>
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Можно указывать как просто ID, так и ссылку на сообщение (одну на строку, через запятую или пробел)
                </p>
                {messagesSearch.messageIds && (
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="bg-secondary/70 px-1.5 py-0.5 rounded text-muted-foreground/80 font-mono">Ctrl+Enter</span> для быстрого поиска
                  </p>
                )}
                {extractedMessageIds.length > 0 && (
                  <div className="mt-2 border border-border/50 rounded-md p-2 bg-secondary/30 transition-all duration-300 hover:bg-secondary/50">
                    <p className="text-xs font-medium text-foreground mb-1 flex items-center gap-1">
                      <span>Найдено ID сообщений:</span>
                      <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{extractedMessageIds.length}</span>
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {extractedMessageIds.slice(0, 10).map((id, index) => (
                        <span key={id + index} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-foreground">
                          {id}
                        </span>
                      ))}
                      {extractedMessageIds.length > 10 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-muted-foreground">
                          +{extractedMessageIds.length - 10}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {/* Календарь убран */}
              {additionalControls && (
                <div className="mt-4">
                  {additionalControls}
                </div>
              )}
              <Button 
                onClick={handleMessagesSearch} 
                className="w-full bg-primary text-primary-foreground hover:bg-primary-accent focus:ring-2 focus:ring-primary/50 disabled:bg-muted disabled:text-muted-foreground disabled:border disabled:border-muted/30 transition-all duration-200 flex items-center justify-center"
                disabled={!messagesSearch.messageIds.trim() || isLoading || extractedMessageIds.length === 0}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Начать
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Начать
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
