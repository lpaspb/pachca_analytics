import { Button } from '@/components/ui/button';
import { LogOut, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { toast } from 'sonner';

interface HeaderIconsProps {
  onLogout: () => void;
}

export default function HeaderIcons({ onLogout }: HeaderIconsProps) {
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => {
    toast.info('Выход выполнен');
    onLogout();
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className="rounded-full"
        title={theme === 'dark' ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'}
      >
        {theme === 'dark' ? (
          <Sun className="h-5 w-5" />
        ) : (
          <Moon className="h-5 w-5" />
        )}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={handleLogout}
        className="rounded-full"
        title="Выйти"
      >
        <LogOut className="h-5 w-5" />
      </Button>
    </div>
  );
} 