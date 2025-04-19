import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const colorOptions = [
  // Reds
  "#FEE2E2", "#FECACA", "#FCA5A5", "#F87171", "#EF4444", "#DC2626", "#B91C1C", "#991B1B", "#7F1D1D",
  // Oranges
  "#FFEDD5", "#FED7AA", "#FDBA74", "#FB923C", "#F97316", "#EA580C", "#C2410C", "#9A3412", "#7C2D12",
  // Ambers
  "#FEF3C7", "#FDE68A", "#FCD34D", "#FBBF24", "#F59E0B", "#D97706", "#B45309", "#92400E", "#78350F",
  // Yellows
  "#FEF9C3", "#FEF08A", "#FDE047", "#FACC15", "#EAB308", "#CA8A04", "#A16207", "#854D0E", "#713F12",
  // Limes
  "#ECFCCB", "#D9F99D", "#BEF264", "#A3E635", "#84CC16", "#65A30D", "#4D7C0F", "#3F6212", "#365314",
  // Greens
  "#DCFCE7", "#BBF7D0", "#86EFAC", "#4ADE80", "#22C55E", "#16A34A", "#15803D", "#166534", "#14532D",
  // Emeralds
  "#D1FAE5", "#A7F3D0", "#6EE7B7", "#34D399", "#10B981", "#059669", "#047857", "#065F46", "#064E3B",
  // Teals
  "#CCFBF1", "#99F6E4", "#5EEAD4", "#2DD4BF", "#14B8A6", "#0D9488", "#0F766E", "#115E59", "#134E4A",
  // Cyans
  "#CFFAFE", "#A5F3FC", "#67E8F9", "#22D3EE", "#06B6D4", "#0891B2", "#0E7490", "#155E75", "#164E63",
  // Sky Blues
  "#E0F2FE", "#BAE6FD", "#7DD3FC", "#38BDF8", "#0EA5E9", "#0284C7", "#0369A1", "#075985", "#0C4A6E",
  // Blues
  "#DBEAFE", "#BFDBFE", "#93C5FD", "#60A5FA", "#3B82F6", "#2563EB", "#1D4ED8", "#1E40AF", "#1E3A8A",
  // Indigos
  "#E0E7FF", "#C7D2FE", "#A5B4FC", "#818CF8", "#6366F1", "#4F46E5", "#4338CA", "#3730A3", "#312E81",
  // Violets
  "#EDE9FE", "#DDD6FE", "#C4B5FD", "#A78BFA", "#8B5CF6", "#7C3AED", "#6D28D9", "#5B21B6", "#4C1D95",
  // Purples
  "#F3E8FF", "#E9D5FF", "#D8B4FE", "#C084FC", "#A855F7", "#9333EA", "#7E22CE", "#6B21A8", "#581C87",
  // Fuchsias
  "#FAE8FF", "#F5D0FE", "#F0ABFC", "#E879F9", "#D946EF", "#C026D3", "#A21CAF", "#86198F", "#701A75",
  // Pinks
  "#FCE7F3", "#FBCFE8", "#F9A8D4", "#F472B6", "#EC4899", "#DB2777", "#BE185D", "#9D174D", "#831843",
  // Roses
  "#FFE4E6", "#FECDD3", "#FDA4AF", "#FB7185", "#F43F5E", "#E11D48", "#BE123C", "#9F1239", "#881337",
  // Blacks/Whites
  "#F8FAFC", "#F1F5F9", "#E2E8F0", "#CBD5E1", "#94A3B8", "#64748B", "#475569", "#334155", "#1E293B", "#0F172A", "#020617",
  // Neutrals
  "#FAFAFA", "#F5F5F5", "#E5E5E5", "#D4D4D4", "#A3A3A3", "#737373", "#525252", "#404040", "#262626", "#171717", "#0A0A0A",
];

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  id?: string;
}

export function ColorPicker({ value, onChange, label, id }: ColorPickerProps) {
  const [customValue, setCustomValue] = useState(value);

  // Sync customValue with external value when it changes
  useEffect(() => {
    setCustomValue(value);
  }, [value]);

  const handleColorSelect = (color: string) => {
    setCustomValue(color);
    onChange(color);
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setCustomValue(newValue);
    
    // Real-time update for preview while typing
    if (newValue.match(/^#([0-9A-F]{3}){1,2}$/i) || 
        newValue.match(/^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/i) ||
        newValue.match(/^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/i)) {
      onChange(newValue);
    }
  };

  const handleCustomColorBlur = () => {
    // Only update the value if it's a valid color (keep simple validation)
    if (customValue.match(/^#([0-9A-F]{3}){1,2}$/i) || 
        customValue.match(/^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/i) ||
        customValue.match(/^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/i)) {
      onChange(customValue);
    } else {
      // If invalid, revert to the current valid value
      setCustomValue(value);
    }
  };

  return (
    <div className="flex flex-col space-y-1.5">
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="flex items-center space-x-2">
        <Popover>
          <PopoverTrigger asChild>
            <button
              id={id}
              className="w-8 h-8 rounded-md border border-input"
              style={{ backgroundColor: value }}
              aria-label="Pick a color"
            />
          </PopoverTrigger>
          <PopoverContent className="w-64" align="start">
            <div className="grid grid-cols-9 gap-1 p-2">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  className="w-5 h-5 rounded-sm border border-gray-200 hover:scale-125 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorSelect(color)}
                  aria-label={color}
                />
              ))}
            </div>
            <div className="flex items-center px-2 pt-2 pb-1 border-t">
              <Input
                value={customValue}
                onChange={handleCustomColorChange}
                onBlur={handleCustomColorBlur}
                className="h-7 text-xs"
              />
            </div>
          </PopoverContent>
        </Popover>
        <Input
          id={id ? `${id}-text` : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 text-xs"
        />
      </div>
    </div>
  );
}