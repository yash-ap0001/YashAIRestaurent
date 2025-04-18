import { ThemedOrderBoard } from "@/components/orders/ThemedOrderBoard";
import { ThemeSelector } from "@/components/theme/ThemeSelector";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";

export default function TestTheme() {
  const { colors, setTheme } = useTheme();
  
  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
        <h1 className="text-3xl font-bold">Theme Testing Dashboard</h1>
        <ThemeSelector />
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="p-4 rounded-lg shadow-md">
          <h2 className="text-lg font-bold mb-2">Theme Colors</h2>
          <div className="space-y-2">
            {Object.entries(colors).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded ${value}`}></div>
                <span>{key}: <code className="text-xs bg-muted p-1 rounded">{value}</code></span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-4 rounded-lg shadow-md">
          <h2 className="text-lg font-bold mb-2">Theme Buttons</h2>
          <div className="space-y-2">
            <Button variant="default">Default Button</Button>
            <Button variant="destructive">Destructive Button</Button>
            <Button variant="outline">Outline Button</Button>
            <Button variant="secondary">Secondary Button</Button>
            <Button variant="ghost">Ghost Button</Button>
            <Button variant="link">Link Button</Button>
          </div>
        </div>
        
        <div className="p-4 rounded-lg shadow-md">
          <h2 className="text-lg font-bold mb-2">Theme Presets</h2>
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              onClick={() => setTheme({
                primary: "#7A0177",
                appearance: "dark",
                radius: 0.5,
                variant: "vibrant"
              })}
            >
              Purple Vibrant
            </Button>
            <Button 
              variant="outline"
              onClick={() => setTheme({
                primary: "#22c55e",
                appearance: "dark",
                radius: 0.5,
                variant: "professional"
              })}
            >
              Green Professional
            </Button>
            <Button 
              variant="outline"
              onClick={() => setTheme({
                primary: "#0ea5e9",
                appearance: "dark",
                radius: 0.5,
                variant: "tint"
              })}
            >
              Blue Tint
            </Button>
            <Button 
              variant="outline"
              onClick={() => setTheme({
                primary: "#f97316",
                appearance: "dark",
                radius: 0.75,
                variant: "vibrant"
              })}
            >
              Orange Vibrant
            </Button>
          </div>
        </div>
      </div>
      
      <div className="bg-card p-4 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-bold mb-4">Themed Order Board</h2>
        <ThemedOrderBoard />
      </div>
    </div>
  );
}