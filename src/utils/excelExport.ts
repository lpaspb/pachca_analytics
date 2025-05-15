
import { utils, writeFile } from 'xlsx';
import { ChatMessage, AnalyticsResult, MessageReaction } from '@/types/api';
import { format } from 'date-fns';

interface ExcelRow {
  'Дата': string;
  'Сообщение': string;
  'Прочтения': number;
  'Реакции': number;
  'Комментарии': number;
  'ER (%)': string;
  'Msg ID': string;
  'Chat ID': string | number;
}

export const exportToExcel = (messages: ChatMessage[], analytics: AnalyticsResult) => {
  if (!messages || messages.length === 0) {
    console.error('No messages to export');
    throw new Error('Нет данных для экспорта');
  }

  console.log('Processing messages for Excel export:', messages.length, 'messages');
  console.log('Analytics data:', analytics);

  const data: ExcelRow[] = messages.map(message => {
    // Get date and content
    const createdAt = message.created_at || message.createdAt || '';
    const formattedDate = createdAt 
      ? format(new Date(createdAt), 'dd.MM.yyyy HH:mm')
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
    if (readsCount === 0 && analytics?.totalReads && messages.length === 1) {
      readsCount = analytics.totalReads;
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
    if (reactionsCount === 0 && analytics?.totalReactions && messages.length === 1) {
      reactionsCount = analytics.totalReactions;
      console.log('Using global analytics for reactions:', reactionsCount);
    }
    
    // Get comments count
    const commentsCount = message.thread?.messages_count || 0;
    
    // Calculate total interactions and engagement rate
    const totalInteractions = reactionsCount + commentsCount;
    const er = readsCount > 0 ? (totalInteractions / readsCount) * 100 : 0;
    
    return {
      'Дата': formattedDate,
      'Сообщение': message.content || '',
      'Прочтения': readsCount,
      'Реакции': reactionsCount,
      'Комментарии': commentsCount,
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
    { wch: 18 },   // Дата
    { wch: 50 },   // Сообщение
    { wch: 10 },   // Прочтения
    { wch: 10 },   // Реакции
    { wch: 12 },   // Комментарии
    { wch: 10 },   // ER (%)
    { wch: 10 },   // Msg ID
    { wch: 10 },   // Chat ID
  ];
  ws['!cols'] = colWidths;

  const fileName = `analytics_${format(new Date(), 'dd-MM-yyyy_HH-mm')}.xlsx`;
  writeFile(wb, fileName);

  return fileName;
};
