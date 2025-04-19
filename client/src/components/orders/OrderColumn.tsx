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
  // Define professional gradient backgrounds with matched colors
  const gradientMap = {
    'pending': 'bg-gradient-to-r from-amber-500 to-orange-700',
    'preparing': 'bg-gradient-to-r from-indigo-500 to-blue-700',
    'ready': 'bg-gradient-to-r from-emerald-500 to-green-700',
    'completed': 'bg-gradient-to-r from-purple-500 to-violet-700'
  };
  
  return (
    <div 
      className={`font-bold py-2 rounded-t-md text-center flex items-center justify-between w-full px-3 ${gradientMap[columnType]} order-card-text`}
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
  // Define gradient backgrounds for order cards that match headers
  const colorMap = {
    'pending': 'bg-gradient-to-r from-amber-400 to-orange-500 text-white border-amber-600',
    'preparing': 'bg-gradient-to-r from-indigo-400 to-blue-500 text-white border-blue-600',
    'ready': 'bg-gradient-to-r from-emerald-400 to-green-500 text-white border-green-600',
    'completed': 'bg-gradient-to-r from-purple-400 to-violet-500 text-white border-purple-600'
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