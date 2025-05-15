import { ChatMessage } from '@/types/api';

/**
 * Получить количество прочтений сообщения
 */
export function getMessageReadsCount(message: ChatMessage): number {
  if (message.reads_count !== undefined) {
    return message.reads_count;
  }
  if (message.readBy && Array.isArray(message.readBy)) {
    return message.readBy.length;
  }
  return 0;
}

/**
 * Получить количество реакций на сообщение
 */
export function getMessageReactionsCount(message: ChatMessage): number {
  if (message.reactions_count !== undefined) {
    return message.reactions_count;
  }
  if (message.reactions) {
    if (Array.isArray(message.reactions)) {
      return message.reactions.length;
    } else {
      return Object.values(message.reactions).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
    }
  }
  return 0;
}

/**
 * Получить количество комментариев (сообщений в треде) для сообщения
 */
export function getThreadMessagesCount(message: ChatMessage): number {
  return message.thread?.messages_count || 0;
}

/**
 * Вычислить ER (engagement rate) для сообщения
 */
export function calculateMessageER(message: ChatMessage): number {
  const reads = getMessageReadsCount(message);
  if (!reads) return 0;
  const reactions = getMessageReactionsCount(message);
  const comments = getThreadMessagesCount(message);
  return ((reactions + comments) / reads) * 100;
}
