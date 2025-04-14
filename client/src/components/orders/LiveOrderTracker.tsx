import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, CheckCircle2, ChefHat, AlertCircle, Truck, Receipt } from "lucide-react";

// Order status type
type OrderStatus = "pending" | "preparing" | "ready" | "completed" | "delivered" | "billed";

// Status configuration with colors and icons
const STATUS_CONFIG = {
  pending: { 
    color: "bg-amber-500", 
    textColor: "text-amber-700", 
    bgColor: "bg-amber-50", 
    borderColor: "border-amber-200", 
    label: "Pending", 
    icon: Clock 
  },
  preparing: { 
    color: "bg-blue-500", 
    textColor: "text-blue-700", 
    bgColor: "bg-blue-50", 
    borderColor: "border-blue-200", 
    label: "Preparing", 
    icon: ChefHat 
  },
  ready: { 
    color: "bg-emerald-500", 
    textColor: "text-emerald-700", 
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200", 
    label: "Ready", 
    icon: CheckCircle2 
  },
  completed: { 
    color: "bg-indigo-500", 
    textColor: "text-indigo-700", 
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200", 
    label: "Completed", 
    icon: CheckCircle2 
  },
  delivered: { 
    color: "bg-violet-500", 
    textColor: "text-violet-700", 
    bgColor: "bg-violet-50",
    borderColor: "border-violet-200", 
    label: "Delivered", 
    icon: Truck 
  },
  billed: { 
    color: "bg-slate-500", 
    textColor: "text-slate-700", 
    bgColor: "bg-slate-50",
    borderColor: "border-slate-200", 
    label: "Billed", 
    icon: Receipt 
  }
};

// Calculate progress percentage based on status
const getProgressPercentage = (status: OrderStatus): number => {
  const stages: OrderStatus[] = ["pending", "preparing", "ready", "completed", "delivered", "billed"];
  const currentIndex = stages.indexOf(status);
  return Math.round(((currentIndex + 1) / stages.length) * 100);
};

// Format date to display as relative time (e.g., "2 minutes ago")
const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  return `${Math.floor(diffInSeconds / 86400)} days ago`;
};

export function LiveOrderTracker() {
  // Track active filter
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [refreshInterval, setRefreshInterval] = useState<number>(5000); // 5 seconds refresh

  // Query orders
  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/orders'],
    refetchInterval: refreshInterval,
  });

  // Query kitchen tokens
  const { data: kitchenTokens = [] } = useQuery({
    queryKey: ['/api/kitchen-tokens'],
    refetchInterval: refreshInterval,
  });

  // Query bills
  const { data: bills = [] } = useQuery({
    queryKey: ['/api/bills'],
    refetchInterval: refreshInterval,
  });

  // Process and combine data
  const processedOrders = orders.map((order: any) => {
    // Find associated kitchen token
    const kitchenToken = kitchenTokens.find((token: any) => token.orderId === order.id);
    
    // Find associated bill
    const bill = bills.find((bill: any) => bill.orderId === order.id);
    
    // Calculate time in current status
    const updatedAt = new Date(order.updatedAt);
    const timeInStatus = formatRelativeTime(updatedAt);
    
    // Calculate progress percentage
    const progress = getProgressPercentage(order.status as OrderStatus);
    
    // Get source icon
    const getSourceIcon = () => {
      switch(order.orderSource) {
        case 'phone': return '📞';
        case 'whatsapp': return '💬';
        case 'zomato': return '🍽️';
        case 'swiggy': return '🛵';
        case 'ai': return '🤖';
        default: return '👤';
      }
    };
    
    return {
      ...order,
      kitchenToken,
      bill,
      timeInStatus,
      progress,
      sourceIcon: getSourceIcon(),
    };
  });

  // Filter orders based on the selected filter
  const filteredOrders = processedOrders.filter((order: any) => {
    if (filter === "all") return true;
    if (filter === "active") return ["pending", "preparing", "ready"].includes(order.status);
    if (filter === "completed") return ["completed", "delivered", "billed"].includes(order.status);
    return true;
  });

  // Sort orders by status priority (active first) and then by updatedAt
  const sortedOrders = [...filteredOrders].sort((a: any, b: any) => {
    // Define priority for statuses
    const priority: Record<string, number> = {
      "pending": 1,
      "preparing": 2,
      "ready": 3,
      "completed": 4,
      "delivered": 5,
      "billed": 6
    };
    
    // First sort by status priority
    const priorityDiff = priority[a.status] - priority[b.status];
    if (priorityDiff !== 0) return priorityDiff;
    
    // Then sort by updatedAt (newest first)
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return (
    <Card className="bg-neutral-800 border-neutral-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white">Live Order Tracker</CardTitle>
            <CardDescription className="text-neutral-400">
              Real-time status updates for all orders across all channels
            </CardDescription>
          </div>
          <Badge 
            variant="outline" 
            className={`px-2 py-1 ${isLoading ? 'animate-pulse bg-purple-900 text-purple-100' : 'bg-green-900 text-green-100'}`}
          >
            {isLoading ? "Updating..." : "Live"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full" onValueChange={(value) => setFilter(value as any)}>
          <TabsList className="grid w-full grid-cols-3 mb-4 bg-neutral-700">
            <TabsTrigger value="all" className="data-[state=active]:bg-purple-700 data-[state=active]:text-white">All Orders</TabsTrigger>
            <TabsTrigger value="active" className="data-[state=active]:bg-purple-700 data-[state=active]:text-white">Active</TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:bg-purple-700 data-[state=active]:text-white">Completed</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-0">
            <div className="space-y-4">
              {sortedOrders.length === 0 ? (
                <div className="text-center py-8 text-neutral-400">
                  <AlertCircle className="mx-auto h-12 w-12 mb-2 opacity-20" />
                  <p>No orders available</p>
                </div>
              ) : (
                sortedOrders.map((order: any) => (
                  <OrderStatusCard key={order.id} order={order} />
                ))
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="active" className="mt-0">
            <div className="space-y-4">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-8 text-neutral-400">
                  <CheckCircle2 className="mx-auto h-12 w-12 mb-2 opacity-20" />
                  <p>No active orders</p>
                </div>
              ) : (
                filteredOrders.map((order: any) => (
                  <OrderStatusCard key={order.id} order={order} />
                ))
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="completed" className="mt-0">
            <div className="space-y-4">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-8 text-neutral-400">
                  <AlertCircle className="mx-auto h-12 w-12 mb-2 opacity-20" />
                  <p>No completed orders</p>
                </div>
              ) : (
                filteredOrders.map((order: any) => (
                  <OrderStatusCard key={order.id} order={order} />
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Individual order status card component
function OrderStatusCard({ order }: { order: any }) {
  const StatusIcon = STATUS_CONFIG[order.status as OrderStatus]?.icon || Clock;
  const statusColor = STATUS_CONFIG[order.status as OrderStatus]?.color || "bg-gray-500";
  const textColor = STATUS_CONFIG[order.status as OrderStatus]?.textColor || "text-gray-700";
  const bgColor = STATUS_CONFIG[order.status as OrderStatus]?.bgColor || "bg-gray-50";
  const borderColor = STATUS_CONFIG[order.status as OrderStatus]?.borderColor || "border-gray-200";
  const statusLabel = STATUS_CONFIG[order.status as OrderStatus]?.label || "Unknown";
  
  return (
    <Card className="overflow-hidden bg-neutral-800 border-neutral-700">
      <div className={`h-1 ${statusColor} w-full`}></div>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{order.sourceIcon}</span>
            <h3 className="font-semibold text-white">
              Order #{order.orderNumber}
              {order.tableNumber && <span className="ml-2 text-sm text-neutral-400">
                (Table {order.tableNumber})
              </span>}
            </h3>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge className={`${statusColor} text-white hover:${statusColor}`}>
                  <StatusIcon className="h-3.5 w-3.5 mr-1" />
                  {statusLabel}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Updated {order.timeInStatus}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div className="mb-2">
          <Progress 
            value={order.progress} 
            className="h-2 bg-neutral-700" 
            indicatorColor={statusColor}
          />
          <div className="flex justify-between text-xs text-neutral-400 mt-1">
            <span>Order Placed</span>
            <span>Preparing</span>
            <span>Ready</span>
            <span>Completed</span>
          </div>
        </div>
        
        <div className="flex justify-between items-center mt-4 text-sm">
          <div>
            <p className="font-medium text-white">
              {order.useAIAutomation ? (
                <span className="flex items-center gap-1">
                  <span className="text-purple-400">🤖</span> AI-Managed
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <span>👤</span> Manually Managed
                </span>
              )}
            </p>
            <p className="text-neutral-400">
              ₹{order.totalAmount.toFixed(2)} 
              {order.bill && <span className="ml-2">• Bill #{order.bill.billNumber}</span>}
            </p>
          </div>
          <div className="text-right">
            <p className="font-medium text-white">
              {order.kitchenToken ? `Token: ${order.kitchenToken.tokenNumber}` : 'No Token'}
            </p>
            <p className="text-neutral-400">
              Created {formatRelativeTime(new Date(order.createdAt))}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}