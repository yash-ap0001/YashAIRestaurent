import { useColumnColors } from "@/contexts/ColumnColorContext";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export function ColumnColorSettings() {
  const { resetColors } = useColumnColors();

  return (
    <Button variant="outline" size="sm" className="px-2" onClick={resetColors}>
      <RefreshCw className="h-4 w-4 mr-1" />
      <span>Reset Colors</span>
    </Button>
  );
}