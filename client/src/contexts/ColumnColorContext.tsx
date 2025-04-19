import { createContext, useContext, useState, ReactNode, useCallback } from "react";

export type ColumnType = 'pending' | 'preparing' | 'ready' | 'completed';

export interface ColumnStyle {
  backgroundColor: string;
  textColor: string;
  borderColor: string;
}

interface ColumnColorContextType {
  getColumnStyle: (column: ColumnType) => ColumnStyle;
  resetColors: () => void;
  updateColumnStyle: (column: ColumnType, style: ColumnStyle) => void;
}

// Define fixed professional color schemes for each column status
const defaultStyles: Record<ColumnType, ColumnStyle> = {
  pending: {
    backgroundColor: "#FF9800", // Orange
    textColor: "#FFFFFF",      // White
    borderColor: "#E65100"     // Dark Orange
  },
  preparing: {
    backgroundColor: "#2196F3", // Blue
    textColor: "#FFFFFF",      // White
    borderColor: "#0D47A1"     // Dark Blue
  },
  ready: {
    backgroundColor: "#4CAF50", // Green
    textColor: "#FFFFFF",      // White
    borderColor: "#1B5E20"     // Dark Green
  },
  completed: {
    backgroundColor: "#9C27B0", // Purple
    textColor: "#FFFFFF",      // White
    borderColor: "#4A148C"     // Dark Purple
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
  
  // Reset all colors to defaults
  const resetColors = useCallback(() => {
    setColumnStyles({...defaultStyles});
  }, []);
  
  // Update a specific column's style
  const updateColumnStyle = useCallback((column: ColumnType, style: ColumnStyle) => {
    setColumnStyles(prev => ({
      ...prev,
      [column]: style
    }));
  }, []);
  
  return (
    <ColumnColorContext.Provider value={{ getColumnStyle, resetColors, updateColumnStyle }}>
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