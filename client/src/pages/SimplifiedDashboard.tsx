import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CircleCheck, ChefHat, Utensils, ClipboardList, ClipboardCheck, Timer, Phone, Smartphone, Search, Globe, User, UserPlus, ReceiptText, CreditCard, PanelLeft, PanelRight, Mail } from "lucide-react";
import { SiZomato, SiSwiggy } from "react-icons/si";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { apiRequest } from "@/lib/queryClient";

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

  // Filter orders by search term
  const filteredOrders = orders.filter((order: Order) => {
    return (
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.tableNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.orderSource.toLowerCase().includes(searchTerm.toLowerCase())
    );
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

          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search order or table..."
              className="pl-10 w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <TabsContent value="board" className="space-y-6 mt-2">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Today's Orders</h1>
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

          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
              
              {/* Pending Orders Column */}
              <div className="flex flex-col w-full">
                <div className="bg-gradient-to-r from-amber-600 to-amber-800 text-white font-bold py-2 rounded-t-md text-center flex items-center justify-center w-full">
                  <ClipboardList className="h-5 w-5 mr-2" />
                  Pending Orders
                </div>
                <Droppable droppableId="pending">
                  {(provided) => (
                    <div 
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-3 max-h-[70vh] overflow-y-auto p-4 rounded-b-md shadow-lg bg-neutral-900"
                    >
                      {orders
                          .filter(order => order.status === "pending")
                          .map((order, index) => (
                            <Draggable key={order.id.toString()} draggableId={order.id.toString()} index={index}>
                              {(provided, snapshot) => (
                                <div 
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className="rounded-lg p-3 hover:shadow-xl transition-all bg-gradient-to-r from-amber-600 to-amber-800 order-card-text"
                                  style={{
                                    ...provided.draggableProps.style,
                                    backgroundColor: snapshot.isDragging ? '#ffc107' : undefined,
                                    transform: snapshot.isDragging ? `${provided.draggableProps.style?.transform} scale(1.05)` : provided.draggableProps.style?.transform
                                  }}
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <h3 className="font-bold text-lg text-[#7A0177]">#{order.orderNumber}</h3>
                                      <div className="text-xs text-neutral-500">Table {order.tableNumber}</div>
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
                <div className="bg-gradient-to-r from-emerald-600 to-emerald-800 text-white font-bold py-2 rounded-t-md text-center flex items-center justify-center w-full">
                  <ChefHat className="h-5 w-5 mr-2" />
                  Preparing
                </div>
                <Droppable droppableId="preparing">
                  {(provided) => (
                    <div 
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-3 max-h-[70vh] overflow-y-auto p-4 rounded-b-md shadow-lg bg-neutral-900"
                    >
                      {orders
                          .filter(order => order.status === "preparing")
                          .map((order, index) => (
                            <Draggable key={order.id.toString()} draggableId={order.id.toString()} index={index}>
                              {(provided, snapshot) => (
                                <div 
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className="rounded-lg p-3 hover:shadow-xl transition-all bg-gradient-to-r from-emerald-600 to-emerald-800 order-card-text"
                                  style={{
                                    ...provided.draggableProps.style,
                                    backgroundColor: snapshot.isDragging ? '#ffa4b0' : undefined,
                                    transform: snapshot.isDragging ? `${provided.draggableProps.style?.transform} scale(1.05)` : provided.draggableProps.style?.transform
                                  }}
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <h3 className="font-bold text-lg text-[#7A0177]">#{order.orderNumber}</h3>
                                      <div className="text-xs text-neutral-500">Table {order.tableNumber}</div>
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
                <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white font-bold py-2 rounded-t-md text-center flex items-center justify-center w-full">
                  <Utensils className="h-5 w-5 mr-2" />
                  Ready to Serve
                </div>
                <Droppable droppableId="ready">
                  {(provided) => (
                    <div 
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-3 max-h-[70vh] overflow-y-auto p-4 rounded-b-md shadow-lg bg-neutral-900"
                    >
                      {orders
                          .filter(order => order.status === "ready")
                          .map((order, index) => (
                            <Draggable key={order.id.toString()} draggableId={order.id.toString()} index={index}>
                              {(provided, snapshot) => (
                                <div 
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className="rounded-lg p-3 hover:shadow-xl transition-all bg-gradient-to-r from-blue-600 to-blue-800 order-card-text"
                                  style={{
                                    ...provided.draggableProps.style,
                                    backgroundColor: snapshot.isDragging ? '#ff87b9' : undefined,
                                    transform: snapshot.isDragging ? `${provided.draggableProps.style?.transform} scale(1.05)` : provided.draggableProps.style?.transform
                                  }}
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <h3 className="font-bold text-lg text-[#7A0177]">#{order.orderNumber}</h3>
                                      <div className="text-xs text-neutral-500">Table {order.tableNumber}</div>
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
                <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white font-bold py-2 rounded-t-md text-center flex items-center justify-center w-full">
                  <CircleCheck className="h-5 w-5 mr-2" />
                  Completed
                </div>
                <Droppable droppableId="completed">
                  {(provided) => (
                    <div 
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-3 max-h-[70vh] overflow-y-auto p-4 rounded-b-md shadow-lg bg-neutral-900"
                    >
                      {orders
                          .filter(order => order.status === "completed")
                          .map((order, index) => (
                            <Draggable key={order.id.toString()} draggableId={order.id.toString()} index={index}>
                              {(provided, snapshot) => (
                                <div 
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className="rounded-lg p-3 hover:shadow-xl transition-all bg-gradient-to-r from-purple-600 to-purple-800 order-card-text"
                                  style={{
                                    ...provided.draggableProps.style,
                                    backgroundColor: snapshot.isDragging ? '#c440a0' : undefined,
                                    transform: snapshot.isDragging ? `${provided.draggableProps.style?.transform} scale(1.05)` : provided.draggableProps.style?.transform
                                  }}
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <h3 className="font-bold text-lg text-[#7A0177]">#{order.orderNumber}</h3>
                                      <div className="text-xs text-neutral-500">Table {order.tableNumber}</div>
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
                <div className="bg-gradient-to-r from-gray-600 to-gray-800 text-white font-bold py-2 rounded-t-md text-center flex items-center justify-center w-full">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Billed
                </div>
                <Droppable droppableId="billed">
                  {(provided) => (
                    <div 
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-3 max-h-[70vh] overflow-y-auto p-4 rounded-b-md shadow-lg bg-neutral-900"
                    >
                      {orders
                          .filter(order => order.status === "billed")
                          .map((order, index) => (
                            <Draggable key={order.id.toString()} draggableId={order.id.toString()} index={index}>
                              {(provided, snapshot) => (
                                <div 
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className="rounded-lg p-3 hover:shadow-xl transition-all bg-gradient-to-r from-gray-600 to-gray-800 order-card-text"
                                  style={{
                                    ...provided.draggableProps.style,
                                    backgroundColor: snapshot.isDragging ? '#a4a4a4' : undefined,
                                    transform: snapshot.isDragging ? `${provided.draggableProps.style?.transform} scale(1.05)` : provided.draggableProps.style?.transform
                                  }}
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <h3 className="font-bold text-lg text-[#7A0177]">#{order.orderNumber}</h3>
                                      <div className="text-xs text-neutral-500">Table {order.tableNumber}</div>
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