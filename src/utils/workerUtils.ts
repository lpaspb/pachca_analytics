/**
 * Утилиты для работы с Web Workers в проекте
 */

// Воркер для сортировки данных
export const sortWorkerContent = `
  self.onmessage = function(e) {
    const { data, column, direction } = e.data;
    
    if (!data || !data.length) {
      self.postMessage([]);
      return;
    }
    
    const sortedData = [...data];
    
    sortedData.sort((a, b) => {
      const col = column;
      let av = a[col];
      let bv = b[col];
      
      if (typeof av === 'string' && typeof bv === 'string') {
        av = av.toLowerCase();
        bv = bv.toLowerCase();
      }
      
      if (av === undefined || av === null) return 1;
      if (bv === undefined || bv === null) return -1;
      if (av < bv) return direction === 'asc' ? -1 : 1;
      if (av > bv) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    self.postMessage(sortedData);
  };
`;

// Воркер для поиска сообщений
export const searchWorkerContent = `
  self.onmessage = function(e) {
    const { messages, query, field } = e.data;
    
    if (!messages || !messages.length || !query) {
      self.postMessage([]);
      return;
    }
    
    // Поиск по выбранному полю или по всем полям
    const searchResults = messages.filter(msg => {
      if (field) {
        // Поиск по конкретному полю
        const value = msg[field];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(query.toLowerCase());
        }
        return false;
      } else {
        // Поиск по всем текстовым полям
        return Object.keys(msg).some(key => {
          const value = msg[key];
          if (typeof value === 'string') {
            return value.toLowerCase().includes(query.toLowerCase());
          }
          return false;
        });
      }
    });
    
    self.postMessage(searchResults);
  };
`;

// Воркер для обработки данных графика
export const chartDataWorkerContent = `
  self.onmessage = function(e) {
    const { messageStats, daysStats, type } = e.data;
    
    // Готовим набор данных для графика
    let datasets = [];
    
    // Добавляем линию среднего ER по дням если есть данные
    if (daysStats && daysStats.length > 0) {
      datasets.push({
        type: 'line',
        label: 'ER (%)',
        data: daysStats.map(d => ({
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
      });
    }
    
    // Добавляем точки сообщений если есть
    if (messageStats && messageStats.length > 0) {
      // Для оптимизации отображения при большом количестве сообщений 
      // используем децимацию (прореживание) данных
      let optimizedMessageStats = messageStats;
      
      if (messageStats.length > 500) {
        // Если сообщений очень много, оставляем только самые значимые
        // (сортируем по ER и берем топ-300 + случайные 200)
        const topByER = [...messageStats].sort((a, b) => b.er - a.er).slice(0, 300);
        
        // Добавляем случайные сообщения для представительности
        const randomMessages = [];
        const remainingMessages = messageStats.filter(m => !topByER.includes(m));
        const totalRandomToTake = Math.min(200, remainingMessages.length);
        
        for (let i = 0; i < totalRandomToTake; i++) {
          const randomIndex = Math.floor(Math.random() * remainingMessages.length);
          if (randomIndex < remainingMessages.length) {
            randomMessages.push(remainingMessages[randomIndex]);
            remainingMessages.splice(randomIndex, 1);
          }
        }
        
        optimizedMessageStats = [...topByER, ...randomMessages];
      }
      
      datasets.push({
        type: 'scatter',
        label: 'ER сообщений',
        data: optimizedMessageStats.map(msg => ({
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
      });
    }
    
    self.postMessage({ datasets });
  };
`;

/**
 * Создает веб-воркер с заданным контентом
 */
export const createWorker = (content: string): Worker => {
  const blob = new Blob([content], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
};

/**
 * Проверяет поддержку веб-воркеров в браузере
 */
export const isWorkerSupported = (): boolean => {
  return typeof Worker !== 'undefined';
};

/**
 * Создает воркер для параллельной сортировки данных
 */
export const createSortWorker = (): Worker => {
  return createWorker(sortWorkerContent);
};

/**
 * Создает воркер для параллельного поиска
 */
export const createSearchWorker = (): Worker => {
  return createWorker(searchWorkerContent);
};

/**
 * Создает воркер для обработки данных графика
 */
export const createChartDataWorker = (): Worker => {
  return createWorker(chartDataWorkerContent);
};

/**
 * Преобразует данные для экспорта в Excel через воркер
 */
export const prepareDataForExport = async (data: any[], onComplete: (data: any) => void): Promise<void> => {
  // Если веб-воркеры не поддерживаются или данных мало - обрабатываем синхронно
  if (!isWorkerSupported() || data.length <= 1000) {
    onComplete(data);
    return;
  }
  
  // Иначе создаем воркер для обработки
  const exportWorkerContent = `
    self.onmessage = function(e) {
      const { data } = e.data;
      
      // Здесь может быть предобработка данных
      // ...
      
      self.postMessage({ processedData: data });
    };
  `;
  
  const exportWorker = createWorker(exportWorkerContent);
  
  exportWorker.onmessage = (e) => {
    const { processedData } = e.data;
    onComplete(processedData);
    exportWorker.terminate();
  };
  
  exportWorker.postMessage({ data });
};

/**
 * Параллельная сортировка массива через N воркеров (sharding + merge)
 * @param data - исходный массив
 * @param column - поле для сортировки
 * @param direction - 'asc' | 'desc'
 * @param workerCount - количество воркеров (по умолчанию 4)
 * @returns Promise<отсортированный массив>
 */
export async function parallelSort<T = any>(data: T[], column: string, direction: 'asc' | 'desc', workerCount = 4): Promise<T[]> {
  if (!isWorkerSupported() || data.length < 1000) {
    // Для малых массивов сортируем синхронно
    return [...data].sort((a, b) => {
      let av = a[column];
      let bv = b[column];
      if (typeof av === 'string' && typeof bv === 'string') {
        av = av.toLowerCase();
        bv = bv.toLowerCase();
      }
      if (av === undefined || av === null) return 1;
      if (bv === undefined || bv === null) return -1;
      if (av < bv) return direction === 'asc' ? -1 : 1;
      if (av > bv) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }
  // Разбиваем массив на чанки
  const chunkSize = Math.ceil(data.length / workerCount);
  const chunks: T[][] = [];
  for (let i = 0; i < workerCount; i++) {
    chunks.push(data.slice(i * chunkSize, (i + 1) * chunkSize));
  }
  // Запускаем воркеры
  const workers = Array.from({ length: workerCount }, () => createSortWorker());
  const promises = workers.map((worker, i) => new Promise<T[]>((resolve) => {
    worker.onmessage = (e) => {
      resolve(e.data);
      worker.terminate();
    };
    worker.postMessage({ data: chunks[i], column, direction });
  }));
  // Получаем отсортированные чанки
  const sortedChunks = await Promise.all(promises);
  // Сливаем чанки (merge)
  return mergeSortedChunks(sortedChunks, column, direction);
}

/**
 * Слияние отсортированных чанков (merge для merge sort)
 */
export function mergeSortedChunks<T = any>(chunks: T[][], column: string, direction: 'asc' | 'desc'): T[] {
  const result: T[] = [];
  const indices = Array(chunks.length).fill(0);
  while (true) {
    let minIdx = -1;
    let minValue: any = undefined;
    for (let i = 0; i < chunks.length; i++) {
      const idx = indices[i];
      if (idx < chunks[i].length) {
        const value = chunks[i][idx][column];
        if (minIdx === -1 ||
          (direction === 'asc' ? value < minValue : value > minValue)) {
          minIdx = i;
          minValue = value;
        }
      }
    }
    if (minIdx === -1) break;
    result.push(chunks[minIdx][indices[minIdx]]);
    indices[minIdx]++;
  }
  return result;
}

/**
 * Параллельный поиск по массиву через N воркеров (sharding)
 * @param data - исходный массив
 * @param query - поисковый запрос
 * @param field - поле для поиска (или undefined для всех)
 * @param workerCount - количество воркеров (по умолчанию 4)
 * @returns Promise<массив найденных>
 */
export async function parallelSearch<T = any>(data: T[], query: string, field?: string, workerCount = 4): Promise<T[]> {
  if (!isWorkerSupported() || data.length < 1000) {
    // Для малых массивов ищем синхронно
    return data.filter(msg => {
      if (field) {
        const value = msg[field as keyof T];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(query.toLowerCase());
        }
        return false;
      } else {
        return Object.keys(msg).some(key => {
          const value = msg[key as keyof T];
          if (typeof value === 'string') {
            return value.toLowerCase().includes(query.toLowerCase());
          }
          return false;
        });
      }
    });
  }
  // Разбиваем массив на чанки
  const chunkSize = Math.ceil(data.length / workerCount);
  const chunks: T[][] = [];
  for (let i = 0; i < workerCount; i++) {
    chunks.push(data.slice(i * chunkSize, (i + 1) * chunkSize));
  }
  // Запускаем воркеры
  const workers = Array.from({ length: workerCount }, () => createSearchWorker());
  const promises = workers.map((worker, i) => new Promise<T[]>((resolve) => {
    worker.onmessage = (e) => {
      resolve(e.data);
      worker.terminate();
    };
    worker.postMessage({ messages: chunks[i], query, field });
  }));
  // Получаем результаты поиска
  const foundChunks = await Promise.all(promises);
  // Объединяем результаты
  return foundChunks.flat();
} 