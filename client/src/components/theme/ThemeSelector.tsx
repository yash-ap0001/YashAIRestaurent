import React from "react";
import { useTheme, ThemeOption, themeColors } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Palette, Check, Sun, Moon, Crown, Leaf, Sunset } from "lucide-react";

// Theme option with icon and name
interface ThemeOptionProps {
  value: ThemeOption;
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  isActive: boolean;
}

const ThemeOptionItem: React.FC<ThemeOptionProps> = ({ 
  value, 
  icon, 
  label, 
  description, 
  onClick, 
  isActive 
}) => {
  const gradientClass = themeColors[value].buttonPrimary;
  
  return (
    <div 
      className={`flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-muted/50 ${isActive ? 'bg-muted' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-md ${gradientClass} text-white`}>
          {icon}
        </div>
        <div>
          <div className="font-medium">{label}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
      </div>
      {isActive && <Check className="h-4 w-4 text-primary" />}
    </div>
  );
};

// Main theme selector component
export const ThemeSelector: React.FC = () => {
  const { theme, changeTheme } = useTheme();

  const themeOptions: { 
    value: ThemeOption; 
    icon: React.ReactNode; 
    label: string;
    description: string;
  }[] = [
    { 
      value: 'default', 
      icon: <Palette className="h-4 w-4" />, 
      label: 'Default',
      description: 'Dark purple accents with colorful statuses' 
    },
    { 
      value: 'dark', 
      icon: <Moon className="h-4 w-4" />, 
      label: 'Dark Monochrome',
      description: 'Shades of gray for a minimalist look' 
    },
    { 
      value: 'light', 
      icon: <Sun className="h-4 w-4" />, 
      label: 'Light Mode',
      description: 'Bright and clean with blue accents' 
    },
    { 
      value: 'royal', 
      icon: <Crown className="h-4 w-4" />, 
      label: 'Royal Purple',
      description: 'Rich indigo and purple tones' 
    },
    { 
      value: 'forest', 
      icon: <Leaf className="h-4 w-4" />, 
      label: 'Forest Green',
      description: 'Calming emerald and teal palette' 
    },
    { 
      value: 'sunset', 
      icon: <Sunset className="h-4 w-4" />, 
      label: 'Sunset Orange',
      description: 'Warm orange and red color scheme' 
    },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1">
          <Palette className="h-4 w-4" />
          <span>Theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[240px]">
        <DropdownMenuLabel className="text-xs">Dashboard Themes</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="py-1 px-1 space-y-1">
          {themeOptions.map((option) => (
            <ThemeOptionItem
              key={option.value}
              value={option.value}
              icon={option.icon}
              label={option.label}
              description={option.description}
              onClick={() => changeTheme(option.value)}
              isActive={theme === option.value}
            />
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};