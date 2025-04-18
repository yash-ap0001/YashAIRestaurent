import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

// Define the available themes
export type ThemeOption = 'default' | 'dark' | 'light' | 'royal' | 'forest' | 'sunset';

// Custom colors for each theme
export const themeColors = {
  default: {
    background: 'bg-neutral-900',
    text: 'text-white',
    headerBg: 'bg-neutral-800',
    cardBg: 'bg-neutral-800',
    buttonPrimary: 'bg-gradient-to-r from-purple-500 to-purple-700',
    buttonSecondary: 'bg-gradient-to-r from-blue-500 to-blue-700',
    pending: 'bg-gradient-to-r from-amber-500 to-orange-700',
    preparing: 'bg-gradient-to-r from-emerald-500 to-green-700',
    ready: 'bg-gradient-to-r from-blue-500 to-indigo-700',
    completed: 'bg-gradient-to-r from-purple-500 to-fuchsia-700',
    billed: 'bg-gradient-to-r from-slate-500 to-slate-700',
    accent: 'bg-purple-600',
  },
  dark: {
    background: 'bg-gray-950',
    text: 'text-gray-100',
    headerBg: 'bg-gray-900',
    cardBg: 'bg-gray-900',
    buttonPrimary: 'bg-gradient-to-r from-gray-600 to-gray-800',
    buttonSecondary: 'bg-gradient-to-r from-gray-700 to-gray-900',
    pending: 'bg-gradient-to-r from-gray-600 to-gray-700',
    preparing: 'bg-gradient-to-r from-gray-500 to-gray-600',
    ready: 'bg-gradient-to-r from-gray-400 to-gray-500',
    completed: 'bg-gradient-to-r from-gray-300 to-gray-400',
    billed: 'bg-gradient-to-r from-gray-200 to-gray-300',
    accent: 'bg-gray-600',
  },
  light: {
    background: 'bg-gray-100',
    text: 'text-gray-900',
    headerBg: 'bg-white',
    cardBg: 'bg-white',
    buttonPrimary: 'bg-gradient-to-r from-blue-400 to-blue-600',
    buttonSecondary: 'bg-gradient-to-r from-gray-400 to-gray-600',
    pending: 'bg-gradient-to-r from-amber-300 to-orange-500',
    preparing: 'bg-gradient-to-r from-emerald-300 to-green-500',
    ready: 'bg-gradient-to-r from-blue-300 to-indigo-500',
    completed: 'bg-gradient-to-r from-purple-300 to-fuchsia-500',
    billed: 'bg-gradient-to-r from-slate-300 to-slate-500',
    accent: 'bg-blue-500',
  },
  royal: {
    background: 'bg-indigo-950',
    text: 'text-indigo-100',
    headerBg: 'bg-indigo-900',
    cardBg: 'bg-indigo-900/50',
    buttonPrimary: 'bg-gradient-to-r from-indigo-500 to-purple-700',
    buttonSecondary: 'bg-gradient-to-r from-blue-500 to-indigo-700',
    pending: 'bg-gradient-to-r from-amber-400 to-red-600',
    preparing: 'bg-gradient-to-r from-green-400 to-teal-600',
    ready: 'bg-gradient-to-r from-blue-400 to-cyan-600',
    completed: 'bg-gradient-to-r from-purple-400 to-pink-600',
    billed: 'bg-gradient-to-r from-slate-400 to-slate-600',
    accent: 'bg-purple-700',
  },
  forest: {
    background: 'bg-emerald-950',
    text: 'text-emerald-100',
    headerBg: 'bg-emerald-900',
    cardBg: 'bg-emerald-900/50',
    buttonPrimary: 'bg-gradient-to-r from-emerald-500 to-teal-700',
    buttonSecondary: 'bg-gradient-to-r from-teal-500 to-green-700',
    pending: 'bg-gradient-to-r from-yellow-400 to-orange-600',
    preparing: 'bg-gradient-to-r from-lime-400 to-green-600',
    ready: 'bg-gradient-to-r from-teal-400 to-cyan-600',
    completed: 'bg-gradient-to-r from-green-400 to-emerald-600',
    billed: 'bg-gradient-to-r from-slate-400 to-slate-600',
    accent: 'bg-teal-700',
  },
  sunset: {
    background: 'bg-orange-950',
    text: 'text-orange-100',
    headerBg: 'bg-red-900',
    cardBg: 'bg-red-900/30',
    buttonPrimary: 'bg-gradient-to-r from-red-500 to-pink-700',
    buttonSecondary: 'bg-gradient-to-r from-orange-500 to-amber-700',
    pending: 'bg-gradient-to-r from-yellow-400 to-amber-600',
    preparing: 'bg-gradient-to-r from-orange-400 to-red-600',
    ready: 'bg-gradient-to-r from-pink-400 to-rose-600',
    completed: 'bg-gradient-to-r from-purple-400 to-fuchsia-600',
    billed: 'bg-gradient-to-r from-slate-400 to-slate-600',
    accent: 'bg-red-700',
  },
};

interface ThemeContextType {
  theme: ThemeOption;
  changeTheme: (theme: ThemeOption) => void;
  colors: typeof themeColors.default;
}

// Create the theme context
export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Theme provider component
export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Get the theme from localStorage or use default
  const [theme, setTheme] = useState<ThemeOption>(() => {
    const savedTheme = localStorage.getItem('dashboard-theme');
    return (savedTheme as ThemeOption) || 'default';
  });

  // Current colors based on selected theme
  const colors = themeColors[theme];

  // Change theme function
  const changeTheme = (newTheme: ThemeOption) => {
    setTheme(newTheme);
    localStorage.setItem('dashboard-theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, changeTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme context
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};