import React from 'react';
import { 
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell
} from '@/components/ui/table';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface TableDemoProps {
  data?: any[];
}

// Функция для получения инициалов из имени
const getInitials = (name: string) => {
  const parts = name.split(' ');
  return parts.length > 1 
    ? `${parts[0][0]}${parts[1][0]}` 
    : parts[0].substring(0, 2);
};

// Функция для получения случайного цвета фона для аватара
const getAvatarColor = (name: string) => {
  const colors = [
    'bg-red-500', 'bg-green-500', 'bg-blue-500', 
    'bg-yellow-500', 'bg-purple-500', 'bg-pink-500',
    'bg-indigo-500', 'bg-teal-500', 'bg-orange-500'
  ];
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  return colors[index];
};

export function TableDemo({ data }: TableDemoProps) {
  // Пример данных, сходных с тем, что показал пользователь
  const demoData = data || [
    {
      name: 'Андрей Лукин',
      role: 'Владелец',
      position: 'CIO, Product, Design',
      nickname: '@lookinway',
      phone: '+7(953)123-45-67',
      admin: true,
      avatar: null
    },
    {
      name: 'Григорий Любачев',
      role: 'Администратор',
      position: 'All things product',
      nickname: '@lgmspb',
      phone: '-',
      admin: true,
      avatar: null
    },
    {
      name: 'Максим Индыков',
      role: 'Администратор',
      position: 'CTO / 10 x Developer, Partner',
      nickname: '@indmaksim',
      phone: '-',
      admin: true,
      avatar: null
    },
    {
      name: 'Андрей Любачев',
      role: 'Сотрудник',
      position: 'Директор, Partner',
      nickname: '@andreylyubachev',
      phone: '+796507XXXXX',
      admin: false,
      avatar: null
    },
    {
      name: 'Дмитрий Платонов',
      role: 'Администратор',
      position: 'Developer, Юрист, Partner',
      nickname: '@DmitryPlatonov',
      phone: '+792657XXXXX',
      admin: true,
      avatar: null
    },
    {
      name: 'Михаил Любачев',
      role: 'Администратор',
      position: 'Partner',
      nickname: '@mikhail',
      phone: '-',
      admin: true,
      avatar: null
    },
    {
      name: 'Павел Голубев',
      role: 'Администратор',
      position: 'Developer, Partner',
      nickname: '@golubevpn',
      phone: '7 911 825XXXX',
      admin: true,
      avatar: null
    },
    {
      name: 'Николай Кондратьев',
      role: 'Администратор',
      position: 'Developer, Partner',
      nickname: '@nkondratev',
      phone: '+798264XXXXX',
      admin: true,
      avatar: null
    },
    {
      name: 'Владислав Бакуров',
      role: 'Сотрудник',
      position: 'Developer',
      nickname: '@vbakurov',
      phone: '+799972XXXXX',
      admin: false,
      avatar: null
    },
    {
      name: 'Антон Тарасов',
      role: 'Сотрудник',
      position: 'Developer',
      nickname: '@at',
      phone: '892333XXXXX',
      admin: false,
      avatar: null
    }
  ];

  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Имя</TableHead>
            <TableHead>Роль</TableHead>
            <TableHead>Должность</TableHead>
            <TableHead>Никнейм</TableHead>
            <TableHead>Телефон</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {demoData.map((row, index) => (
            <TableRow key={index}>
              <TableCell>
                <div className="flex items-center">
                  <Avatar className={`w-8 h-8 mr-3 ${getAvatarColor(row.name)}`}>
                    <AvatarFallback>{getInitials(row.name)}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{row.name}</span>
                  {row.admin && row.role === 'Владелец' && (
                    <span className="ml-2 inline-block">🔶</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center">
                  {row.role}
                  {row.admin && row.role !== 'Владелец' && (
                    <div className="ml-2 w-2 h-2 rounded-full bg-green-500"></div>
                  )}
                </div>
              </TableCell>
              <TableCell>{row.position}</TableCell>
              <TableCell>{row.nickname}</TableCell>
              <TableCell>{row.phone}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 