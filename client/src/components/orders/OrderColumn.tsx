import { useColumnColors } from "@/contexts/ColumnColorContext";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ColumnType } from "@/contexts/ColumnColorContext";

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
  
  const handleBgColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateColumnStyle(columnType, { ...style, backgroundColor: e.target.value });
  };
  
  const handleTextColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateColumnStyle(columnType, { ...style, textColor: e.target.value });
  };
  
  const handleBorderColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateColumnStyle(columnType, { ...style, borderColor: e.target.value });
  };
  
  return (
    <div className="space-y-2">
      <div className="font-medium text-sm">{label}</div>
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label htmlFor={`${columnType}-bg`} className="text-xs">Background</Label>
          <div className="flex items-center space-x-2">
            <div 
              className="w-4 h-4 rounded-full border" 
              style={{ backgroundColor: style.backgroundColor }}
            />
            <Input
              id={`${columnType}-bg`}
              type="text"
              value={style.backgroundColor}
              onChange={handleBgColorChange}
              className="h-6 text-xs"
            />
          </div>
        </div>
        
        <div className="space-y-1">
          <Label htmlFor={`${columnType}-text`} className="text-xs">Text</Label>
          <div className="flex items-center space-x-2">
            <div 
              className="w-4 h-4 rounded-full border" 
              style={{ backgroundColor: style.textColor }}
            />
            <Input
              id={`${columnType}-text`}
              type="text"
              value={style.textColor}
              onChange={handleTextColorChange}
              className="h-6 text-xs"
            />
          </div>
        </div>
        
        <div className="space-y-1">
          <Label htmlFor={`${columnType}-border`} className="text-xs">Border</Label>
          <div className="flex items-center space-x-2">
            <div 
              className="w-4 h-4 rounded-full border" 
              style={{ backgroundColor: style.borderColor }}
            />
            <Input
              id={`${columnType}-border`}
              type="text"
              value={style.borderColor}
              onChange={handleBorderColorChange}
              className="h-6 text-xs"
            />
          </div>
        </div>
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