import { createContext, ReactNode, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  currentMode: "light" | "dark";
  getThemeStyles: (component: "header" | "sidebar") => React.CSSProperties;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Get stored theme from localStorage or default to "system"
    const storedTheme = localStorage.getItem("theme") as Theme;
    return storedTheme || "system";
  });
  
  const [currentMode, setCurrentMode] = useState<"light" | "dark">(() => {
    // Initial calculation of dark/light mode
    if (typeof window === "undefined") return "light"; // SSR fallback
    
    return theme === "dark" || 
      (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
      ? "dark" 
      : "light";
  });

  // Get appropriate styles based on current theme
  const getThemeStyles = (component: "header" | "sidebar"): React.CSSProperties => {
    if (component === "header") {
      return {
        background: currentMode === "dark" ? 'var(--header-bg-dark)' : 'var(--header-bg)',
        borderColor: 'var(--border-color)',
        boxShadow: 'var(--header-shadow)'
      };
    } else {
      return {
        background: currentMode === "dark" ? 'var(--sidebar-bg-dark)' : 'var(--sidebar-bg)',
        borderColor: 'var(--border-color)',
        boxShadow: 'var(--sidebar-shadow)'
      };
    }
  };

  // Apply theme changes
  useEffect(() => {
    const root = window.document.documentElement;
    const isDark = 
      theme === "dark" || 
      (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

    root.classList.remove("light", "dark");
    root.classList.add(isDark ? "dark" : "light");
    
    // Update current mode
    setCurrentMode(isDark ? "dark" : "light");
    
    // Save theme to localStorage
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Listen for system theme changes if using system theme
  useEffect(() => {
    if (theme !== "system") return;
    
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    
    const handleChange = () => {
      const root = window.document.documentElement;
      const isDark = mediaQuery.matches;
      
      root.classList.remove("light", "dark");
      root.classList.add(isDark ? "dark" : "light");
      
      // Update current mode when system preference changes
      setCurrentMode(isDark ? "dark" : "light");
    };
    
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, currentMode, getThemeStyles }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}