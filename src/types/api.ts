export interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  errors?: Array<{message: string}>;
}

export interface PachkaUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  nickname?: string;
  phone_number?: string;
  department?: string;
  title?: string;
  suspended?: boolean;
  invite_status?: string;
  list_tags?: string[];
  image_url?: string | null;
  last_activity_at?: string;
  reactionCount?: number; // For analytics purposes
  commentsCount?: number; // For analytics purposes
  bot?: boolean; // Является ли пользователь ботом
}

export interface ChatMessage {
  userEngagementRate?: number;
  id: string;
  content: string;
  createdAt: string;
  readBy: string[];
  reactions: {
    [key: string]: string[];
  } | MessageReaction[];
  created_at?: string;
  reads_count?: number;
  reactions_count?: number;
  reaction_types?: string[];
  chat_id?: string | number; // Added this property to fix the type error
  user_id?: number; // ID пользователя, создавшего сообщение
  thread?: {
    id: number;
    chat_id: number;
    messages_count?: number;
  } | null;
}

export interface ChatData {
  id: string | number;
  name: string;
  isPublic: boolean;
  isChannel: boolean;
  messages?: ChatMessage[];
  participantsCount?: number;
  owner_id?: number;
  created_at?: string;
  member_ids?: number[];
  group_tag_ids?: number[];
  channel?: boolean;
  public?: boolean;
  last_message_at?: string;
  meet_room_url?: string;
}

export interface SearchFilters {
  dateRange: {
    from: Date;
    to: Date | undefined;
  };
  chatId?: string;
  chatIds?: string[];
  messageId?: string;
  messageIds?: string[];
  messageUrl?: string;
  isPublic?: boolean;
  isChannel?: boolean;
  channel?: boolean;
  public?: boolean;
}

export interface ReactionStat {
  emoji: string;
  count: number;
}

export interface MessageReaction {
  user_id: number;
  created_at: string;
  code: string;  // Эмодзи код реакции (символ эмодзи)
}

/**
 * Статистика по сообщению
 */
export interface MessageStat {
  /** ID сообщения */
  id: number;
  /** Текст сообщения */
  text: string;
  /** Дата создания сообщения */
  date: string;
  /** Количество просмотров */
  readers: number;
  /** Количество реакций */
  reactions: number;
  /** Количество комментариев в треде */
  threadComments: number;
  /** Показатель ER */
  er: number;
}

/**
 * Статистика по дню
 */
export interface DayStat {
  /** Дата */
  date: string;
  /** Показатель ER за день */
  er: number;
}

/**
 * Статистика по пользователю
 */
export interface UserStat {
  /** ID пользователя */
  user_id: number;
  /** Имя пользователя */
  name: string;
  /** URL аватарки пользователя */
  avatar: string | null;
  /** Количество сообщений */
  messages: number;
  /** Количество сообщений в тредах */
  threadMessages: number;
  /** Количество реакций */
  reactions: number;
  /** Баллы активности */
  score: number;
}

/**
 * Результат аналитики
 */
export interface AnalyticsResult {
  /** Значение ER в процентах */
  engagementRate?: number;
  /** Статистика по сообщениям */
  messageStats?: MessageStat[];
  /** Статистика по дням */
  daysStats?: DayStat[];
  /** Топ активных пользователей */
  topUsers?: UserStat[];
  /** Данные для сравнения с другим периодом */
  comparison?: {
    /** Диапазон дат для сравнения */
    dateRange?: {
      from: Date;
      to?: Date;
    };
    /** Значение ER в процентах для периода сравнения */
    engagementRate?: number;
    /** Разница в процентах между периодами */
    percentageDifferences?: {
      engagementRate: number;
    };
    /** Абсолютная разница между периодами */
    absoluteDifferences?: {
      engagementRate: number;
    };
  };
}

export interface AnalyticsComparison {
  dateRange: {
    from: Date;
    to: Date;
  };
  totalMessages: number;
  totalReads: number;
  totalReactions: number;
  messagesWithReactions: number;
  totalThreadMessages: number;
  engagementRate?: number; // Now represents (comments + reactions) / reads * 100%
  
  // Adding the required properties from AnalyticsResult
  topReactions: ReactionStat[];
  topMessages?: ChatMessage[];
  topUsers?: PachkaUser[];
  
  // Difference percentages
  percentageDifferences: {
    totalMessages: number;
    totalReads: number;
    totalReactions: number;
    messagesWithReactions: number;
    totalThreadMessages: number;
    engagementRate?: number;
  };
  
  // Absolute differences
  absoluteDifferences: {
    totalMessages: number;
    totalReads: number;
    totalReactions: number;
    messagesWithReactions: number;
    totalThreadMessages: number;
    engagementRate?: number;
  };
}
