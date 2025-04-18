import { useTheme } from "@/contexts/ThemeContext";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState } from "react";
import { ThemeBox, ThemeCard, ThemeColumnHeader } from "../theme/ThemeStyles";
import { Button } from "@/components/ui/button";
import { ChefHat, ClipboardCheck, Receipt, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Order {
  id: number;
  orderNumber: string;
  tableNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  orderSource: string;
}

export function ThemedOrderBoard() {
  const { colors } = useTheme();
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null);
  
  // Retrieve sample orders
  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    queryFn: async () => {
      const response = await fetch("/api/orders");
      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }
      return response.json();
    },
  });
  
  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };
  
  // Helper function to get source icon
  const getSourceIcon = (source: string) => {
    switch (source.toLowerCase()) {
      case 'manual':
        return <span className="text-xs">👤</span>;
      case 'whatsapp':
        return <span className="text-xs">📱</span>;
      case 'phone':
        return <span className="text-xs">☎️</span>;
      case 'zomato':
        return <span className="text-xs">🍽️</span>;
      case 'swiggy':
        return <span className="text-xs">🛵</span>;
      case 'ai':
        return <span className="text-xs">🤖</span>;
      default:
        return <span className="text-xs">📝</span>;
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 w-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  // Filter orders by status
  const pendingOrders = orders.filter(order => order.status === "pending").slice(0, 3);
  const preparingOrders = orders.filter(order => order.status === "preparing").slice(0, 3);
  const readyOrders = orders.filter(order => order.status === "ready").slice(0, 3);
  const completedOrders = orders.filter(order => order.status === "completed").slice(0, 3);
  
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Orders Column */}
        <div className="space-y-4">
          <ThemeColumnHeader variant="pending">
            <div className="flex items-center justify-between w-full">
              <span>Pending Orders</span>
              <Badge variant="outline" className="bg-amber-800 text-amber-100">
                {pendingOrders.length}
              </Badge>
            </div>
          </ThemeColumnHeader>
          
          <div className="space-y-3">
            {pendingOrders.map(order => (
              <ThemeCard 
                key={order.id} 
                variant="pending"
                className={cn(
                  "hover:shadow-lg transition-all cursor-pointer",
                  selectedOrder === order.id ? "ring-2 ring-primary" : ""
                )}
                onClick={() => setSelectedOrder(order.id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-lg">#{order.orderNumber}</h3>
                    <div className="text-xs opacity-80">Table {order.tableNumber}</div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    <span className="flex items-center">
                      {getSourceIcon(order.orderSource)}
                      <span className="ml-1">{order.orderSource.charAt(0).toUpperCase() + order.orderSource.slice(1)}</span>
                    </span>
                  </Badge>
                </div>
                
                <div className="text-xs opacity-70 mb-2">
                  {format(new Date(order.createdAt), "h:mm a")}
                </div>
                
                <div className="flex justify-between items-center mt-2">
                  <div className="font-bold">{formatCurrency(order.totalAmount)}</div>
                  
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-7 px-2"
                  >
                    <ChefHat className="h-3 w-3 mr-1" />
                    <span className="text-xs">Start</span>
                  </Button>
                </div>
              </ThemeCard>
            ))}
          </div>
        </div>
        
        {/* Preparing Orders Column */}
        <div className="space-y-4">
          <ThemeColumnHeader variant="preparing">
            <div className="flex items-center justify-between w-full">
              <span>Preparing</span>
              <Badge variant="outline" className="bg-emerald-800 text-emerald-100">
                {preparingOrders.length}
              </Badge>
            </div>
          </ThemeColumnHeader>
          
          <div className="space-y-3">
            {preparingOrders.map(order => (
              <ThemeCard 
                key={order.id} 
                variant="preparing"
                className={cn(
                  "hover:shadow-lg transition-all cursor-pointer",
                  selectedOrder === order.id ? "ring-2 ring-primary" : ""
                )}
                onClick={() => setSelectedOrder(order.id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-lg">#{order.orderNumber}</h3>
                    <div className="text-xs opacity-80">Table {order.tableNumber}</div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    <span className="flex items-center">
                      {getSourceIcon(order.orderSource)}
                      <span className="ml-1">{order.orderSource.charAt(0).toUpperCase() + order.orderSource.slice(1)}</span>
                    </span>
                  </Badge>
                </div>
                
                <div className="text-xs opacity-70 mb-2">
                  {format(new Date(order.createdAt), "h:mm a")}
                </div>
                
                <div className="flex justify-between items-center mt-2">
                  <div className="font-bold">{formatCurrency(order.totalAmount)}</div>
                  
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-7 px-2"
                  >
                    <ClipboardCheck className="h-3 w-3 mr-1" />
                    <span className="text-xs">Ready</span>
                  </Button>
                </div>
              </ThemeCard>
            ))}
          </div>
        </div>
        
        {/* Ready Orders Column */}
        <div className="space-y-4">
          <ThemeColumnHeader variant="ready">
            <div className="flex items-center justify-between w-full">
              <span>Ready to Serve</span>
              <Badge variant="outline" className="bg-blue-800 text-blue-100">
                {readyOrders.length}
              </Badge>
            </div>
          </ThemeColumnHeader>
          
          <div className="space-y-3">
            {readyOrders.map(order => (
              <ThemeCard 
                key={order.id} 
                variant="ready"
                className={cn(
                  "hover:shadow-lg transition-all cursor-pointer",
                  selectedOrder === order.id ? "ring-2 ring-primary" : ""
                )}
                onClick={() => setSelectedOrder(order.id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-lg">#{order.orderNumber}</h3>
                    <div className="text-xs opacity-80">Table {order.tableNumber}</div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    <span className="flex items-center">
                      {getSourceIcon(order.orderSource)}
                      <span className="ml-1">{order.orderSource.charAt(0).toUpperCase() + order.orderSource.slice(1)}</span>
                    </span>
                  </Badge>
                </div>
                
                <div className="text-xs opacity-70 mb-2">
                  {format(new Date(order.createdAt), "h:mm a")}
                </div>
                
                <div className="flex justify-between items-center mt-2">
                  <div className="font-bold">{formatCurrency(order.totalAmount)}</div>
                  
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-7 px-2"
                  >
                    <CheckCheck className="h-3 w-3 mr-1" />
                    <span className="text-xs">Complete</span>
                  </Button>
                </div>
              </ThemeCard>
            ))}
          </div>
        </div>
        
        {/* Completed Orders Column */}
        <div className="space-y-4">
          <ThemeColumnHeader variant="completed">
            <div className="flex items-center justify-between w-full">
              <span>Completed</span>
              <Badge variant="outline" className="bg-purple-800 text-purple-100">
                {completedOrders.length}
              </Badge>
            </div>
          </ThemeColumnHeader>
          
          <div className="space-y-3">
            {completedOrders.map(order => (
              <ThemeCard 
                key={order.id} 
                variant="completed"
                className={cn(
                  "hover:shadow-lg transition-all cursor-pointer",
                  selectedOrder === order.id ? "ring-2 ring-primary" : ""
                )}
                onClick={() => setSelectedOrder(order.id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-lg">#{order.orderNumber}</h3>
                    <div className="text-xs opacity-80">Table {order.tableNumber}</div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    <span className="flex items-center">
                      {getSourceIcon(order.orderSource)}
                      <span className="ml-1">{order.orderSource.charAt(0).toUpperCase() + order.orderSource.slice(1)}</span>
                    </span>
                  </Badge>
                </div>
                
                <div className="text-xs opacity-70 mb-2">
                  {format(new Date(order.createdAt), "h:mm a")}
                </div>
                
                <div className="flex justify-between items-center mt-2">
                  <div className="font-bold">{formatCurrency(order.totalAmount)}</div>
                  
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-7 px-2"
                  >
                    <Receipt className="h-3 w-3 mr-1" />
                    <span className="text-xs">Bill</span>
                  </Button>
                </div>
              </ThemeCard>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}