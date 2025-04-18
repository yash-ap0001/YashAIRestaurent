import { useColumnColors } from "@/contexts/ColumnColorContext";
import { ColumnColorPicker } from "../orders/OrderColumn";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Settings } from "lucide-react";

export function ColumnColorSettings() {
  const { resetColors } = useColumnColors();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="px-2">
          <Settings className="h-4 w-4 mr-1" />
          <span>Column Colors</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="font-medium">Customize Column Colors</div>
          
          <div className="space-y-2">
            <ColumnColorPicker columnType="pending" label="Pending" />
            <ColumnColorPicker columnType="preparing" label="Preparing" />
            <ColumnColorPicker columnType="ready" label="Ready" />
            <ColumnColorPicker columnType="completed" label="Completed" />
          </div>
          
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={resetColors}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              <span>Reset</span>
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}