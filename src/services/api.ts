import { ApiResponse, ChatData, SearchFilters, AnalyticsResult, PachkaUser, ChatMessage, ReactionStat, MessageReaction } from '../types/api';

const API_PROXY_URL = '/api/pachka';

/**
 * Класс для работы с API Пачки (Pachka)
 */
class PachkaApi {
  private apiKey: string | null = null;

  /**
   * Устанавливает API-ключ и валидирует его
   * @param key API ключ
   */
  setApiKey(key: string) {
    this.apiKey = key;
    localStorage.setItem('pachka_api_key', key);
    return this.validateApiKey(key);
  }

  /**
   * Получает текущий API-ключ из памяти или localStorage
   */
  getApiKey(): string | null {
    if (!this.apiKey) {
      this.apiKey = localStorage.getItem('pachka_api_key');
    }
    return this.apiKey;
  }

  /**
   * Очищает API-ключ
   */
  clearApiKey() {
    this.apiKey = null;
    localStorage.removeItem('pachka_api_key');
  }

  /**
   * Валидирует API-ключ через запрос к /users
   * @param key API ключ
   */
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

  /**
   * Поиск чатов/сообщений по фильтрам
   * @param filters Фильтры поиска
   */
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

  /**
   * Получить чат по ID
   * @param chatId ID чата
   */
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

  /**
   * Получить все сообщения для списка чатов
   */
  async getAllChatMessages(chats: ChatData[], dateRange?: { from: Date, to: Date }): Promise<ChatMessage[]> {
    if (!chats || chats.length === 0) {
      return [];
    }
    try {
      // Параллельная загрузка сообщений для всех чатов
      const messagesResponses = await Promise.all(
        chats.map(chat => this.getChatMessages(chat.id.toString(), dateRange))
      );
      let allMessages: ChatMessage[] = [];
      for (let i = 0; i < messagesResponses.length; i++) {
        const messagesResponse = messagesResponses[i];
        if (messagesResponse.success && messagesResponse.data) {
          allMessages = [...allMessages, ...messagesResponse.data];
        } else {
          console.warn(`Не удалось загрузить сообщения для чата ${chats[i].id}:`, messagesResponse.error);
        }
      }
      // Получаем всех пользователей для фильтрации ботов
      const allUsersList = await this.getAllUsers();
      const botUserIds = new Set(allUsersList.filter(u => u.bot).map(u => u.id));

      // Фильтрация системных сообщений и сообщений от ботов
      const filteredMessages = allMessages.filter(msg => {
        if (!msg.content) return true;
        const content = msg.content.trim();
        if (content === 'Начался видеочат') return false;
        // Исключаем оба варианта: 'завершен' и 'завершён', с любым временем в скобках
        if (/^Видеочат заверш[её]н( \(.+\))?$/i.test(content)) return false;
        // Исключаем сообщения от ботов
        if (msg.user_id && botUserIds.has(msg.user_id)) return false;
        return true;
      });
      console.log(`Общее количество загруженных сообщений по всем чатам (после фильтрации): ${filteredMessages.length}`);
      if (filteredMessages.length === 0) {
        console.warn('После фильтрации не осталось ни одного сообщения для аналитики (боты, системные сообщения).');
        return [];
      }
      return filteredMessages;
    } catch (error) {
      console.error('Ошибка при получении сообщений:', error);
      return [];
    }
  }

  /**
   * Получить сообщения одного чата с пагинацией и фильтрацией по датам
   */
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
      
      console.log(`Фильтрация по датам: ${fromDate ? fromDate.toISOString() : 'не задана'} - ${toDate ? toDate.toISOString() : 'не задана'}`);
      
      while (hasMorePages && !foundOlderMessagesOutsideRange) {
        const params = new URLSearchParams();
        params.append('chat_id', chatId);
        params.append('per', '50'); // Максимальное количество сообщений на страницу согласно API
        params.append('page', currentPage.toString());
        params.append('sort[id]', 'desc'); // Сортировка по убыванию для получения сначала новых сообщений

        console.log(`Получение сообщений чата ${chatId}, страница ${currentPage}, размер страницы: 50`);
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

  /**
   * Получить всех пользователей (сотрудников)
   */
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

  /**
   * Получить количество сообщений в треде
   */
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

  /**
   * Получить аналитику по чатам за период
   */
  async getAnalytics(
    chats: ChatData[], 
    dateRange?: { from: Date, to: Date },
    onProgress?: (progress: number) => void
  ): Promise<AnalyticsResult> {
    if (!chats || chats.length === 0) {
      return {
        engagementRate: 0
      };
    }

    try {
      let allMessages: ChatMessage[] = [];
      let erSum = 0;
      let erCount = 0;
      let daysStats: { date: string, er: number }[] = [];
      
      if (onProgress) {
        onProgress(5);
      }
      
      allMessages = await this.getAllChatMessages(chats, dateRange);
      
      if (onProgress) {
        onProgress(40);
      }
      // Группируем сообщения по дате (YYYY-MM-DD)
      const messagesByDay: Record<string, ChatMessage[]> = {};
      allMessages.forEach(msg => {
        const date = (msg.created_at || msg.createdAt || '').slice(0, 10);
        if (!messagesByDay[date]) messagesByDay[date] = [];
        messagesByDay[date].push(msg);
      });
      // Для каждого дня считаем ER по вашей формуле
      for (const date of Object.keys(messagesByDay).sort()) {
        const dayMessages = messagesByDay[date].filter((msg: any) => msg.entity_type !== 'thread');
        let dayErSum = 0;
        let dayErCount = 0;
        // Параллельно собираем данные для всех сообщений дня
        const readersPromises = dayMessages.map(msg => this.getMessageReaders(msg.id.toString()));
        const reactionsPromises = dayMessages.map(msg => this.getMessageReactions(msg.id.toString()));
        const threadMessagesPromises = dayMessages.map(msg =>
          msg.thread && msg.thread.chat_id
            ? this.getChatMessages(msg.thread.chat_id.toString())
            : Promise.resolve({ success: false, data: [] })
        );
        const [readersResults, reactionsResults, threadMessagesResults] = await Promise.all([
          Promise.all(readersPromises),
          Promise.all(reactionsPromises),
          Promise.all(threadMessagesPromises)
        ]);
        for (let i = 0; i < dayMessages.length; i++) {
          const msg = dayMessages[i];
          // Прочитавшие
          let readers: number[] = [];
          if (readersResults[i].success && readersResults[i].data) {
            readers = readersResults[i].data;
          }
          // Добавляем автора сообщения в список прочитавших, если его там нет
          if (msg.user_id && !readers.includes(msg.user_id)) {
            readers.push(msg.user_id);
          }
          // Реакции
          let reactedUserIds = new Set<number>();
          if (reactionsResults[i].success && reactionsResults[i].data) {
            const reactions = reactionsResults[i].data as MessageReaction[];
            reactions.forEach(reaction => {
              if (reaction.user_id) reactedUserIds.add(reaction.user_id);
            });
          }
          // Комментаторы (авторы сообщений в треде)
          let commentedUserIds = new Set<number>();
          if (threadMessagesResults[i].success && Array.isArray(threadMessagesResults[i].data)) {
            threadMessagesResults[i].data.forEach((threadMsg: any) => {
              if (threadMsg.user_id) commentedUserIds.add(threadMsg.user_id);
            });
          }
          // Все, кто поставил реакцию или комментарий
          const engaged = new Set<number>([...reactedUserIds, ...commentedUserIds]);
          // Только те, кто прочитал и сделал действие
          const engagedAndRead = readers.filter(uid => engaged.has(uid));
          // ER для этого сообщения
          const er = readers.length > 0 ? (engagedAndRead.length / readers.length) * 100 : 0;
          if (readers.length > 0) {
            dayErSum += er;
            dayErCount++;
          }
        }
        const dayER = dayErCount > 0 ? dayErSum / dayErCount : 0;
        daysStats.push({ date, er: dayER });
      }
      // Теперь общий ER по всем сообщениям (как раньше)
      const mainMessages = allMessages.filter((msg: any) => msg.entity_type !== 'thread');
      // Параллельно собираем данные для всех сообщений
      const readersPromises = mainMessages.map(msg => this.getMessageReaders(msg.id.toString()));
      const reactionsPromises = mainMessages.map(msg => this.getMessageReactions(msg.id.toString()));
      const threadMessagesPromises = mainMessages.map(msg =>
        msg.thread && msg.thread.chat_id
          ? this.getChatMessages(msg.thread.chat_id.toString())
          : Promise.resolve({ success: false, data: [] })
      );
      const [readersResults, reactionsResults, threadMessagesResults] = await Promise.all([
        Promise.all(readersPromises),
        Promise.all(reactionsPromises),
        Promise.all(threadMessagesPromises)
      ]);

      // Сбор статистики по каждому сообщению
      const messageStats = mainMessages.map((msg, i) => {
        // Прочитавшие
        let readers: number[] = [];
        if (readersResults[i].success && readersResults[i].data) {
          readers = readersResults[i].data;
        }
        if (msg.user_id && !readers.includes(msg.user_id)) {
          readers.push(msg.user_id);
        }
        // Реакции
        let reactedUserIds = new Set<number>();
        if (reactionsResults[i].success && reactionsResults[i].data) {
          const reactions = reactionsResults[i].data as MessageReaction[];
          reactions.forEach(reaction => {
            if (reaction.user_id) reactedUserIds.add(reaction.user_id);
          });
        }
        // Комментаторы (авторы сообщений в треде)
        let commentedUserIds = new Set<number>();
        if (threadMessagesResults[i].success && Array.isArray(threadMessagesResults[i].data)) {
          threadMessagesResults[i].data.forEach((threadMsg: any) => {
            if (threadMsg.user_id) commentedUserIds.add(threadMsg.user_id);
          });
        }
        // Все, кто поставил реакцию или комментарий
        const engaged = new Set<number>([...reactedUserIds, ...commentedUserIds]);
        // Только те, кто прочитал и сделал действие
        const engagedAndRead = readers.filter(uid => engaged.has(uid));
        // ER для этого сообщения
        const er = readers.length > 0 ? (engagedAndRead.length / readers.length) * 100 : 0;
        return {
          id: typeof msg.id === 'string' ? parseInt(msg.id) : msg.id,
          text: msg.content || '',
          date: msg.created_at || msg.createdAt || '',
          readers: readers.length,
          reactions: reactedUserIds.size,
          threadComments: commentedUserIds.size,
          er: Number(er.toFixed(2)),
        };
      });

      for (let i = 0; i < mainMessages.length; i++) {
        const msg = mainMessages[i];
        // Прочитавшие
        let readers: number[] = [];
        if (readersResults[i].success && readersResults[i].data) {
          readers = readersResults[i].data;
        }
        // Добавляем автора сообщения в список прочитавших, если его там нет
        if (msg.user_id && !readers.includes(msg.user_id)) {
          readers.push(msg.user_id);
        }
        // Реакции
        let reactedUserIds = new Set<number>();
        if (reactionsResults[i].success && reactionsResults[i].data) {
          const reactions = reactionsResults[i].data as MessageReaction[];
          reactions.forEach(reaction => {
            if (reaction.user_id) reactedUserIds.add(reaction.user_id);
          });
        }
        // Комментаторы (авторы сообщений в треде)
        let commentedUserIds = new Set<number>();
        if (threadMessagesResults[i].success && Array.isArray(threadMessagesResults[i].data)) {
          threadMessagesResults[i].data.forEach((threadMsg: any) => {
            if (threadMsg.user_id) commentedUserIds.add(threadMsg.user_id);
          });
        }
        // Все, кто поставил реакцию или комментарий
        const engaged = new Set<number>([...reactedUserIds, ...commentedUserIds]);
        // Только те, кто прочитал и сделал действие
        const engagedAndRead = readers.filter(uid => engaged.has(uid));
        // ER для этого сообщения
        const er = readers.length > 0 ? (engagedAndRead.length / readers.length) * 100 : 0;
        if (readers.length > 0) {
          erSum += er;
          erCount++;
        }
        // Логирование для отладки
        console.log(`\n--- Анализ сообщения ID: ${msg.id} ---`);
        console.log('Прочитали (readers):', readers);
        console.log('Поставили реакцию (reactedUserIds):', Array.from(reactedUserIds));
        console.log('Прокомментировали (commentedUserIds):', Array.from(commentedUserIds));
        console.log('Вовлечённые и прочитавшие (engagedAndRead):', engagedAndRead);
        console.log(`ER для сообщения: ${er.toFixed(2)}%`);
        if (onProgress) {
          const messageProgress = 40 + (i / mainMessages.length) * 59;
          onProgress(Math.min(Math.round(messageProgress), 99));
        }
      }
      // Средний ER по всем сообщениям
      const engagementRate = erCount > 0 ? erSum / erCount : 0;
      console.log(`\n=== Итоговый средний ER по всем сообщениям: ${engagementRate.toFixed(2)}% ===`);

      // Получаем всех пользователей для отображения имени и аватарки
      const allUsersList = await this.getAllUsers();
      const userInfoMap: Record<number, { name: string, avatar: string | null }> = {};
      allUsersList.forEach(u => {
        userInfoMap[u.id] = {
          name: (u.first_name || '') + (u.last_name ? ' ' + u.last_name : ''),
          avatar: u.image_url || null
        };
      });
      // Считаем активность пользователей
      const userStats: Record<number, { messages: number, threadMessages: number, reactions: number, score: number }> = {};
      // Считаем обычные сообщения
      allMessages.forEach(msg => {
        // Если нет parent_message_id — это не тред
        if ((!('parent_message_id' in msg) || !msg.parent_message_id) && msg.user_id) {
          if (!userStats[msg.user_id]) userStats[msg.user_id] = { messages: 0, threadMessages: 0, reactions: 0, score: 0 };
          userStats[msg.user_id].messages++;
        }
      });
      // Считаем сообщения в тредах (только для тредов, относящихся к сообщениям за период)
      // Соберём chat_id тредов только из сообщений за период (allMessages)
      const threadChatIds = Array.from(new Set(
        allMessages
          .filter(msg => msg.thread && msg.thread.chat_id && (!('parent_message_id' in msg) || !msg.parent_message_id))
          .map(msg => msg.thread.chat_id.toString())
      ));
      // --- Параллельная обработка сообщений в тредах ---
      const threadMessagesResponses = await Promise.all(
        threadChatIds.map(threadChatId => this.getChatMessages(threadChatId))
      );
      threadMessagesResponses.forEach(threadMessagesResponse => {
        if (threadMessagesResponse.success && Array.isArray(threadMessagesResponse.data)) {
          threadMessagesResponse.data.forEach((threadMsg: any) => {
            if (threadMsg.user_id) {
              if (!userStats[threadMsg.user_id]) userStats[threadMsg.user_id] = { messages: 0, threadMessages: 0, reactions: 0, score: 0 };
              userStats[threadMsg.user_id].threadMessages++;
            }
          });
        }
      });
      // --- Параллельная обработка реакций ---
      const reactionsResponses = await Promise.all(
        allMessages.map(msg => this.getMessageReactions(msg.id.toString()))
      );
      allMessages.forEach((msg, idx) => {
        const reactionsResponse = reactionsResponses[idx];
        if (reactionsResponse.success && reactionsResponse.data) {
          const reactions = reactionsResponse.data as MessageReaction[];
          reactions.forEach(reaction => {
            if (reaction.user_id) {
              if (!userStats[reaction.user_id]) userStats[reaction.user_id] = { messages: 0, threadMessages: 0, reactions: 0, score: 0 };
              userStats[reaction.user_id].reactions++;
            }
          });
        }
      });
      // Считаем score
      Object.values(userStats).forEach(stat => {
        stat.score = stat.messages * 1 + stat.threadMessages * 0.8 + stat.reactions * 0.25;
      });
      // Формируем топ пользователей
      const topUsers = Object.entries(userStats)
        .map(([user_id, stat]) => {
          const user = allUsersList.find(u => u.id === Number(user_id));
          return {
            user_id: Number(user_id),
            ...stat,
            name: userInfoMap[Number(user_id)]?.name || '',
            avatar: userInfoMap[Number(user_id)]?.avatar || null,
            bot: user?.bot ?? false
          };
        })
        .filter(u => u.name && u.name.trim() !== '' && !u.bot) // Исключаем неизвестных и ботов
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      // ВРЕМЕННЫЙ ЛОГ ДЛЯ ОТЛАДКИ: выводим все сообщения, попавшие в mainMessages
      console.log('mainMessages для графика:', mainMessages.map(m => ({id: m.id, date: m.created_at || m.createdAt, entity_type: (m as any).entity_type, text: m.content})));
      // ВРЕМЕННЫЙ ЛОГ ДЛЯ ОТЛАДКИ: выводим все сообщения, попавшие в messageStats
      console.log('messageStats:', messageStats.map(m => ({id: m.id, date: m.date, er: m.er, text: m.text})));

      // === Продление линии средних до конца графика (на 1 день позже последнего сообщения) ===
      if (daysStats.length > 0 && messageStats.length > 0) {
        // Находим максимальную дату среди сообщений
        const lastMsgDate = new Date(messageStats.reduce((max, msg) => 
          new Date(msg.date) > new Date(max) ? msg.date : max, messageStats[0].date));
        // Продлеваем на 1 день вперёд
        const afterLastMsg = new Date(lastMsgDate);
        afterLastMsg.setDate(afterLastMsg.getDate() + 1);
        afterLastMsg.setHours(0, 0, 0, 0);
        daysStats.push({
          date: afterLastMsg.toISOString(),
          er: daysStats[daysStats.length - 1].er
        });
      }

      return {
        engagementRate,
        daysStats,
        topUsers,
        messageStats
      };
    } catch (error) {
      console.error('Ошибка при поиске:', error);
      return {
        engagementRate: 0
      };
    }
  }

  /**
   * Получить аналитику по одному сообщению
   */
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
          engagementRate: 0
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

      // Формируем messageStats для поддержки графика и таблицы
      const messageStats = [
        {
          id: typeof message.id === 'string' ? parseInt(message.id) : message.id,
          text: message.content || '',
          date: message.created_at || message.createdAt || '',
          readers: totalReads,
          reactions: totalReactions,
          threadComments: totalThreadMessages,
          er: totalReads > 0 ? Number((((totalReactions + totalThreadMessages) / totalReads) * 100).toFixed(2)) : 0,
        }
      ];

      return {
        engagementRate,
        messageStats
      };
    } catch (error) {
      console.error('Error analyzing single message:', error);
      return {
        engagementRate: 0
      };
    }
  }

  /**
   * Получить текущего пользователя по API-ключу
   */
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
