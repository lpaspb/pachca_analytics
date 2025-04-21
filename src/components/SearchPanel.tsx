import { useState } from 'react';
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

interface SearchPanelProps {
  onSearch: (filters: SearchFilters) => void;
  additionalControls?: React.ReactNode;
  enableComparison?: boolean;
  onComparisonEnableChange?: (enabled: boolean) => void;
  comparisonDateRange?: DateRange;
  onComparisonDateChange?: (range: DateRange | undefined) => void;
}

export default function SearchPanel({ 
  onSearch, 
  additionalControls,
  enableComparison,
  onComparisonEnableChange,
  comparisonDateRange,
  onComparisonDateChange
}: SearchPanelProps) {
  const [searchMode, setSearchMode] = useState('simple');
  
  const defaultFrom = addDays(new Date(), -30);
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
  
  const handleSimpleSearch = () => {
    const chatIds = simpleSearch.chatIds
      .split(/[\n,\s]+/)
      .map(id => id.trim())
      .filter(id => /^\d+$/.test(id));
      
    if (chatIds.length > 0) {
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

  const extractMessageId = (input: string): string | null => {
    // Если просто число
    if (/^\d+$/.test(input)) return input;
    // Если ссылка вида https://app.pachca.com/chats/2258174?message=482982137
    const match = input.match(/message=(\d+)/);
    if (match) return match[1];
    return null;
  };

  const handleMessagesSearch = () => {
    const messageIds = messagesSearch.messageIds
      .split(/[\n,\s]+/)
      .map(id => id.trim())
      .map(id => extractMessageId(id))
      .filter((id): id is string => !!id);

    if (messageIds.length > 0) {
      onSearch({
        dateRange: {
          from: messagesSearch.dateRange.from || defaultFrom,
          to: messagesSearch.dateRange.to || defaultTo,
        },
        messageIds: messageIds
      });
    }
  };

  const handleSimpleDateRangeChange = (range: DateRange | undefined) => {
    if (range) {
      setSimpleSearch({
        ...simpleSearch,
        dateRange: {
          from: range.from || defaultFrom,
          to: range.to || defaultTo,
        }
      });
    }
  };

  const handleFilterDateRangeChange = (range: DateRange | undefined) => {
    if (range) {
      setFilterSearch({
        ...filterSearch,
        dateRange: {
          from: range.from || defaultFrom,
          to: range.to || defaultTo,
        }
      });
    }
  };

  const handleMessagesDateRangeChange = (range: DateRange | undefined) => {
    if (range) {
      setMessagesSearch({
        ...messagesSearch,
        dateRange: {
          from: range.from || defaultFrom,
          to: range.to || defaultTo,
        }
      });
    }
  };
  
  return (
    <div className="search-container">
      <Tabs defaultValue="simple" className="w-full" onValueChange={setSearchMode}>
        <TabsList className="grid grid-cols-3 bg-secondary">
          <TabsTrigger value="simple" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            <span>По ID чата</span>
          </TabsTrigger>
          <TabsTrigger value="filter" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span>По фильтрам</span>
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessagesSquare className="h-4 w-4" />
            <span>По ID сообщения</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="simple" className="space-y-4 mt-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="chatIds">ID чатов</Label>
              <Textarea
                id="chatIds"
                placeholder="Введите ID чатов (каждый с новой строки или через запятую)"
                value={simpleSearch.chatIds}
                onChange={(e) => 
                  setSimpleSearch({ ...simpleSearch, chatIds: e.target.value })
                }
                className="bg-secondary min-h-[120px]"
              />
              <p className="text-xs text-muted-foreground">
                Введите несколько ID чатов, разделяя их запятыми или переносами строк
              </p>
            </div>
            
            <div className="border p-3 rounded-md bg-secondary/30">
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
              className="w-full bg-gradient-primary"
              disabled={!simpleSearch.chatIds.trim()}
            >
              <Search className="mr-2 h-4 w-4" />
              Искать
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="filter" className="space-y-4 mt-2">
          <div className="space-y-4">
            <div className="border p-3 rounded-md bg-secondary/30">
              <h3 className="text-sm font-medium flex items-center gap-2 mb-2">
                <BarChart className="h-4 w-4" />
                Период для аналитики сообщений
              </h3>
              <DateRangePicker
                dateRange={filterSearch.dateRange}
                onDateRangeChange={handleFilterDateRangeChange}
              />
            </div>
            
            {additionalControls && (
              <div className="mt-4">
                {additionalControls}
              </div>
            )}
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  Тип чата
                </Label>
                <div className="flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        {filterSearch.channel === undefined && (
                          <>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            <span>Любой</span>
                          </>
                        )}
                        {filterSearch.channel === true && (
                          <>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            <span>Канал</span>
                          </>
                        )}
                        {filterSearch.channel === false && (
                          <>
                            <Users className="h-4 w-4 mr-2" />
                            <span>Беседа</span>
                          </>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem 
                        onClick={() => setFilterSearch({ ...filterSearch, channel: undefined })}
                      >
                        Любой
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setFilterSearch({ ...filterSearch, channel: true })}
                        className="flex items-center gap-2"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span>Канал</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setFilterSearch({ ...filterSearch, channel: false })}
                        className="flex items-center gap-2"
                      >
                        <Users className="h-4 w-4" />
                        <span>Беседа</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1">
                  <Globe className="h-4 w-4" />
                  Открытость
                </Label>
                <div className="flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        {filterSearch.public === undefined && (
                          <>
                            <Globe className="h-4 w-4 mr-2" />
                            <span>Любой</span>
                          </>
                        )}
                        {filterSearch.public === true && (
                          <>
                            <Globe className="h-4 w-4 mr-2" />
                            <span>Открытый</span>
                          </>
                        )}
                        {filterSearch.public === false && (
                          <>
                            <Lock className="h-4 w-4 mr-2" />
                            <span>Закрытый</span>
                          </>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem 
                        onClick={() => setFilterSearch({ ...filterSearch, public: undefined })}
                      >
                        Любой
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setFilterSearch({ ...filterSearch, public: true })}
                        className="flex items-center gap-2"
                      >
                        <Globe className="h-4 w-4" />
                        <span>Открытый</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setFilterSearch({ ...filterSearch, public: false })}
                        className="flex items-center gap-2"
                      >
                        <Lock className="h-4 w-4" />
                        <span>Закрытый</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
            
            <Button 
              onClick={handleFilterSearch} 
              className="w-full bg-gradient-primary"
            >
              <Filter className="mr-2 h-4 w-4" />
              Применить фильтры
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="messages" className="space-y-4 mt-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="messageIds">ID сообщений или ссылки на сообщения</Label>
              <Textarea
                id="messageIds"
                placeholder="ID сообщения или ссылка на https://app.pachca.com/chats/2258174?message=482982137"
                value={messagesSearch.messageIds}
                onChange={(e) => 
                  setMessagesSearch({ ...messagesSearch, messageIds: e.target.value })
                }
                className="bg-secondary min-h-[120px]"
              />
              <p className="text-xs text-muted-foreground">
                Можно указывать как просто ID, так и ссылку на сообщение (одну на строку, через запятую или пробел)
              </p>
            </div>
            
            <div className="border p-3 rounded-md bg-secondary/30">
              <h3 className="text-sm font-medium flex items-center gap-2 mb-2">
                <BarChart className="h-4 w-4" />
                Период для аналитики сообщений
              </h3>
              <DateRangePicker
                dateRange={messagesSearch.dateRange}
                onDateRangeChange={handleMessagesDateRangeChange}
              />
            </div>
            
            {additionalControls && (
              <div className="mt-4">
                {additionalControls}
              </div>
            )}
            
            <Button 
              onClick={handleMessagesSearch} 
              className="w-full bg-gradient-primary"
              disabled={!messagesSearch.messageIds.trim()}
            >
              <Search className="mr-2 h-4 w-4" />
              Искать сообщения
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
