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

  const handleSimpleDateRangeChange = (range: { from: Date; to: Date }) => {
    setSimpleSearch(prev => ({ ...prev, dateRange: range }));
  };

  const handleFilterDateRangeChange = (range: { from: Date; to: Date }) => {
    setFilterSearch(prev => ({ ...prev, dateRange: range }));
  };
  const handleMessagesDateRangeChange = (range: { from: Date; to: Date }) => {
    setMessagesSearch(prev => ({ ...prev, dateRange: range }));
  };
  
  return (
    <div className="search-container">
      <Tabs defaultValue="simple" className="w-full" onValueChange={setSearchMode}>
        <TabsList className="grid grid-cols-2 bg-secondary w-full">
  <TabsTrigger value="simple" className="flex items-center gap-2 w-full justify-center text-center">
    <Search className="h-4 w-4" />
    <span>По ID чата</span>
  </TabsTrigger>
  <TabsTrigger value="messages" className="flex items-center gap-2 w-full justify-center text-center">
    <MessagesSquare className="h-4 w-4" />
    <span>По ID сообщения</span>
  </TabsTrigger>
</TabsList>
        
        <TabsContent value="simple" className="space-y-4 mt-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="chatId">ID чата</Label>
              <Input
                id="chatId"
                placeholder="Введите ID чата"
                value={simpleSearch.chatIds}
                onChange={(e) => 
                  setSimpleSearch({ ...simpleSearch, chatIds: e.target.value.replace(/[^0-9]/g, '').slice(0, 20) }) // только цифры, максимум 20 символов
                }
                className="bg-secondary"
              />
              <p className="text-xs text-muted-foreground">
                Введите только один ID чата
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
              disabled={!simpleSearch.chatIds.trim() || isLoading}
            >
              <Search className="mr-2 h-4 w-4" />
              Искать
            </Button>
          </div>
        </TabsContent>
        
        {/*
        <TabsContent value="filter" className="space-y-4 mt-2">
          ...
        </TabsContent>
        */}

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
            {/* Календарь убран */}
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
