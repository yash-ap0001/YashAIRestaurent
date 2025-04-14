import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChefHat, CheckCircle2, Clock, AlertCircle, Share2 } from "lucide-react";
import { useState, useEffect } from "react";

// Order status type and configuration
type OrderStatus = "pending" | "preparing" | "ready" | "completed" | "delivered" | "billed";

const STATUS_CONFIG = {
  pending: {
    color: "bg-yellow-500",
    textColor: "text-yellow-500",
    lightColor: "bg-yellow-100",
    icon: Clock,
    label: "Order Received",
    description: "We've received your order and will start preparing it soon."
  },
  preparing: {
    color: "bg-blue-500",
    textColor: "text-blue-500",
    lightColor: "bg-blue-100",
    icon: ChefHat,
    label: "Preparing Your Order",
    description: "Our chefs are now preparing your delicious meal."
  },
  ready: {
    color: "bg-green-500",
    textColor: "text-green-500",
    lightColor: "bg-green-100",
    icon: CheckCircle2,
    label: "Ready for Pickup/Service",
    description: "Your order is ready! Please collect from the counter or wait for service."
  },
  completed: {
    color: "bg-purple-500",
    textColor: "text-purple-500",
    lightColor: "bg-purple-100",
    icon: CheckCircle2,
    label: "Order Completed",
    description: "Your meal has been served. Enjoy your food!"
  },
  delivered: {
    color: "bg-indigo-500",
    textColor: "text-indigo-500",
    lightColor: "bg-indigo-100",
    icon: CheckCircle2,
    label: "Order Delivered",
    description: "Your order has been delivered. Enjoy your meal!"
  },
  billed: {
    color: "bg-gray-500",
    textColor: "text-gray-500",
    lightColor: "bg-gray-100",
    icon: CheckCircle2,
    label: "Order Billed",
    description: "Your order has been billed. Thank you for dining with us!"
  }
};

// Calculate progress percentage based on status
const getProgressPercentage = (status: OrderStatus): number => {
  const stages: OrderStatus[] = ["pending", "preparing", "ready", "completed", "billed"];
  const currentIndex = stages.indexOf(status);
  return Math.round(((currentIndex + 1) / stages.length) * 100);
};

// Format date to display as relative time
const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  return new Date(date).toLocaleString();
};

export default function TrackOrder() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const [refreshInterval, setRefreshInterval] = useState<number>(5000); // 5 seconds
  
  // Auto-refresh control
  const [isAutoRefresh, setIsAutoRefresh] = useState<boolean>(true);
  
  // When auto-refresh is toggled, update the refresh interval
  useEffect(() => {
    setRefreshInterval(isAutoRefresh ? 5000 : 0);
  }, [isAutoRefresh]);
  
  // Query the order data
  const {
    data: orders = [],
    isLoading: isLoadingOrder,
    isError: isErrorOrder,
  } = useQuery({
    queryKey: ['/api/orders'],
    refetchInterval: refreshInterval,
  });
  
  // Find the order by orderNumber
  const order = orders.find((o: any) => o.orderNumber === orderNumber);
  
  // Query order items if we have an order
  const {
    data: orderItems = [],
    isLoading: isLoadingItems
  } = useQuery({
    queryKey: ['/api/order-items', order?.id],
    enabled: !!order?.id,
    refetchInterval: refreshInterval,
  });
  
  // Query kitchen tokens
  const {
    data: kitchenTokens = [],
    isLoading: isLoadingTokens
  } = useQuery({
    queryKey: ['/api/kitchen-tokens'],
    refetchInterval: refreshInterval,
  });
  
  // Find the kitchen token for this order
  const kitchenToken = kitchenTokens.find((token: any) => token.orderId === order?.id);
  
  // Calculate estimated time based on status
  const getEstimatedTime = () => {
    if (!order) return "Unknown";
    
    switch (order.status) {
      case "pending":
        return "5-10 minutes";
      case "preparing":
        return "5-7 minutes";
      case "ready":
        return "Ready now";
      case "completed":
      case "delivered":
      case "billed":
        return "Completed";
      default:
        return "Unknown";
    }
  };
  
  // Share order tracking
  const shareOrderTracking = () => {
    if (navigator.share) {
      navigator.share({
        title: `Track Order #${orderNumber}`,
        text: `Track your order #${orderNumber} in real-time.`,
        url: window.location.href,
      });
    } else {
      // Fallback for browsers that don't support navigator.share
      navigator.clipboard.writeText(window.location.href);
      alert("Tracking link copied to clipboard!");
    }
  };
  
  // Loading state
  if (isLoadingOrder) {
    return (
      <div className="container mx-auto max-w-md px-4 py-8">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Error state - order not found
  if (isErrorOrder || !order) {
    return (
      <div className="container mx-auto max-w-md px-4 py-8">
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center text-red-500">
              <AlertCircle className="h-5 w-5 mr-2" />
              Order Not Found
            </CardTitle>
            <CardDescription>
              We couldn't find any order with the number #{orderNumber}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Please check if you have the correct order number or contact restaurant support.
            </p>
            <Button variant="outline" onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Get status configuration
  const statusConfig = STATUS_CONFIG[order.status as OrderStatus] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;
  
  // Calculate progress
  const progress = getProgressPercentage(order.status as OrderStatus);
  
  return (
    <div className="container mx-auto max-w-md px-4 py-8">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center">
                Order #{orderNumber}
              </CardTitle>
              <CardDescription>
                {order.tableNumber ? `Table ${order.tableNumber}` : "Takeaway Order"}
                {" • "}
                {formatRelativeTime(new Date(order.createdAt))}
              </CardDescription>
            </div>
            <Badge 
              variant="outline" 
              className={`${isAutoRefresh ? 'animate-pulse bg-green-100' : 'bg-gray-100'}`}
              onClick={() => setIsAutoRefresh(!isAutoRefresh)}
            >
              {isAutoRefresh ? "Live Updates" : "Paused"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Order Status Section */}
          <div className="rounded-lg overflow-hidden border">
            <div className={`p-5 ${statusConfig.lightColor}`}>
              <div className="flex items-center">
                <div className={`p-3 rounded-full ${statusConfig.color} text-white mr-4`}>
                  <StatusIcon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className={`font-bold ${statusConfig.textColor}`}>
                    {statusConfig.label}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {statusConfig.description}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-5">
              <div className="flex justify-between items-center mb-1 text-sm">
                <span>Ordered</span>
                <span>Preparing</span>
                <span>Ready</span>
                <span>Completed</span>
              </div>
              <Progress value={progress} className="h-2.5 mb-4" />
              
              <div className="flex justify-between items-center text-sm">
                <div>
                  <p className="font-medium">Est. Time:</p>
                  <p className={`${progress >= 75 ? "text-green-600 font-semibold" : "text-muted-foreground"}`}>
                    {getEstimatedTime()}
                  </p>
                </div>
                
                {kitchenToken && (
                  <div className="text-right">
                    <p className="font-medium">Kitchen Token:</p>
                    <p className="text-muted-foreground">{kitchenToken.tokenNumber}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Order Items Section */}
          <div>
            <h3 className="font-semibold mb-2">Order Summary</h3>
            {isLoadingItems ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="space-y-2">
                {orderItems.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No items available
                  </p>
                ) : (
                  orderItems.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center p-3 border rounded-md">
                      <div>
                        <p className="font-medium">
                          {item.name || `Item #${item.menuItemId}`}
                          <span className="ml-2 text-sm text-muted-foreground">
                            x{item.quantity}
                          </span>
                        </p>
                        {item.notes && (
                          <p className="text-xs text-muted-foreground">
                            {item.notes}
                          </p>
                        )}
                      </div>
                      <p className="font-medium">
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))
                )}
                
                <div className="flex justify-between items-center p-3 border-t pt-3">
                  <p className="font-semibold">Total Amount</p>
                  <p className="font-semibold">₹{order.totalAmount.toFixed(2)}</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="w-1/2" onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
            <Button className="w-1/2" onClick={shareOrderTracking}>
              <Share2 className="h-4 w-4 mr-2" />
              Share Tracking
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}