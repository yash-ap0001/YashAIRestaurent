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
    backgroundColor: "#FFE0B2", // Light Orange/Amber
    textColor: "#E65100",       // Dark Orange text
    borderColor: "#FFB74D"      // Medium Orange border
  },
  preparing: {
    backgroundColor: "#BBDEFB", // Light Blue
    textColor: "#1565C0",       // Dark Blue text
    borderColor: "#64B5F6"      // Medium Blue border
  },
  ready: {
    backgroundColor: "#C8E6C9", // Light Green
    textColor: "#2E7D32",       // Dark Green text
    borderColor: "#81C784"      // Medium Green border
  },
  completed: {
    backgroundColor: "#D1C4E9", // Light Purple
    textColor: "#4527A0",       // Dark Purple text
    borderColor: "#9575CD"      // Medium Purple border
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