import { useColumnColors } from "@/contexts/ColumnColorContext";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { ColumnType } from "@/contexts/ColumnColorContext";
import { ColorPicker } from "@/components/ui/color-picker";

interface ColumnHeaderProps {
  title: string;
  count: number;
  columnType: ColumnType;
  className?: string;
}

export function ColumnHeader({ title, count, columnType, className }: ColumnHeaderProps) {
  const { getColumnStyle } = useColumnColors();
  const style = getColumnStyle(columnType);
  
  return (
    <div 
      className={cn(
        "px-4 py-3 rounded-md flex items-center justify-between",
        className
      )}
      style={{
        backgroundColor: style.backgroundColor,
        color: style.textColor,
        borderColor: style.borderColor,
        borderWidth: "1px",
        borderStyle: "solid"
      }}
    >
      <h3 className="font-semibold">{title}</h3>
      <span className="rounded-full bg-background/20 min-w-[1.5rem] h-6 flex items-center justify-center px-1 text-sm">
        {count}
      </span>
    </div>
  );
}

interface OrderCardProps {
  columnType: ColumnType;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
  isSelected?: boolean;
}

export function OrderCard({ columnType, className, children, onClick, isSelected }: OrderCardProps) {
  const { getColumnStyle } = useColumnColors();
  const style = getColumnStyle(columnType);
  
  return (
    <div 
      className={cn(
        "rounded-md p-3 cursor-pointer transition-all hover:shadow-md",
        isSelected ? "ring-2 ring-ring" : "",
        className
      )}
      style={{
        backgroundColor: "white",
        borderLeftWidth: "4px",
        borderLeftStyle: "solid",
        borderLeftColor: style.borderColor
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface ColorPickerProps {
  columnType: ColumnType;
  label: string;
}

export function ColumnColorPicker({ columnType, label }: ColorPickerProps) {
  const { getColumnStyle, updateColumnStyle } = useColumnColors();
  const style = getColumnStyle(columnType);
  
  const handleBgColorChange = (value: string) => {
    updateColumnStyle(columnType, { ...style, backgroundColor: value });
  };
  
  const handleTextColorChange = (value: string) => {
    updateColumnStyle(columnType, { ...style, textColor: value });
  };
  
  const handleBorderColorChange = (value: string) => {
    updateColumnStyle(columnType, { ...style, borderColor: value });
  };
  
  return (
    <div className="space-y-2">
      <div className="font-medium text-sm">{label}</div>
      <div className="grid grid-cols-1 gap-3">
        <ColorPicker
          id={`${columnType}-bg`}
          label="Background"
          value={style.backgroundColor}
          onChange={handleBgColorChange}
        />
        
        <ColorPicker
          id={`${columnType}-text`}
          label="Text"
          value={style.textColor}
          onChange={handleTextColorChange}
        />
        
        <ColorPicker
          id={`${columnType}-border`}
          label="Border"
          value={style.borderColor}
          onChange={handleBorderColorChange}
        />
      </div>
      
      <div className="flex mt-1">
        <div 
          className="text-xs p-1 rounded flex-1 text-center"
          style={{ 
            backgroundColor: style.backgroundColor,
            color: style.textColor,
            borderColor: style.borderColor,
            borderWidth: "1px",
            borderStyle: "solid"
          }}
        >
          Preview
        </div>
      </div>
    </div>
  );
}