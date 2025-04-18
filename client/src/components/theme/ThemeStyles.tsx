import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface ThemeClassesProps {
  className?: string;
  variant: 'pending' | 'preparing' | 'ready' | 'completed' | 'billed' | 'buttonPrimary' | 'buttonSecondary';
  children: ReactNode;
}

// Generic theming component with full customization
export function ThemeBox({ className, variant, children }: ThemeClassesProps) {
  const { colors, theme } = useTheme();
  
  // Apply different background colors based on the theme and variant
  const getBgColor = () => {
    switch(theme) {
      case 'dark':
        return variant === 'pending' ? 'bg-amber-900/70' :
               variant === 'preparing' ? 'bg-emerald-900/70' :
               variant === 'ready' ? 'bg-blue-900/70' :
               variant === 'completed' ? 'bg-purple-900/70' : '';
      case 'light':
        return variant === 'pending' ? 'bg-amber-200' :
               variant === 'preparing' ? 'bg-emerald-200' :
               variant === 'ready' ? 'bg-blue-200' :
               variant === 'completed' ? 'bg-purple-200' : '';
      case 'royal':
        return variant === 'pending' ? 'bg-amber-800/70' :
               variant === 'preparing' ? 'bg-emerald-800/70' :
               variant === 'ready' ? 'bg-blue-800/70' :
               variant === 'completed' ? 'bg-purple-800/70' : '';
      case 'forest':
        return variant === 'pending' ? 'bg-yellow-800/70' :
               variant === 'preparing' ? 'bg-green-800/70' :
               variant === 'ready' ? 'bg-teal-800/70' :
               variant === 'completed' ? 'bg-indigo-800/70' : '';
      case 'sunset':
        return variant === 'pending' ? 'bg-orange-800/70' :
               variant === 'preparing' ? 'bg-rose-800/70' :
               variant === 'ready' ? 'bg-pink-800/70' :
               variant === 'completed' ? 'bg-violet-800/70' : '';
      default:
        return variant === 'pending' ? 'bg-amber-900/70' :
               variant === 'preparing' ? 'bg-emerald-900/70' :
               variant === 'ready' ? 'bg-blue-900/70' :
               variant === 'completed' ? 'bg-purple-900/70' : '';
    }
  };
  
  return (
    <div className={cn("p-4 rounded-md", getBgColor(), className)}>
      {children}
    </div>
  );
}

// Specific component for column headers in dashboard
export function ThemeColumnHeader({ className, variant, children }: ThemeClassesProps) {
  const { colors, theme } = useTheme();
  
  // Apply different background colors based on the theme and variant
  const getBgColor = () => {
    switch(theme) {
      case 'dark':
        return variant === 'pending' ? 'bg-amber-700' :
               variant === 'preparing' ? 'bg-emerald-700' :
               variant === 'ready' ? 'bg-blue-700' :
               variant === 'completed' ? 'bg-purple-700' : '';
      case 'light':
        return variant === 'pending' ? 'bg-amber-500' :
               variant === 'preparing' ? 'bg-emerald-500' :
               variant === 'ready' ? 'bg-blue-500' :
               variant === 'completed' ? 'bg-purple-500' : '';
      case 'royal':
        return variant === 'pending' ? 'bg-amber-600' :
               variant === 'preparing' ? 'bg-emerald-600' :
               variant === 'ready' ? 'bg-blue-600' :
               variant === 'completed' ? 'bg-purple-600' : '';
      case 'forest':
        return variant === 'pending' ? 'bg-yellow-700' :
               variant === 'preparing' ? 'bg-green-700' :
               variant === 'ready' ? 'bg-teal-700' :
               variant === 'completed' ? 'bg-indigo-700' : '';
      case 'sunset':
        return variant === 'pending' ? 'bg-orange-600' :
               variant === 'preparing' ? 'bg-rose-600' :
               variant === 'ready' ? 'bg-pink-600' :
               variant === 'completed' ? 'bg-violet-600' : '';
      default:
        return variant === 'pending' ? 'bg-amber-700' :
               variant === 'preparing' ? 'bg-emerald-700' :
               variant === 'ready' ? 'bg-blue-700' :
               variant === 'completed' ? 'bg-purple-700' : '';
    }
  };
  
  return (
    <div className={cn(
      "text-white font-bold py-2 rounded-t-md text-center flex items-center justify-between w-full px-3",
      getBgColor(),
      className
    )}>
      {children}
    </div>
  );
}

// Specific component for cards in dashboard
export function ThemeCard({ className, variant, children, ...props }: ThemeClassesProps & React.HTMLAttributes<HTMLDivElement>) {
  const { colors, theme } = useTheme();
  
  // Apply different background colors based on the theme and variant
  const getBgColor = () => {
    switch(theme) {
      case 'dark':
        return variant === 'pending' ? 'bg-amber-950/40' :
               variant === 'preparing' ? 'bg-emerald-950/40' :
               variant === 'ready' ? 'bg-blue-950/40' :
               variant === 'completed' ? 'bg-purple-950/40' : '';
      case 'light':
        return variant === 'pending' ? 'bg-amber-100' :
               variant === 'preparing' ? 'bg-emerald-100' :
               variant === 'ready' ? 'bg-blue-100' :
               variant === 'completed' ? 'bg-purple-100' : '';
      case 'royal':
        return variant === 'pending' ? 'bg-amber-900/30' :
               variant === 'preparing' ? 'bg-emerald-900/30' :
               variant === 'ready' ? 'bg-blue-900/30' :
               variant === 'completed' ? 'bg-purple-900/30' : '';
      case 'forest':
        return variant === 'pending' ? 'bg-yellow-900/40' :
               variant === 'preparing' ? 'bg-green-900/40' :
               variant === 'ready' ? 'bg-teal-900/40' :
               variant === 'completed' ? 'bg-indigo-900/40' : '';
      case 'sunset':
        return variant === 'pending' ? 'bg-orange-900/40' :
               variant === 'preparing' ? 'bg-rose-900/40' :
               variant === 'ready' ? 'bg-pink-900/40' :
               variant === 'completed' ? 'bg-violet-900/40' : '';
      default:
        return variant === 'pending' ? 'bg-amber-950/40' :
               variant === 'preparing' ? 'bg-emerald-950/40' :
               variant === 'ready' ? 'bg-blue-950/40' :
               variant === 'completed' ? 'bg-purple-950/40' : '';
    }
  };
  
  const getBorderColor = () => {
    switch(variant) {
      case 'pending': return 'border-l-4 border-l-amber-500';
      case 'preparing': return 'border-l-4 border-l-emerald-500';
      case 'ready': return 'border-l-4 border-l-blue-500';
      case 'completed': return 'border-l-4 border-l-purple-500';
      default: return '';
    }
  };
  
  return (
    <div 
      className={cn(
        "p-3 rounded-lg shadow-md hover:shadow-lg transition-all", 
        getBgColor(),
        getBorderColor(),
        colors[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Specific component for buttons with theme styling
export function ThemeButton({ className, variant, children, ...props }: ThemeClassesProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { colors, theme } = useTheme();
  
  const buttonVariant = variant.startsWith('button') ? variant : 'buttonPrimary';
  
  // Apply different background colors based on the theme and variant
  const getBgColor = () => {
    if (variant === 'buttonPrimary') {
      switch(theme) {
        case 'dark': return 'bg-purple-700 hover:bg-purple-800';
        case 'light': return 'bg-purple-500 hover:bg-purple-600';
        case 'royal': return 'bg-indigo-600 hover:bg-indigo-700';
        case 'forest': return 'bg-green-600 hover:bg-green-700';
        case 'sunset': return 'bg-orange-500 hover:bg-orange-600';
        default: return 'bg-purple-700 hover:bg-purple-800';
      }
    } else if (variant === 'buttonSecondary') {
      switch(theme) {
        case 'dark': return 'bg-gray-700 hover:bg-gray-800'; 
        case 'light': return 'bg-gray-500 hover:bg-gray-600';
        case 'royal': return 'bg-blue-600 hover:bg-blue-700';
        case 'forest': return 'bg-teal-600 hover:bg-teal-700';
        case 'sunset': return 'bg-pink-500 hover:bg-pink-600';
        default: return 'bg-gray-700 hover:bg-gray-800';
      }
    } else {
      return '';
    }
  };
  
  return (
    <button 
      className={cn(
        "px-4 py-2 rounded-md font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2",
        getBgColor(),
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}