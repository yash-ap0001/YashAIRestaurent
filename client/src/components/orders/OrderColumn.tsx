import { useColumnColors } from "@/contexts/ColumnColorContext";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";
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
        backgroundColor: style.backgroundColor,
        color: style.textColor,
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: style.borderColor
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}