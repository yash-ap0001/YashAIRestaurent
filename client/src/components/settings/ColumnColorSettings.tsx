import { useColumnColors } from "@/contexts/ColumnColorContext";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export function ColumnColorSettings() {
  const { resetColors } = useColumnColors();
  const { toast } = useToast();

  // Force a reset when the component mounts
  useEffect(() => {
    resetColors();
  }, [resetColors]);

  const handleReset = () => {
    resetColors();
    
    // Show toast confirmation
    toast({
      title: "Color scheme reset",
      description: "The order board colors have been reset to default",
      variant: "default",
    });
    
    // Force component re-render by reloading the page
    window.location.reload();
  };

  return (
    <Button 
      variant="default" 
      size="sm" 
      className="px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-800 text-white hover:from-gray-700 hover:to-gray-900"
      onClick={handleReset}
    >
      <RefreshCw className="h-4 w-4 mr-1" />
      <span>Reset Colors</span>
    </Button>
  );
}