import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AnalyticsResult, ChatData, ChatMessage } from '@/types/api';
import { getMessageReadsCount, getMessageReactionsCount, getThreadMessagesCount, calculateMessageER } from '@/utils/analyticsUtils';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Progress } from '@/components/ui/progress';
import { useTheme } from '@/contexts/ThemeContext';
import EmployeesReactionChart from './EmployeesReactionChart';
import EChartsBar from './EChartsBar';
import DarkBarChartBlue from './DarkBarChartBlue';
import StackedAreaStatsChart from './StackedAreaStatsChart';
import RoseChart from './RoseChart';
import PieChart from './PieChart';
import FunnelChart from './FunnelChart';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DateRange } from 'react-day-picker';
import { Badge } from '@/components/ui/badge';
import { exportToExcel } from '@/utils/excelExport';
import { toast } from '@/hooks/use-toast';
import './ui/custom-tooltip.css';
import { 
  Minus, 
  ArrowUp, 
  ArrowDown, 
  Loader, 
  Calendar, 
  ArrowUpDown, 
  Download, 
  MessageSquare, 
  Eye, 
  ThumbsUp, 
  MessageCircle, 
  Gauge, 
  Percent, 
  BarChart3, 
  PieChart as PieChartIcon, 
  Trophy,
  HelpCircle
} from 'lucide-react';
import { ThemeAwareBarChart, ThemeAwarePieChart } from './ThemeAwareChart';
import { Line, Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  TimeScale,
  Tooltip as ChartTooltip,
  Legend,
  Filler
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import type { ChartData, ChartDataset } from 'chart.js';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from '@/components/ui/pagination';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  isWorkerSupported, 
  createSortWorker, 
  createSearchWorker, 
  createChartDataWorker,
  prepareDataForExport,
  parallelSort,
  parallelSearch
} from '@/utils/workerUtils';

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, TimeScale, ChartTooltip, Legend, Filler);

/**
 * Пропсы для AnalyticsDashboard
 */
interface AnalyticsDashboardProps {
  analytics: AnalyticsResult | null;
  isLoading: boolean;
  loadingProgress?: number;
  chats?: ChatData[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  searchStarted?: boolean;
  isComparisonLoading?: boolean;
  onCompareWithPreviousPeriod?: () => void;
  enableComparison?: boolean;
  onComparisonEnableChange?: (enabled: boolean) => void;
  comparisonDateRange?: DateRange;
  onComparisonDateRangeChange?: (range: DateRange | undefined) => void;
}

interface AnalyticsDashboardPropsExt extends AnalyticsDashboardProps {
  /** Флаг поиска по сообщениям */
  isMessageSearch?: boolean;
}

export default function AnalyticsDashboard({ 
  analytics, 
  isLoading, 
  loadingProgress = 0,
  chats = [], 
  dateRange,
  searchStarted = false,
  isComparisonLoading = false,
  onCompareWithPreviousPeriod,
  enableComparison = false,
  onComparisonEnableChange = () => {},
  comparisonDateRange,
  onComparisonDateRangeChange = () => {},
  isMessageSearch = false
}: AnalyticsDashboardPropsExt) {
  const { chartColors } = useTheme();
  
  // Состояния для веб-воркеров
  const [sortWorker, setSortWorker] = useState<Worker | null>(null);
  const [searchWorker, setSearchWorker] = useState<Worker | null>(null);
  const [chartDataWorker, setChartDataWorker] = useState<Worker | null>(null);
  const [isSorting, setIsSorting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isChartProcessing, setIsChartProcessing] = useState(false);
  
  // Состояние поиска
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  // Данные для графика ER
  const [chartDatasets, setChartDatasets] = useState<any[]>([]);

  // Инициализация веб-воркеров
  useEffect(() => {
    if (isWorkerSupported()) {
      // Создаем воркеры
      const sortWorkerInstance = createSortWorker();
      const searchWorkerInstance = createSearchWorker(); 
      const chartDataWorkerInstance = createChartDataWorker();
      
      setSortWorker(sortWorkerInstance);
      setSearchWorker(searchWorkerInstance);
      setChartDataWorker(chartDataWorkerInstance);
      
      return () => {
        // Очищаем воркеры при размонтировании
        sortWorkerInstance.terminate();
        searchWorkerInstance.terminate();
        chartDataWorkerInstance.terminate();
      };
    }
  }, []);

  // Обработка данных для графика с помощью воркера
  useEffect(() => {
    if (!chartDataWorker || !analytics) return;
    
    setIsChartProcessing(true);
    
    // Настраиваем обработчик сообщений от воркера
    const handleChartWorkerMessage = (e: MessageEvent) => {
      const { datasets } = e.data;
      if (datasets) {
        setChartDatasets(datasets);
      }
      setIsChartProcessing(false);
    };
    
    chartDataWorker.onmessage = handleChartWorkerMessage;
    
    // Отправляем данные в воркер для обработки
    chartDataWorker.postMessage({
      messageStats: analytics.messageStats,
      daysStats: analytics.daysStats,
      type: isMessageSearch ? 'message' : 'regular'
    });
    
  }, [analytics, chartDataWorker, isMessageSearch]);

  const formatEngagementRate = (rate: number | undefined): string => {
    if (rate === undefined) return '0.00';
    return rate.toFixed(2);
  };
  
  const engagementRate = analytics ? analytics.engagementRate ?? 0 : 0;

  // --- ДАННЫЕ ДЛЯ ГРАФИКА ---
  // Используем данные, обработанные воркером, если они есть
  const erChartData: ChartData<'scatter' | 'line'> | null = chartDatasets.length > 0
    ? { datasets: chartDatasets }
    : null;  

  // --- СТЕЙТЫ ДЛЯ ПАГИНАЦИИ И СОРТИРОВКИ ---
  const [page, setPage] = React.useState(1);
  const pageSize = 10;
  const [sort, setSort] = React.useState<{column: string, direction: 'asc' | 'desc'}>({column: 'id', direction: 'desc'});
  const [sortedStats, setSortedStats] = useState<any[]>([]);

  // --- СОРТИРОВКА ---
  useEffect(() => {
    if (!analytics?.messageStats) {
      setSortedStats([]);
      return;
    }
    setIsSorting(true);
    console.time('parallelSort');
    parallelSort(analytics.messageStats, sort.column, sort.direction, 8).then(sorted => {
      setSortedStats(sorted);
      setIsSorting(false);
      console.timeEnd('parallelSort');
    });
  }, [analytics?.messageStats, sort]);

  // Поиск по данным через воркер
  const handleSearch = (query: string, field?: string) => {
    if (!query.trim() || !analytics?.messageStats) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    console.time('parallelSearch');
    parallelSearch(analytics.messageStats, query, field, 8).then(results => {
      setSearchResults(results);
      setIsSearching(false);
      console.timeEnd('parallelSearch');
    });
  };

  // Вычисляем общее количество страниц
  const totalPages = Math.ceil(sortedStats.length / pageSize);
  
  // Отбираем только нужные данные для текущей страницы
  const pagedStats = sortedStats.slice((page - 1) * pageSize, page * pageSize);

  // --- ВЫГРУЗКА В EXCEL ---
  const handleExportExcel = () => {
    try {
      // Подготавливаем данные для экспорта
    const messages = sortedStats.map(msg => ({
      id: msg.id.toString(),
      content: msg.text,
      created_at: msg.date,
      reads_count: msg.readers,
      reactions_count: msg.reactions,
      thread: { id: 0, messages_count: msg.threadComments, chat_id: 0 },
      chat_id: '',
      readBy: [],
      reactions: [],
      user_id: undefined,
      createdAt: msg.date,
    }));
      
      // Показываем сообщение о начале экспорта при большом объеме данных
      if (messages.length > 1000) {
        toast({
          title: "Подготовка экспорта",
          description: "Пожалуйста, подождите. Обрабатываем большой объем данных.",
          variant: "default",
        });
      }
      
      // Используем оптимизированный экспорт с воркером
      prepareDataForExport(messages, (processedData) => {
        exportToExcel(processedData, {} as any);
        
        // Сообщаем об успешном экспорте при большом объеме данных
        if (messages.length > 1000) {
          toast({
            title: "Экспорт завершен",
            description: "Данные успешно экспортированы в Excel",
            variant: "default",
          });
        }
      });
    } catch (e) {
      console.error('Ошибка при экспорте в Excel', e);
      toast({
        title: "Ошибка экспорта",
        description: "Не удалось экспортировать данные",
        variant: "destructive",
      });
    }
  };

  // --- СТЕЙТ для анимации хлопков ---
  const [clapActiveIdx, setClapActiveIdx] = useState<number | null>(null);
  
  // --- СТЕЙТЫ ДЛЯ МИНИ-ИГРЫ (ПАСХАЛКА) ---
  const [gameActive, setGameActive] = useState(false);
  const [gameScore, setGameScore] = useState(0);
  const [gameLevel, setGameLevel] = useState(1);
  const [emojis, setEmojis] = useState<Array<{
    id: number, 
    x: number, 
    y: number, 
    emoji: string, 
    speed: number, 
    points: number, 
    type: string,
    avatar?: string,
    userName?: string
  }>>([]);
  const [combo, setCombo] = useState(0);
  const [comboTimer, setComboTimer] = useState<number | null>(null);
  const [effects, setEffects] = useState<Array<{id: number, x: number, y: number, text: string, color: string, expires: number}>>([]);
  const [nextLevelProgress, setNextLevelProgress] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  // Анимация новой жизни
  const [newLifeAnimation, setNewLifeAnimation] = useState(false);
  // Специальные эффекты
  const [specialEffects, setSpecialEffects] = useState<Array<{
    type: string,
    x?: number,
    y?: number,
    radius?: number,
    userName?: string,
    expires: number
  }>>([]);
  // Сохраненные суперспособности
  const [savedPowers, setSavedPowers] = useState<Array<{
    id: number,
    type: string,
    name: string,
    description: string,
    userName?: string,
    icon: string
  }>>([]);
  
  const gameRef = useRef<HTMLDivElement>(null);
  const gameInterval = useRef<number | null>(null);
  const emojiCounter = useRef(0);
  const effectCounter = useRef(0);
  const missedEmojis = useRef<number[]>([]);
  const powerCounter = useRef(0);
  
  // Конфигурация игры
  const gameConfig = {
    baseInterval: 1100, // Начальный интервал между смайликами (увеличиваем для снижения сложности)
    baseSpeed: 0.7, // Начальная базовая скорость (уменьшаем для снижения сложности)
    pointsToNextLevel: 15, // Больше очков для перехода на следующий уровень
    maxLevel: 8,
    comboTimeout: 1200, // Время в мс для комбо
    comboMultipliers: [1, 1, 1.2, 1.5, 2, 2.5, 3], // Множители за комбо
    levelSpeedMultiplier: 0.1, // Уменьшаем прирост скорости с каждым уровнем
    startingLives: 3, // Начальное количество жизней
    emojiSizes: {
      common: 32, // Увеличенные размеры эмоджи (px)
      rare: 36,
      epic: 42,
      special: 48,
      avatar: 40
    },
    avatarChance: 4, // Увеличиваем шанс появления аватарки
    emojiTypes: {
      common: {
        chance: 70, // Уменьшаем шанс обычных
        emojis: ['😀', '😁', '😎', '😄', '👍'],
        points: 1,
        speed: 0.85 // Снижаем скорость
      },
      rare: {
        chance: 20,
        emojis: ['🚀', '💯', '🔥', '💰', '🏆'],
        points: 2,
        speed: 1 // Снижаем скорость
      },
      epic: {
        chance: 8, // Увеличиваем шанс
        emojis: ['💎', '⭐', '🌟', '👑', '🍒'],
        points: 5,
        speed: 1.2 // Снижаем скорость
      },
      special: {
        chance: 2, // Увеличиваем шанс
        emojis: ['⏱️', '✨', '🎯', '📈', '🎪'],
        points: 10,
        speed: 1.4, // Снижаем скорость
        effect: true
      }
    },
    bonusTypes: {
      life: {
        chance: 20,
        emoji: '❤️'
      },
      slowdown: {
        chance: 40,
        emoji: '⏱️'
      },
      points: {
        chance: 40,
        emoji: '💯'
      }
    }
  };
  
  // Инициализация игры
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+G / Option+G / Cmd+G / Ctrl+G запускает игру на всех платформах
      if ((e.altKey || e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        if (!gameActive) {
          startGame();
        } else {
          endGame();
        }
      }
      
      // Esc останавливает игру
      if (e.key === 'Escape' && gameActive) {
        endGame();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameActive]);
  
  // Обработка эффектов - удаляем истекшие
  useEffect(() => {
    if (gameActive && effects.length > 0) {
      const interval = setInterval(() => {
        const now = Date.now();
        setEffects(prev => prev.filter(effect => effect.expires > now));
      }, 50);
      
      return () => clearInterval(interval);
    }
  }, [gameActive, effects.length]);
  
  // Определяем тип эмоджи с учетом вероятности
  const getRandomEmojiType = () => {
    const rand = Math.random() * 100;
    const types = Object.entries(gameConfig.emojiTypes);
    let cumulative = 0;
    
    for (const [type, config] of types) {
      cumulative += config.chance;
      if (rand <= cumulative) {
        return type;
      }
    }
    
    return 'common';
  };
  
  // Логика игры - создание и падение эмоджи
  useEffect(() => {
    if (gameActive && gameRef.current && !gameOver) {
      // Скорость создания эмоджи зависит от уровня
      const interval = Math.max(
        gameConfig.baseInterval - (gameLevel - 1) * 70, 
        200
      );
      
      // Создание новых эмоджи
      gameInterval.current = window.setInterval(() => {
        // Размеры области игры
        const gameWidth = gameRef.current?.clientWidth || 600;
        const gameHeight = gameRef.current?.clientHeight || 400;
        
        // Шанс генерации аватара пользователя вместо эмоджи
        const isAvatar = analytics?.topUsers && analytics.topUsers.length > 0 && 
                         Math.random() * 100 < (gameConfig.avatarChance + gameLevel * 0.5);
        
        if (isAvatar) {
          // Выбираем случайного пользователя из топ-10
          const randomUser = analytics.topUsers[Math.floor(Math.random() * Math.min(analytics.topUsers.length, 10))];
          
          // Создаем аватар-эмоджи
          const avatarEmoji = {
            id: emojiCounter.current++,
            x: Math.random() * (gameWidth - 40),
            y: -40, // Чуть выше, чем обычные эмоджи
            emoji: '👤', // Значение по умолчанию, если аватар не загрузится
            avatar: randomUser.avatar || undefined, // URL аватара
            userName: randomUser.name,
            speed: 0.8 + (gameLevel * 0.1), // Аватары двигаются медленнее
            points: 15 + Math.floor(randomUser.score), // Очки зависят от рейтинга пользователя
            type: 'avatar'
          };
          
          // Добавляем аватар в массив эмоджи
          setEmojis(prev => [
            ...prev.filter(e => e.y < gameHeight + 30),
            avatarEmoji
          ]);
        } else {
          // Определяем тип эмоджи с учетом вероятности
          const emojiType = getRandomEmojiType();
          const typeConfig = gameConfig.emojiTypes[emojiType as keyof typeof gameConfig.emojiTypes];
          
          // Выбираем эмоджи из списка для этого типа
          const emoji = typeConfig.emojis[Math.floor(Math.random() * typeConfig.emojis.length)];
          
          // Создаем новый эмоджи
          const newEmoji = {
            id: emojiCounter.current++,
            x: Math.random() * (gameWidth - 40),
            y: -30,
            emoji: emoji,
            // Скорость зависит от типа и уровня
            speed: typeConfig.speed * (1 + gameConfig.levelSpeedMultiplier * (gameLevel - 1)) * (0.9 + Math.random() * 0.3),
            points: typeConfig.points,
            type: emojiType
          };
          
          // Обновляем массив эмоджи - добавляем новый и удаляем те, что упали за границу
          setEmojis(prev => [
            ...prev.filter(e => e.y < gameHeight + 30),
            newEmoji
          ]);
        }
      }, interval);
      
      // Интервал для движения эмоджи вниз
      const moveInterval = window.setInterval(() => {
        const gameHeight = gameRef.current?.clientHeight || 400;
        const gameWidth = gameRef.current?.clientWidth || 600;
        
        // Обновляем позиции эмоджи и проверяем, не упали ли они за пределы экрана
        setEmojis(prev => {
          const updatedEmojis = prev.map(emoji => ({
            ...emoji,
            y: emoji.y + emoji.speed * gameConfig.baseSpeed
          }));
          
          // Проверяем, какие эмоджи вышли за пределы экрана
          const escapedEmojiIds = updatedEmojis
            .filter(e => e.y > gameHeight + 30 && !missedEmojis.current.includes(e.id))
            .map(e => e.id);
          
          // Если есть пропущенные эмоджи - снимаем жизнь
          if (escapedEmojiIds.length > 0) {
            missedEmojis.current = [...missedEmojis.current, ...escapedEmojiIds];
            setLives(prev => {
              const newLives = prev - escapedEmojiIds.length;
              
              // Показываем эффект пропущенного эмоджи
              escapedEmojiIds.forEach(() => {
                // Добавляем эффект -1 жизнь внизу
                setEffects(prevEffects => [...prevEffects, {
                  id: effectCounter.current++,
                  x: gameWidth / 2,
                  y: gameHeight - 30,
                  text: '💔 -1',
                  color: '#ff4040',
                  expires: Date.now() + 1000
                }]);
              });
              
              // Если жизни закончились - конец игры
              if (newLives <= 0) {
                setGameOver(true);
                endGame();
              }
              
              return Math.max(0, newLives);
            });
          }
          
          // Возвращаем обновленный массив, исключая упавшие эмоджи
          return updatedEmojis.filter(e => e.y <= gameHeight + 30);
        });
      }, 16); // 60fps примерно
      
      // Обработка специальных эффектов
      const specialEffectsInterval = window.setInterval(() => {
        // Удаляем эффекты, время которых истекло
        const now = Date.now();
        setSpecialEffects(prev => prev.filter(effect => effect.expires > now));
      }, 100);
      
      return () => {
        if (gameInterval.current) clearInterval(gameInterval.current);
        clearInterval(moveInterval);
        clearInterval(specialEffectsInterval);
      };
    }
  }, [gameActive, gameLevel, gameOver, analytics?.topUsers]);
  
  // Сбрасываем комбо через время
  useEffect(() => {
    if (combo > 0) {
      // Очищаем предыдущий таймер
      if (comboTimer !== null) {
        clearTimeout(comboTimer);
      }
      
      // Создаем новый таймер для сброса комбо
      const timer = window.setTimeout(() => {
        setCombo(0);
      }, gameConfig.comboTimeout);
      
      setComboTimer(timer as unknown as number);
      
      return () => {
        if (comboTimer !== null) clearTimeout(comboTimer);
      };
    }
  }, [combo]);
  
  // Начало игры
  const startGame = () => {
    setGameActive(true);
    setGameScore(0);
    setGameLevel(1);
    setEmojis([]);
    setCombo(0);
    setNextLevelProgress(0);
    setLives(gameConfig.startingLives);
    setGameOver(false);
    emojiCounter.current = 0;
    effectCounter.current = 0;
    missedEmojis.current = [];
    
    // Показываем сообщение о начале игры
    toast({
      title: "Мини-игра активирована!",
      description: "Ловите смайлики, кликая по ним. У вас 3 жизни - не пропустите слишком много!",
      variant: "default",
      duration: 3000,
    });
  };
  
  // Конец игры
  const endGame = () => {
    setGameActive(false);
    if (gameInterval.current) clearInterval(gameInterval.current);
    
    // Сообщение с результатом
    toast({
      title: gameOver ? "Игра окончена! Жизни закончились." : "Игра завершена!",
      description: `Вы набрали ${gameScore} очков, достигнув ${gameLevel} уровня.`,
      variant: gameOver ? "destructive" : "default"
    });
  };
  
  // Обработка клика по эмоджи или аватару
  const handleEmojiClick = (id: number) => {
    // Находим эмоджи по id
    const clickedEmoji = emojis.find(e => e.id === id);
    if (clickedEmoji) {
      // Удаляем эмоджи из массива
      setEmojis(prev => prev.filter(e => e.id !== id));
      
      // Увеличиваем комбо
      setCombo(prev => prev + 1);
      
      // Рассчитываем множитель комбо
      const comboMultiplier = combo < gameConfig.comboMultipliers.length 
        ? gameConfig.comboMultipliers[combo]
        : gameConfig.comboMultipliers[gameConfig.comboMultipliers.length - 1];
      
      // Если это аватар - применяем особую логику
      if (clickedEmoji.type === 'avatar') {
        // Бонус очков за аватар (с учетом комбо)
        const avatarPoints = Math.round(clickedEmoji.points * comboMultiplier);
        
        // Имя пользователя
        const nameText = clickedEmoji.userName || 'Пользователь';
        
        // Проверяем, есть ли особый бонус для этого пользователя
        const specialBonus = getSpecialBonusByName(nameText);
        
        if (specialBonus) {
          // Если бонус можно сохранить, показываем диалог для выбора действия
          if (specialBonus.saveable) {
            // Начисляем базовые очки в любом случае
            setGameScore(prev => prev + avatarPoints);
            
            // Показываем уведомление с выбором - активировать сейчас или сохранить на потом
            toast({
              title: `Особый бонус от ${nameText}!`,
              description: (
        <div className="flex flex-col gap-2">
                  <p>{specialBonus.description}</p>
                  <div className="flex gap-2 mt-1">
                    <button 
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                      onClick={() => {
                        specialBonus.action(false);
                        // Добавляем анимацию использования способности
                        setEffects(prev => [...prev, {
                          id: effectCounter.current++,
                          x: clickedEmoji.x,
                          y: clickedEmoji.y - 40,
                          text: "АКТИВИРОВАНО! ✅",
                          color: '#22c55e', // зеленый
                          expires: Date.now() + 1500
                        }]);
                        
                        toast({
                          title: "Способность использована!",
                          description: "Суперспособность успешно активирована и израсходована.",
                          variant: "default",
                          duration: 1500,
                        });
                      }}
                    >
                      Активировать
                    </button>
                    <button 
                      className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-sm"
                      onClick={() => {
                        specialBonus.action(true);
                        // Добавляем анимацию сохранения способности
                        setEffects(prev => [...prev, {
                          id: effectCounter.current++,
                          x: clickedEmoji.x,
                          y: clickedEmoji.y - 40,
                          text: "СОХРАНЕНО! 💾",
                          color: '#8b5cf6', // фиолетовый
                          expires: Date.now() + 1500
                        }]);
                      }}
                    >
                      Сохранить
                    </button>
          </div>
        </div>
              ),
              variant: "default",
              duration: 6000,
            });
            
            // Добавляем эффект при клике (имя и бонус)
            setEffects(prev => [...prev, {
              id: effectCounter.current++,
              x: clickedEmoji.x,
              y: clickedEmoji.y - 20,
              text: `${nameText}: БОНУС!`,
              color: '#8b5cf6',
              expires: Date.now() + 1500
            }]);
          } else {
            // Обычное поведение для несохраняемых бонусов
            toast({
              title: `Особый бонус от ${nameText}!`,
              description: specialBonus.description,
              variant: "default",
              duration: 3000,
            });
            
            // Активируем особый бонус
            specialBonus.action();
            
            // Начисляем очки
            setGameScore(prev => prev + avatarPoints);
          }
        } else {
          // Стандартный бонус от аватара
          // Добавляем эффект при клике (имя пользователя и очки)
          setEffects(prev => [...prev, {
            id: effectCounter.current++,
            x: clickedEmoji.x,
            y: clickedEmoji.y - 20,
            text: `${nameText}: +${avatarPoints}!`,
            color: '#8b5cf6', // Фиолетовый цвет для аватаров
            expires: Date.now() + 1500
          }]);
          
          // 50% шанс получить бонус при ловле аватара
          if (Math.random() > 0.5) {
            // Возможные бонусы от аватаров
            const bonuses = [
              { text: '🛡️ Щит на 10 секунд!', action: 'shield' },
              { text: '⏱️ Замедление времени!', action: 'slow' },
              { text: '💎 Двойные очки 15 сек!', action: 'double' },
              { text: '❤️ +1 Жизнь!', action: 'life' }
            ];
            
            // Выбираем случайный бонус
            const bonus = bonuses[Math.floor(Math.random() * bonuses.length)];
            
            // Показываем сообщение о бонусе
            toast({
              title: `Бонус от ${nameText}!`,
              description: bonus.text,
              variant: "default",
              duration: 3000,
            });
            
            // Особая обработка для бонуса жизни
            if (bonus.action === 'life') {
              // Проверяем, нужно ли добавлять жизнь (не превышен ли максимум)
              if (lives < 5) {
                setLives(prev => Math.min(prev + 1, 5));
                // Активируем анимацию новой жизни
                setNewLifeAnimation(true);
                // Сбрасываем анимацию через 1.5 секунды
                setTimeout(() => setNewLifeAnimation(false), 1500);
              }
            }
          }
          
          // Добавляем очки за аватар
          setGameScore(prev => prev + avatarPoints);
        }
      } else {
        // Обычная логика для эмоджи
        // Вычисляем очки с учетом комбо
        const pointsEarned = Math.round(clickedEmoji.points * comboMultiplier);
        
        // Добавляем очки к счету
        setGameScore(prev => {
          const newScore = prev + pointsEarned;
          
          // Проверяем, не пора ли перейти на следующий уровень
          const pointsForLevel = gameConfig.pointsToNextLevel * gameLevel;
          const newProgress = ((newScore % pointsForLevel) / pointsForLevel) * 100;
          setNextLevelProgress(newProgress);
          
          // Если набрали достаточно очков и не на максимальном уровне - повышаем уровень
          if (newScore >= gameConfig.pointsToNextLevel * gameLevel && gameLevel < gameConfig.maxLevel) {
            setGameLevel(lvl => lvl + 1);
            
            // Показываем уведомление о новом уровне
            toast({
              title: `Уровень ${gameLevel + 1}!`,
              description: "Скорость увеличена, больше редких смайлов!",
              variant: "default",
              duration: 1500,
            });
          }
          
          return newScore;
        });
        
        // Создаем эффект при клике (+очки)
        const pointsText = pointsEarned > 1 ? `+${pointsEarned}` : '+1';
        const comboText = combo > 1 ? ` x${combo}` : '';
        const effectColor = combo > 3 ? '#ff9500' : combo > 1 ? '#3b82f6' : '#6b7280';
        
        setEffects(prev => [...prev, {
          id: effectCounter.current++,
          x: clickedEmoji.x,
          y: clickedEmoji.y,
          text: pointsText + comboText,
          color: effectColor,
          expires: Date.now() + 1000
        }]);
        
        // Обработка специальных смайликов
        if (clickedEmoji.type === 'special') {
          // Случайный бонус - шанс получить жизнь или другой бонус
          const rand = Math.random() * 100;
          
          if (rand < 30) {
            // 30% шанс получить дополнительную жизнь
            if (lives < 5) {  // Проверяем, не достигнут ли максимум
              setLives(prev => Math.min(prev + 1, 5));
              // Активируем анимацию новой жизни
              setNewLifeAnimation(true);
              // Сбрасываем анимацию через 1.5 секунды
              setTimeout(() => setNewLifeAnimation(false), 1500);
            }
            
            // Добавляем эффект +1 жизнь
            setEffects(prev => [...prev, {
              id: effectCounter.current++,
              x: clickedEmoji.x,
              y: clickedEmoji.y - 30,
              text: '❤️ +1',
              color: '#ff3366',
              expires: Date.now() + 1500
            }]);
            
            toast({
              title: "Бонус: Дополнительная жизнь!",
              description: "Вы получили дополнительную жизнь.",
              variant: "default",
              duration: 1500,
            });
          } else {
            // Выбираем случайный эффект
            const effects = [
              'Замедление времени!',
              'Двойные очки!',
              'Бонус очков!',
              'Супер-комбо!'
            ];
            const effect = effects[Math.floor(Math.random() * effects.length)];
            
            toast({
              title: "Специальный смайлик!",
              description: effect,
              variant: "default",
              duration: 1500,
            });
            
            // +50 очков за особый смайл
            setGameScore(s => s + 50);
          }
        }
      }
    }
  };

  // Функция для проверки особых имен пользователей и выбора специального бонуса
  const getSpecialBonusByName = (userName: string) => {
    // Приведем имя к нижнему регистру для нечувствительности к регистру
    const lowerName = userName.toLowerCase();
    
    // Проверка на конкретные имена (можно добавить больше)
    if (lowerName.includes('артемий') || lowerName.includes('артем') || 
        lowerName.includes('поминчук') || lowerName.includes('artem')) {
      return {
        name: 'Звуковая волна',
        type: 'soundwave',
        description: 'Звуковая волна уничтожает все эмоджи на экране!',
        icon: '🔊',
        saveable: true,
        action: (shouldSave = false) => {
          if (shouldSave) {
            // Сохраняем способность для использования позже
            setSavedPowers(prev => {
              // Проверяем, не слишком ли много способностей сохранено
              // Максимальное количество сохраненных способностей - 3
              const maxPowers = 3;
              
              // Новая способность
              const newPower = {
                id: powerCounter.current++,
                type: 'soundwave',
                name: 'Звуковая волна',
                description: 'Звуковая волна уничтожает все эмоджи на экране!',
                userName: 'Артемий Поминчук',
                icon: '🔊'
              };
              
              // Если уже максимальное количество, удаляем самую старую и показываем уведомление
              if (prev.length >= maxPowers) {
                // Получаем самую старую способность (с наименьшим id)
                const oldestPower = [...prev].sort((a, b) => a.id - b.id)[0];
                
                // Показываем уведомление о сбросе
                toast({
                  title: "Сброс старой способности!",
                  description: `Способность "${oldestPower.name}" автоматически сброшена, т.к. максимальное количество сохраненных способностей - ${maxPowers}.`,
                  variant: "destructive",
                  duration: 3500,
                });
                
                // Добавляем эффект удаления способности
                const gameWidth = gameRef.current?.clientWidth || 600;
                setEffects(prev => [...prev, {
                  id: effectCounter.current++,
                  x: gameWidth - 30,
                  y: 70 + 60, // Позиция на первой кнопке способности
                  text: `${oldestPower.icon} ❌`,
                  color: '#ff4040',
                  expires: Date.now() + 1000
                }]);
                
                // Возвращаем новый массив с удаленной самой старой и добавленной новой способностью
                return [...prev.filter(p => p.id !== oldestPower.id), newPower];
              }
              
              // Иначе просто добавляем новую
              return [...prev, newPower];
            });
            
            toast({
              title: "Суперспособность сохранена!",
              description: "Звуковая волна Артемия Поминчука добавлена в инвентарь.",
              variant: "default",
              duration: 3000,
            });
            
            return true;
          }
          
          // Размеры экрана
          const gameWidth = gameRef.current?.clientWidth || 600;
          const gameHeight = gameRef.current?.clientHeight || 400;
          
          // Создаем улучшенный эффект звуковой волны с несколькими концентрическими кругами
          // Запускаем 5 волн с разными интервалами для более мощного эффекта
          const waveCount = 5;
          for (let i = 0; i < waveCount; i++) {
            setTimeout(() => {
              setSpecialEffects(prev => [...prev, {
                type: 'soundwave',
                x: gameWidth / 2,
                y: gameHeight / 2,
                radius: 0,
                userName: 'Артемий Поминчук',
                expires: Date.now() + 1500 + (i * 200)
              }]);
              
              // Добавляем звуковые эффекты по периметру экрана для более мощного визуального воздействия
              if (i === 0 || i === 2 || i === 4) {
                const positions = [
                  { x: gameWidth * 0.25, y: gameHeight * 0.25 },
                  { x: gameWidth * 0.75, y: gameHeight * 0.25 },
                  { x: gameWidth * 0.25, y: gameHeight * 0.75 },
                  { x: gameWidth * 0.75, y: gameHeight * 0.75 }
                ];
                
                // Для первых двух волн добавляем эффекты на углах
                positions.forEach((pos, pIdx) => {
                  setTimeout(() => {
                    setSpecialEffects(prev => [...prev, {
                      type: 'soundwave',
                      x: pos.x,
                      y: pos.y,
                      radius: 0,
                      userName: 'Артемий Поминчук',
                      expires: Date.now() + 1200
                    }]);
                  }, pIdx * 50); // Небольшая задержка между углами
                });
              }
            }, i * 160); // Запускаем волны с интервалом
          }
          
          // Через небольшую задержку удаляем все эмоджи и начисляем очки
          setTimeout(() => {
            // Подсчитываем, сколько эмоджи на экране
            const emojiCount = emojis.length;
            // Бонусные очки за каждый уничтоженный эмоджи
            const bonusPoints = emojiCount * 8; // Увеличиваем бонус для сохраненной способности
            
            // Удаляем все эмоджи
            setEmojis([]);
            
            // Начисляем очки
            setGameScore(prev => prev + bonusPoints);
            
            // Показываем эффект
            if (emojiCount > 0) {
              // Размещаем несколько эффектов по экрану для более впечатляющего вида
              const positions = [
                { x: gameWidth / 2, y: gameHeight / 2 },
                { x: gameWidth / 4, y: gameHeight / 4 },
                { x: gameWidth * 3/4, y: gameHeight / 4 },
                { x: gameWidth / 4, y: gameHeight * 3/4 },
                { x: gameWidth * 3/4, y: gameHeight * 3/4 }
              ];
              
              positions.forEach((pos, idx) => {
                setTimeout(() => {
                  setEffects(prev => [...prev, {
                    id: effectCounter.current++,
                    x: pos.x,
                    y: pos.y,
                    text: idx === 0 ? `МЕГА ВОЛНА +${bonusPoints}!` : '💥',
                    color: '#ff9900',
                    expires: Date.now() + 2000
                  }]);
                }, idx * 100);
              });
            }
          }, 600);
          
          return true;
        }
      };
    }
    
    // Другие специальные пользователи и их бонусы
    if (lowerName.includes('анна') || lowerName.includes('ann')) {
      return {
        name: 'Замедление времени',
        type: 'slowtime',
        description: 'Все эмоджи замедляются на 10 секунд!',
        icon: '⏱️',
        saveable: true,
        action: (shouldSave = false) => {
          if (shouldSave) {
            // Сохраняем способность для использования позже
            setSavedPowers(prev => [...prev, {
              id: powerCounter.current++,
              type: 'slowtime',
              name: 'Замедление времени',
              description: 'Все эмоджи замедляются на 10 секунд!',
              userName: 'Анна',
              icon: '⏱️'
            }]);
            
            toast({
              title: "Суперспособность сохранена!",
              description: "Замедление времени Анны добавлено в инвентарь.",
              variant: "default",
              duration: 3000,
            });
            
            return true;
          }
          
          // Эффект замедления
          // ... implementation ...
          return true;
        }
      };
    }
    
    // Если нет особых бонусов для этого имени, возвращаем null
    return null;
  };

  // Активация сохраненной суперспособности
  const activateSavedPower = (id: number) => {
    // Находим суперспособность по id
    const power = savedPowers.find(p => p.id === id);
    if (!power) return;
    
    // Создаем визуальный эффект "расходования" способности перед ее удалением
    // Сначала создаем анимацию затухания на месте бонуса
    const gameWidth = gameRef.current?.clientWidth || 600;
    const gameHeight = gameRef.current?.clientHeight || 400;

    // Добавляем эффект исчезновения на месте иконки способности
    setEffects(prev => [...prev, {
      id: effectCounter.current++,
      x: gameWidth - 30, // примерное положение панели суперспособностей
      y: 70, // положение первой способности на панели 
      text: `${power.icon} 💥`,
      color: '#ff4040',
      expires: Date.now() + 1000
    }]);
    
    // Добавляем эффект на всю игровую область для мощной способности
    if (power.type === 'soundwave') {
      // Добавляем эффект на весь экран
      setEffects(prev => [...prev, {
        id: effectCounter.current++,
        x: gameWidth / 2,
        y: gameHeight / 4, 
        text: `СУПЕРСПОСОБНОСТЬ АКТИВИРОВАНА!`,
        color: '#ff9900',
        expires: Date.now() + 1500
      }]);
    }
    
    // Удаляем способность из списка сохраненных
    setSavedPowers(prev => prev.filter(p => p.id !== id));
    
    // Показываем уведомление о применении
    toast({
      title: `Активация: ${power.name}!`,
      description: `${power.description} Способность израсходована.`,
      variant: "default",
      duration: 2000,
    });
    
    // Применяем эффект в зависимости от типа
    if (power.type === 'soundwave') {
      // Создаем улучшенный эффект звуковой волны с несколькими концентрическими кругами
      // Запускаем 5 волн с разными интервалами для более мощного эффекта
      const waveCount = 5;
      for (let i = 0; i < waveCount; i++) {
        setTimeout(() => {
          setSpecialEffects(prev => [...prev, {
            type: 'soundwave',
            x: gameWidth / 2,
            y: gameHeight / 2,
            radius: 0,
            userName: power.userName,
            expires: Date.now() + 1500 + (i * 200)
          }]);
          
          // Добавляем звуковые эффекты по периметру экрана для более мощного визуального воздействия
          if (i === 0 || i === 2 || i === 4) {
            const positions = [
              { x: gameWidth * 0.25, y: gameHeight * 0.25 },
              { x: gameWidth * 0.75, y: gameHeight * 0.25 },
              { x: gameWidth * 0.25, y: gameHeight * 0.75 },
              { x: gameWidth * 0.75, y: gameHeight * 0.75 }
            ];
            
            // Для первых двух волн добавляем эффекты на углах
            positions.forEach((pos, pIdx) => {
              setTimeout(() => {
                setSpecialEffects(prev => [...prev, {
                  type: 'soundwave',
                  x: pos.x,
                  y: pos.y,
                  radius: 0,
                  userName: power.userName,
                  expires: Date.now() + 1200
                }]);
              }, pIdx * 50); // Небольшая задержка между углами
            });
          }
        }, i * 160); // Запускаем волны с интервалом
      }
      
      // Через небольшую задержку удаляем все эмоджи и начисляем очки
      setTimeout(() => {
        // Подсчитываем, сколько эмоджи на экране
        const emojiCount = emojis.length;
        // Бонусные очки за каждый уничтоженный эмоджи
        const bonusPoints = emojiCount * 8; // Увеличиваем бонус для сохраненной способности
        
        // Удаляем все эмоджи
        setEmojis([]);
        
        // Начисляем очки
        setGameScore(prev => prev + bonusPoints);
        
        // Показываем эффект
        if (emojiCount > 0) {
          // Размещаем несколько эффектов по экрану для более впечатляющего вида
          const positions = [
            { x: gameWidth / 2, y: gameHeight / 2 },
            { x: gameWidth / 4, y: gameHeight / 4 },
            { x: gameWidth * 3/4, y: gameHeight / 4 },
            { x: gameWidth / 4, y: gameHeight * 3/4 },
            { x: gameWidth * 3/4, y: gameHeight * 3/4 }
          ];
          
          positions.forEach((pos, idx) => {
            setTimeout(() => {
              setEffects(prev => [...prev, {
                id: effectCounter.current++,
                x: pos.x,
                y: pos.y,
                text: idx === 0 ? `МЕГА ВОЛНА +${bonusPoints}!` : '💥',
                color: '#ff9900',
                expires: Date.now() + 2000
              }]);
            }, idx * 100);
          });
        }
      }, 600);
    } else if (power.type === 'slowtime') {
      // Логика для замедления времени
      // ...
    }
  };

  // Генерация инициалов из имени пользователя
  const getInitials = (name: string | undefined): string => {
    if (!name || name.trim() === '') return '?';
    
    // Разбиваем имя на части по пробелам
    const parts = name.trim().split(' ');
    
    if (parts.length === 1) {
      // Если только одно слово, берем первую букву
      return parts[0].charAt(0).toUpperCase();
    } else {
      // Берем первые буквы первого и последнего слова
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {analytics && (
        <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-lg px-4 py-3 mb-4">
          <Gauge className="w-6 h-6 text-primary" />
          <div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              Общий ER
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="whitespace-pre-line p-2 max-w-xs er-tooltip">
                    <div className="text-xs text-left">
                      <b>Общий коэффициент вовлечённости (ER)</b> — среднее значение ER по всем сообщениям за выбранный период или по чату. Показывает, какой процент прочитавших проявил активность (реакция, комментарий).
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="text-3xl font-bold text-primary">{formatEngagementRate(analytics.engagementRate)}%</div>
          </div>
        </div>
      )}
      {(!isLoading && loadingProgress >= 100) && (
        <>
          {/* Топ пользователей */}
      {analytics?.topUsers && analytics.topUsers.length > 0 && (
            <div className="mt-2">
          <h3 className="text-base font-semibold mb-2">Топ-10 самых активных пользователей</h3>
          <div className="overflow-x-auto rounded-lg shadow-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">Пользователь</TableHead>
                      <TableHead className="text-center">Сообщения</TableHead>
                      <TableHead className="text-center">Комментарии</TableHead>
                      <TableHead className="text-center">Реакции</TableHead>
                      <TableHead className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          Баллы
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="whitespace-pre-line p-1 max-w-xs er-tooltip">
                                <div className="text-xs text-left">
                                  Баллы = Сообщения + Комментарии × 0.8 + Реакции × 0.25 Баллы отражают общий вклад пользователя в активность чата.
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.topUsers.map((user, idx) => (
                      <TableRow key={user.user_id} 
                        className={`hover:bg-primary/5 transition 
                          ${idx < 3 ? 'animate-pop-top3' : ''}`}
                      >
                    <TableCell>
                          <div 
                            className="flex items-center gap-2"
                            onMouseEnter={() => {
                              if (idx === 0) {
                                setClapActiveIdx(0);
                                setTimeout(() => setClapActiveIdx(null), 1000);
                              }
                            }}
                            onMouseLeave={() => {
                              if (idx === 0) setClapActiveIdx(null);
                            }}
                          >
                      <div className="flex items-center gap-2">
                              <div className={`relative ${idx === 0 ? 'top1-container' : ''}`}>
                                {idx === 0 && (
                                  <div className="top1-crown">
                                    👑
                                    <span className="sparkle sparkle-1"></span>
                                    <span className="sparkle sparkle-2"></span>
                                    <span className="sparkle sparkle-3"></span>
                                  </div>
                                )}
                                <Avatar className={`w-8 h-8 ${idx === 0 ? 'top1-avatar' : ''} ${
                                  idx === 0 ? 'border border-yellow-400' : 
                                  idx === 1 ? 'border border-gray-400' : 
                                  idx === 2 ? 'border border-amber-700' : ''
                                }`}>
                                  <AvatarImage src={user.avatar || undefined} alt={user.name || ''} />
                                  <AvatarFallback className={`text-xs font-bold ${
                                    idx === 0 ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' : 
                                    idx === 1 ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' : 
                                    idx === 2 ? 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200' : 
                                    ''
                                  }`}>
                                    {getInitials(user.name)}
                                  </AvatarFallback>
                                </Avatar>
                                
                                {idx === 0 && (
                                  <span title="1 место" className="absolute -bottom-1 -right-1 text-lg select-none">🥇</span>
                                )}
                                {idx === 1 && (
                                  <span title="2 место" className="absolute -bottom-1 -right-1 text-lg select-none">🥈</span>
                                )}
                                {idx === 2 && (
                                  <span title="3 место" className="absolute -bottom-1 -right-1 text-lg select-none">🥉</span>
                                )}
                              </div>
                            </div>
                        <span className="font-medium">
                          {user.name && user.name.trim() !== ''
                            ? user.name
                            : user.user_id?.toString() || '—'}
                        </span>
                        </div>
                      </TableCell>
                    <TableCell className="text-center">{user.messages}</TableCell>
                    <TableCell className="text-center">{user.threadMessages}</TableCell>
                    <TableCell className="text-center">{user.reactions}</TableCell>
                    <TableCell className="text-center font-bold text-primary">{user.score.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
                        </div>
      )}

          {/* График ER */}
          {erChartData && (
            <div className="mt-8">
              <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
                Средний коэффициент вовлеченности (ER) по чату за период
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="whitespace-pre-line p-2 max-w-xs er-tooltip">
                      <div className="text-xs text-left">
                        <b>Коэффициент вовлеченности (ER)</b> — это отношение числа пользователей, совершивших действие (реакция, комментарий), к числу прочитавших сообщение. ER помогает оценить, насколько аудитория активно взаимодействует с контентом чата.
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </h3>
              <div ref={gameRef} className="relative">
                <Scatter data={erChartData as any} options={{
                  responsive: true,
                  plugins: { 
                    legend: { display: true },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          const d: any = context.raw;
                          if (context.dataset.type === 'scatter' && d) {
                            return `ID: ${d.id} | ER: ${d.y}% | ${d.text?.slice(0, 40)}`;
                          }
                          return `ER: ${d.y ?? context.parsed.y}%`;
                        }
                      }
                    }
                  },
                  scales: {
                    y: { beginAtZero: true, max: 100, title: { display: true, text: 'ER (%)' } },
                    x: { title: { display: true, text: 'Дата' }, type: 'time', time: { unit: 'day', tooltipFormat: 'yyyy-MM-dd HH:mm' } }
                  }
                }} />
                
                {/* Слой для мини-игры */}
                {gameActive && (
                  <div className="absolute inset-0 overflow-hidden cursor-pointer">
                    {/* Игровое HUD - сдвигаю ниже */}
                    <div className="absolute top-10 left-2 right-2 flex items-center gap-3 z-10 bg-black/20 dark:bg-white/10 p-2 rounded-lg backdrop-blur-sm">
                      {/* Счет и уровень */}
                      <div className="bg-white/80 dark:bg-black/70 px-3 py-1 rounded-full text-sm font-medium">
                        Счет: {gameScore}
                      </div>
                      
                      <div className="bg-white/80 dark:bg-black/70 px-3 py-1 rounded-full text-sm font-medium">
                        Уровень: {gameLevel}
                      </div>
                      
                      {/* Индикатор жизней */}
                      <div className="bg-white/80 dark:bg-black/70 px-3 py-1 rounded-full text-sm font-medium flex items-center relative group">
                        {/* Анимация новой жизни */}
                        {newLifeAnimation && (
                          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 new-life-animation">
                            <div className="text-2xl">❤️</div>
                            <div className="text-xs font-bold text-green-500 mt-1">+1 ЖИЗНЬ</div>
                          </div>
                        )}
                        
                        {/* Используем массив для отображения сердечек */}
                        {[...Array(gameConfig.startingLives)].map((_, i) => (
                          <span 
                            key={i} 
                            className={`transition-all duration-300 mx-0.5 ${
                              i < lives ? 'text-red-500 scale-100' : 'text-gray-400 scale-90 opacity-70'
                            }`}
                            style={{
                              transform: i < lives ? 'scale(1)' : 'scale(0.9)',
                              animation: lives === i + 1 ? 'pulse 1s infinite' : 'none'
                            }}
                          >
                            ❤️
                          </span>
                        ))}
                        
                        {/* Число жизней (на hover) */}
                        <span className="ml-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                          ({lives}/{gameConfig.startingLives})
                        </span>
                      </div>
                      
                      {/* Индикатор комбо */}
                      {combo > 1 && (
                        <div className="bg-orange-500/80 dark:bg-orange-600/80 px-3 py-1 rounded-full text-sm text-white font-medium animate-pulse">
                          Комбо x{combo}
                        </div>
                      )}
                      
                      {/* Прогресс до следующего уровня */}
                      <div className="flex-grow flex items-center">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-300 ease-out"
                            style={{ 
                              width: `${nextLevelProgress}%`,
                              background: `linear-gradient(90deg, #3b82f6 0%, #8b5cf6 ${nextLevelProgress}%)` 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Панель суперспособностей */}
                    {savedPowers.length > 0 && (
                      <div className="absolute top-24 right-2 z-20 bg-black/30 dark:bg-white/10 p-2 rounded-lg backdrop-blur-sm">
                        <div className="text-xs font-medium text-white mb-1 text-center">Суперспособности</div>
                        <div className="flex flex-col gap-2 items-center">
                          {savedPowers.map(power => (
                            <div 
                              key={power.id}
                              className="relative group"
                            >
                              <button
                                className="w-12 h-12 rounded-full bg-purple-600/60 hover:bg-purple-600/90 flex items-center justify-center text-2xl transition-all transform hover:scale-110 border-2 border-purple-400/50 power-pulse"
                                onClick={() => {
                                  // Сначала показываем анимацию мигания перед активацией
                                  const btn = document.getElementById(`power-btn-${power.id}`);
                                  if (btn) {
                                    btn.classList.add('bright-flash');
                                    
                                    // Убираем класс через 300мс
                                    setTimeout(() => {
                                      btn.classList.remove('bright-flash');
                                      // Активируем способность после завершения анимации
                                      activateSavedPower(power.id);
                                    }, 300);
                                  } else {
                                    // Если что-то пошло не так, просто активируем
                                    activateSavedPower(power.id);
                                  }
                                }}
                                title={`Активировать: ${power.name}`}
                                id={`power-btn-${power.id}`}
                              >
                                {power.icon}
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white text-xs flex items-center justify-center text-purple-700 font-bold">{power.type === 'soundwave' ? '💥' : '⚡'}</div>
                              </button>
                              
                              {/* Всплывающая подсказка */}
                              <div className="absolute right-full mr-2 top-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white rounded px-2 py-1 text-xs whitespace-nowrap">
                                <div className="font-bold">{power.name}</div>
                                <div className="text-[10px]">{power.description}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Специальные эффекты */}
                    {specialEffects.map((effect, index) => (
                      <div key={`effect-${index}-${effect.type}`}>
                        {effect.type === 'soundwave' && (
                          <>
                            {/* Внешний круг */}
                            <div 
                              className="absolute rounded-full soundwave-effect soundwave-effect-outer"
                              style={{
                                left: effect.x,
                                top: effect.y,
                                width: '10px',
                                height: '10px',
                                transform: 'translate(-50%, -50%)',
                                background: 'radial-gradient(circle, rgba(255,153,0,0.3) 0%, rgba(255,153,0,0) 70%)',
                                animation: 'soundwave-expand 1.8s forwards'
                              }}
                            ></div>
                            {/* Средний круг */}
                            <div 
                              className="absolute rounded-full soundwave-effect"
                              style={{
                                left: effect.x,
                                top: effect.y,
                                width: '10px',
                                height: '10px',
                                transform: 'translate(-50%, -50%)',
                                background: 'radial-gradient(circle, rgba(255,153,0,0.5) 0%, rgba(255,153,0,0) 70%)',
                                animation: 'soundwave-expand 1.5s forwards'
                              }}
                            ></div>
                            {/* Внутренний круг */}
                            <div 
                              className="absolute rounded-full soundwave-effect soundwave-effect-inner"
                              style={{
                                left: effect.x,
                                top: effect.y,
                                width: '10px',
                                height: '10px',
                                transform: 'translate(-50%, -50%)',
                                background: 'radial-gradient(circle, rgba(255,153,0,0.7) 0%, rgba(255,153,0,0) 70%)',
                                animation: 'soundwave-expand 1.2s forwards'
                              }}
                            ></div>
                          </>
                        )}
                      </div>
                    ))}
                    
                    {/* Падающие эмоджи - добавляем классы в зависимости от типа */}
                    {emojis.map(emoji => (
                      <div 
                        key={emoji.id}
                        className={`absolute transition-none cursor-pointer select-none ${
                          emoji.type === 'common' ? '' :
                          emoji.type === 'rare' ? 'animate-pulse' :
                          emoji.type === 'epic' ? 'animate-bounce' :
                          emoji.type === 'avatar' ? 'animate-pulse shadow-glow' :
                          'animate-spin'
                        }`}
                        style={{ 
                          left: `${emoji.x}px`, 
                          top: `${emoji.y}px`, 
                          fontSize: `${
                            emoji.type === 'common' ? gameConfig.emojiSizes.common : 
                            emoji.type === 'rare' ? gameConfig.emojiSizes.rare : 
                            emoji.type === 'epic' ? gameConfig.emojiSizes.epic : 
                            emoji.type === 'avatar' ? gameConfig.emojiSizes.avatar :
                            gameConfig.emojiSizes.special
                          }px`,
                          filter: emoji.type === 'common' ? 'none' : 
                                 emoji.type === 'rare' ? 'drop-shadow(0 0 3px rgba(59,130,246,0.7))' :
                                 emoji.type === 'epic' ? 'drop-shadow(0 0 5px rgba(139,92,246,0.8))' :
                                 emoji.type === 'avatar' ? 'drop-shadow(0 0 8px rgba(139,92,246,1))' :
                                 'drop-shadow(0 0 8px rgba(249,115,22,0.9))',
                          zIndex: emoji.type === 'special' ? 30 : emoji.type === 'epic' ? 25 : 20
                        }}
                        onClick={() => handleEmojiClick(emoji.id)}
                      >
                        {emoji.type === 'avatar' ? (
                          <div className="relative">
                            <Avatar className="w-12 h-12 border-2 border-purple-500 shadow-glow">
                              <AvatarImage src={emoji.avatar} alt={emoji.userName || 'user'} />
                              <AvatarFallback 
                                className="text-lg font-bold text-white" 
                                style={{ 
                                  background: emoji.points > 30 ? 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)' : 
                                             emoji.points > 20 ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 
                                             'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)'
                                }}
                              >
                                {getInitials(emoji.userName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-1 -right-1 text-lg select-none">👑</div>
                          </div>
                        ) : (
                          emoji.emoji
                        )}
                      </div>
                    ))}
                    
                    {/* Плавающие эффекты при клике */}
                    {effects.map(effect => (
                      <div
                        key={effect.id}
                        className="absolute transition-all pointer-events-none select-none"
                        style={{
                          left: `${effect.x}px`,
                          top: `${effect.y}px`,
                          color: effect.color,
                          fontWeight: 'bold',
                          fontSize: '14px',
                          textShadow: '0 1px 0 rgba(0,0,0,0.3)',
                          opacity: 0.9,
                          transform: 'translateY(-20px)',
                          animation: 'floatUp 0.8s forwards'
                        }}
                      >
                        {effect.text}
                      </div>
                    ))}
                    
                    {/* Помощь при игре */}
                    <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs bg-black/40 text-white px-2 py-1 rounded-full">
                      ESC для выхода | Разные цвета = разные очки
                    </div>
                  </div>
                )}
                
                {/* Подсказка про пасхалку - немного прозрачная и маленькая */}
                <div className="absolute bottom-2 right-2 text-[10px] opacity-30 pointer-events-none">
                  ⌘/Ctrl+G
                </div>
              </div>
            </div>
          )}

      {/* Таблица по каждому сообщению за период */}
      {analytics?.messageStats && analytics.messageStats.length > 0 && (
            <div className="mt-8" style={{ overflow: 'visible' }}>
          <h3 className="text-base font-semibold mb-2 flex items-center gap-4">
            ER по каждому сообщению за период
            <Button size="sm" variant="outline" onClick={handleExportExcel} className="ml-auto flex gap-2">
              <Download className="w-4 h-4" />
              Excel
            </Button>
          </h3>
              <div className="overflow-x-auto rounded-lg shadow-md" style={{ overflow: 'visible' }}>
                {isSorting && (
                  <div className="flex items-center justify-center py-2 text-muted-foreground text-sm gap-2">
                    <Loader className="w-4 h-4 animate-spin" />
                    Сортировка данных...
                  </div>
                )}
                
                <Table style={{ overflow: 'visible' }}>
              <TableHeader>
                    <TableRow className="bg-muted/5">
                  {['id','text','date','readers','reactions','threadComments','er'].map(col => (
                    <TableHead
                      key={col}
                          className="text-center cursor-pointer select-none group hover:bg-muted/10 transition-colors"
                          onClick={() => {
                            if (isSorting) return; // Блокируем сортировку во время обработки
                            setSort(s => ({
                        column: col,
                        direction: s.column === col ? (s.direction === 'asc' ? 'desc' : 'asc') : 'desc',
                            }))
                          }}
                        >
                          {col === 'id' && (
                            <div className="flex items-center justify-center gap-1 py-2">
                              <span>ID</span>
                        {sort.column === col ? (
                                sort.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                              ) : (
                                <ArrowUpDown className="w-3.5 h-3.5 opacity-30 group-hover:opacity-60" />
                              )}
                            </div>
                          )}
                          {col === 'text' && (
                            <div className="flex items-center justify-start gap-1 py-2">
                              <span>Сообщение</span>
                              {sort.column === col ? (
                                sort.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                              ) : (
                                <ArrowUpDown className="w-3.5 h-3.5 opacity-30 group-hover:opacity-60" />
                              )}
                            </div>
                          )}
                          {col === 'date' && (
                            <div className="flex items-center justify-center gap-1 py-2">
                              <span>Дата</span>
                              {sort.column === col ? (
                                sort.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                              ) : (
                                <ArrowUpDown className="w-3.5 h-3.5 opacity-30 group-hover:opacity-60" />
                              )}
                            </div>
                          )}
                          {col === 'readers' && (
                            <div className="flex items-center justify-center gap-1 py-2">
                              <Eye className="w-3.5 h-3.5" />
                              <span>Просмотры</span>
                              {sort.column === col ? (
                                sort.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                              ) : (
                                <ArrowUpDown className="w-3.5 h-3.5 opacity-30 group-hover:opacity-60" />
                              )}
                            </div>
                          )}
                          {col === 'reactions' && (
                            <div className="flex items-center justify-center gap-1 py-2">
                              <ThumbsUp className="w-3.5 h-3.5" />
                              <span>Реакции</span>
                              {sort.column === col ? (
                                sort.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                              ) : (
                                <ArrowUpDown className="w-3.5 h-3.5 opacity-30 group-hover:opacity-60" />
                              )}
                            </div>
                          )}
                          {col === 'threadComments' && (
                            <div className="flex items-center justify-center gap-1 py-2">
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>Комментарии</span>
                              {sort.column === col ? (
                                sort.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                              ) : (
                                <ArrowUpDown className="w-3.5 h-3.5 opacity-30 group-hover:opacity-60" />
                              )}
                            </div>
                          )}
                          {col === 'er' && (
                            <div className="flex items-center justify-center gap-1 py-2">
                              <Gauge className="w-3.5 h-3.5" />
                              <span>ER (%)</span>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="whitespace-pre-line p-1 max-w-xs er-tooltip">
                                    <div className="text-xs text-left">
                                      ER = (Реакции + Комментарии) / Просмотры × 100% Показывает, какой процент прочитавших проявил активность.
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              {sort.column === col ? (
                                sort.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                              ) : (
                                <ArrowUpDown className="w-3.5 h-3.5 opacity-30 group-hover:opacity-60" />
                              )}
                            </div>
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedStats.map(msg => (
                      <TableRow key={msg.id} className="hover:bg-primary/5 transition h-[53px]">
                    <TableCell className="text-center">{msg.id}</TableCell>
                    <TableCell title={msg.text} className="max-w-[300px] truncate">{msg.text?.slice(0, 60) || msg.id}</TableCell>
                    <TableCell className="text-center">{msg.date?.slice(0, 16)}</TableCell>
                    <TableCell className="text-center">{msg.readers}</TableCell>
                    <TableCell className="text-center">{msg.reactions}</TableCell>
                    <TableCell className="text-center">{msg.threadComments}</TableCell>
                    <TableCell className="text-center font-bold text-primary">{msg.er}</TableCell>
                    </TableRow>
                ))}
                    {/* Добавляем пустые строки, если данных меньше 10 */}
                    {pagedStats.length > 0 && pagedStats.length < pageSize && Array.from({ length: pageSize - pagedStats.length }).map((_, index) => (
                      <TableRow key={`empty-${index}`} className="h-[53px] opacity-40 hover:opacity-10 transition-opacity">
                        <TableCell className="text-center text-muted/30 py-4">·</TableCell>
                        <TableCell className="text-muted/30 py-4">·</TableCell>
                        <TableCell className="text-center text-muted/30 py-4">·</TableCell>
                        <TableCell className="text-center text-muted/30 py-4">·</TableCell>
                        <TableCell className="text-center text-muted/30 py-4">·</TableCell>
                        <TableCell className="text-center text-muted/30 py-4">·</TableCell>
                        <TableCell className="text-center text-muted/30 py-4">·</TableCell>
                      </TableRow>
                    ))}
                {pagedStats.length === 0 && (
                      <>
                        <TableRow className="h-[100px]">
                          <TableCell colSpan={7} className="text-center align-middle">
                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                              <span className="text-3xl">🔍</span>
                              <span>Нет данных для отображения</span>
                              <span className="text-xs text-muted/60">Попробуйте изменить параметры поиска</span>
                            </div>
                          </TableCell>
                  </TableRow>
                        {/* Добавляем 9 пустых строк для сохранения высоты таблицы, но зарезервировали 100px под сообщение */}
                        {Array.from({ length: 8 }).map((_, index) => (
                          <TableRow key={`empty-${index}`} className="h-[53px]">
                            <TableCell colSpan={7} className="border-b border-border/10"></TableCell>
                          </TableRow>
                        ))}
                      </>
                )}
              </TableBody>
            </Table>
                
            {/* Пагинация только стрелки */}
            {totalPages > 1 && (
              <Pagination className="mt-2">
                <PaginationContent>
                  <PaginationItem>
                        <PaginationPrevious onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || isSorting} />
                  </PaginationItem>
                  <PaginationItem>
                        <span className="text-sm text-muted-foreground">
                          {page} / {totalPages}
                        </span>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationNext onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || isSorting} />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        </div>
          )}
        </>
      )}
    </div>
  );
}
