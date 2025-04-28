import { useColumnColors } from "@/contexts/ColumnColorContext";
import { useEffect } from "react";

// This component now only initializes colors but doesn't display any UI
export function ColumnColorSettings() {
  const { resetColors } = useColumnColors();

  // Force a reset when the component mounts
  useEffect(() => {
    resetColors();
  }, [resetColors]);

  // Return nothing (empty fragment) since we removed the Reset Colors button
  return <></>;
}