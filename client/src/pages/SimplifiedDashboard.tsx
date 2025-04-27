import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useColumnColors } from "@/contexts/ColumnColorContext";
import { format } from "date-fns";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CircleCheck, ChefHat, Utensils, ClipboardList, ClipboardCheck, Timer, Phone, Smartphone, Search, Globe, User, UserPlus, ReceiptText, CreditCard, PanelLeft, PanelRight, Mail, X, CheckSquare, ChevronsUpDown, Receipt, Plus, BarChart3 } from "lucide-react";
import { SiZomato, SiSwiggy } from "react-icons/si";
import { apiRequest } from "@/lib/queryClient";
import { BulkOrderCreate } from "@/components/orders/BulkOrderCreate";
import { cn } from "@/lib/utils";
import { ColumnHeader, OrderCard } from "@/components/orders/OrderColumn";
import { OrderDetailsDialog } from "@/components/orders/OrderDetailsDialog";
import { ErrorBoundary } from "@/components/ErrorBoundary";

interface Order {
  id: number;
  orderNumber: string;
  tableNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  orderSource: string;
}

interface OrderItem {
  id: number;
  orderId: number;
  menuItemId: number;
  quantity: number;
  price: number;
  specialInstructions?: string;
}

interface MenuItem {
  id: number;
  name: string;
  price: number;
  category: string;
  description: string;
  dietaryInfo: string[];
  isAvailable: boolean;
  imageUrl?: string;
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

interface NewOrderFormData {
  tableNumber: string;
  orderItems: {
    menuItemId: number;
    quantity: number;
    price?: number;
    specialInstructions?: string;
  }[];
}

// This component has been replaced by a direct link to the separate dashboard stats page

// Utility function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount);
};

// Function to get appropriate icon for order source
const getSourceIcon = (source: string) => {
  switch (source.toLowerCase()) {
    case 'zomato':
      return <SiZomato className="h-3 w-3" />;
    case 'swiggy':
      return <SiSwiggy className="h-3 w-3" />;
    case 'phone':
      return <Phone className="h-3 w-3" />;
    case 'whatsapp':
      return <Smartphone className="h-3 w-3" />;
    case 'manual':
      return <User className="h-3 w-3" />;
    case 'ai':
      return <Globe className="h-3 w-3" />;
    default:
      return <Globe className="h-3 w-3" />;
  }
};

// Status colors for badges
const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return 'bg-amber-200 text-amber-800';
    case 'preparing':
      return 'bg-emerald-200 text-emerald-800';
    case 'ready':
      return 'bg-blue-200 text-blue-800';
    case 'completed':
      return 'bg-purple-200 text-purple-800';
    case 'billed':
      return 'bg-gray-200 text-gray-800';
    default:
      return 'bg-neutral-200 text-neutral-800';
  }
};

export default function SimplifiedDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [orderSourceFilter, setOrderSourceFilter] = useState<string | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [bulkActionAnchor, setBulkActionAnchor] = useState<HTMLElement | null>(null);
  const [isBulkCreateOpen, setIsBulkCreateOpen] = useState(false);
  const [singleOrderOpen, setSingleOrderOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getColumnStyle } = useColumnColors();
  
  // Set up WebSocket connection for real-time updates
  useEffect(() => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      console.log('WebSocket connected');
    };
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // For new orders, we need to handle them specially to ensure they show up immediately
        if (data.type === 'new_order') {
          console.log('New order received via WebSocket:', data);
          console.log('New order data structure:', JSON.stringify(data, null, 2));
          
          // Check if we should handle this order update
          if (data.data && data.data.id) {
            console.log('New order received. Order ID:', data.data.id, 'Order Number:', data.data.orderNumber);
            
            // IMPORTANT: Don't add to cache immediately to prevent duplicate cards
            // Instead, just schedule a delayed refetch of the data
            
            // Significantly increase delay to ensure server processing is complete
            const refetchDelay = 2000; // 2 seconds delay
            console.log(`Scheduling data refetch in ${refetchDelay}ms`);
            
            // Set a timeout to refetch the data
            setTimeout(() => {
              console.log('Executing delayed refetch of orders data');
              queryClient.refetchQueries({ queryKey: ['/api/orders'] });
              queryClient.refetchQueries({ queryKey: ['/api/kitchen-tokens'] });
              queryClient.refetchQueries({ queryKey: ['/api/dashboard/stats'] });
            }, refetchDelay);
          } else {
            console.error('Invalid order data structure received:', data);
          }
        }
        // Invalidate queries based on the type of update
        else if (data.type === 'order_created' || data.type === 'order_updated') {
          queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
          queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
        }
        else if (data.type === 'kitchen_token_updated' || data.type === 'new_kitchen_token') {
          queryClient.invalidateQueries({ queryKey: ['/api/kitchen-tokens'] });
          queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
        }
        else if (data.type === 'bill_created' || data.type === 'new_bill') {
          queryClient.invalidateQueries({ queryKey: ['/api/bills'] });
          queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
        }
        
        // For stats updates, just apply them directly
        if (data.type === 'stats_updated' && data.data) {
          queryClient.setQueryData(['/api/dashboard/stats'], data.data);
        }
        
        console.log('WebSocket message received:', data);
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    socket.onclose = () => {
      console.log('Closing WebSocket connection');
    };
    
    // Clean up the WebSocket connection when the component unmounts
    return () => {
      socket.close();
    };
  }, [queryClient]);

  // Queries for data
  const {
    data: orders = [],
    isLoading: isLoadingOrders,
    error: ordersError,
  } = useQuery<Order[]>({
    queryKey: ["/api/orders"]
  });

  const {
    data: kitchenTokens = [],
    isLoading: isLoadingTokens,
    error: tokensError,
  } = useQuery<KitchenToken[]>({
    queryKey: ["/api/kitchen-tokens"],
  });

  const {
    data: bills = [],
    isLoading: isLoadingBills,
    error: billsError,
  } = useQuery<Bill[]>({
    queryKey: ["/api/bills"],
  });

  // Mutation to update order status
  const updateOrderMutation = useMutation({
    mutationFn: async (orderData: { id: number; status: string }) => {
      const response = await apiRequest("PATCH", `/api/orders/${orderData.id}`, {
        status: orderData.status,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Order updated",
        description: "The order status has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update order",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for creating new order
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: NewOrderFormData) => {
      const response = await apiRequest("POST", "/api/orders", orderData);
      return await response.json();
    },
    onSuccess: (data) => {
      // Increase the delay before refetching data to prevent duplicate entries
      const refetchDelay = 2000; // 2 seconds
      console.log(`Order created. Scheduling data refetch in ${refetchDelay}ms`);
      
      // First, show a success notification
      toast({
        title: "Order created",
        description: `Order #${data.orderNumber} has been created successfully.`,
      });
      
      // Then, schedule a delayed refetch
      setTimeout(() => {
        console.log('Executing delayed refetch after order creation');
        queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
        queryClient.invalidateQueries({ queryKey: ["/api/kitchen-tokens"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      }, refetchDelay);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create order",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle drag and drop
  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // Dropped outside a droppable area or in the same position
    if (!destination || (destination.droppableId === source.droppableId && 
        destination.index === source.index)) {
      return;
    }
    
    // Find the order that was dragged
    const orderId = parseInt(draggableId);
    const order = orders.find(order => order.id === orderId);
    
    if (!order) return;
    
    // Determine new status based on destination droppable
    let newStatus = destination.droppableId;
    
    // Apply optimistic update to the client-side cache
    queryClient.setQueryData(["/api/orders"], (oldData: Order[] | undefined) => {
      if (!oldData) return oldData;
      
      return oldData.map(item => {
        if (item.id === orderId) {
          return { ...item, status: newStatus };
        }
        return item;
      });
    });
    
    // Then send update to the server
    updateOrderMutation.mutate({ id: orderId, status: newStatus });
  };

  // Get the next status for an order
  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case "pending":
        return "preparing";
      case "preparing":
        return "ready";
      case "ready":
        return "completed";
      case "completed":
        return "billed";
      default:
        return currentStatus;
    }
  };

  // Progress an order to the next status
  const progressOrder = (order: Order) => {
    const nextStatus = getNextStatus(order.status);
    
    // Apply optimistic update to the client-side cache
    queryClient.setQueryData(["/api/orders"], (oldData: Order[] | undefined) => {
      if (!oldData) return oldData;
      
      return oldData.map(item => {
        if (item.id === order.id) {
          return { ...item, status: nextStatus };
        }
        return item;
      });
    });
    
    // Then send update to the server
    updateOrderMutation.mutate({ id: order.id, status: nextStatus });
  };

  // Check if tokens or bills are available for order
  const getOrderTokenBillStatus = (order: Order) => {
    const hasToken = kitchenTokens.some((token: KitchenToken) => token.orderId === order.id);
    const hasBill = bills.some((bill: Bill) => bill.orderId === order.id);
    
    return {
      hasToken,
      hasBill
    };
  };
  
  // Multi-select functionality
  const toggleOrderSelection = (orderId: number) => {
    setSelectedOrders(prev => {
      if (prev.includes(orderId)) {
        return prev.filter(id => id !== orderId);
      } else {
        return [...prev, orderId];
      }
    });
  };
  
  // Toggle select mode on/off
  const toggleSelectMode = () => {
    setIsSelectMode(prev => !prev);
    // Clear selections when turning select mode off
    if (isSelectMode) {
      setSelectedOrders([]);
    }
  };
  
  // Handler for viewing order details
  const handleViewOrderDetails = (orderId: number) => {
    setSelectedOrderId(orderId);
    setIsOrderDetailsOpen(true);
  };
  
  // Select all orders in a specific status
  const selectAllInStatus = (status: string) => {
    const orderIdsInStatus = orders
      .filter(order => order.status === status)
      .map(order => order.id);
    setSelectedOrders(orderIdsInStatus);
  };
  
  const unselectAllInStatus = (status: string) => {
    const orderIdsInStatus = orders
      .filter(order => order.status === status)
      .map(order => order.id);
    setSelectedOrders(prev => prev.filter(id => !orderIdsInStatus.includes(id)));
  };
  
  // Select all orders across all statuses
  const selectAllOrders = () => {
    const allOrderIds = orders.map(order => order.id);
    setSelectedOrders(allOrderIds);
  };
  
  // Bulk update orders to a specific status
  const bulkUpdateOrderStatus = (newStatus: string) => {
    // Apply optimistic update to the client-side cache
    queryClient.setQueryData(["/api/orders"], (oldData: Order[] | undefined) => {
      if (!oldData) return oldData;
      
      return oldData.map(item => {
        if (selectedOrders.includes(item.id)) {
          return { ...item, status: newStatus };
        }
        return item;
      });
    });
    
    // Update each selected order
    selectedOrders.forEach(orderId => {
      updateOrderMutation.mutate({ id: orderId, status: newStatus });
    });
    
    // Clear selections after bulk update
    setSelectedOrders([]);
    
    toast({
      title: "Bulk update completed",
      description: `${selectedOrders.length} orders updated to "${newStatus}" status.`,
    });
  };

  // Get unique order sources for filtering
  const orderSources = useMemo(() => {
    // Create an array of unique order sources without using Set spreading
    const sourcesMap: {[key: string]: boolean} = {};
    orders.forEach(order => {
      sourcesMap[order.orderSource] = true;
    });
    return Object.keys(sourcesMap).sort();
  }, [orders]);

  // Filter orders by search term and selected filters
  const filteredOrders = orders.filter((order: Order) => {
    // If search term is empty, don't filter by search
    if (!searchTerm.trim()) {
      // Only apply source filter
      return !orderSourceFilter || order.orderSource === orderSourceFilter;
    }
    
    // Search term is not empty, apply strict filtering
    const search = searchTerm.toLowerCase().trim();
    
    // Perform a more thorough search
    const matchesSearch = 
      (order.orderNumber && order.orderNumber.toLowerCase().includes(search)) ||
      (order.tableNumber && order.tableNumber.toLowerCase().includes(search)) ||
      (order.orderSource && order.orderSource.toLowerCase().includes(search)) ||
      (order.status && order.status.toLowerCase().includes(search)) ||
      (order.totalAmount && order.totalAmount.toString().includes(search));
    
    // Filter by order source if specified
    const matchesOrderSource = !orderSourceFilter || order.orderSource === orderSourceFilter;
    
    return matchesSearch && matchesOrderSource;
  }).sort((a: Order, b: Order) => {
    // Sort by timestamp, most recent first
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Loading state
  if (isLoadingOrders || isLoadingTokens || isLoadingBills) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div className="mt-4 text-muted-foreground">Loading dashboard data...</div>
      </div>
    );
  }

  // Error state
  if (ordersError || tokensError || billsError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-destructive font-bold">Error loading dashboard data</div>
        <div className="mt-4 text-muted-foreground">
          {ordersError?.message || tokensError?.message || billsError?.message}
        </div>
      </div>
    );
  }

  // Track active tab for better control over stat refreshes
  const [activeTab, setActiveTab] = useState("board");

  // Simple tab tracking - no side effects that might cause hook issues

  return (
    <div className="container mx-auto px-4 py-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-6">
          <TabsList>
            <TabsTrigger value="board" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <ClipboardList className="h-4 w-4 mr-2" />
              Order Board
            </TabsTrigger>
            <TabsTrigger value="stats" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Timer className="h-4 w-4 mr-2" />
              Today's Stats
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-3">
            {/* We've moved the Create Order button to the action row at the bottom */}
            
            {/* We've removed the dialog and now route to the NewOrder page */}

            <div className="relative">
              <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-primary" />
              <Input
                placeholder="Search order #, table, status..."
                className="pl-10 w-72 border-primary/30 focus:border-primary focus:ring-primary bg-muted/5 text-md"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button 
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearchTerm("")}
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Globe className="h-4 w-4 mr-1" />
                  <span>{orderSourceFilter || "All Sources"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter by Source</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setOrderSourceFilter(null)}>
                  <Globe className="h-4 w-4 mr-2" />
                  <span>All Sources</span>
                </DropdownMenuItem>
                {orderSources.map(source => (
                  <DropdownMenuItem 
                    key={source} 
                    onClick={() => setOrderSourceFilter(source)}
                  >
                    <span className="flex items-center">
                      {getSourceIcon(source)}
                      <span className="ml-2">{source.charAt(0).toUpperCase() + source.slice(1)}</span>
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <TabsContent value="board" className="space-y-6 mt-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold mr-4">Today's Orders</h1>
              
              {isSelectMode && (
                <div className="inline-flex items-center gap-1 bg-muted/5 rounded-md px-2 py-1 border border-muted/20">
                  <span className="text-xs text-muted-foreground mr-1">
                    {orders.length} Total
                  </span>
                  
                  {selectedOrders.length > 0 ? (
                    <Badge variant="secondary" className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary border-primary/30">
                      {selectedOrders.length} Selected
                    </Badge>
                  ) : null}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Link href="/new-order">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="bg-gradient-to-r from-purple-500 to-purple-700 text-white hover:from-purple-600 hover:to-purple-800"
                >
                  <Utensils className="h-4 w-4 mr-1" />
                  <span>Create Order</span>
                </Button>
              </Link>
              
              <Button
                onClick={() => setIsBulkCreateOpen(true)}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Bulk Create Orders
              </Button>
              
              {/* Select Orders dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant={isSelectMode ? "destructive" : "secondary"} size="sm" className="h-9 px-2">
                    <CheckSquare className="h-4 w-4 mr-1" />
                    <span>{isSelectMode ? "Selection Menu" : "Select Orders"}</span>
                    <ChevronsUpDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {isSelectMode ? (
                    <>
                      <div className="flex items-center justify-between px-2 py-1.5">
                        <span className="text-xs font-medium">Selection Tools</span>
                        <div className="flex gap-1 items-center">
                          <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 bg-background">
                            {orders.length} Total
                          </Badge>
                          {selectedOrders.length > 0 && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 bg-primary/20 text-primary">
                              {selectedOrders.length} Selected
                            </Badge>
                          )}
                        </div>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={toggleSelectMode} className="cursor-pointer text-destructive font-medium">
                        <X className="h-4 w-4 mr-2" />
                        Exit Selection Mode
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={selectAllOrders} className="cursor-pointer">
                        <CheckSquare className="h-4 w-4 mr-2" />
                        Select All Orders
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSelectedOrders([])} className="cursor-pointer">
                        <X className="h-4 w-4 mr-2" />
                        Clear Selection
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Select by Status</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => selectAllInStatus("pending")} className="cursor-pointer">
                        Select All Pending
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => selectAllInStatus("preparing")} className="cursor-pointer">
                        Select All Preparing
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => selectAllInStatus("ready")} className="cursor-pointer">
                        Select All Ready
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => selectAllInStatus("completed")} className="cursor-pointer">
                        Select All Completed
                      </DropdownMenuItem>
                      
                      {selectedOrders.length > 0 && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Bulk Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => bulkUpdateOrderStatus("pending")} className="cursor-pointer">
                            Move to Pending
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => bulkUpdateOrderStatus("preparing")} className="cursor-pointer">
                            Move to Preparing
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => bulkUpdateOrderStatus("ready")} className="cursor-pointer">
                            Move to Ready
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => bulkUpdateOrderStatus("completed")} className="cursor-pointer">
                            Move to Completed
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => bulkUpdateOrderStatus("billed")} className="cursor-pointer">
                            Move to Billed
                          </DropdownMenuItem>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <DropdownMenuLabel>Order Selection Options</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={toggleSelectMode} className="cursor-pointer">
                        <CheckSquare className="h-4 w-4 mr-2" />
                        Select All Orders
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        toggleSelectMode();
                        setTimeout(() => selectAllInStatus("pending"), 100);
                      }} className="cursor-pointer">
                        Select Pending Orders
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        toggleSelectMode();
                        setTimeout(() => selectAllInStatus("preparing"), 100);
                      }} className="cursor-pointer">
                        Select Preparing Orders
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        toggleSelectMode();
                        setTimeout(() => selectAllInStatus("ready"), 100);
                      }} className="cursor-pointer">
                        Select Ready Orders
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        toggleSelectMode();
                        setTimeout(() => selectAllInStatus("completed"), 100);
                      }} className="cursor-pointer">
                        Select Completed Orders
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Bulk Order Creation Dialog */}
          <BulkOrderCreate 
            isOpen={isBulkCreateOpen}
            onClose={() => setIsBulkCreateOpen(false)}
          />

          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2 mt-4 w-full max-w-full">
              
              {/* Pending Orders Column */}
              <div className="flex flex-col w-full min-w-0 max-w-full">
                <div className="font-bold py-2 rounded-t-md text-center flex items-center justify-between w-full px-3 bg-gradient-to-r from-amber-500 to-orange-700 order-card-text">
                  <div className="flex items-center text-white">
                    {isSelectMode && (
                      <div className="mr-2">
                        <Checkbox 
                          checked={orders.filter(order => order.status === "pending").every(order => selectedOrders.includes(order.id))}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              selectAllInStatus("pending");
                            } else {
                              unselectAllInStatus("pending");
                            }
                          }}
                          aria-label="Select all pending orders"
                          className="h-4 w-4 rounded-sm"
                        />
                      </div>
                    )}
                    Pending Orders
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white/20 min-w-[1.5rem] h-6 flex items-center justify-center px-1 text-sm text-white">
                      {orders.filter(order => order.status === "pending").length}
                    </span>
                  </div>
                </div>
                <Droppable droppableId="pending">
                  {(provided) => (
                    <div 
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-3 max-h-[70vh] overflow-y-auto pt-4 pb-4 rounded-b-md shadow-lg bg-neutral-900 w-full pending-column"
                    >
                      {orders
                          .filter(order => order.status === "pending")
                          .map((order, index) => (
                            <Draggable key={order.id.toString()} draggableId={order.id.toString()} index={index}>
                              {(provided, snapshot) => (
                                <div 
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...(isSelectMode ? {} : provided.dragHandleProps)}
                                  className={`rounded-lg p-3 hover:shadow-xl transition-all bg-gradient-to-r from-amber-500 to-orange-700 order-card-text ${
                                    isSelectMode && selectedOrders.includes(order.id) ? 'ring-2 ring-primary' : ''
                                  }`}
                                  style={{
                                    ...provided.draggableProps.style,
                                    backgroundColor: snapshot.isDragging ? '#ffc107' : undefined,
                                    transform: snapshot.isDragging ? `${provided.draggableProps.style?.transform} scale(1.05)` : provided.draggableProps.style?.transform
                                  }}
                                  onClick={isSelectMode ? () => toggleOrderSelection(order.id) : () => handleViewOrderDetails(order.id)}
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-start gap-2">
                                      {isSelectMode && (
                                        <div className="relative flex items-center h-5 mt-1">
                                          <Checkbox 
                                            checked={selectedOrders.includes(order.id)} 
                                            onCheckedChange={() => toggleOrderSelection(order.id)}
                                            aria-label={`Select order ${order.orderNumber}`}
                                            className="mr-2 h-4 w-4 rounded-sm"
                                          />
                                        </div>
                                      )}
                                      <div>
                                        <h3 className="font-bold text-lg text-[#7A0177]">#{order.orderNumber}</h3>
                                        <div className="text-xs text-neutral-500">Table {order.tableNumber}</div>
                                      </div>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                      <span className="flex items-center">
                                        {getSourceIcon(order.orderSource)}
                                        <span className="ml-1">{order.orderSource.charAt(0).toUpperCase() + order.orderSource.slice(1)}</span>
                                      </span>
                                    </Badge>
                                  </div>
                                  
                                  <div className="text-xs text-neutral-500 mb-2">
                                    {format(new Date(order.createdAt), "h:mm a")}
                                  </div>
                                  
                                  <div className="flex justify-between items-center mt-2">
                                    <div className="font-bold">{formatCurrency(order.totalAmount)}</div>
                                    
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      disabled={updateOrderMutation.isPending}
                                      onClick={() => progressOrder(order)}
                                      className="h-7 px-2"
                                    >
                                      {updateOrderMutation.isPending && updateOrderMutation.variables?.id === order.id ? (
                                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                      ) : (
                                        <ChefHat className="h-3 w-3 mr-1" />
                                      )}
                                      <span className="text-xs">Start</span>
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
              
              {/* Preparing Orders Column */}
              <div className="flex flex-col w-full min-w-0 max-w-full">
                <div className="font-bold py-2 rounded-t-md text-center flex items-center justify-between w-full px-3 bg-gradient-to-r from-blue-500 to-blue-700 order-card-text">
                  <div className="flex items-center text-white">
                    {isSelectMode && (
                      <div className="mr-2">
                        <Checkbox 
                          checked={orders.filter(order => order.status === "preparing").every(order => selectedOrders.includes(order.id))}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              selectAllInStatus("preparing");
                            } else {
                              unselectAllInStatus("preparing");
                            }
                          }}
                          aria-label="Select all preparing orders"
                          className="h-4 w-4 rounded-sm"
                        />
                      </div>
                    )}
                    Preparing
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white/20 min-w-[1.5rem] h-6 flex items-center justify-center px-1 text-sm text-white">
                      {orders.filter(order => order.status === "preparing").length}
                    </span>
                  </div>
                </div>
                <Droppable droppableId="preparing">
                  {(provided) => (
                    <div 
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-3 max-h-[70vh] overflow-y-auto pt-4 pb-4 rounded-b-md shadow-lg bg-neutral-900 w-full preparing-column"
                    >
                      {orders
                          .filter(order => order.status === "preparing")
                          .map((order, index) => (
                            <Draggable key={order.id.toString()} draggableId={order.id.toString()} index={index}>
                              {(provided, snapshot) => (
                                <div 
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...(isSelectMode ? {} : provided.dragHandleProps)}
                                  className={`rounded-lg p-3 hover:shadow-xl transition-all bg-gradient-to-r from-indigo-500 to-blue-700 order-card-text ${
                                    isSelectMode && selectedOrders.includes(order.id) ? 'ring-2 ring-primary' : ''
                                  }`}
                                  style={{
                                    ...provided.draggableProps.style,
                                    backgroundColor: snapshot.isDragging ? '#ffa4b0' : undefined,
                                    transform: snapshot.isDragging ? `${provided.draggableProps.style?.transform} scale(1.05)` : provided.draggableProps.style?.transform
                                  }}
                                  onClick={isSelectMode ? () => toggleOrderSelection(order.id) : () => handleViewOrderDetails(order.id)}
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-start gap-2">
                                      {isSelectMode && (
                                        <div className="relative flex items-center h-5 mt-1">
                                          <Checkbox 
                                            checked={selectedOrders.includes(order.id)} 
                                            onCheckedChange={() => toggleOrderSelection(order.id)}
                                            aria-label={`Select order ${order.orderNumber}`}
                                            className="mr-2 h-4 w-4 rounded-sm"
                                          />
                                        </div>
                                      )}
                                      <div>
                                        <h3 className="font-bold text-lg text-[#7A0177]">#{order.orderNumber}</h3>
                                        <div className="text-xs text-neutral-500">Table {order.tableNumber}</div>
                                      </div>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                      <span className="flex items-center">
                                        {getSourceIcon(order.orderSource)}
                                        <span className="ml-1">{order.orderSource.charAt(0).toUpperCase() + order.orderSource.slice(1)}</span>
                                      </span>
                                    </Badge>
                                  </div>
                                  
                                  <div className="text-xs text-neutral-500 mb-2">
                                    {format(new Date(order.createdAt), "h:mm a")}
                                  </div>
                                  
                                  <div className="flex justify-between items-center mt-2">
                                    <div className="font-bold">{formatCurrency(order.totalAmount)}</div>
                                    
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      disabled={updateOrderMutation.isPending}
                                      onClick={() => progressOrder(order)}
                                      className="h-7 px-2"
                                    >
                                      {updateOrderMutation.isPending && updateOrderMutation.variables?.id === order.id ? (
                                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                      ) : (
                                        <ClipboardCheck className="h-3 w-3 mr-1" />
                                      )}
                                      <span className="text-xs">Ready</span>
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
              
              {/* Ready Orders Column */}
              <div className="flex flex-col w-full min-w-0 max-w-full">
                <div className="font-bold py-2 rounded-t-md text-center flex items-center justify-between w-full px-3 bg-gradient-to-r from-green-500 to-green-700 order-card-text">
                  <div className="flex items-center text-white">
                    {isSelectMode && (
                      <div className="mr-2">
                        <Checkbox 
                          checked={orders.filter(order => order.status === "ready").every(order => selectedOrders.includes(order.id))}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              selectAllInStatus("ready");
                            } else {
                              unselectAllInStatus("ready");
                            }
                          }}
                          aria-label="Select all ready orders"
                          className="h-4 w-4 rounded-sm"
                        />
                      </div>
                    )}
                    Ready to Serve
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white/20 min-w-[1.5rem] h-6 flex items-center justify-center px-1 text-sm text-white">
                      {orders.filter(order => order.status === "ready").length}
                    </span>
                  </div>
                </div>
                <Droppable droppableId="ready">
                  {(provided) => (
                    <div 
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-3 max-h-[70vh] overflow-y-auto pt-4 pb-4 rounded-b-md shadow-lg bg-neutral-900 w-full ready-column"
                    >
                      {orders
                          .filter(order => order.status === "ready")
                          .map((order, index) => (
                            <Draggable key={order.id.toString()} draggableId={order.id.toString()} index={index}>
                              {(provided, snapshot) => (
                                <div 
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...(isSelectMode ? {} : provided.dragHandleProps)}
                                  className={`rounded-lg p-3 hover:shadow-xl transition-all bg-gradient-to-r from-emerald-500 to-green-700 order-card-text ${
                                    isSelectMode && selectedOrders.includes(order.id) ? 'ring-2 ring-primary' : ''
                                  }`}
                                  style={{
                                    ...provided.draggableProps.style,
                                    backgroundColor: snapshot.isDragging ? '#72da8d' : undefined,
                                    transform: snapshot.isDragging ? `${provided.draggableProps.style?.transform} scale(1.05)` : provided.draggableProps.style?.transform
                                  }}
                                  onClick={isSelectMode ? () => toggleOrderSelection(order.id) : () => handleViewOrderDetails(order.id)}
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-start gap-2">
                                      {isSelectMode && (
                                        <div className="relative flex items-center h-5 mt-1">
                                          <Checkbox 
                                            checked={selectedOrders.includes(order.id)} 
                                            onCheckedChange={() => toggleOrderSelection(order.id)}
                                            aria-label={`Select order ${order.orderNumber}`}
                                            className="mr-2 h-4 w-4 rounded-sm"
                                          />
                                        </div>
                                      )}
                                      <div>
                                        <h3 className="font-bold text-lg text-[#7A0177]">#{order.orderNumber}</h3>
                                        <div className="text-xs text-neutral-500">Table {order.tableNumber}</div>
                                      </div>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                      <span className="flex items-center">
                                        {getSourceIcon(order.orderSource)}
                                        <span className="ml-1">{order.orderSource.charAt(0).toUpperCase() + order.orderSource.slice(1)}</span>
                                      </span>
                                    </Badge>
                                  </div>
                                  
                                  <div className="text-xs text-neutral-500 mb-2">
                                    {format(new Date(order.createdAt), "h:mm a")}
                                  </div>
                                  
                                  <div className="flex justify-between items-center mt-2">
                                    <div className="font-bold">{formatCurrency(order.totalAmount)}</div>
                                    
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      disabled={updateOrderMutation.isPending}
                                      onClick={() => progressOrder(order)}
                                      className="h-7 px-2"
                                    >
                                      {updateOrderMutation.isPending && updateOrderMutation.variables?.id === order.id ? (
                                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                      ) : (
                                        <CircleCheck className="h-3 w-3 mr-1" />
                                      )}
                                      <span className="text-xs">Complete</span>
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
              
              {/* Completed Orders Column */}
              <div className="flex flex-col w-full min-w-0 max-w-full">
                <div className="font-bold py-2 rounded-t-md text-center flex items-center justify-between w-full px-3 bg-gradient-to-r from-purple-500 to-purple-700 order-card-text">
                  <div className="flex items-center text-white">
                    {isSelectMode && (
                      <div className="mr-2">
                        <Checkbox 
                          checked={orders.filter(order => order.status === "completed").every(order => selectedOrders.includes(order.id))}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              selectAllInStatus("completed");
                            } else {
                              unselectAllInStatus("completed");
                            }
                          }}
                          aria-label="Select all completed orders"
                          className="h-4 w-4 rounded-sm"
                        />
                      </div>
                    )}
                    Completed
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white/20 min-w-[1.5rem] h-6 flex items-center justify-center px-1 text-sm text-white">
                      {orders.filter(order => order.status === "completed").length}
                    </span>
                  </div>
                </div>
                <Droppable droppableId="completed">
                  {(provided) => (
                    <div 
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-3 max-h-[70vh] overflow-y-auto pt-4 pb-4 rounded-b-md shadow-lg bg-neutral-900 w-full delivered-column"
                    >
                      {orders
                          .filter(order => order.status === "completed")
                          .map((order, index) => (
                            <Draggable key={order.id.toString()} draggableId={order.id.toString()} index={index}>
                              {(provided, snapshot) => (
                                <div 
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...(isSelectMode ? {} : provided.dragHandleProps)}
                                  className={`rounded-lg p-3 hover:shadow-xl transition-all bg-gradient-to-r from-purple-500 to-violet-700 order-card-text ${
                                    isSelectMode && selectedOrders.includes(order.id) ? 'ring-2 ring-primary' : ''
                                  }`}
                                  style={{
                                    ...provided.draggableProps.style,
                                    backgroundColor: snapshot.isDragging ? '#c440a0' : undefined,
                                    transform: snapshot.isDragging ? `${provided.draggableProps.style?.transform} scale(1.05)` : provided.draggableProps.style?.transform
                                  }}
                                  onClick={isSelectMode ? () => toggleOrderSelection(order.id) : () => handleViewOrderDetails(order.id)}
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-start gap-2">
                                      {isSelectMode && (
                                        <div className="relative flex items-center h-5 mt-1">
                                          <Checkbox 
                                            checked={selectedOrders.includes(order.id)} 
                                            onCheckedChange={() => toggleOrderSelection(order.id)}
                                            aria-label={`Select order ${order.orderNumber}`}
                                            className="mr-2 h-4 w-4 rounded-sm"
                                          />
                                        </div>
                                      )}
                                      <div>
                                        <h3 className="font-bold text-lg text-[#7A0177]">#{order.orderNumber}</h3>
                                        <div className="text-xs text-neutral-500">Table {order.tableNumber}</div>
                                      </div>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                      <span className="flex items-center">
                                        {getSourceIcon(order.orderSource)}
                                        <span className="ml-1">{order.orderSource.charAt(0).toUpperCase() + order.orderSource.slice(1)}</span>
                                      </span>
                                    </Badge>
                                  </div>
                                  
                                  <div className="text-xs text-neutral-500 mb-2">
                                    {format(new Date(order.createdAt), "h:mm a")}
                                  </div>
                                  
                                  <div className="flex justify-between items-center mt-2">
                                    <div className="font-bold">{formatCurrency(order.totalAmount)}</div>
                                    
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      disabled={updateOrderMutation.isPending}
                                      onClick={() => progressOrder(order)}
                                      className="h-7 px-2"
                                    >
                                      {updateOrderMutation.isPending && updateOrderMutation.variables?.id === order.id ? (
                                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                      ) : (
                                        <ReceiptText className="h-3 w-3 mr-1" />
                                      )}
                                      <span className="text-xs">Bill</span>
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
              
              {/* Billed Orders Column */}
              <div className="flex flex-col w-full min-w-0 max-w-full">
                <div className="font-bold py-2 rounded-t-md text-center flex items-center justify-between w-full px-3 bg-gradient-to-r from-pink-500 to-rose-700 order-card-text">
                  <div className="flex items-center text-white">
                    {isSelectMode && (
                      <div className="mr-2">
                        <Checkbox 
                          checked={orders.filter(order => order.status === "billed").every(order => selectedOrders.includes(order.id))}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              selectAllInStatus("billed");
                            } else {
                              unselectAllInStatus("billed");
                            }
                          }}
                          aria-label="Select all billed orders"
                          className="h-4 w-4 rounded-sm"
                        />
                      </div>
                    )}
                    Billed
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white/20 min-w-[1.5rem] h-6 flex items-center justify-center px-1 text-sm text-white">
                      {orders.filter(order => order.status === "billed").length}
                    </span>
                  </div>
                </div>
                <Droppable droppableId="billed">
                  {(provided) => (
                    <div 
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-3 max-h-[70vh] overflow-y-auto pt-4 pb-4 rounded-b-md shadow-lg bg-neutral-900 w-full billed-column"
                    >
                      {orders
                          .filter(order => order.status === "billed")
                          .map((order, index) => (
                            <Draggable key={order.id.toString()} draggableId={order.id.toString()} index={index}>
                              {(provided, snapshot) => (
                                <div 
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...(isSelectMode ? {} : provided.dragHandleProps)}
                                  className={`rounded-lg p-3 hover:shadow-xl transition-all order-card-text bg-gradient-to-r from-pink-500 to-rose-700 text-white ${
                                    isSelectMode && selectedOrders.includes(order.id) ? 'ring-2 ring-primary' : ''
                                  }`}
                                  style={{
                                    ...provided.draggableProps.style,
                                    transform: snapshot.isDragging ? `${provided.draggableProps.style?.transform} scale(1.05)` : provided.draggableProps.style?.transform
                                  }}
                                  onClick={isSelectMode ? () => toggleOrderSelection(order.id) : () => handleViewOrderDetails(order.id)}
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-start gap-2">
                                      {isSelectMode && (
                                        <div className="relative flex items-center h-5 mt-1">
                                          <Checkbox 
                                            checked={selectedOrders.includes(order.id)} 
                                            onCheckedChange={() => toggleOrderSelection(order.id)}
                                            aria-label={`Select order ${order.orderNumber}`}
                                            className="mr-2 h-4 w-4 rounded-sm"
                                          />
                                        </div>
                                      )}
                                      <div>
                                        <h3 className="font-bold text-lg text-[#7A0177]">#{order.orderNumber}</h3>
                                        <div className="text-xs text-neutral-500">Table {order.tableNumber}</div>
                                      </div>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                      <span className="flex items-center">
                                        {getSourceIcon(order.orderSource)}
                                        <span className="ml-1">{order.orderSource.charAt(0).toUpperCase() + order.orderSource.slice(1)}</span>
                                      </span>
                                    </Badge>
                                  </div>
                                  
                                  <div className="text-xs text-neutral-500 mb-2">
                                    {format(new Date(order.createdAt), "h:mm a")}
                                  </div>
                                  
                                  <div className="flex justify-between items-center mt-2">
                                    <div className="font-bold">{formatCurrency(order.totalAmount)}</div>
                                    
                                    <div className="flex items-center">
                                      {getOrderTokenBillStatus(order).hasBill && (
                                        <Badge className="mr-2 bg-green-700">
                                          <ReceiptText className="h-3 w-3 mr-1" />
                                          <span className="text-xs">Billed</span>
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            </div>
          </DragDropContext>
        </TabsContent>

        <TabsContent value="stats" className="mt-2">
          <ErrorBoundary>
            <div className="mb-4">
              <h1 className="text-2xl font-bold">Today's Stats</h1>
              <p className="text-muted-foreground">
                Real-time statistics updated automatically 
                <Button 
                  variant="link" 
                  size="sm" 
                  className="text-primary hover:text-primary/90 p-0 ml-2 inline-flex items-center" 
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] })}
                >
                  <span className="underline text-sm">Refresh Now</span>
                </Button>
              </p>
            </div>
            <Link href="/dashboard-stats" className="block mb-4">
              <Button className="w-full">
                <BarChart3 className="w-4 h-4 mr-2" />
                Open Full Stats Dashboard
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground">
              We've moved the stats to a separate page to improve performance.
              Click the button above to view real-time statistics.
            </p>
          </ErrorBoundary>
        </TabsContent>
      </Tabs>

      {/* Order Details Dialog */}
      <OrderDetailsDialog 
        orderId={selectedOrderId} 
        open={isOrderDetailsOpen}
        onOpenChange={setIsOrderDetailsOpen}
      />
    </div>
  );
}