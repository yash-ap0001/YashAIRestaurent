import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeOption, useTheme } from "@/contexts/ThemeContext";
import { Paintbrush } from "lucide-react";

// Map theme names to user-friendly display names
const themeDisplayNames: Record<ThemeOption, string> = {
  default: "Purple Theme",
  dark: "Dark Mode",
  light: "Light Mode",
  royal: "Royal Blue",
  forest: "Forest Green",
  sunset: "Sunset Orange"
};

export function ThemeSelector() {
  const { theme, changeTheme, setTheme } = useTheme();
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1">
          <Paintbrush className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Theme Options</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Predefined Themes */}
        {Object.entries(themeDisplayNames).map(([key, name]) => (
          <DropdownMenuItem
            key={key}
            className="cursor-pointer"
            onClick={() => changeTheme(key as ThemeOption)}
          >
            <div className="flex items-center gap-2">
              <div 
                className={`w-4 h-4 rounded-full ${key === theme ? 'ring-2 ring-primary' : ''}`} 
                style={{
                  background: key === 'default' ? '#7A0177' : 
                            key === 'dark' ? '#333333' : 
                            key === 'light' ? '#f8f9fa' : 
                            key === 'royal' ? '#4338ca' : 
                            key === 'forest' ? '#047857' : 
                            '#f97316' // sunset
                }}
              />
              <span>{name}</span>
              {key === theme && (
                <span className="ml-auto text-xs opacity-60">Active</span>
              )}
            </div>
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        
        {/* Theme Presets - using theme.json format */}
        <DropdownMenuLabel className="text-xs">Theme Presets</DropdownMenuLabel>
        
        <DropdownMenuItem 
          className="cursor-pointer"
          onClick={() => setTheme({
            primary: "#7A0177",
            appearance: "dark",
            radius: 0.5,
            variant: "vibrant"
          })}
        >
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#7A0177]" />
            <span>Purple Vibrant</span>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          className="cursor-pointer"
          onClick={() => setTheme({
            primary: "#22c55e",
            appearance: "dark",
            radius: 0.5,
            variant: "professional"
          })}
        >
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#22c55e]" />
            <span>Green Professional</span>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          className="cursor-pointer"
          onClick={() => setTheme({
            primary: "#0ea5e9",
            appearance: "dark",
            radius: 0.5,
            variant: "tint"
          })}
        >
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#0ea5e9]" />
            <span>Blue Tint</span>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          className="cursor-pointer"
          onClick={() => setTheme({
            primary: "#f97316",
            appearance: "dark",
            radius: 0.75,
            variant: "vibrant"
          })}
        >
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#f97316]" />
            <span>Orange Vibrant</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}