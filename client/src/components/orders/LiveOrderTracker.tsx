import { useEffect, useState, useRef, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Clock, CheckCircle2, ChefHat, AlertCircle, 
  Truck, Receipt, Wifi, WifiOff, Search,
  ArrowUpDown, Filter, MoreHorizontal, RefreshCw,
  Zap, Grid2X2, LayoutList, Table, MapPin, Phone,
  MessageSquare, ShoppingBag, Utensils, Bot
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Order status type
type OrderStatus = "pending" | "preparing" | "ready" | "completed" | "delivered" | "billed";

// Order source type
type OrderSource = "manual" | "phone" | "whatsapp" | "zomato" | "swiggy" | "ai" | "ai_simulator" | "simulator";

// Order view type
type OrderViewMode = "grid" | "list" | "table";

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

// Source configuration with icons
const SOURCE_CONFIG: Record<OrderSource, { icon: React.FC; label: string; color: string }> = {
  manual: { icon: Utensils, label: "Manual", color: "bg-neutral-400" },
  phone: { icon: Phone, label: "Phone", color: "bg-blue-400" },
  whatsapp: { icon: MessageSquare, label: "WhatsApp", color: "bg-green-500" },
  zomato: { icon: ShoppingBag, label: "Zomato", color: "bg-red-500" },
  swiggy: { icon: Truck, label: "Swiggy", color: "bg-orange-500" },
  ai: { icon: Bot, label: "AI", color: "bg-purple-500" },
  ai_simulator: { icon: Bot, label: "AI Sim", color: "bg-purple-400" },
  simulator: { icon: Bot, label: "Sim", color: "bg-zinc-400" }
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
  const [refreshInterval, setRefreshInterval] = useState<number>(10000); // 10 seconds as fallback
  const [websocketConnected, setWebsocketConnected] = useState<boolean>(false);
  const webSocketRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();

  // Setup WebSocket connection
  useEffect(() => {
    // Create WebSocket connection
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    // Explicitly use the hostname without port, as the server already handles the WebSocket
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    let socket: WebSocket | null = null;
    
    try {
      socket = new WebSocket(wsUrl);
      webSocketRef.current = socket;
    
      // Connection opened
      socket.addEventListener('open', (event) => {
        console.log('WebSocket connected');
        setWebsocketConnected(true);
        // Turn off frequent polling when WebSocket is connected
        setRefreshInterval(30000); // 30 seconds as a fallback
      });
    
      // Listen for messages
      socket.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);
          
          // Handle different event types
          switch (data.type) {
            case 'order_updated':
            case 'new_order':
              // Invalidate the orders cache to trigger a refetch
              queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
              break;
              
            case 'kitchen_token_updated':
            case 'new_kitchen_token':
              // Invalidate the kitchen tokens cache
              queryClient.invalidateQueries({ queryKey: ['/api/kitchen-tokens'] });
              break;
              
            case 'bill_updated':
            case 'new_bill':
              // Invalidate the bills cache
              queryClient.invalidateQueries({ queryKey: ['/api/bills'] });
              break;
              
            case 'ping':
              // Respond to server ping
              if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'pong' }));
              }
              break;
              
            case 'connect':
              console.log('WebSocket client ID:', data.clientId);
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });
      
      // Connection closed or error
      socket.addEventListener('close', () => {
        console.log('WebSocket disconnected');
        setWebsocketConnected(false);
        // Increase polling frequency when WebSocket is disconnected
        setRefreshInterval(5000);
      });
      
      socket.addEventListener('error', (error) => {
        console.error('WebSocket error:', error);
        setWebsocketConnected(false);
        setRefreshInterval(5000);
      });
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setWebsocketConnected(false);
      setRefreshInterval(5000); // Fallback to frequent polling
    }
    
    // Clean up on unmount
    return () => {
      console.log('Closing WebSocket connection');
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [queryClient]);

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
  const processedOrders = (orders as any[]).map((order: any) => {
    // Find associated kitchen token
    const kitchenToken = (kitchenTokens as any[]).find((token: any) => token.orderId === order.id);
    
    // Find associated bill
    const bill = (bills as any[]).find((bill: any) => bill.orderId === order.id);
    
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

  // New state for search, source filter, sorting, and view mode
  const [searchValue, setSearchValue] = useState<string>("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [sortOption, setSortOption] = useState<string>("status");
  const [viewMode, setViewMode] = useState<OrderViewMode>("grid");
  const [itemsPerPage, setItemsPerPage] = useState<number>(12);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Filter orders based on all filters
  const filteredOrders = useMemo(() => {
    return processedOrders.filter((order: any) => {
      // First apply active/completed filter
      if (filter === "active" && !["pending", "preparing", "ready"].includes(order.status)) {
        return false;
      }
      if (filter === "completed" && !["completed", "delivered", "billed"].includes(order.status)) {
        return false;
      }
      
      // Then apply source filter
      if (sourceFilter !== "all" && order.orderSource !== sourceFilter) {
        return false;
      }
      
      // Finally apply search filter
      if (searchValue) {
        const searchLower = searchValue.toLowerCase();
        return (
          order.orderNumber.toLowerCase().includes(searchLower) ||
          (order.tableNumber && order.tableNumber.toLowerCase().includes(searchLower)) ||
          (order.customerName && order.customerName.toLowerCase().includes(searchLower))
        );
      }
      
      return true;
    });
  }, [processedOrders, filter, sourceFilter, searchValue]);

  // Sort orders based on selected option
  const sortedOrders = useMemo(() => {
    // Define priority for statuses
    const priority: Record<string, number> = {
      "pending": 1,
      "preparing": 2,
      "ready": 3,
      "completed": 4,
      "delivered": 5,
      "billed": 6
    };
    
    return [...filteredOrders].sort((a: any, b: any) => {
      switch (sortOption) {
        case "status":
          // First sort by status priority
          const priorityDiff = priority[a.status] - priority[b.status];
          if (priorityDiff !== 0) return priorityDiff;
          // Then by updated time (newest first)
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          
        case "table":
          // Sort by table number 
          if (!a.tableNumber) return 1;
          if (!b.tableNumber) return -1;
          return a.tableNumber.localeCompare(b.tableNumber);
          
        case "amount":
          return (b.totalAmount || 0) - (a.totalAmount || 0);
          
        default:
          return 0;
      }
    });
  }, [filteredOrders, sortOption]);

  // Pagination
  const totalPages = Math.ceil(sortedOrders.length / itemsPerPage);
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedOrders.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedOrders, currentPage, itemsPerPage]);
  
  // Handle page changes
  const goToPage = (page: number) => {
    setCurrentPage(Math.min(Math.max(1, page), totalPages));
  };

  return (
    <Card className="bg-neutral-800 border-neutral-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white">Live Order Tracker</CardTitle>
            <CardDescription className="text-neutral-400">
              {sortedOrders.length > 0 ? 
                `Showing ${paginatedOrders.length} of ${sortedOrders.length} orders` :
                "Real-time status updates for all orders across all channels"
              }
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={`flex items-center gap-1 px-2 py-1 ${websocketConnected ? 'bg-green-900 text-green-100' : 'bg-amber-900 text-amber-100'}`}
            >
              {websocketConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {websocketConnected ? "Real-time" : "Polling"}
            </Badge>
            <Badge 
              variant="outline" 
              className={`px-2 py-1 ${isLoading ? 'animate-pulse bg-purple-900 text-purple-100' : 'bg-green-900 text-green-100'}`}
            >
              {isLoading ? "Updating..." : "Live"}
            </Badge>
            <Button size="icon" variant="outline" onClick={() => refetch()} className="h-8 w-8">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters and controls */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full">
          <div className="relative flex items-center flex-1">
            <Search className="absolute left-2.5 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="Search orders..."
              className="pl-9 bg-neutral-900 border-neutral-700 text-neutral-100"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[135px] bg-neutral-900 border-neutral-700 text-neutral-100">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent className="bg-neutral-900 border-neutral-700 text-neutral-100">
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="zomato">Zomato</SelectItem>
                <SelectItem value="swiggy">Swiggy</SelectItem>
                <SelectItem value="ai">AI</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortOption} onValueChange={setSortOption}>
              <SelectTrigger className="w-[135px] bg-neutral-900 border-neutral-700 text-neutral-100">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent className="bg-neutral-900 border-neutral-700 text-neutral-100">
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="table">Table</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* View mode toggles */}
        <div className="flex justify-between items-center">
          <div className="flex gap-1">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="sm"
              className={`h-8 px-2 ${viewMode === "grid" ? "bg-purple-700" : "bg-neutral-900 border-neutral-700 text-neutral-100"}`}
              onClick={() => setViewMode("grid")}
            >
              <Grid2X2 className="h-4 w-4 mr-1" />
              Grid
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              className={`h-8 px-2 ${viewMode === "list" ? "bg-purple-700" : "bg-neutral-900 border-neutral-700 text-neutral-100"}`}
              onClick={() => setViewMode("list")}
            >
              <LayoutList className="h-4 w-4 mr-1" />
              List
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "outline"}
              size="sm"
              className={`h-8 px-2 ${viewMode === "table" ? "bg-purple-700" : "bg-neutral-900 border-neutral-700 text-neutral-100"}`}
              onClick={() => setViewMode("table")}
            >
              <Table className="h-4 w-4 mr-1" />
              Table
            </Button>
          </div>
          
          <div className="flex gap-1 text-sm text-neutral-400">
            <Select 
              value={itemsPerPage.toString()} 
              onValueChange={(value) => {
                setItemsPerPage(parseInt(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-20 bg-neutral-900 border-neutral-700 text-neutral-100">
                <SelectValue placeholder="Items" />
              </SelectTrigger>
              <SelectContent className="bg-neutral-900 border-neutral-700 text-neutral-100">
                <SelectItem value="12">12</SelectItem>
                <SelectItem value="24">24</SelectItem>
                <SelectItem value="48">48</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="self-center">per page</span>
          </div>
        </div>
        
        {/* Tab selection for active/completed */}
        <Tabs defaultValue="all" className="w-full" onValueChange={(value) => {
          setFilter(value as any);
          setCurrentPage(1);
        }}>
          <TabsList className="grid w-full grid-cols-3 mb-4 bg-neutral-700">
            <TabsTrigger value="all" className="data-[state=active]:bg-purple-700 data-[state=active]:text-white">All Orders</TabsTrigger>
            <TabsTrigger value="active" className="data-[state=active]:bg-purple-700 data-[state=active]:text-white">Active</TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:bg-purple-700 data-[state=active]:text-white">Completed</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-0">
            {paginatedOrders.length === 0 ? (
              <div className="text-center py-8 text-neutral-400">
                <AlertCircle className="mx-auto h-12 w-12 mb-2 opacity-20" />
                <p>No orders available</p>
              </div>
            ) : (
              <>
                {/* Grid view */}
                {viewMode === "grid" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paginatedOrders.map((order: any) => (
                      <OrderStatusCard key={order.id} order={order} viewMode={viewMode} />
                    ))}
                  </div>
                )}
                
                {/* List view */}
                {viewMode === "list" && (
                  <div className="space-y-3">
                    {paginatedOrders.map((order: any) => (
                      <OrderStatusCard key={order.id} order={order} viewMode={viewMode} />
                    ))}
                  </div>
                )}
                
                {/* Table view */}
                {viewMode === "table" && (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead className="bg-neutral-900 border-b border-neutral-700">
                        <tr>
                          <th className="text-left p-2 text-xs font-medium text-neutral-400">ORDER #</th>
                          <th className="text-left p-2 text-xs font-medium text-neutral-400">SOURCE</th>
                          <th className="text-left p-2 text-xs font-medium text-neutral-400">TABLE</th>
                          <th className="text-left p-2 text-xs font-medium text-neutral-400">STATUS</th>
                          <th className="text-left p-2 text-xs font-medium text-neutral-400">AMOUNT</th>
                          <th className="text-left p-2 text-xs font-medium text-neutral-400">TIME</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedOrders.map((order: any) => (
                          <OrderTableRow key={order.id} order={order} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </TabsContent>
          
          <TabsContent value="active" className="mt-0">
            {paginatedOrders.length === 0 ? (
              <div className="text-center py-8 text-neutral-400">
                <CheckCircle2 className="mx-auto h-12 w-12 mb-2 opacity-20" />
                <p>No active orders</p>
              </div>
            ) : (
              <>
                {/* Grid view */}
                {viewMode === "grid" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paginatedOrders.map((order: any) => (
                      <OrderStatusCard key={order.id} order={order} viewMode={viewMode} />
                    ))}
                  </div>
                )}
                
                {/* List view */}
                {viewMode === "list" && (
                  <div className="space-y-3">
                    {paginatedOrders.map((order: any) => (
                      <OrderStatusCard key={order.id} order={order} viewMode={viewMode} />
                    ))}
                  </div>
                )}
                
                {/* Table view */}
                {viewMode === "table" && (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead className="bg-neutral-900 border-b border-neutral-700">
                        <tr>
                          <th className="text-left p-2 text-xs font-medium text-neutral-400">ORDER #</th>
                          <th className="text-left p-2 text-xs font-medium text-neutral-400">SOURCE</th>
                          <th className="text-left p-2 text-xs font-medium text-neutral-400">TABLE</th>
                          <th className="text-left p-2 text-xs font-medium text-neutral-400">STATUS</th>
                          <th className="text-left p-2 text-xs font-medium text-neutral-400">AMOUNT</th>
                          <th className="text-left p-2 text-xs font-medium text-neutral-400">TIME</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedOrders.map((order: any) => (
                          <OrderTableRow key={order.id} order={order} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </TabsContent>
          
          <TabsContent value="completed" className="mt-0">
            {paginatedOrders.length === 0 ? (
              <div className="text-center py-8 text-neutral-400">
                <AlertCircle className="mx-auto h-12 w-12 mb-2 opacity-20" />
                <p>No completed orders</p>
              </div>
            ) : (
              <>
                {/* Grid view */}
                {viewMode === "grid" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paginatedOrders.map((order: any) => (
                      <OrderStatusCard key={order.id} order={order} viewMode={viewMode} />
                    ))}
                  </div>
                )}
                
                {/* List view */}
                {viewMode === "list" && (
                  <div className="space-y-3">
                    {paginatedOrders.map((order: any) => (
                      <OrderStatusCard key={order.id} order={order} viewMode={viewMode} />
                    ))}
                  </div>
                )}
                
                {/* Table view */}
                {viewMode === "table" && (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead className="bg-neutral-900 border-b border-neutral-700">
                        <tr>
                          <th className="text-left p-2 text-xs font-medium text-neutral-400">ORDER #</th>
                          <th className="text-left p-2 text-xs font-medium text-neutral-400">SOURCE</th>
                          <th className="text-left p-2 text-xs font-medium text-neutral-400">TABLE</th>
                          <th className="text-left p-2 text-xs font-medium text-neutral-400">STATUS</th>
                          <th className="text-left p-2 text-xs font-medium text-neutral-400">AMOUNT</th>
                          <th className="text-left p-2 text-xs font-medium text-neutral-400">TIME</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedOrders.map((order: any) => (
                          <OrderTableRow key={order.id} order={order} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-neutral-400">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, sortedOrders.length)} of {sortedOrders.length} orders
            </div>
            <div className="flex gap-1">
              <Button 
                variant="outline" 
                size="sm"
                disabled={currentPage === 1}
                onClick={() => goToPage(currentPage - 1)}
                className="h-8 w-8 p-0 bg-neutral-900 border-neutral-700 text-neutral-100"
              >
                &lt;
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                // Show pages around current page
                let pageNum = currentPage;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => goToPage(pageNum)}
                    className={`h-8 w-8 p-0 ${
                      currentPage === pageNum 
                        ? "bg-purple-700" 
                        : "bg-neutral-900 border-neutral-700 text-neutral-100"
                    }`}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              <Button 
                variant="outline" 
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => goToPage(currentPage + 1)}
                className="h-8 w-8 p-0 bg-neutral-900 border-neutral-700 text-neutral-100"
              >
                &gt;
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Individual order status card component
function OrderStatusCard({ order, viewMode = "grid" }: { order: any, viewMode?: OrderViewMode }) {
  // Get status configuration
  const StatusIcon = STATUS_CONFIG[order.status as OrderStatus]?.icon || Clock;
  const statusColor = STATUS_CONFIG[order.status as OrderStatus]?.color || "bg-gray-500";
  const textColor = STATUS_CONFIG[order.status as OrderStatus]?.textColor || "text-gray-700";
  const bgColor = STATUS_CONFIG[order.status as OrderStatus]?.bgColor || "bg-gray-50";
  const borderColor = STATUS_CONFIG[order.status as OrderStatus]?.borderColor || "border-gray-200";
  const statusLabel = STATUS_CONFIG[order.status as OrderStatus]?.label || "Unknown";
  
  // Get source configuration
  const sourceType = (order.orderSource || "manual") as OrderSource;
  const SourceIcon = SOURCE_CONFIG[sourceType]?.icon || Utensils;
  const sourceColor = SOURCE_CONFIG[sourceType]?.color || "bg-gray-400";
  const sourceLabel = SOURCE_CONFIG[sourceType]?.label || "Manual";
  
  // Render grid card
  if (viewMode === "grid") {
    return (
      <Card className="overflow-hidden bg-neutral-800 border-neutral-700 hover:shadow-lg hover:border-purple-700 transition-all">
        <div className={`h-1 ${statusColor} w-full`}></div>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Badge className={`${sourceColor} text-white hover:${sourceColor} h-6 w-6 p-0 flex items-center justify-center`}>
                <SourceIcon className="h-3.5 w-3.5" />
              </Badge>
              <h3 className="font-semibold text-white">
                #{order.orderNumber.split('-')[1]}
                {order.tableNumber && <span className="ml-2 text-sm text-neutral-400">
                  <span className="inline-flex items-center">
                    <MapPin className="h-3 w-3 mr-0.5" />
                    {order.tableNumber}
                  </span>
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
            />
          </div>
          
          <div className="flex justify-between items-center mt-4 text-sm">
            <div>
              <p className="font-medium text-white">
                {order.useAIAutomation ? (
                  <span className="flex items-center gap-1">
                    <Bot className="h-3.5 w-3.5 text-purple-400" /> AI-Managed
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Utensils className="h-3.5 w-3.5 text-neutral-400" /> Manual
                  </span>
                )}
              </p>
              <p className="text-neutral-400">
                {order.totalAmount !== undefined ? `₹${order.totalAmount.toFixed(2)}` : `₹0.00`}
                {order.bill && <span className="ml-2 text-xs">• Bill #{order.bill.billNumber.split('-')[1]}</span>}
              </p>
            </div>
            <div className="text-right">
              <p className="font-medium text-white">
                {order.kitchenToken ? `Token: ${order.kitchenToken.tokenNumber}` : 'No Token'}
              </p>
              <p className="text-neutral-400 text-xs">
                {formatRelativeTime(new Date(order.createdAt))}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Render list card (more compact)
  if (viewMode === "list") {
    return (
      <Card className="overflow-hidden bg-neutral-800 border-neutral-700 hover:border-purple-700 transition-all">
        <div className="flex">
          <div className={`w-1 ${statusColor}`}></div>
          <CardContent className="py-2.5 px-4 flex-1 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge className={`${sourceColor} text-white hover:${sourceColor} h-7 w-7 p-1 flex items-center justify-center`}>
                <SourceIcon className="h-4 w-4" />
              </Badge>
              
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white">Order #{order.orderNumber.split('-')[1]}</h3>
                  <Badge className={`${statusColor} text-white hover:${statusColor}`}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {statusLabel}
                  </Badge>
                </div>
                
                <div className="flex gap-4 text-sm text-neutral-400">
                  {order.tableNumber && <span className="flex items-center gap-0.5">
                    <MapPin className="h-3 w-3" /> Table {order.tableNumber}
                  </span>}
                  
                  {order.kitchenToken && <span className="flex items-center gap-0.5">
                    <Utensils className="h-3 w-3" /> Token {order.kitchenToken.tokenNumber}
                  </span>}
                  
                  {order.bill && <span className="flex items-center gap-0.5">
                    <Receipt className="h-3 w-3" /> Bill #{order.bill.billNumber.split('-')[1]}
                  </span>}
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-end">
              <div className="font-bold text-white">
                {order.totalAmount !== undefined ? `₹${order.totalAmount.toFixed(2)}` : `₹0.00`}
              </div>
              <div className="text-xs text-neutral-400">
                {formatRelativeTime(new Date(order.createdAt))}
              </div>
            </div>
          </CardContent>
        </div>
      </Card>
    );
  }
  
  // Viewmode is "table", but this is handled by OrderTableRow component
  return null;
}

// Table row for table view mode
function OrderTableRow({ order }: { order: any }) {
  // Get status configuration
  const StatusIcon = STATUS_CONFIG[order.status as OrderStatus]?.icon || Clock;
  const statusColor = STATUS_CONFIG[order.status as OrderStatus]?.color || "bg-gray-500";
  const statusLabel = STATUS_CONFIG[order.status as OrderStatus]?.label || "Unknown";
  
  // Get source configuration
  const sourceType = (order.orderSource || "manual") as OrderSource;
  const SourceIcon = SOURCE_CONFIG[sourceType]?.icon || Utensils;
  const sourceColor = SOURCE_CONFIG[sourceType]?.color || "bg-gray-400";
  const sourceLabel = SOURCE_CONFIG[sourceType]?.label || "Manual";
  
  return (
    <tr className="border-b border-neutral-800 hover:bg-neutral-900">
      <td className="p-2 text-white">
        #{order.orderNumber.split('-')[1]}
      </td>
      <td className="p-2">
        <div className="flex items-center gap-1.5">
          <div className={`${sourceColor} rounded-full w-4 h-4 flex items-center justify-center p-0.5`}>
            <SourceIcon className="h-3 w-3 text-white" />
          </div>
          <span className="text-neutral-200">{sourceLabel}</span>
        </div>
      </td>
      <td className="p-2 text-neutral-300">
        {order.tableNumber || '—'}
      </td>
      <td className="p-2">
        <div className={`flex items-center gap-1 ${statusColor.replace('bg-', 'text-')}`}>
          <StatusIcon className="h-3.5 w-3.5" />
          {statusLabel}
        </div>
      </td>
      <td className="p-2 text-neutral-200 font-medium">
        {order.totalAmount !== undefined ? `₹${order.totalAmount.toFixed(2)}` : `₹0.00`}
      </td>
      <td className="p-2 text-neutral-400 text-sm">
        {formatRelativeTime(new Date(order.createdAt))}
      </td>
    </tr>
  );
}