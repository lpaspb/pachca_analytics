
import { ApiResponse, ChatData, SearchFilters, AnalyticsResult, PachkaUser, ChatMessage, ReactionStat, MessageReaction } from '../types/api';

const API_PROXY_URL = '/api/pachka';

class PachkaApi {
  private apiKey: string | null = null;

  setApiKey(key: string) {
    this.apiKey = key;
    localStorage.setItem('pachka_api_key', key);
    return this.validateApiKey(key);
  }

  getApiKey(): string | null {
    if (!this.apiKey) {
      this.apiKey = localStorage.getItem('pachka_api_key');
    }
    return this.apiKey;
  }

  clearApiKey() {
    this.apiKey = null;
    localStorage.removeItem('pachka_api_key');
  }

  async validateApiKey(key: string): Promise<ApiResponse> {
    if (!key) {
      return { success: false, error: 'API ключ обязателен' };
    }

    try {
      console.log('Валидация API ключа через:', `${API_PROXY_URL}/users`);
      const response = await fetch(`${API_PROXY_URL}/users`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'omit' // Don't send cookies
      });

      const contentType = response.headers.get('content-type');
      console.log('Полученный Content-Type:', contentType);
      
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Получен неверный формат данных вместо JSON. Content-Type:', contentType);
        
        // Attempt to parse the response regardless of content type
        try {
          const responseText = await response.text();
          console.log('Response text preview:', responseText.substring(0, 200));
          
          // Try to parse as JSON even if content type is wrong
          try {
            const jsonData = JSON.parse(responseText);
            console.log('Successfully parsed response as JSON despite content type:', jsonData);
            
            if (jsonData && jsonData.data) {
              return { 
                success: true,
                data: jsonData.data 
              };
            }
          } catch (jsonError) {
            console.error('Failed to parse response as JSON:', jsonError);
          }
        } catch (textError) {
          console.error('Failed to read response as text:', textError);
        }
        
        return { 
          success: false, 
          error: 'Ошибка соединения с сервером Pachka. Получен неверный формат ответа. Пожалуйста, проверьте подключение к VPN или попробуйте позже.' 
        };
      }

      if (response.ok) {
        try {
          const userData = await response.json();
          console.log('Получены данные пользователя:', userData);
          return { 
            success: true,
            data: userData.data 
          };
        } catch (parseError) {
          console.error('Ошибка при парсинге ответа:', parseError);
          return { 
            success: false, 
            error: 'Получен некорректный ответ от сервера. Попробуйте позже.' 
          };
        }
      } else {
        try {
          const errorData = await response.json();
          console.error('API validation error response:', errorData);
          return { 
            success: false, 
            error: errorData.errors ? errorData.errors[0].message : 'Неверный API ключ'
          };
        } catch (parseError) {
          console.error('Ошибка при парсинге ответа с ошибкой:', parseError);
          return { 
            success: false, 
            error: `Ошибка соединения с сервером (${response.status}). Проверьте API ключ и соединение.`
          };
        }
      }
    } catch (error) {
      console.error('API validation error:', error);
      return { 
        success: false, 
        error: 'Не удалось подключиться к API Pachka. Возможно, проблема с сетевым подключением или требуется VPN.'
      };
    }
  }

  async searchChats(filters: SearchFilters): Promise<ApiResponse> {
    if (!this.apiKey) {
      return { success: false, error: 'API ключ не установлен' };
    }

    try {
      // Handle single message ID
      if (filters.messageId) {
        console.log('Выполняем поиск сообщения по ID:', filters.messageId);
        const response = await fetch(`${API_PROXY_URL}/messages/${filters.messageId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const result = await response.json();
          if (result.data) {
            // Get the chat for this message
            const chatResponse = await this.getChatById(result.data.chat_id.toString());
            if (chatResponse.success && chatResponse.data) {
              return chatResponse;
            }
          }
          return {
            success: false,
            error: `Сообщение с ID ${filters.messageId} не найдено`
          };
        }
      }
      
      // Handle multiple message IDs
      if (filters.messageIds && filters.messageIds.length > 0) {
        console.log('Выполняем поиск по нескольким сообщениям:', filters.messageIds);
        
        // Use the first message ID to get results
        const firstMessageId = filters.messageIds[0];
        const response = await fetch(`${API_PROXY_URL}/messages/${firstMessageId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const result = await response.json();
          if (result.data) {
            // Get the chat for this message
            const chatResponse = await this.getChatById(result.data.chat_id.toString());
            if (chatResponse.success && chatResponse.data) {
              return chatResponse;
            }
          }
          return {
            success: false,
            error: `Сообщение с ID ${firstMessageId} не найдено`
          };
        }
      }

      if (filters.chatId) {
        console.log('Выполняем поиск чата по ID:', filters.chatId);
        return this.getChatById(filters.chatId);
      }

      let allChats: any[] = [];
      let currentPage = 1;
      let hasMorePages = true;
      
      while (hasMorePages) {
        const params = new URLSearchParams();
        params.append('per', '50');
        params.append('page', currentPage.toString());
        
        console.log(`Запрос чатов, страница ${currentPage} с параметрами:`, params.toString());
        const response = await fetch(`${API_PROXY_URL}/chats?${params.toString()}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const result = await response.json();
          const pageChats = result.data || [];
          
          if (pageChats.length > 0) {
            allChats = [...allChats, ...pageChats];
            currentPage++;
            
            if (pageChats.length < 50) {
              hasMorePages = false;
              console.log(`Достигнут конец списка чатов на странице ${currentPage-1}`);
            }
          } else {
            hasMorePages = false;
            console.log(`Пустая страница ${currentPage}, прекращаем пагинацию`);
          }
          
          console.log(`Загружена страница ${currentPage-1}, получено чатов: ${pageChats.length}, всего: ${allChats.length}`);
        } else {
          const errorData = await response.json();
          console.error('Ошибка при поиске чатов:', errorData);
          return {
            success: false,
            error: errorData.errors ? errorData.errors[0].message : 'Ошибка при поиске чатов'
          };
        }
      }

      console.log(`Загружено всего чатов: ${allChats.length}`);
      
      let filteredChats = allChats;

      if (filters.channel !== undefined) {
        console.log(`Фильтрация по типу чата: ${filters.channel ? 'Каналы' : 'Беседы'}`);
        filteredChats = filteredChats.filter(chat => chat.channel === filters.channel);
      }
      
      if (filters.public !== undefined) {
        console.log(`Фильтрация по доступности: ${filters.public ? 'Открытые' : 'Закрытые'}`);
        filteredChats = filteredChats.filter(chat => chat.public === filters.public);
      }
      
      console.log(`После фильтрации осталось чатов: ${filteredChats.length}`);

      return {
        success: true,
        data: filteredChats
      };
    } catch (error) {
      console.error('Ошибка при поиске:', error);
      return {
        success: false,
        error: 'Не удалось подключиться к API Pachka'
      };
    }
  }

  async getChatById(chatId: string): Promise<ApiResponse> {
    if (!this.apiKey) {
      return { success: false, error: 'API ключ не установлен' };
    }

    try {
      console.log('Получение чата по ID:', chatId);
      
      const response = await fetch(`${API_PROXY_URL}/chats/${chatId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        try {
          const result = await response.json();
          console.log('Ответ API при поиске чата по ID:', result);
          
          if (result.data) {
            return {
              success: true,
              data: [result.data]
            };
          } else {
            console.error(`Чат с ID ${chatId} не найден в ответе API`);
            return {
              success: false,
              error: `Чат с ID ${chatId} не найден`
            };
          }
        } catch (parseError) {
          console.error('Ошибка при парсинге ответа:', parseError);
          return { 
            success: false, 
            error: 'Не удалось обработать ответ сервера'
          };
        }
      } else {
        console.log(`Прямой запрос к чату с ID ${chatId} не удался, пробуем поиск по всем чатам`);
        
        const allChatsResponse = await fetch(`${API_PROXY_URL}/chats`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (allChatsResponse.ok) {
          const allChatsResult = await allChatsResponse.json();
          const foundChat = allChatsResult.data?.find((c: any) => c.id.toString() === chatId);
          
          if (foundChat) {
            console.log(`Найден чат с ID ${chatId} через поиск по всем чатам:`, foundChat);
            return {
              success: true,
              data: [foundChat]
            };
          } else {
            console.error(`Чат с ID ${chatId} не найден даже при поиске по всем чатам`);
            return {
              success: false,
              error: `Чат с ID ${chatId} не найден`
            };
          }
        } else {
          const errorData = await response.json();
          return {
            success: false,
            error: errorData.errors ? errorData.errors[0].message : `Ошибка при получении чата: ${response.status}`
          };
        }
      }
    } catch (error) {
      console.error('Ошибка при получении чата:', error);
      return {
        success: false,
        error: 'Не удалось подключиться к API Pachka'
      };
    }
  }

  async getAllChatMessages(chats: ChatData[], dateRange?: { from: Date, to: Date }): Promise<ChatMessage[]> {
    if (!chats || chats.length === 0) {
      return [];
    }
    
    try {
      let allMessages: ChatMessage[] = [];
      
      for (const chat of chats) {
        console.log(`Загрузка сообщений для чата ${chat.id}...`);
        const messagesResponse = await this.getChatMessages(chat.id.toString(), dateRange);
        if (messagesResponse.success && messagesResponse.data) {
          console.log(`Загружено ${messagesResponse.data.length} сообщений для чата ${chat.id}`);
          allMessages = [...allMessages, ...messagesResponse.data];
        } else {
          console.warn(`Не удалось загрузить сообщения для чата ${chat.id}:`, messagesResponse.error);
        }
      }
      
      console.log(`Общее количество загруженных сообщений по всем чатам: ${allMessages.length}`);
      return allMessages;
    } catch (error) {
      console.error('Ошибка п��и получении сообщений:', error);
      return [];
    }
  }

  async getChatMessages(chatId: string, dateRange?: { from: Date, to: Date }): Promise<ApiResponse> {
    if (!this.apiKey) {
      return { success: false, error: 'API ключ не установлен' };
    }

    try {
      let allMessages: any[] = [];
      let currentPage = 1;
      let hasMorePages = true;
      let totalMessagesCount = 0;
      let foundOlderMessagesOutsideRange = false;
      
      console.log(`Начинаем загрузку сообщений для чата ${chatId}...`);
      
      // Конвертируем границы диапазона в объекты Date для сравнения
      const fromDate = dateRange?.from ? new Date(dateRange.from) : null;
      const toDate = dateRange?.to ? new Date(dateRange.to) : null;
      
      if (fromDate) fromDate.setHours(0, 0, 0, 0);
      if (toDate) toDate.setHours(23, 59, 59, 999);
      
      console.log(`Фильтрация по да��ам: ${fromDate ? fromDate.toISOString() : 'не задана'} - ${toDate ? toDate.toISOString() : 'не задана'}`);
      
      while (hasMorePages && !foundOlderMessagesOutsideRange) {
        const params = new URLSearchParams();
        params.append('chat_id', chatId);
        params.append('per', '50'); // Максимальное количество сообщений на страницу согласно API
        params.append('page', currentPage.toString());
        params.append('sort[id]', 'desc'); // Сортировка по убыванию для получения сначала новых сообщений

        console.log(`Получение сообщени�� чата ${chatId}, страница ${currentPage}, размер страницы: 50`);
        const response = await fetch(`${API_PROXY_URL}/messages?${params.toString()}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const result = await response.json();
          const pageMessages = result.data || [];
          
          // Получаем общее количество сообщений из meta, если доступно
          if (result.meta?.total) {
            totalMessagesCount = result.meta.total;
            console.log(`Всего сообщений согласно API: ${totalMessagesCount}`);
          }
          
          console.log(`Страница ${currentPage}: получено ${pageMessages.length} сообщений`);
          
          if (pageMessages.length > 0) {
            // Проверяем, нужно ли продолжать загрузку с учетом диапазона дат
            let messagesInRange = 0;
            let hasMessagesOutsideRange = false;
            
            for (const message of pageMessages) {
              const messageDate = new Date(message.created_at);
              let inRange = true;
              
              // Проверяем, входит ли сообщение в диапазон дат
              if (fromDate) {
                inRange = inRange && messageDate >= fromDate;
              }
              
              if (toDate) {
                inRange = inRange && messageDate <= toDate;
              }
              
              if (inRange) {
                allMessages.push(message);
                messagesInRange++;
              } else if (fromDate && messageDate < fromDate) {
                // Если сообщение старше нижней границы диапазона,
                // то последующие сообщения тоже будут вне диапазона
                hasMessagesOutsideRange = true;
                foundOlderMessagesOutsideRange = true;
                console.log(`Найдено сообщение вне диапазона дат (старше ${fromDate.toISOString()}), прекращаем загрузку`);
                break;
              }
            }
            
            console.log(`На странице ${currentPage} найдено ${messagesInRange} сообщений в диапазоне дат`);
            
            // Если на странице есть сообщения вне диапазона дат и они старше нижней границы,
            // прекращаем загрузку
            if (hasMessagesOutsideRange) {
              console.log('Прекращаем загрузку из-за нахождения сообщений вне диапазона дат');
              hasMorePages = false;
            } 
            // Иначе проверяем другие условия для продолжения пагинации
            else if (pageMessages.length < 50) {
              // Если на текущей странице меньше 50 сообщений, это последняя страница
              hasMorePages = false;
              console.log('Последняя страница загружена (меньше 50 сообщений)');
            } else if (result.meta?.total && allMessages.length >= result.meta.total) {
              // Если мы уже получили все доступные сообщения согласно meta.total
              hasMorePages = false;
              console.log(`Все ${result.meta.total} сообщений загружены`);
            } else {
              // Увеличиваем номер страницы для следующего запроса
              currentPage++;
              console.log(`Переход к следующей странице ${currentPage}`);
            }
          } else {
            // Если на текущей странице нет сообщений, завершаем пагинацию
            hasMorePages = false;
            console.log('Получена пустая страница, завершаем загрузку');
          }
        } else {
          // При ошибке запроса прекращаем пагинацию
          try {
            const errorData = await response.json();
            console.error(`Ошибка при получении сообщений на странице ${currentPage}:`, errorData);
            return {
              success: false,
              error: errorData.errors ? errorData.errors[0].message : `Ошибка при получении сообщений: ${response.status}`
            };
          } catch (parseError) {
            console.error('Ошибка при парсинге ответа:', parseError);
            return {
              success: false,
              error: `Ошибка при получении сообщений: ${response.status}`
            };
          }
        }
      }
      
      console.log(`Загружено всего ${allMessages.length} сообщений для чата ${chatId} в рамках указанного диапазона дат`);
      if (totalMessagesCount > 0) {
        console.log(`Процент загруженных сообщений от общего числа: ${Math.round((allMessages.length / totalMessagesCount) * 100)}%`);
      }
        
      return {
        success: true,
        data: allMessages
      };
    } catch (error) {
      console.error('Ошибка при получении сообщений:', error);
      return {
        success: false,
        error: 'Не удалось подключиться к API Pachka'
      };
    }
  }

  async getMessageReaders(messageId: string): Promise<ApiResponse> {
    if (!this.apiKey) {
      return { success: false, error: 'API ключ не установлен' };
    }

    try {
      const params = new URLSearchParams();
      params.append('per', '300');

      console.log('Получение списка прочитавших сообщение:', messageId);
      const response = await fetch(`${API_PROXY_URL}/messages/${messageId}/read_member_ids?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        console.error('Получен HTML вместо JSON при запросе списка прочитавших.');
        return { 
          success: false, 
          error: 'Ошибка соединения с сервером Pachka.' 
        };
      }

      if (response.ok) {
        try {
          const result = await response.json();
          console.log(`Получен список прочитавших сообщение ${messageId}:`, result);
          
          return {
            success: true,
            data: result.data || []
          };
        } catch (parseError) {
          console.error('Ошибка при парсинге списка прочитавших:', parseError);
          return { 
            success: false, 
            error: 'Получен некорректный ответ от сервера.' 
          };
        }
      } else {
        try {
          const errorData = await response.json();
          return {
            success: false,
            error: errorData.errors ? errorData.errors[0].message : 'Ошибка при получении списка прочитавших'
          };
        } catch (parseError) {
          console.error('Ошибка при парсинге ответа с ошибкой:', parseError);
          return { 
            success: false, 
            error: `Ошибка соединения с сервером (${response.status}).`
          };
        }
      }
    } catch (error) {
      console.error('Ошибка при получении списка прочитавших:', error);
      return {
        success: false,
        error: 'Не удалось подключиться к API Pachka'
      };
    }
  }

  async getMessageReactions(messageId: string): Promise<ApiResponse> {
    if (!this.apiKey) {
      return { success: false, error: 'API ключ не установлен' };
    }

    try {
      const params = new URLSearchParams();
      params.append('per', '50');

      console.log('Получение списка реакций на сообщение:', messageId);
      const response = await fetch(`${API_PROXY_URL}/messages/${messageId}/reactions?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        console.error('Получен HTML вместо JSON при запросе списка реакций.');
        return { 
          success: false, 
          error: 'Ошибка соединения с сервером Pachka.' 
        };
      }

      if (response.ok) {
        try {
          const result = await response.json();
          console.log(`Получен список реакций на сообщение ${messageId}:`, result);
          
          return {
            success: true,
            data: result.data || []
          };
        } catch (parseError) {
          console.error('Ошибка при парсинге списка реакций:', parseError);
          return { 
            success: false, 
            error: 'Получен некорректный ответ от сервера.' 
          };
        }
      } else {
        try {
          const errorData = await response.json();
          return {
            success: false,
            error: errorData.errors ? errorData.errors[0].message : 'Ошибка при получении списка реакций'
          };
        } catch (parseError) {
          console.error('Ошибка при парсинге ответа с ошибкой:', parseError);
          return { 
            success: false, 
            error: `Ошибка соединения с сервером (${response.status}).`
          };
        }
      }
    } catch (error) {
      console.error('Ошибка при получении списка реакций:', error);
      return {
        success: false,
        error: 'Не удалось подключиться к API Pachka'
      };
    }
  }

  async getAllUsers(): Promise<PachkaUser[]> {
    if (!this.apiKey) {
      console.error('API ключ не установлен');
      return [];
    }

    try {
      let allUsers: PachkaUser[] = [];
      let currentPage = 1;
      let hasMorePages = true;
      
      while (hasMorePages) {
        const params = new URLSearchParams();
        params.append('per', '50');
        params.append('page', currentPage.toString());
        
        console.log(`Получение списка сотрудников, страница ${currentPage}`);
        const response = await fetch(`${API_PROXY_URL}/users?${params.toString()}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const result = await response.json();
          const pageUsers = result.data || [];
          
          if (pageUsers.length > 0) {
            allUsers = [...allUsers, ...pageUsers];
            currentPage++;
            
            if (pageUsers.length < 50) {
              hasMorePages = false;
              console.log(`Загружен весь список сотрудников. Всего: ${allUsers.length}`);
            }
          } else {
            hasMorePages = false;
            console.log(`Пустая страница ${currentPage}, прекращаем пагинацию`);
          }
        } else {
          const errorData = await response.json();
          console.error('Ошибка при получении списка сотрудников:', errorData);
          hasMorePages = false;
        }
      }
      
      return allUsers;
    } catch (error) {
      console.error('Ошибка при получении списка сотрудников:', error);
      return [];
    }
  }

  async getThreadMessagesCount(chatId: string | number): Promise<number> {
    if (!this.apiKey) {
      console.error('API ключ не установлен');
      return 0;
    }

    try {
      let totalMessages = 0;
      let currentPage = 1;
      let hasMorePages = true;
      
      while (hasMorePages) {
        const params = new URLSearchParams();
        params.append('chat_id', chatId.toString());
        params.append('per', '50'); // Maximum allowed by API
        params.append('page', currentPage.toString());
        
        console.log(`Получение сообщений треда ${chatId}, страница ${currentPage}`);
        const response = await fetch(`${API_PROXY_URL}/messages?${params.toString()}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const result = await response.json();
          const pageMessages = result.data || [];
          
          if (pageMessages.length > 0) {
            totalMessages += pageMessages.length;
            currentPage++;
            
            if (pageMessages.length < 50) {
              hasMorePages = false;
            }
          } else {
            hasMorePages = false;
          }
        } else {
          console.error(`Ошибка при получении сообщений треда ${chatId}:`, response.status);
          hasMorePages = false;
        }
      }
      
      console.log(`Всего сообщений в треде ${chatId}: ${totalMessages}`);
      return totalMessages;
    } catch (error) {
      console.error('Ошибка при получении количества сообщений в треде:', error);
      return 0;
    }
  }

  async getAnalytics(
    chats: ChatData[], 
    dateRange?: { from: Date, to: Date },
    onProgress?: (progress: number) => void
  ): Promise<AnalyticsResult> {
    if (!chats || chats.length === 0) {
      return {
        totalMessages: 0,
        totalReads: 0,
        totalReactions: 0,
        messagesWithReactions: 0,
        totalThreadMessages: 0,
        engagementRate: 0,
        userEngagementRate: 0,
        topReactions: []
      };
    }

    try {
      let allMessages: ChatMessage[] = [];
      let totalReads = 0;
      let totalReactions = 0;
      let messagesWithReactions = 0;
      let totalThreadMessages = 0;
      const reactionCounts: Record<string, number> = {};
      const messageReactionsMap: Map<string, {
        message: ChatMessage,
        reactionsCount: number,
        reactionTypes: Set<string>
      }> = new Map();
      
      const userReactionsMap: Map<number, number> = new Map();
      let allUsers: PachkaUser[] = [];
      
      if (onProgress) {
        onProgress(5);
      }
      
      allUsers = await this.getAllUsers();
      
      if (onProgress) {
        onProgress(10);
      }
      
      allMessages = await this.getAllChatMessages(chats, dateRange);
      
      if (onProgress) {
        onProgress(40);
      }
      
      const processedThreadIds = new Set<number>();
      
      for (let i = 0; i < allMessages.length; i++) {
        const msg = allMessages[i];
        // --- Индивидуальные списки для ER по уникальным пользователям ---
        let readersUserIds: number[] = [];
        let engagedUserIds: Set<number> = new Set();
        
        // Прочитавшие
        const readersResponse = await this.getMessageReaders(msg.id.toString());
        if (readersResponse.success && readersResponse.data) {
          totalReads += readersResponse.data.length;
          msg.reads_count = readersResponse.data.length;
          readersUserIds = readersResponse.data;
        }
        // Реакции
        const reactionsResponse = await this.getMessageReactions(msg.id.toString());
        if (reactionsResponse.success && reactionsResponse.data) {
          const reactions = reactionsResponse.data as MessageReaction[];
          totalReactions += reactions.length;
          if (reactions.length > 0) messagesWithReactions++;
          reactions.forEach((reaction) => {
            const emoji = reaction.code || '👍';
            reactionCounts[emoji] = (reactionCounts[emoji] || 0) + 1;
            const userId = reaction.user_id;
            userReactionsMap.set(userId, (userReactionsMap.get(userId) || 0) + 1);
            if (userId) engagedUserIds.add(userId);
          });
          if (reactions.length > 0) {
            const reactionTypes = new Set<string>();
            reactions.forEach((reaction) => {
              if (reaction.code) reactionTypes.add(reaction.code);
            });
            messageReactionsMap.set(msg.id, {
              message: {
                ...msg,
                reactions_count: reactions.length,
                reaction_types: Array.from(reactionTypes)
              },
              reactionsCount: reactions.length,
              reactionTypes
            });
          }
        }
        // Комментарии (thread)
        if (msg.thread && msg.thread.participants && Array.isArray(msg.thread.participants)) {
          msg.thread.participants.forEach((uid: number) => engagedUserIds.add(uid));
        }
        // ER по уникальным пользователям для сообщения: теперь просто engaged/readers
        msg.userEngagementRate = readersUserIds.length > 0 ? (engagedUserIds.size / readersUserIds.length) * 100 : 0;
        // ---
        if (msg.thread && msg.thread.chat_id && !processedThreadIds.has(msg.thread.chat_id)) {
          processedThreadIds.add(msg.thread.chat_id);
          const threadMessagesCount = await this.getThreadMessagesCount(msg.thread.chat_id);
          totalThreadMessages += threadMessagesCount;
          msg.thread.messages_count = threadMessagesCount;
        }
        if (onProgress) {
          const messageProgress = 40 + (i / allMessages.length) * 59;
          onProgress(Math.min(Math.round(messageProgress), 99));
        }
      }
      
      // Calculate Engagement Rate: reads / (comments + reactions)
      const engagementDenominator = totalThreadMessages + totalReactions;
      const engagementRate = engagementDenominator > 0 ? totalReads / engagementDenominator : 0;

      // --- ER по уникальному пользователю (через API) ---
      // Ограничим количество сообщений для производительности
      const messagesForUserER = allMessages.slice(0, 50);
      const readersUserIds = new Set<number>();
      const engagedUserIds = new Set<number>();

      // Параллельно получаем прочитавших и реакции для каждого сообщения
      const readersPromises = messagesForUserER.map(msg => this.getMessageReaders(msg.id.toString()));
      const reactionsPromises = messagesForUserER.map(msg => this.getMessageReactions(msg.id.toString()));
      const [readersResults, reactionsResults] = await Promise.all([
        Promise.all(readersPromises),
        Promise.all(reactionsPromises)
      ]);

      // Собираем user_id прочитавших
      readersResults.forEach(res => {
        if (res.success && Array.isArray(res.data)) {
          res.data.forEach((uid: number) => readersUserIds.add(uid));
        }
      });
      // Собираем user_id поставивших реакцию
      reactionsResults.forEach(res => {
        if (res.success && Array.isArray(res.data)) {
          res.data.forEach((reaction: any) => {
            if (typeof reaction === 'object' && reaction.user_id) {
              engagedUserIds.add(reaction.user_id);
            } else if (typeof reaction === 'number') {
              engagedUserIds.add(reaction);
            }
          });
        }
      });
      // Комментарии (thread) — если есть
      for (const msg of messagesForUserER) {
        if (msg.thread && msg.thread.participants && Array.isArray(msg.thread.participants)) {
          msg.thread.participants.forEach((uid: number) => engagedUserIds.add(uid));
        }
      }
      // Пользователи, которые и прочитали, и поставили реакцию/комментарий
      const uniqueEngagedReaders = Array.from(readersUserIds).filter(uid => engagedUserIds.has(uid));
      const userEngagementRate = readersUserIds.size > 0 ? (uniqueEngagedReaders.length / readersUserIds.size) * 100 : 0;
      console.log('userEngagementRate', userEngagementRate, 'uniqueEngagedReaders', uniqueEngagedReaders, 'readersUserIds', Array.from(readersUserIds), 'engagedUserIds', Array.from(engagedUserIds));
      
      const topReactions: ReactionStat[] = Object.entries(reactionCounts)
        .map(([emoji, count]) => ({ emoji, count }))
        .sort((a, b) => b.count - a.count);
      
      // Гарантируем, что у каждого сообщения есть reactions_count
    const topMessages = allMessages.map(msg => {
      if (typeof msg.reactions_count !== 'number') {
        // Попробуем найти данные о реакциях в messageReactionsMap
        const reactionEntry = messageReactionsMap.get(msg.id);
        if (reactionEntry) {
          return {
            ...msg,
            reactions_count: reactionEntry.reactionsCount,
            reaction_types: Array.from(reactionEntry.reactionTypes)
          };
        }
      }
      return msg;
    });
      
      const topUsers = allUsers
        .filter(user => userReactionsMap.has(user.id))
        .map(user => ({
          ...user,
          reactionCount: userReactionsMap.get(user.id) || 0
        }))
        .sort((a, b) => (b.reactionCount || 0) - (a.reactionCount || 0))
        .slice(0, 10);
      
      if (onProgress) {
        onProgress(100);
      }
      
      console.log(`Получено ${allMessages.length} сообщений для анализа`);
      console.log(`Сообщений с реакциями: ${messagesWithReactions} (${Math.round((messagesWithReactions / allMessages.length) * 100)}%)`);
      console.log(`Общее количество прочтений: ${totalReads}`);
      console.log(`Общее количество реакций: ${totalReactions}`);
      console.log(`Общее количество сообщений в тредах: ${totalThreadMessages}`);
      console.log(`Коэффициент вовлеченности (ER): ${engagementRate.toFixed(2)}`);
      console.log(`Топ реакций:`, topReactions);
      console.log(`Топ сотрудников по реакциям:`, topUsers);
      
      return {
        totalMessages: allMessages.length,
        totalReads: totalReads,
        totalReactions: totalReactions,
        messagesWithReactions: messagesWithReactions,
        totalThreadMessages: totalThreadMessages,
        engagementRate: engagementRate,
        userEngagementRate: userEngagementRate,
        topReactions,
        topMessages,
        topUsers
      };
    } catch (error) {
      console.error('Ошибка при получении аналитики:', error);
      
      if (onProgress) {
        onProgress(100);
      }
      
      return {
        totalMessages: 0,
        totalReads: 0,
        totalReactions: 0,
        messagesWithReactions: 0,
        totalThreadMessages: 0,
        engagementRate: 0,
        topReactions: []
      };
    }
  }

  async getAnalyticsForSingleMessage(messageId: string): Promise<AnalyticsResult> {
    try {
      console.log('Analyzing single message:', messageId);
      
      const messageResponse = await fetch(`${API_PROXY_URL}/messages/${messageId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!messageResponse.ok) {
        console.error(`Failed to fetch message ${messageId}`);
        return {
          totalMessages: 0,
          totalReads: 0,
          totalReactions: 0,
          messagesWithReactions: 0,
          totalThreadMessages: 0,
          engagementRate: 0,
          topReactions: []
        };
      }

      const messageData = await messageResponse.json();
      const message = messageData.data;

      // Get readers
      const readersResponse = await this.getMessageReaders(messageId);
      const totalReads = readersResponse.success ? readersResponse.data.length : 0;

      // Get reactions
      const reactionsResponse = await this.getMessageReactions(messageId);
      const reactions = reactionsResponse.success ? reactionsResponse.data : [];
      const totalReactions = reactions.length;

      // Count unique reaction types
      const reactionCounts: Record<string, number> = {};
      reactions.forEach((reaction: any) => {
        const emoji = reaction.code || '👍';
        reactionCounts[emoji] = (reactionCounts[emoji] || 0) + 1;
      });

      // Calculate thread messages if thread exists
      let totalThreadMessages = 0;
      if (message.thread?.chat_id) {
        totalThreadMessages = await this.getThreadMessagesCount(message.thread.chat_id);
      }

      const topReactions = Object.entries(reactionCounts)
        .map(([emoji, count]) => ({ emoji, count }))
        .sort((a, b) => b.count - a.count);

      // Calculate engagement rate for single message
      const engagementDenominator = totalThreadMessages + totalReactions;
      const engagementRate = engagementDenominator > 0 ? totalReads / engagementDenominator : 0;

      return {
        totalMessages: 1,
        totalReads,
        totalReactions,
        messagesWithReactions: totalReactions > 0 ? 1 : 0,
        totalThreadMessages,
        engagementRate,
        topReactions,
        topMessages: message ? [message] : []
      };
    } catch (error) {
      console.error('Error analyzing single message:', error);
      return {
        totalMessages: 0,
        totalReads: 0,
        totalReactions: 0,
        messagesWithReactions: 0,
        totalThreadMessages: 0,
        engagementRate: 0,
        topReactions: []
      };
    }
  }

  async getCurrentUser(): Promise<PachkaUser | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;

    try {
      const response = await fetch(`${API_PROXY_URL}/users`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        console.error('Получен HTML вместо JSON при запросе данных пользователя.');
        return null;
      }

      if (response.ok) {
        try {
          const data = await response.json();
          return data.data;
        } catch (parseError) {
          console.error('Ошибка при парсинге данных пользователя:', parseError);
          return null;
        }
      }
      return null;
    } catch (error) {
      console.error('Error fetching current user:', error);
      return null;
    }
  }
}

export const pachkaApi = new PachkaApi();
