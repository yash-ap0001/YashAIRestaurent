import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

// Define types
interface Order {
  id: number;
  orderNumber: string;
  tableNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  orderSource: string;
}

interface KitchenToken {
  id: number;
  tokenNumber: string;
  orderId: number;
  status: string;
}

interface Bill {
  id: number;
  billNumber: string;
  orderId: number;
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CircleCheck,
  DollarSign,
  CreditCard,
  Loader2,
  ChefHat,
  ClipboardCheck,
  Bell,
  Clock,
  FileText,
  Menu,
  MessageSquare,
  Phone,
  ReceiptText
} from "lucide-react";

// Order status colors
const statusColors = {
  pending: "bg-amber-500",
  preparing: "bg-blue-500",
  ready: "bg-emerald-500",
  completed: "bg-indigo-500",
  delivered: "bg-violet-500",
  billed: "bg-slate-500",
};

// Order status text
const statusText = {
  pending: "Pending",
  preparing: "Preparing",
  ready: "Ready",
  completed: "Completed",
  delivered: "Delivered",
  billed: "Billed",
};

export default function SimplifiedDashboard() {
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null);

  // Fetch orders
  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  // Fetch kitchen tokens
  const { data: kitchenTokens = [], isLoading: tokensLoading } = useQuery<KitchenToken[]>({
    queryKey: ["/api/kitchen-tokens"],
  });

  // Fetch bills
  const { data: bills = [], isLoading: billsLoading } = useQuery<Bill[]>({
    queryKey: ["/api/bills"],
  });

  // Update order status mutation
  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/orders/${id}`, { status });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kitchen-tokens"] });
      toast({
        title: "Order Updated",
        description: "Order status has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create kitchen token mutation
  const createTokenMutation = useMutation({
    mutationFn: async ({ orderId }: { orderId: number }) => {
      const res = await apiRequest("POST", "/api/kitchen-tokens", { orderId });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kitchen-tokens"] });
      toast({
        title: "Token Created",
        description: "Kitchen token has been created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Token Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update kitchen token mutation
  const updateTokenMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/kitchen-tokens/${id}`, { status });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kitchen-tokens"] });
      toast({
        title: "Token Updated",
        description: "Kitchen token has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Token Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create bill mutation
  const createBillMutation = useMutation({
    mutationFn: async ({ orderId }: { orderId: number }) => {
      const res = await apiRequest("POST", "/api/bills", { orderId });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Bill Created",
        description: "Bill has been created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Bill Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Progress order to next status
  const progressOrder = (order: Order) => {
    const currentStatus = order.status;
    let nextStatus = currentStatus;

    // Define the order flow
    switch (currentStatus) {
      case "pending":
        nextStatus = "preparing";
        break;
      case "preparing":
        nextStatus = "ready";
        break;
      case "ready":
        nextStatus = "completed";
        break;
      case "completed":
        nextStatus = "billed";
        break;
      default:
        break;
    }

    // Only update if there's a valid next status
    if (nextStatus !== currentStatus) {
      updateOrderMutation.mutate({ id: order.id, status: nextStatus });

      // If moving to preparing, create kitchen token
      if (nextStatus === "preparing") {
        const hasToken = kitchenTokens.some((token: KitchenToken) => token.orderId === order.id);
        if (!hasToken) {
          createTokenMutation.mutate({ orderId: order.id });
        }
      }

      // If moving to billed, create bill
      if (nextStatus === "billed") {
        const hasBill = bills.some((bill: Bill) => bill.orderId === order.id);
        if (!hasBill) {
          createBillMutation.mutate({ orderId: order.id });
        }
      }
    }
  };

  // Get the action button text based on order status
  const getActionText = (status: string) => {
    switch (status) {
      case "pending":
        return "Start Cooking";
      case "preparing":
        return "Mark as Ready";
      case "ready":
        return "Mark as Completed";
      case "completed":
        return "Create Bill";
      case "billed":
        return "Done";
      default:
        return "Next Step";
    }
  };

  // Get action button icon
  const getActionIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <ChefHat className="h-4 w-4 mr-2" />;
      case "preparing":
        return <ClipboardCheck className="h-4 w-4 mr-2" />;
      case "ready":
        return <CircleCheck className="h-4 w-4 mr-2" />;
      case "completed":
        return <ReceiptText className="h-4 w-4 mr-2" />;
      case "billed":
        return <CircleCheck className="h-4 w-4 mr-2" />;
      default:
        return <Clock className="h-4 w-4 mr-2" />;
    }
  };

  // Get order source icon
  const getSourceIcon = (source: string) => {
    switch (source) {
      case "manual":
        return <Menu className="h-4 w-4" />;
      case "whatsapp":
        return <MessageSquare className="h-4 w-4" />;
      case "phone":
        return <Phone className="h-4 w-4" />;
      case "zomato":
      case "swiggy":
        return <FileText className="h-4 w-4" />;
      default:
        return <Menu className="h-4 w-4" />;
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  // Loading state
  if (ordersLoading || tokensLoading || billsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold">Simple Dashboard</h1>
        <p className="text-neutral-500">
          Manage orders with one-click actions. Everything you need in one place.
        </p>
      </div>

      {/* Simple Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Pending Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders.filter((order: Order) => ["pending", "preparing"].includes(order.status)).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Ready to Serve</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders.filter((order: Order) => order.status === "ready").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Total Sales Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                orders
                  .filter((order: Order) => order.status === "billed")
                  .reduce((sum: number, order: Order) => sum + order.totalAmount, 0)
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order List */}
      <Card>
        <CardHeader>
          <CardTitle>All Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="text-center py-6 text-neutral-500">
                No orders yet. Create a new order to get started.
              </div>
            ) : (
              orders.map((order: Order) => (
                <div 
                  key={order.id} 
                  className="border rounded-lg p-4 space-y-3 hover:border-primary transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${statusColors[order.status as keyof typeof statusColors]}`}></div>
                      <h3 className="font-medium">Order #{order.orderNumber}</h3>
                      <div className="flex items-center space-x-1 text-neutral-500 text-sm">
                        <span className="flex items-center">
                          {getSourceIcon(order.orderSource)}
                        </span>
                        <span>{order.orderSource.charAt(0).toUpperCase() + order.orderSource.slice(1)}</span>
                      </div>
                    </div>
                    <div className="text-sm text-neutral-500">
                      {format(new Date(order.createdAt), "h:mm a")}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm text-neutral-500">Table {order.tableNumber}</div>
                      <div className="font-medium">{formatCurrency(order.totalAmount)}</div>
                    </div>
                    
                    <Button
                      variant={order.status === "billed" ? "outline" : "default"}
                      size="sm"
                      disabled={updateOrderMutation.isPending || order.status === "billed"}
                      onClick={() => progressOrder(order)}
                    >
                      {updateOrderMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        getActionIcon(order.status)
                      )}
                      {getActionText(order.status)}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}