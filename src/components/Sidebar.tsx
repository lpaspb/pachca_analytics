
import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { pachkaApi } from '@/services/api';
import { LogOut } from 'lucide-react';
import { PachkaUser } from '@/types/api';
import { toast } from 'sonner';

/**
 * Пропсы для Sidebar
 */
interface SidebarProps {
  /** Колбэк для выхода из аккаунта */
  onLogout: () => void;
}

/**
 * Боковая панель с данными пользователя и кнопкой выхода
 */
export default function Sidebar({ onLogout }: SidebarProps) {
  const [user, setUser] = useState<PachkaUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Используем useRef, чтобы отслеживать, монтирован ли компонент
  const isMountedRef = useRef(true);

  useEffect(() => {
    // Устанавливаем флаг монтирования
    isMountedRef.current = true;

    /**
     * Загружает данные пользователя и обрабатывает логику сессии
     */
    const fetchUser = async () => {
      setIsLoading(true);
      try {
        const userData = await pachkaApi.getCurrentUser();
        // Проверяем, что компонент все еще монтирован
        if (isMountedRef.current) {
          if (userData) {
            setUser(userData);
          } else {
            // Если нет валидных данных пользователя, выполняем выход
            toast.error('Сессия истекла. Пожалуйста, войдите снова');
            handleLogout();
          }
        }
      } catch (error) {
        // Проверяем, что компонент все еще монтирован
        if (isMountedRef.current) {
          console.error('Error fetching user data:', error);
        }
      } finally {
        // Проверяем, что компонент все еще монтирован
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    fetchUser();

    // Очистка при размонтировании компонента
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Обработчик выхода из аккаунта
   */
  const handleLogout = () => {
    pachkaApi.clearApiKey();
    onLogout();
  };
  
  return (
    <div className="sidebar">
      <div className="flex items-center p-4 border-b border-border">
        {isLoading ? (
          <div className="w-full flex items-center justify-center p-2">
            <div className="w-4 h-4 border-t-2 border-b-2 border-primary rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white">
              {user && user.first_name ? user.first_name[0] : 'P'}
            </div>
            <div>
              <div className="font-semibold">
                {user ? `${user.first_name || ''} ${user.last_name || ''}` : 'Pachca team'}
              </div>
              {user && <div className="text-xs text-muted-foreground">{user.role}</div>}
            </div>
          </div>
        )}
      </div>
      
      <div className="flex flex-col p-2 gap-1">
        <div className="flex items-center p-2 bg-accent rounded-md text-accent-foreground">
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-xs mr-2">
            A
          </div>
          <span>Аналитика</span>
        </div>
      </div>
      
      <div className="flex-1"></div>
      
      <div className="p-4 border-t border-border">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full" 
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Выйти
        </Button>
      </div>
    </div>
  );
}
