import { Moon, Sun, Monitor } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/contexts/ThemeContext";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className={`
            rounded-full h-10 w-10
            ${theme === "light" 
              ? "bg-gray-100 hover:bg-gray-200 border-gray-300 shadow-sm" 
              : "bg-gray-800 hover:bg-gray-700 border-gray-700"
            }
          `}
        >
          {theme === "light" ? (
            <Sun className="h-5 w-5 text-amber-600 transition-all hover:text-amber-500" />
          ) : theme === "dark" ? (
            <Moon className="h-5 w-5 text-blue-400 transition-all hover:text-blue-300" />
          ) : (
            <Monitor className="h-5 w-5 text-gray-500" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[150px]">
        <DropdownMenuItem onClick={() => setTheme("light")} className="flex items-center gap-2 cursor-pointer">
          <Sun className="h-4 w-4 text-amber-600" />
          <span>Light Mode</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")} className="flex items-center gap-2 cursor-pointer">
          <Moon className="h-4 w-4 text-blue-500" />
          <span>Dark Mode</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")} className="flex items-center gap-2 cursor-pointer">
          <Monitor className="h-4 w-4" />
          <span>System Default</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}