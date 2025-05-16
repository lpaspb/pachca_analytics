import React, { useState, useEffect } from 'react';
import { KeyRound, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { pachkaApi } from '@/services/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [apiToken, setApiToken] = useState('');
  const [isValidatingToken, setIsValidatingToken] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [connectionIssue, setConnectionIssue] = useState(false);
  const navigate = useNavigate();

  // Проверяем, есть ли уже сохраненный токен
  useEffect(() => {
    const apiKey = pachkaApi.getApiKey();
    if (apiKey) {
      pachkaApi.validateApiKey(apiKey)
        .then((result) => {
          if (result.success) {
            toast.success('Авторизация успешна');
            navigate('/');
          } else {
            pachkaApi.clearApiKey();
          }
        })
        .catch(error => {
          console.error('Auth validation error:', error);
          pachkaApi.clearApiKey();
        });
    }
  }, [navigate]);

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiToken.trim()) {
      toast.error('Введите токен API');
      return;
    }

    setIsValidatingToken(true);
    setTokenError('');
    setConnectionIssue(false);

    try {
      const result = await pachkaApi.setApiKey(apiToken);
      if (result.success) {
        toast.success('Авторизация успешна');
        navigate('/');
      } else {
        setTokenError(result.error || 'Неверный токен API');
        toast.error(result.error || 'Ошибка авторизации');
        
        if (result.error && (
            result.error.includes('Ошибка соединения с сервером') || 
            result.error.includes('VPN') || 
            result.error.includes('Получен неверный формат')
          )) {
          setConnectionIssue(true);
        }
      }
    } catch (error) {
      console.error('Token validation error:', error);
      setTokenError('Ошибка при проверке токена');
      setConnectionIssue(true);
      toast.error('Не удалось проверить токен');
    } finally {
      setIsValidatingToken(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center space-y-2 text-center">
          <KeyRound className="w-12 h-12 text-primary" />
          <h1 className="text-2xl font-bold">Аналитика Пачки</h1>
          <p className="text-muted-foreground">Введите API токен для доступа к аналитике</p>
        </div>

        <div className="bg-card border rounded-lg shadow-sm p-6">
          <form onSubmit={handleTokenSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="api-token" className="text-sm font-medium">
                API Токен
              </label>
              <Input
                id="api-token"
                autoFocus
                placeholder="Введите ваш API токен"
                value={apiToken}
                onChange={e => setApiToken(e.target.value)}
                className="w-full"
                disabled={isValidatingToken}
              />
              {tokenError && (
                <div className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {tokenError}
                </div>
              )}
            </div>

            {connectionIssue && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                Проблема с подключением к API Пачки. Убедитесь, что у вас установлено соединение 
                и при необходимости подключитесь через VPN.
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground"
              disabled={!apiToken.trim() || isValidatingToken}
            >
              {isValidatingToken ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                  <span>Проверка...</span>
                </div>
              ) : 'Войти'}
            </Button>
          </form>

          <div className="mt-4 text-xs text-center text-muted-foreground">
            <p>Токен можно получить в настройках аккаунта Пачки.<br/>
            Для этого зайдите в "Настройки" → "API токены".</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login; 