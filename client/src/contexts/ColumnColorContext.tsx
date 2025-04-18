import { createContext, useContext, useState, ReactNode } from "react";

export type ColumnType = 'pending' | 'preparing' | 'ready' | 'completed';

export interface ColumnStyle {
  backgroundColor: string;
  textColor: string;
  borderColor: string;
}

interface ColumnColorContextType {
  getColumnStyle: (column: ColumnType) => ColumnStyle;
  updateColumnStyle: (column: ColumnType, style: ColumnStyle) => void;
  resetColors: () => void;
}

const defaultStyles: Record<ColumnType, ColumnStyle> = {
  pending: {
    backgroundColor: "#FEF3C7", // Amber 100
    textColor: "#92400E",       // Amber 800
    borderColor: "#F59E0B"      // Amber 500
  },
  preparing: {
    backgroundColor: "#DBEAFE", // Blue 100
    textColor: "#1E40AF",       // Blue 800
    borderColor: "#3B82F6"      // Blue 500
  },
  ready: {
    backgroundColor: "#D1FAE5", // Green 100
    textColor: "#065F46",       // Green 800
    borderColor: "#10B981"      // Green 500
  },
  completed: {
    backgroundColor: "#E0E7FF", // Indigo 100
    textColor: "#3730A3",       // Indigo 800
    borderColor: "#6366F1"      // Indigo 500
  }
};

const ColumnColorContext = createContext<ColumnColorContextType | undefined>(undefined);

export function ColumnColorProvider({ children }: { children: ReactNode }) {
  const [columnStyles, setColumnStyles] = useState<Record<ColumnType, ColumnStyle>>(
    // Load from localStorage if available, otherwise use defaults
    JSON.parse(localStorage.getItem('yash_hotel_column_styles') || JSON.stringify(defaultStyles))
  );
  
  const getColumnStyle = (column: ColumnType): ColumnStyle => {
    return columnStyles[column];
  };
  
  const updateColumnStyle = (column: ColumnType, style: ColumnStyle) => {
    const newStyles = { ...columnStyles, [column]: style };
    setColumnStyles(newStyles);
    localStorage.setItem('yash_hotel_column_styles', JSON.stringify(newStyles));
  };
  
  const resetColors = () => {
    setColumnStyles(defaultStyles);
    localStorage.setItem('yash_hotel_column_styles', JSON.stringify(defaultStyles));
  };
  
  return (
    <ColumnColorContext.Provider value={{ getColumnStyle, updateColumnStyle, resetColors }}>
      {children}
    </ColumnColorContext.Provider>
  );
}

export function useColumnColors() {
  const context = useContext(ColumnColorContext);
  
  if (!context) {
    throw new Error("useColumnColors must be used within a ColumnColorProvider");
  }
  
  return context;
}