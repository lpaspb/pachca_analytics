
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Settings, Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { pachkaApi } from '@/services/api';
import { PachkaUser } from '@/types/api';
import { toast } from 'sonner';
import { useTheme } from '@/contexts/ThemeContext';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';

interface SettingsMenuProps {
  onLogout: () => void;
}

export default function SettingsMenu({ onLogout }: SettingsMenuProps) {
  const [user, setUser] = useState<PachkaUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const fetchUser = async () => {
      setIsLoading(true);
      try {
        const userData = await pachkaApi.getCurrentUser();
        if (userData) {
          setUser(userData);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUser();
  }, []);

  const handleLogout = () => {
    toast.info('Выход выполнен');
    onLogout();
  };
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-full">
          <Settings className="h-5 w-5" />
          <span className="sr-only">Настройки</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b">
            {isLoading ? (
              <div className="w-4 h-4 border-t-2 border-b-2 border-primary rounded-full animate-spin"></div>
            ) : (
              <>
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white">
                  {user && user.first_name ? user.first_name[0] : 'P'}
                </div>
                <div>
                  <div className="font-semibold">
                    {user ? `${user.first_name || ''} ${user.last_name || ''}` : 'Пользователь Pachka'}
                  </div>
                  {user && <div className="text-xs text-muted-foreground">{user.role}</div>}
                </div>
              </>
            )}
          </div>
          
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Настройки</h4>
            
            <div className="border rounded-md p-3 bg-accent/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Тема приложения</span>
                <Toggle 
                  aria-label="Переключить тему"
                  pressed={theme === 'light'}
                  onPressedChange={toggleTheme}
                  className="p-1 h-8"
                >
                  {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                </Toggle>
              </div>
              <p className="text-xs text-muted-foreground">
                {theme === 'dark' ? 'Тёмная тема' : 'Светлая тема'}
              </p>
            </div>
            
            <div className="border rounded-md p-3 bg-accent/30">
              <p className="text-sm text-muted-foreground mb-2">Аналитика</p>
              <p className="text-xs text-muted-foreground">Доступ к аналитике чатов Pachka</p>
            </div>
          </div>
          
          <div className="pt-2 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full" 
              onClick={handleLogout}
            >
              Выйти
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
