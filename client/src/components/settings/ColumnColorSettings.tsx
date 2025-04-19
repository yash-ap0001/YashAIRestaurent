import { useColumnColors } from "@/contexts/ColumnColorContext";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useEffect } from "react";

export function ColumnColorSettings() {
  const { resetColors } = useColumnColors();

  // Force a reset when the component mounts
  useEffect(() => {
    resetColors();
  }, [resetColors]);

  return (
    <Button variant="outline" size="sm" className="px-2" onClick={resetColors}>
      <RefreshCw className="h-4 w-4 mr-1" />
      <span>Reset Colors</span>
    </Button>
  );
}