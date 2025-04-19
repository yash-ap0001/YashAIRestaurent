import { createContext, useContext, useState, ReactNode } from "react";

export type ColumnType = 'pending' | 'preparing' | 'ready' | 'completed';

export interface ColumnStyle {
  backgroundColor: string;
  textColor: string;
  borderColor: string;
}

interface ColumnColorContextType {
  getColumnStyle: (column: ColumnType) => ColumnStyle;
  resetColors: () => void;
}

const defaultStyles: Record<ColumnType, ColumnStyle> = {
  pending: {
    backgroundColor: "#FFA500", // Amber/Orange
    textColor: "#FFFFFF",       // White
    borderColor: "#FF7A00"      // Darker Orange
  },
  preparing: {
    backgroundColor: "#4F94CD", // Royal Blue
    textColor: "#FFFFFF",       // White
    borderColor: "#3A70A0"      // Darker Blue
  },
  ready: {
    backgroundColor: "#2ECC71", // Emerald Green
    textColor: "#FFFFFF",       // White
    borderColor: "#27AE60"      // Darker Green
  },
  completed: {
    backgroundColor: "#9370DB", // Medium Purple
    textColor: "#FFFFFF",       // White
    borderColor: "#7D5EC8"      // Darker Purple
  }
};

const ColumnColorContext = createContext<ColumnColorContextType | undefined>(undefined);

export function ColumnColorProvider({ children }: { children: ReactNode }) {
  const [columnStyles, setColumnStyles] = useState<Record<ColumnType, ColumnStyle>>(defaultStyles);
  
  const getColumnStyle = (column: ColumnType): ColumnStyle => {
    return columnStyles[column];
  };
  
  const resetColors = () => {
    setColumnStyles(defaultStyles);
  };
  
  return (
    <ColumnColorContext.Provider value={{ getColumnStyle, resetColors }}>
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