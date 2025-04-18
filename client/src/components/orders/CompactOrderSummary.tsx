import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Minus, X } from "lucide-react";

interface OrderItem {
  menuItemId: number;
  menuItemName?: string;
  quantity: number;
  price: number;
  specialInstructions?: string;
}

interface CompactOrderSummaryProps {
  orderItems: OrderItem[];
  notes: string;
  onNotesChange: (notes: string) => void;
  onUpdateQuantity: (index: number, change: number) => void;
  onRemoveItem: (index: number) => void;
  emptyStateIcon: React.ReactNode;
  emptyStateText: string;
}

export function CompactOrderSummary({
  orderItems,
  notes,
  onNotesChange,
  onUpdateQuantity,
  onRemoveItem,
  emptyStateIcon,
  emptyStateText
}: CompactOrderSummaryProps) {
  // Calculate total amount
  const totalAmount = orderItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="h-full p-2 flex flex-col">
      <div className="flex justify-between items-center mb-1">
        <h3 className="font-bold text-white text-sm">Your Order Summary</h3>
        {orderItems.length > 0 && (
          <div className="text-xs bg-blue-900/30 px-1.5 py-0.5 rounded-full text-blue-300 border border-blue-800/50">
            {orderItems.length} {orderItems.length === 1 ? 'item' : 'items'}
          </div>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto pr-1">
        {orderItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-2">
            <div className="rounded-full bg-blue-950/30 p-3 w-16 h-16 flex items-center justify-center">
              {emptyStateIcon}
            </div>
            <p className="text-center">{emptyStateText}</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {orderItems.map((item, index) => (
              <div key={index} className="border border-blue-800/50 rounded-lg p-2 space-y-1 hover:bg-blue-900/20 transition-colors">
                <div className="flex justify-between">
                  <h4 className="font-semibold text-white text-sm">{item.menuItemName}</h4>
                  <div className="flex items-center space-x-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5 text-white hover:bg-blue-800/50 hover:text-white rounded-full p-0"
                      onClick={() => onUpdateQuantity(index, -1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-white text-xs min-w-[20px] text-center">
                      {item.quantity}
                    </span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5 text-white hover:bg-blue-600 hover:text-white rounded-full p-0"
                      onClick={() => onUpdateQuantity(index, 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5 text-red-500 hover:bg-red-950/50 hover:text-red-400 rounded-full p-0 ml-1"
                      onClick={() => onRemoveItem(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">
                    {formatCurrency(item.price)} × {item.quantity}
                  </span>
                  <span className="font-medium text-blue-300">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </div>
                
                {item.specialInstructions && (
                  <div className="mt-1 pt-1 border-t border-blue-800/30">
                    <p className="text-gray-400 text-xs italic">{item.specialInstructions}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="pt-2">
        <div className="rounded-lg border border-gray-800 overflow-hidden">
          <Textarea
            placeholder="Add notes for this order..."
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            className="bg-black border-0 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none h-16 text-sm placeholder:text-gray-600"
          />
        </div>
      </div>
      
      <div className="mt-2 p-2 bg-blue-900/30 flex justify-between items-center rounded-lg border border-blue-800">
        <span className="font-bold text-blue-300 text-sm">Total Amount</span>
        <span className="text-lg font-extrabold text-white">
          {formatCurrency(totalAmount)}
        </span>
      </div>
    </div>
  );
}