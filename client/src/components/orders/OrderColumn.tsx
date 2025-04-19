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
  
  // Define gradient backgrounds for each column type
  const gradientMap = {
    'pending': 'bg-gradient-to-r from-amber-500 to-orange-700',
    'preparing': 'bg-gradient-to-r from-blue-500 to-blue-700',
    'ready': 'bg-gradient-to-r from-green-500 to-green-700',
    'completed': 'bg-gradient-to-r from-purple-500 to-purple-700'
  };
  
  return (
    <div 
      className={cn(
        "font-bold py-2 rounded-t-md text-center flex items-center justify-between w-full px-3",
        gradientMap[columnType],
        "order-card-text",
        className
      )}
    >
      <h3 className="font-semibold text-white">{title}</h3>
      <span className="rounded-full bg-white/20 min-w-[1.5rem] h-6 flex items-center justify-center px-1 text-sm text-white">
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
  // Define color backgrounds for each column type
  const colorMap = {
    'pending': 'bg-amber-100 text-amber-900 border-amber-300',
    'preparing': 'bg-blue-100 text-blue-900 border-blue-300',
    'ready': 'bg-green-100 text-green-900 border-green-300',
    'completed': 'bg-purple-100 text-purple-900 border-purple-300'
  };
  
  return (
    <div 
      className={cn(
        "rounded-md p-3 cursor-pointer transition-all hover:shadow-md border",
        colorMap[columnType],
        isSelected ? "ring-2 ring-ring" : "",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}