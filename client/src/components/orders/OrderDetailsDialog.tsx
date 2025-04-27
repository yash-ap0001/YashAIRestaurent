import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

// Define types
interface OrderDetailsDialogProps {
  orderId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface OrderItem {
  id: number;
  orderId: number;
  menuItemId: number;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
}

interface Order {
  id: number;
  orderNumber: string;
  status: string;
  totalAmount: number;
  orderSource: string;
  tableNumber: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export function OrderDetailsDialog({ orderId, open, onOpenChange }: OrderDetailsDialogProps) {
  // Fetch order data
  const { data: order, isLoading: isLoadingOrder } = useQuery<Order>({
    queryKey: ['/api/orders', orderId],
    queryFn: async () => {
      const response = await fetch(`/api/orders/${orderId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch order details');
      }
      return response.json();
    },
    enabled: !!orderId && open,
  });

  // Fetch order items
  const { data: orderItems = [], isLoading: isLoadingItems } = useQuery<OrderItem[]>({
    queryKey: ['/api/orders', orderId, 'items'],
    queryFn: async () => {
      // Use the dedicated endpoint for order items by order ID
      const response = await fetch(`/api/orders/${orderId}/items`);
      if (!response.ok) {
        throw new Error('Failed to fetch order items');
      }
      return response.json();
    },
    enabled: !!orderId && open,
  });

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  // Get status badge class
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-500/20 text-amber-600';
      case 'preparing':
        return 'bg-indigo-500/20 text-indigo-600';
      case 'ready':
        return 'bg-emerald-500/20 text-emerald-600';
      case 'completed':
        return 'bg-purple-500/20 text-purple-600';
      case 'billed':
        return 'bg-pink-500/20 text-pink-600';
      case 'cancelled':
        return 'bg-red-500/20 text-red-600';
      default:
        return 'bg-gray-500/20 text-gray-600';
    }
  };

  const isLoading = isLoadingOrder || isLoadingItems;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {order ? `Order #${order.orderNumber}` : 'Order Details'}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !order ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground">
            No order selected or order not found
          </div>
        ) : (
          <div className="space-y-6">
            {/* Order summary information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Table</div>
                <div className="font-medium">{order.tableNumber || 'Takeaway'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Status</div>
                <div>
                  <Badge className={getStatusBadgeClass(order.status)}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Badge>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Order Source</div>
                <div className="font-medium">
                  {order.orderSource.charAt(0).toUpperCase() + order.orderSource.slice(1)}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Date & Time</div>
                <div className="font-medium">{format(new Date(order.createdAt), "PPp")}</div>
              </div>
              {order.notes && (
                <div className="col-span-2 space-y-1">
                  <div className="text-sm text-muted-foreground">Notes</div>
                  <div className="p-2 bg-muted rounded text-sm">{order.notes}</div>
                </div>
              )}
            </div>

            {/* Order items */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Order Items</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                        No items found for this order
                      </TableCell>
                    </TableRow>
                  ) : (
                    orderItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.price * item.quantity)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Order total */}
            <div className="flex justify-end">
              <div className="space-y-1 w-48">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>{formatCurrency(order.totalAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>{formatCurrency(order.totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}