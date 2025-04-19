import { CustomizableOrderBoard } from "@/components/orders/CustomizableOrderBoard";
import { Button } from "@/components/ui/button";
import { useColumnColors } from "@/contexts/ColumnColorContext";
import { useEffect } from "react";

export default function ColorDemo() {
  const { resetColors } = useColumnColors();

  // Ensure colors are reset when this page loads
  useEffect(() => {
    // Force reset all colors on component mount
    resetColors();
  }, [resetColors]);

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-4">Order Dashboard with Colored Columns</h1>
      <p className="mb-4 text-muted-foreground">
        The dashboard now uses matching colors for both column headers and order cards,
        with professionally chosen color combinations.
      </p>
      
      <div className="mb-6">
        <Button 
          variant="default" 
          size="lg" 
          onClick={resetColors}
          className="w-full md:w-auto"
        >
          Reset All Colors to Default
        </Button>
      </div>
      
      <CustomizableOrderBoard />
    </div>
  );
}