
import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  chartColors: {
    background: string;
    grid: string;
    text: string;
    primary: string;
    tooltip: {
      background: string;
      text: string;
      border: string;
    };
    pieColors: string[];
    barColors: string[];
  };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Chart color configurations for light and dark themes
const chartColorConfigs = {
  light: {
    background: '#fff',
    grid: '#eee',
    text: '#333',
    primary: '#6366f1',
    tooltip: {
      background: '#fff',
      text: '#333',
      border: '#ddd',
    },
    pieColors: ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff'],
    barColors: ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff'],
  },
  dark: {
    background: '#222',
    grid: '#333',
    text: '#ccc',
    primary: '#818cf8',
    tooltip: {
      background: '#333',
      text: '#fff',
      border: '#444',
    },
    pieColors: ['#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff', '#f1f5f9'],
    barColors: ['#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff', '#f1f5f9'],
  },
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Get initial theme from localStorage or default to dark
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme');
    return (savedTheme as Theme) || 'dark';
  });

  // Update theme in localStorage and document body when theme changes
  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  // Get chart colors based on current theme
  const chartColors = chartColorConfigs[theme];

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, chartColors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
