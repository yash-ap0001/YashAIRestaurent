import { createContext, useContext, useState, ReactNode, useCallback } from "react";

export type ColumnType = 'pending' | 'preparing' | 'ready' | 'completed';

export interface ColumnStyle {
  backgroundColor: string;
  textColor: string;
  borderColor: string;
}

interface ColumnColorContextType {
  getColumnStyle: (column: ColumnType) => ColumnStyle;
  updateColumnStyle: (column: ColumnType, style: ColumnStyle) => void;
}

// Define fixed professional color schemes for each column status
// Improved colors for better visibility in both light and dark modes
const defaultStyles: Record<ColumnType, ColumnStyle> = {
  pending: {
    backgroundColor: "#F97316", // Bright Orange
    textColor: "#FFFFFF",      // White
    borderColor: "#C2410C"     // Dark Orange
  },
  preparing: {
    backgroundColor: "#3B82F6", // Bright Blue
    textColor: "#FFFFFF",      // White
    borderColor: "#1D4ED8"     // Dark Blue
  },
  ready: {
    backgroundColor: "#10B981", // Bright Green
    textColor: "#FFFFFF",      // White
    borderColor: "#059669"     // Dark Green
  },
  completed: {
    backgroundColor: "#8B5CF6", // Bright Purple
    textColor: "#FFFFFF",      // White
    borderColor: "#6D28D9"     // Dark Purple
  }
};

const ColumnColorContext = createContext<ColumnColorContextType | undefined>(undefined);

export function ColumnColorProvider({ children }: { children: ReactNode }) {
  // Initialize with the default styles
  const [columnStyles, setColumnStyles] = useState<Record<ColumnType, ColumnStyle>>(defaultStyles);
  
  // Get the style for a specific column type
  const getColumnStyle = useCallback((column: ColumnType): ColumnStyle => {
    return columnStyles[column];
  }, [columnStyles]);
  
  // Update a specific column's style
  const updateColumnStyle = useCallback((column: ColumnType, style: ColumnStyle) => {
    setColumnStyles(prev => ({
      ...prev,
      [column]: style
    }));
  }, []);
  
  return (
    <ColumnColorContext.Provider value={{ getColumnStyle, updateColumnStyle }}>
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