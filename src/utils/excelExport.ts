import { utils, writeFile } from 'xlsx';
import { ChatMessage, AnalyticsResult, MessageReaction } from '@/types/api';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface ExcelRow {
  'Дата': string;
  'Сообщение': string;
  'Прочтения': number;
  'Поставившие реакцию': number;
  'Написавшие комментарий': number;
  'ER (%)': string;
  'Msg ID': string;
  'Chat ID': string | number;
}

// Расширяем тип AnalyticsResult для поддержки дополнительных свойств,
// которые могут присутствовать в объекте, но не объявлены в типе
interface ExtendedAnalyticsResult extends AnalyticsResult {
  totalReads?: number;
  totalReactions?: number;
}

// Расширяем тип ChatMessage для поддержки дополнительного поля er
interface ExtendedMessage extends ChatMessage {
  er?: number;
}

export const exportToExcel = (messages: ChatMessage[], analytics: AnalyticsResult) => {
  if (!messages || messages.length === 0) {
    console.error('No messages to export');
    throw new Error('Нет данных для экспорта');
  }

  console.log('Processing messages for Excel export:', messages.length, 'messages');
  console.log('Analytics data:', analytics);

  // Приведение типа к расширенному типу для доступа к дополнительным свойствам
  const extendedAnalytics = analytics as ExtendedAnalyticsResult;

  const data: ExcelRow[] = messages.map(message => {
    // Приводим сообщение к расширенному типу для доступа к er
    const extendedMessage = message as ExtendedMessage;
    
    // Get date and content
    const createdAt = message.created_at || message.createdAt || '';
    const formattedDate = createdAt 
      ? format(new Date(createdAt), 'dd.MM.yyyy HH:mm', { locale: ru })
      : '-';
    
    const chatId = message.thread?.chat_id || message.chat_id || '';
    
    // Get reads count
    let readsCount = 0;
    if (message.reads_count !== undefined) {
      readsCount = message.reads_count;
    } else if (message.readBy && Array.isArray(message.readBy)) {
      readsCount = message.readBy.length;
    }
    
    // Fix if not available: use global analytics data to estimate reads
    if (readsCount === 0 && extendedAnalytics.totalReads && messages.length === 1) {
      readsCount = extendedAnalytics.totalReads;
      console.log('Using global analytics for reads:', readsCount);
    }
    
    // Get reactions count
    let reactionsCount = 0;
    if (message.reactions_count !== undefined) {
      reactionsCount = message.reactions_count;
    } else if (message.reactions) {
      if (Array.isArray(message.reactions)) {
        reactionsCount = message.reactions.length;
      } else {
        reactionsCount = Object.values(message.reactions).reduce((sum, arr) => 
          sum + (Array.isArray(arr) ? arr.length : 0), 0
        );
      }
    }
    
    // Fix if not available: use global analytics data to estimate reactions
    if (reactionsCount === 0 && extendedAnalytics.totalReactions && messages.length === 1) {
      reactionsCount = extendedAnalytics.totalReactions;
      console.log('Using global analytics for reactions:', reactionsCount);
    }
    
    // Get comments count
    const commentsCount = message.thread?.messages_count || 0;
    
    // Используем предварительно вычисленное значение ER, если оно доступно
    // Иначе рассчитываем его по формуле
    let er = extendedMessage.er;
    if (er === undefined) {
      const totalInteractions = reactionsCount + commentsCount;
      er = readsCount > 0 ? (totalInteractions / readsCount) * 100 : 0;
    }
    
    return {
      'Дата': formattedDate,
      'Сообщение': message.content || '',
      'Прочтения': readsCount,
      'Поставившие реакцию': reactionsCount,
      'Написавшие комментарий': commentsCount,
      'ER (%)': `${er.toFixed(2)}`,
      'Msg ID': message.id,
      'Chat ID': chatId,
    };
  });

  return writeExcelFile(data, 'Analytics');
};

const writeExcelFile = (data: ExcelRow[], sheetName: string): string => {
  console.log('Writing Excel file with data:', data.slice(0, 3));

  const ws = utils.json_to_sheet(data);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, sheetName);

  // Auto-fit columns
  const colWidths = [
    { wch: 20 },   // Дата
    { wch: 30 },   // Сообщение
    { wch: 12 },   // Прочтения
    { wch: 20 },   // Поставившие реакцию
    { wch: 25 },   // Написавшие комментарий
    { wch: 10 },   // ER (%)
    { wch: 10 },   // Msg ID
    { wch: 10 },   // Chat ID
  ];
  ws['!cols'] = colWidths;

  const fileName = `analytics_${format(new Date(), 'dd-MM-yyyy_HH-mm')}.xlsx`;
  writeFile(wb, fileName);

  return fileName;
};
