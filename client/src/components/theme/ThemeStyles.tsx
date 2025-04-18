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
  const { colors } = useTheme();
  
  return (
    <div className={cn("p-4 rounded-md", colors[variant], className)}>
      {children}
    </div>
  );
}

// Specific component for column headers in dashboard
export function ThemeColumnHeader({ className, variant, children }: ThemeClassesProps) {
  const { colors } = useTheme();
  
  return (
    <div className={cn(
      "text-white font-bold py-2 rounded-t-md text-center flex items-center justify-between w-full px-3",
      colors[variant],
      className
    )}>
      {children}
    </div>
  );
}

// Specific component for cards in dashboard
export function ThemeCard({ className, variant, children, ...props }: ThemeClassesProps & React.HTMLAttributes<HTMLDivElement>) {
  const { colors } = useTheme();
  
  return (
    <div 
      className={cn(
        "p-3 rounded-lg shadow-md hover:shadow-lg transition-all", 
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
  const { colors } = useTheme();
  
  const buttonVariant = variant.startsWith('button') ? variant : 'buttonPrimary';
  
  return (
    <button 
      className={cn(
        "px-4 py-2 rounded-md font-medium text-white shadow-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2",
        colors[buttonVariant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}