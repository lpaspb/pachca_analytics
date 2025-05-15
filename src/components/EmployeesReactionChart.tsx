
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PachkaUser } from '@/types/api';
import { Users } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface EmployeesReactionChartProps {
  users?: PachkaUser[];
  isLoading?: boolean;
}

export default function EmployeesReactionChart({ users = [], isLoading = false }: EmployeesReactionChartProps) {
  const sortedUsers = React.useMemo(() => {
    return [...(users || [])].sort((a, b) => (b.reactionCount || 0) - (a.reactionCount || 0));
  }, [users]);
  const { chartColors } = useTheme();
  
  const chartData = React.useMemo(() => {
    if (!users || users.length === 0) return [];
    
    return users.map((user, index) => ({
      name: `${user.first_name} ${user.last_name}`,
      displayName: `${user.first_name} ${user.last_name.charAt(0)}.`,
      value: user.reactionCount || 0,
      color: chartColors.barColors[index % chartColors.barColors.length],
      user: user
    }));
  }, [users, chartColors]);

  if (isLoading) {
    return (
      <Card className="p-4 bg-card animate-pulse">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2 opacity-30">
            <Users className="h-4 w-4" />
            Загрузка...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center">
            <div className="w-8 h-8 border-t-2 border-b-2 border-primary rounded-full animate-spin"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-card animate-slide-up animate-delay-300">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-4 w-4" />
          Топ сотрудников по реакциям
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sortedUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-[300px] w-full border rounded-lg text-xs">
              <thead>
                <tr className="bg-secondary/40">
                  <th className="py-1 px-2 text-left font-normal">#</th>
                  <th className="py-1 px-2 text-left font-normal">Имя</th>

<th className="py-1 px-2 text-right font-normal">Реакций</th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((user, idx) => (
                  <tr key={user.id || idx} className="hover:bg-secondary/10">
                    <td className="py-1 px-2 font-semibold w-6 text-center">{idx + 1}</td>
                    <td className="py-1 px-2 whitespace-nowrap">
  <div className="flex items-center gap-1">
    <Avatar className="w-6 h-6">
      <AvatarImage src={user.image_url} alt={user.first_name} />
      <AvatarFallback className="text-[10px]">{user.first_name?.[0]}{user.last_name?.[0]}</AvatarFallback>
    </Avatar>
    <span>{user.first_name} {user.last_name}</span>
  </div>
</td>
                    
<td className="py-1 px-2 text-right font-medium w-10">{user.reactionCount || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-muted-foreground">Нет данных о реакциях сотрудников</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
