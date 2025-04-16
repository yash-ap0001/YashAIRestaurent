import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CircleCheck, ChefHat, Utensils, ClipboardList, ClipboardCheck, Timer, Phone, Smartphone, Search, Globe, User, UserPlus, ReceiptText, CreditCard, PanelLeft, PanelRight, Mail, X, CheckSquare, ChevronsUpDown, Receipt, Plus } from "lucide-react";
import { SiZomato, SiSwiggy } from "react-icons/si";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { apiRequest } from "@/lib/queryClient";
import { BulkOrderCreate } from "@/components/orders/BulkOrderCreate";

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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries for data
  const {
    data: orders = [],
    isLoading: isLoadingOrders,
    error: ordersError,
  } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Order created",
        description: "The new order has been created successfully.",
      });
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
  
  // Select all orders in a specific status
  const selectAllInStatus = (status: string) => {
    const orderIdsInStatus = orders
      .filter(order => order.status === status)
      .map(order => order.id);
    setSelectedOrders(orderIdsInStatus);
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
    // Filter by search term
    const matchesSearch = 
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.tableNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.orderSource.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by order source
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

  return (
    <div className="container mx-auto px-4 py-6">
      <Tabs defaultValue="board">
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
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search order or table..."
                className="pl-10 w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
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
              <Button 
                variant={isSelectMode ? "default" : "outline"}
                size="sm"
                onClick={toggleSelectMode}
                className="flex items-center gap-1"
              >
                {isSelectMode ? (
                  <>
                    <X className="h-4 w-4" />
                    <span>Cancel Selection</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-4 w-4" />
                    <span>Select Orders</span>
                  </>
                )}
              </Button>
              {isSelectMode && (
                <div className="ml-4 flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={selectAllOrders}
                      className="flex items-center gap-1"
                    >
                      <CheckSquare className="h-4 w-4" />
                      <span>Select All Orders</span>
                    </Button>

                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setSelectedOrders([])}
                      className="flex items-center gap-1"
                    >
                      <X className="h-4 w-4" />
                      <span>Clear Selection</span>
                    </Button>
                  </div>
                  
                  <Badge variant="outline">
                    Total Orders: {orders.length}
                  </Badge>
                  
                  {selectedOrders.length > 0 && (
                    <>
                      <Badge variant="secondary">
                        {selectedOrders.length} selected
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="secondary" size="sm">
                            <ChevronsUpDown className="h-4 w-4 mr-1" />
                            <span>Bulk Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Move Selected Orders To</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => bulkUpdateOrderStatus("pending")}>
                            <ClipboardList className="h-4 w-4 mr-2" />
                            <span>Pending</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => bulkUpdateOrderStatus("preparing")}>
                            <ChefHat className="h-4 w-4 mr-2" />
                            <span>Preparing</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => bulkUpdateOrderStatus("ready")}>
                            <Utensils className="h-4 w-4 mr-2" />
                            <span>Ready</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => bulkUpdateOrderStatus("completed")}>
                            <CircleCheck className="h-4 w-4 mr-2" />
                            <span>Completed</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => bulkUpdateOrderStatus("billed")}>
                            <Receipt className="h-4 w-4 mr-2" />
                            <span>Billed</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setIsBulkCreateOpen(true)}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Bulk Create Orders
              </Button>
              
              <div className="flex items-center text-sm">
                <div className="flex items-center mr-4">
                  <div className="h-3 w-3 rounded-full bg-amber-600 mr-2"></div>
                  <span>Pending: </span>
                  <span className="font-bold ml-1">
                    {orders.filter((order: Order) => ["pending", "preparing"].includes(order.status)).length}
                  </span>
                </div>
                <div className="flex items-center mr-4">
                  <div className="h-3 w-3 rounded-full bg-blue-600 mr-2"></div>
                  <span>Ready: </span>
                  <span className="font-bold ml-1">
                    {orders.filter((order: Order) => order.status === "ready").length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bulk Order Creation Dialog */}
          <BulkOrderCreate 
            isOpen={isBulkCreateOpen}
            onClose={() => setIsBulkCreateOpen(false)}
          />

          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
              
              {/* Pending Orders Column */}
              <div className="flex flex-col w-full">
                <div className="bg-gradient-to-r from-amber-600 to-amber-800 text-white font-bold py-2 rounded-t-md text-center flex items-center justify-between w-full px-3">
                  <div className="flex items-center">
                    <ClipboardList className="h-5 w-5 mr-2" />
                    Pending Orders
                  </div>
                  {isSelectMode && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => selectAllInStatus("pending")}
                      className="text-xs text-amber-50 hover:text-amber-200 pl-1 h-5"
                    >
                      Select All
                    </Button>
                  )}
                </div>
                <Droppable droppableId="pending">
                  {(provided) => (
                    <div 
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-3 max-h-[70vh] overflow-y-auto p-4 rounded-b-md shadow-lg bg-neutral-900 w-full"
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
                                  className={`rounded-lg p-3 hover:shadow-xl transition-all bg-gradient-to-r from-amber-600 to-amber-800 order-card-text ${
                                    isSelectMode && selectedOrders.includes(order.id) ? 'ring-2 ring-primary' : ''
                                  }`}
                                  style={{
                                    ...provided.draggableProps.style,
                                    backgroundColor: snapshot.isDragging ? '#ffc107' : undefined,
                                    transform: snapshot.isDragging ? `${provided.draggableProps.style?.transform} scale(1.05)` : provided.draggableProps.style?.transform
                                  }}
                                  onClick={isSelectMode ? () => toggleOrderSelection(order.id) : undefined}
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
              <div className="flex flex-col w-full">
                <div className="bg-gradient-to-r from-emerald-600 to-emerald-800 text-white font-bold py-2 rounded-t-md text-center flex items-center justify-between w-full px-3">
                  <div className="flex items-center">
                    <ChefHat className="h-5 w-5 mr-2" />
                    Preparing
                  </div>
                  {isSelectMode && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => selectAllInStatus("preparing")}
                      className="text-xs text-emerald-50 hover:text-emerald-200 pl-1 h-5"
                    >
                      Select All
                    </Button>
                  )}
                </div>
                <Droppable droppableId="preparing">
                  {(provided) => (
                    <div 
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-3 max-h-[70vh] overflow-y-auto p-4 rounded-b-md shadow-lg bg-neutral-900 w-full"
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
                                  className={`rounded-lg p-3 hover:shadow-xl transition-all bg-gradient-to-r from-emerald-600 to-emerald-800 order-card-text ${
                                    isSelectMode && selectedOrders.includes(order.id) ? 'ring-2 ring-primary' : ''
                                  }`}
                                  style={{
                                    ...provided.draggableProps.style,
                                    backgroundColor: snapshot.isDragging ? '#ffa4b0' : undefined,
                                    transform: snapshot.isDragging ? `${provided.draggableProps.style?.transform} scale(1.05)` : provided.draggableProps.style?.transform
                                  }}
                                  onClick={isSelectMode ? () => toggleOrderSelection(order.id) : undefined}
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
              <div className="flex flex-col w-full">
                <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white font-bold py-2 rounded-t-md text-center flex items-center justify-between w-full px-3">
                  <div className="flex items-center">
                    <Utensils className="h-5 w-5 mr-2" />
                    Ready to Serve
                  </div>
                  {isSelectMode && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => selectAllInStatus("ready")}
                      className="text-xs text-blue-50 hover:text-blue-200 pl-1 h-5"
                    >
                      Select All
                    </Button>
                  )}
                </div>
                <Droppable droppableId="ready">
                  {(provided) => (
                    <div 
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-3 max-h-[70vh] overflow-y-auto p-4 rounded-b-md shadow-lg bg-neutral-900 w-full"
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
                                  className={`rounded-lg p-3 hover:shadow-xl transition-all bg-gradient-to-r from-blue-600 to-blue-800 order-card-text ${
                                    isSelectMode && selectedOrders.includes(order.id) ? 'ring-2 ring-primary' : ''
                                  }`}
                                  style={{
                                    ...provided.draggableProps.style,
                                    backgroundColor: snapshot.isDragging ? '#ff87b9' : undefined,
                                    transform: snapshot.isDragging ? `${provided.draggableProps.style?.transform} scale(1.05)` : provided.draggableProps.style?.transform
                                  }}
                                  onClick={isSelectMode ? () => toggleOrderSelection(order.id) : undefined}
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
              <div className="flex flex-col w-full">
                <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white font-bold py-2 rounded-t-md text-center flex items-center justify-between w-full px-3">
                  <div className="flex items-center">
                    <CircleCheck className="h-5 w-5 mr-2" />
                    Completed
                  </div>
                  {isSelectMode && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => selectAllInStatus("completed")}
                      className="text-xs text-purple-50 hover:text-purple-200 pl-1 h-5"
                    >
                      Select All
                    </Button>
                  )}
                </div>
                <Droppable droppableId="completed">
                  {(provided) => (
                    <div 
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-3 max-h-[70vh] overflow-y-auto p-4 rounded-b-md shadow-lg bg-neutral-900 w-full"
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
                                  className={`rounded-lg p-3 hover:shadow-xl transition-all bg-gradient-to-r from-purple-600 to-purple-800 order-card-text ${
                                    isSelectMode && selectedOrders.includes(order.id) ? 'ring-2 ring-primary' : ''
                                  }`}
                                  style={{
                                    ...provided.draggableProps.style,
                                    backgroundColor: snapshot.isDragging ? '#c440a0' : undefined,
                                    transform: snapshot.isDragging ? `${provided.draggableProps.style?.transform} scale(1.05)` : provided.draggableProps.style?.transform
                                  }}
                                  onClick={isSelectMode ? () => toggleOrderSelection(order.id) : undefined}
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
              <div className="flex flex-col w-full">
                <div className="bg-gradient-to-r from-gray-600 to-gray-800 text-white font-bold py-2 rounded-t-md text-center flex items-center justify-between w-full px-3">
                  <div className="flex items-center">
                    <CreditCard className="h-5 w-5 mr-2" />
                    Billed
                  </div>
                  {isSelectMode && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => selectAllInStatus("billed")}
                      className="text-xs text-gray-50 hover:text-gray-200 pl-1 h-5"
                    >
                      Select All
                    </Button>
                  )}
                </div>
                <Droppable droppableId="billed">
                  {(provided) => (
                    <div 
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-3 max-h-[70vh] overflow-y-auto p-4 rounded-b-md shadow-lg bg-neutral-900 w-full"
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
                                  className={`rounded-lg p-3 hover:shadow-xl transition-all bg-gradient-to-r from-gray-600 to-gray-800 order-card-text ${
                                    isSelectMode && selectedOrders.includes(order.id) ? 'ring-2 ring-primary' : ''
                                  }`}
                                  style={{
                                    ...provided.draggableProps.style,
                                    backgroundColor: snapshot.isDragging ? '#a4a4a4' : undefined,
                                    transform: snapshot.isDragging ? `${provided.draggableProps.style?.transform} scale(1.05)` : provided.draggableProps.style?.transform
                                  }}
                                  onClick={isSelectMode ? () => toggleOrderSelection(order.id) : undefined}
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
          <DashboardStats />
        </TabsContent>
      </Tabs>
    </div>
  );
}