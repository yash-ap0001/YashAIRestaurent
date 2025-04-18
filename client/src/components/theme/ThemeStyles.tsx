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
  
  // Apply different background colors and styling based on the theme and variant
  const getHeaderStyle = () => {
    // Base styles shared across all themes
    const baseStyle = "text-white font-bold py-2 rounded-t-md text-center flex items-center justify-between w-full px-3";
    
    switch(theme) {
      case 'dark':
        if (variant === 'pending') return `${baseStyle} bg-gradient-to-r from-amber-700 to-amber-800 shadow-lg`;
        if (variant === 'preparing') return `${baseStyle} bg-gradient-to-r from-emerald-700 to-emerald-800 shadow-lg`;
        if (variant === 'ready') return `${baseStyle} bg-gradient-to-r from-blue-700 to-blue-800 shadow-lg`;
        if (variant === 'completed') return `${baseStyle} bg-gradient-to-r from-purple-700 to-purple-800 shadow-lg`;
        return baseStyle;
        
      case 'light':
        if (variant === 'pending') return `${baseStyle} bg-gradient-to-r from-amber-500 to-amber-600`;
        if (variant === 'preparing') return `${baseStyle} bg-gradient-to-r from-emerald-500 to-emerald-600`;
        if (variant === 'ready') return `${baseStyle} bg-gradient-to-r from-blue-500 to-blue-600`;
        if (variant === 'completed') return `${baseStyle} bg-gradient-to-r from-purple-500 to-purple-600`;
        return baseStyle;
        
      case 'royal':
        if (variant === 'pending') return `${baseStyle} bg-gradient-to-r from-amber-600 to-red-700 shadow-md`;
        if (variant === 'preparing') return `${baseStyle} bg-gradient-to-r from-emerald-600 to-green-700 shadow-md`;
        if (variant === 'ready') return `${baseStyle} bg-gradient-to-r from-blue-600 to-indigo-700 shadow-md`;
        if (variant === 'completed') return `${baseStyle} bg-gradient-to-r from-purple-600 to-violet-700 shadow-md`;
        return baseStyle;
        
      case 'forest':
        if (variant === 'pending') return `${baseStyle} bg-gradient-to-r from-yellow-700 to-amber-800 shadow-lg`;
        if (variant === 'preparing') return `${baseStyle} bg-gradient-to-r from-green-700 to-emerald-800 shadow-lg`;
        if (variant === 'ready') return `${baseStyle} bg-gradient-to-r from-teal-700 to-cyan-800 shadow-lg`;
        if (variant === 'completed') return `${baseStyle} bg-gradient-to-r from-indigo-700 to-blue-800 shadow-lg`;
        return baseStyle;
        
      case 'sunset':
        if (variant === 'pending') return `${baseStyle} bg-gradient-to-r from-orange-600 to-red-700 shadow-lg`;
        if (variant === 'preparing') return `${baseStyle} bg-gradient-to-r from-rose-600 to-pink-700 shadow-lg`;
        if (variant === 'ready') return `${baseStyle} bg-gradient-to-r from-pink-600 to-fuchsia-700 shadow-lg`;
        if (variant === 'completed') return `${baseStyle} bg-gradient-to-r from-violet-600 to-purple-700 shadow-lg`;
        return baseStyle;
        
      default:
        if (variant === 'pending') return `${baseStyle} bg-gradient-to-r from-amber-600 to-orange-700`;
        if (variant === 'preparing') return `${baseStyle} bg-gradient-to-r from-emerald-600 to-green-700`;
        if (variant === 'ready') return `${baseStyle} bg-gradient-to-r from-blue-600 to-indigo-700`;
        if (variant === 'completed') return `${baseStyle} bg-gradient-to-r from-purple-600 to-violet-700`;
        return baseStyle;
    }
  };
  
  return (
    <div className={cn(getHeaderStyle(), className)}>
      {children}
    </div>
  );
}

// Specific component for cards in dashboard
export function ThemeCard({ className, variant, children, ...props }: ThemeClassesProps & React.HTMLAttributes<HTMLDivElement>) {
  const { theme } = useTheme();
  
  // Get complete card styling based on theme and variant
  const getCardStyle = () => {
    // Base style shared across all cards
    const baseStyle = "p-3 rounded-lg shadow-md hover:shadow-lg transition-all";
    
    switch(theme) {
      case 'dark':
        if (variant === 'pending') {
          return `${baseStyle} bg-gradient-to-br from-amber-900/40 to-amber-900/20 border-l-4 border-l-amber-700 shadow-amber-900/10`;
        }
        if (variant === 'preparing') {
          return `${baseStyle} bg-gradient-to-br from-emerald-900/40 to-emerald-900/20 border-l-4 border-l-emerald-700 shadow-emerald-900/10`;
        }
        if (variant === 'ready') {
          return `${baseStyle} bg-gradient-to-br from-blue-900/40 to-blue-900/20 border-l-4 border-l-blue-700 shadow-blue-900/10`;
        }
        if (variant === 'completed') {
          return `${baseStyle} bg-gradient-to-br from-purple-900/40 to-purple-900/20 border-l-4 border-l-purple-700 shadow-purple-900/10`;
        }
        return baseStyle;
        
      case 'light':
        if (variant === 'pending') {
          return `${baseStyle} bg-gradient-to-br from-amber-100 to-amber-50 border-l-4 border-l-amber-500 shadow-amber-100/60`;
        }
        if (variant === 'preparing') {
          return `${baseStyle} bg-gradient-to-br from-emerald-100 to-emerald-50 border-l-4 border-l-emerald-500 shadow-emerald-100/60`;
        }
        if (variant === 'ready') {
          return `${baseStyle} bg-gradient-to-br from-blue-100 to-blue-50 border-l-4 border-l-blue-500 shadow-blue-100/60`;
        }
        if (variant === 'completed') {
          return `${baseStyle} bg-gradient-to-br from-purple-100 to-purple-50 border-l-4 border-l-purple-500 shadow-purple-100/60`;
        }
        return baseStyle;
        
      case 'royal':
        if (variant === 'pending') {
          return `${baseStyle} bg-gradient-to-br from-amber-950/40 to-red-950/30 border-l-4 border-l-amber-600 shadow-amber-900/20`;
        }
        if (variant === 'preparing') {
          return `${baseStyle} bg-gradient-to-br from-emerald-950/40 to-green-950/30 border-l-4 border-l-emerald-600 shadow-emerald-900/20`;
        }
        if (variant === 'ready') {
          return `${baseStyle} bg-gradient-to-br from-blue-950/40 to-indigo-950/30 border-l-4 border-l-blue-600 shadow-blue-900/20`;
        }
        if (variant === 'completed') {
          return `${baseStyle} bg-gradient-to-br from-purple-950/40 to-violet-950/30 border-l-4 border-l-purple-600 shadow-purple-900/20`;
        }
        return baseStyle;
        
      case 'forest':
        if (variant === 'pending') {
          return `${baseStyle} bg-gradient-to-br from-yellow-900/40 to-amber-900/20 border-l-4 border-l-yellow-700 shadow-yellow-900/10`;
        }
        if (variant === 'preparing') {
          return `${baseStyle} bg-gradient-to-br from-green-900/40 to-emerald-900/20 border-l-4 border-l-green-700 shadow-green-900/10`;
        }
        if (variant === 'ready') {
          return `${baseStyle} bg-gradient-to-br from-teal-900/40 to-cyan-900/20 border-l-4 border-l-teal-700 shadow-teal-900/10`;
        }
        if (variant === 'completed') {
          return `${baseStyle} bg-gradient-to-br from-indigo-900/40 to-blue-900/20 border-l-4 border-l-indigo-700 shadow-indigo-900/10`;
        }
        return baseStyle;
        
      case 'sunset':
        if (variant === 'pending') {
          return `${baseStyle} bg-gradient-to-br from-orange-900/40 to-red-900/20 border-l-4 border-l-orange-600 shadow-orange-900/10`;
        }
        if (variant === 'preparing') {
          return `${baseStyle} bg-gradient-to-br from-rose-900/40 to-pink-900/20 border-l-4 border-l-rose-600 shadow-rose-900/10`;
        }
        if (variant === 'ready') {
          return `${baseStyle} bg-gradient-to-br from-pink-900/40 to-fuchsia-900/20 border-l-4 border-l-pink-600 shadow-pink-900/10`;
        }
        if (variant === 'completed') {
          return `${baseStyle} bg-gradient-to-br from-violet-900/40 to-purple-900/20 border-l-4 border-l-violet-600 shadow-violet-900/10`;
        }
        return baseStyle;
        
      default:
        if (variant === 'pending') {
          return `${baseStyle} bg-gradient-to-br from-amber-800/40 to-amber-900/20 border-l-4 border-l-amber-700`;
        }
        if (variant === 'preparing') {
          return `${baseStyle} bg-gradient-to-br from-emerald-800/40 to-emerald-900/20 border-l-4 border-l-emerald-700`;
        }
        if (variant === 'ready') {
          return `${baseStyle} bg-gradient-to-br from-blue-800/40 to-blue-900/20 border-l-4 border-l-blue-700`;
        }
        if (variant === 'completed') {
          return `${baseStyle} bg-gradient-to-br from-purple-800/40 to-purple-900/20 border-l-4 border-l-purple-700`;
        }
        return baseStyle;
    }
  };
  
  return (
    <div 
      className={cn(
        getCardStyle(),
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
  const { theme } = useTheme();
  
  const buttonVariant = variant.startsWith('button') ? variant : 'buttonPrimary';
  
  // Get complete button styling with gradients and theme-specific styles
  const getButtonStyle = () => {
    // Base styles shared across all buttons
    const baseStyle = "px-4 py-2 rounded-md font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all";
    
    if (buttonVariant === 'buttonPrimary') {
      switch(theme) {
        case 'dark': 
          return `${baseStyle} bg-gradient-to-r from-purple-700 to-purple-800 hover:from-purple-800 hover:to-purple-900 shadow-md shadow-purple-900/20`;
        case 'light': 
          return `${baseStyle} bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 shadow-sm shadow-purple-200/60`;
        case 'royal': 
          return `${baseStyle} bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 shadow-md shadow-indigo-900/30`;
        case 'forest': 
          return `${baseStyle} bg-gradient-to-r from-green-600 to-teal-700 hover:from-green-700 hover:to-teal-800 shadow-md shadow-green-900/20`;
        case 'sunset': 
          return `${baseStyle} bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 shadow-md shadow-orange-900/20`;
        default: 
          return `${baseStyle} bg-gradient-to-r from-purple-700 to-purple-800 hover:from-purple-800 hover:to-purple-900 shadow-md shadow-purple-900/20`;
      }
    } else if (buttonVariant === 'buttonSecondary') {
      switch(theme) {
        case 'dark': 
          return `${baseStyle} bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 shadow-md shadow-gray-900/20`; 
        case 'light': 
          return `${baseStyle} bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 shadow-sm shadow-gray-200/60`;
        case 'royal': 
          return `${baseStyle} bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 shadow-md shadow-blue-900/30`;
        case 'forest': 
          return `${baseStyle} bg-gradient-to-r from-teal-600 to-green-700 hover:from-teal-700 hover:to-green-800 shadow-md shadow-teal-900/20`;
        case 'sunset': 
          return `${baseStyle} bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 shadow-md shadow-pink-900/20`;
        default: 
          return `${baseStyle} bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 shadow-md shadow-gray-900/20`;
      }
    } else if (variant === 'pending') {
      switch(theme) {
        case 'dark': return `${baseStyle} bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800`;
        case 'light': return `${baseStyle} bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700`;
        case 'royal': return `${baseStyle} bg-gradient-to-r from-amber-600 to-red-700 hover:from-amber-700 hover:to-red-800`;
        case 'forest': return `${baseStyle} bg-gradient-to-r from-yellow-600 to-amber-700 hover:from-yellow-700 hover:to-amber-800`;
        case 'sunset': return `${baseStyle} bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700`;
        default: return `${baseStyle} bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800`;
      }
    } else if (variant === 'preparing') {
      switch(theme) {
        case 'dark': return `${baseStyle} bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800`;
        case 'light': return `${baseStyle} bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700`;
        case 'royal': return `${baseStyle} bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800`;
        case 'forest': return `${baseStyle} bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800`;
        case 'sunset': return `${baseStyle} bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700`;
        default: return `${baseStyle} bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800`;
      }
    } else if (variant === 'ready') {
      switch(theme) {
        case 'dark': return `${baseStyle} bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800`;
        case 'light': return `${baseStyle} bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700`;
        case 'royal': return `${baseStyle} bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800`;
        case 'forest': return `${baseStyle} bg-gradient-to-r from-teal-600 to-cyan-700 hover:from-teal-700 hover:to-cyan-800`;
        case 'sunset': return `${baseStyle} bg-gradient-to-r from-pink-500 to-fuchsia-600 hover:from-pink-600 hover:to-fuchsia-700`;
        default: return `${baseStyle} bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800`;
      }
    } else if (variant === 'completed') {
      switch(theme) {
        case 'dark': return `${baseStyle} bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800`;
        case 'light': return `${baseStyle} bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700`;
        case 'royal': return `${baseStyle} bg-gradient-to-r from-purple-600 to-violet-700 hover:from-purple-700 hover:to-violet-800`;
        case 'forest': return `${baseStyle} bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-700 hover:to-blue-800`;
        case 'sunset': return `${baseStyle} bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700`;
        default: return `${baseStyle} bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800`;
      }
    } else {
      return baseStyle;
    }
  };
  
  return (
    <button 
      className={cn(
        getButtonStyle(),
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}