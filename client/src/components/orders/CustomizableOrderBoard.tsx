import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChefHat, ClipboardCheck, Receipt, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ColumnHeader, OrderCard } from "./OrderColumn";
import { ColumnColorSettings } from "../settings/ColumnColorSettings";

interface Order {
  id: number;
  orderNumber: string;
  tableNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  orderSource: string;
}

export function CustomizableOrderBoard() {
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
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Orders Dashboard</h2>
        <ColumnColorSettings />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Orders Column */}
        <div className="space-y-4">
          <ColumnHeader 
            title="Pending Orders" 
            count={pendingOrders.length}
            columnType="pending"
          />
          
          <div className="space-y-3">
            {pendingOrders.map(order => (
              <OrderCard
                key={order.id}
                columnType="pending"
                onClick={() => setSelectedOrder(order.id)}
                isSelected={selectedOrder === order.id}
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
              </OrderCard>
            ))}
          </div>
        </div>
        
        {/* Preparing Orders Column */}
        <div className="space-y-4">
          <ColumnHeader 
            title="Preparing" 
            count={preparingOrders.length}
            columnType="preparing"
          />
          
          <div className="space-y-3">
            {preparingOrders.map(order => (
              <OrderCard
                key={order.id}
                columnType="preparing"
                onClick={() => setSelectedOrder(order.id)}
                isSelected={selectedOrder === order.id}
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
              </OrderCard>
            ))}
          </div>
        </div>
        
        {/* Ready Orders Column */}
        <div className="space-y-4">
          <ColumnHeader 
            title="Ready to Serve" 
            count={readyOrders.length}
            columnType="ready"
          />
          
          <div className="space-y-3">
            {readyOrders.map(order => (
              <OrderCard
                key={order.id}
                columnType="ready"
                onClick={() => setSelectedOrder(order.id)}
                isSelected={selectedOrder === order.id}
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
              </OrderCard>
            ))}
          </div>
        </div>
        
        {/* Completed Orders Column */}
        <div className="space-y-4">
          <ColumnHeader 
            title="Completed" 
            count={completedOrders.length}
            columnType="completed"
          />
          
          <div className="space-y-3">
            {completedOrders.map(order => (
              <OrderCard
                key={order.id}
                columnType="completed"
                onClick={() => setSelectedOrder(order.id)}
                isSelected={selectedOrder === order.id}
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
              </OrderCard>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}