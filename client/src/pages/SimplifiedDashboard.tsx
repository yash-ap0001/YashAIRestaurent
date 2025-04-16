import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { format } from "date-fns";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { OrderForm } from "@/components/orders/OrderForm";

import { 
  Search,
  Plus,
  Clock,
  ChefHat,
  Utensils,
  CircleCheck,
  CircleDot,
  ReceiptText,
  Mail,
  Phone,
  MessageSquare,
  Github,
  Smartphone,
  Loader2,
  Filter,
  Info,
  ClipboardCheck,
} from "lucide-react";

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

export default function SimplifiedDashboard() {
  const { toast } = useToast();
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  
  // Fetch orders
  const { 
    data: orders = [],
    isLoading: isOrdersLoading,
    error: ordersError,
  } = useQuery<Order[], Error>({
    queryKey: ["/api/orders"],
    refetchInterval: 15000, // Refresh every 15 seconds
  });
  
  // Fetch kitchen tokens
  const {
    data: kitchenTokens = [],
    isLoading: isKitchenTokensLoading,
  } = useQuery<KitchenToken[], Error>({
    queryKey: ["/api/kitchen-tokens"],
    refetchInterval: 15000,
  });
  
  // Fetch bills
  const {
    data: bills = [],
    isLoading: isBillsLoading,
  } = useQuery<Bill[], Error>({
    queryKey: ["/api/bills"],
    refetchInterval: 15000,
  });
  
  // Mutation for updating order status
  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/orders/${id}`, { status });
      return await res.json();
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
        title: "Error",
        description: `Failed to update order: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Mutation for creating kitchen token
  const createKitchenTokenMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const res = await apiRequest("POST", "/api/kitchen-tokens", { orderId });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kitchen-tokens"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create kitchen token: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Mutation for creating bill
  const createBillMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const res = await apiRequest("POST", "/api/bills", { orderId });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create bill: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Mutation for creating a new order
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: NewOrderFormData) => {
      const res = await apiRequest("POST", "/api/orders", {
        ...orderData,
        status: "pending",
        orderSource: "manual"
      });
      return await res.json();
    },
    onSuccess: () => {
      setIsCreateOrderOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Order created",
        description: "A new order has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create order: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle drag and drop
  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    
    // If there's no destination or the item was dropped back to its original position
    if (!destination || 
        (destination.droppableId === source.droppableId && 
        destination.index === source.index)) {
      return;
    }
    
    // Find the order that was dragged
    const orderId = parseInt(draggableId);
    const order = orders.find(o => o.id === orderId);
    
    if (!order) return;
    
    // Determine the new status based on the destination droppableId
    let newStatus = "";
    
    switch (destination.droppableId) {
      case "pending":
        newStatus = "pending";
        break;
      case "preparing":
        newStatus = "preparing";
        break;
      case "ready":
        newStatus = "ready";
        break;
      case "completed":
        newStatus = "completed";
        break;
      case "billed":
        newStatus = "billed";
        break;
      default:
        return;
    }
    
    // If status is the same, no need to update
    if (order.status === newStatus) return;
    
    // Process side effects of status change
    const hasToken = kitchenTokens.some((token: KitchenToken) => token.orderId === order.id);
    const hasBill = bills.some((bill: Bill) => bill.orderId === order.id);
    
    // Update order status and trigger any needed side effects
    updateOrderMutation.mutate(
      { id: order.id, status: newStatus },
      {
        onSuccess: () => {
          // Create kitchen token if moving to preparing and no token exists
          if (newStatus === "preparing" && !hasToken) {
            createKitchenTokenMutation.mutate(order.id);
          }
          
          // Create bill if moving to billed and no bill exists
          if (newStatus === "billed" && !hasBill) {
            createBillMutation.mutate(order.id);
          }
        }
      }
    );
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  // Get appropriate icon for order source
  const getSourceIcon = (source: string) => {
    switch (source) {
      case "manual":
        return <CircleDot className="h-3 w-3" />;
      case "phone":
        return <Phone className="h-3 w-3" />;
      case "whatsapp":
        return <MessageSquare className="h-3 w-3" />;
      case "zomato":
      case "swiggy":
        return <Github className="h-3 w-3" />;
      case "ai":
      case "ai_simulator":
        return <Info className="h-3 w-3" />;
      default:
        return <Smartphone className="h-3 w-3" />;
    }
  };
  
  // Function to handle order progression
  const progressOrder = (order: Order) => {
    let newStatus = "";
    
    switch (order.status) {
      case "pending":
        newStatus = "preparing";
        break;
      case "preparing":
        newStatus = "ready";
        break;
      case "ready":
        newStatus = "completed";
        break;
      case "completed":
        newStatus = "billed";
        break;
      default:
        return;
    }
    
    // Check for side effects
    const hasToken = kitchenTokens.some((token: KitchenToken) => token.orderId === order.id);
    const hasBill = bills.some((bill: Bill) => bill.orderId === order.id);
    
    updateOrderMutation.mutate(
      { id: order.id, status: newStatus },
      {
        onSuccess: () => {
          // Create kitchen token if moving to preparing and no token exists
          if (newStatus === "preparing" && !hasToken) {
            createKitchenTokenMutation.mutate(order.id);
          }
          
          // Create bill if moving to billed and no bill exists
          if (newStatus === "billed" && !hasBill) {
            createBillMutation.mutate(order.id);
          }
        }
      }
    );
  };
  
  // Apply search and sorting
  const filteredOrders = orders
    .filter((order: Order) => {
      if (!searchTerm) return true;
      return (
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.tableNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.orderSource.toLowerCase().includes(searchTerm.toLowerCase())
      );
    })
    .sort((a: Order, b: Order) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "amount-high":
          return b.totalAmount - a.totalAmount;
        case "amount-low":
          return a.totalAmount - b.totalAmount;
        default:
          return 0;
      }
    });
  
  if (isOrdersLoading || isKitchenTokensLoading || isBillsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-neutral-600">Loading orders...</p>
      </div>
    );
  }
  
  if (ordersError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <p className="text-red-500">Error loading orders: {ordersError.message}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Simplified Dashboard</h1>
        <Dialog open={isCreateOrderOpen} onOpenChange={setIsCreateOrderOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Order</DialogTitle>
              <DialogDescription>
                Enter order details below to create a new order in the system.
              </DialogDescription>
            </DialogHeader>
            <OrderForm />
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Pending Orders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-bold">
              {orders.filter((order: Order) => ["pending", "preparing"].includes(order.status)).length}
            </div>
            <div className="text-xs text-muted-foreground">
              Orders waiting to be processed
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Ready Orders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-bold">
              {orders.filter((order: Order) => order.status === "ready").length}
            </div>
            <div className="text-xs text-muted-foreground">
              Orders ready to be served
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Today's Revenue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-bold">
              {formatCurrency(
                orders
                  .filter(order => order.status === "billed" && 
                           new Date(order.createdAt).toDateString() === new Date().toDateString())
                  .reduce((sum, order) => sum + order.totalAmount, 0)
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              Total revenue from billed orders today
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Dashboard */}
      <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders by number, table, or source..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Sort by:</span>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort orders" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest first</SelectItem>
                    <SelectItem value="oldest">Oldest first</SelectItem>
                    <SelectItem value="amount-high">Amount (high to low)</SelectItem>
                    <SelectItem value="amount-low">Amount (low to high)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {orders.length === 0 ? (
              <div className="text-center py-10 text-neutral-500">
                No orders found. Create a new order to get started.
              </div>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {/* Pending Orders Column */}
                  <div className="flex flex-col space-y-3">
                    <div className="bg-amber-500 text-white font-medium px-3 py-1 rounded-t-md text-center flex items-center justify-center">
                      <Clock className="h-4 w-4 mr-2" />
                      Pending Orders
                    </div>
                    <Droppable droppableId="pending">
                      {(provided) => (
                        <div 
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className="space-y-2 max-h-[70vh] overflow-y-auto p-3 border-2 border-amber-300 rounded-b-md shadow-md bg-amber-50"
                        >
                          {orders.filter(order => order.status === "pending").length === 0 ? (
                            <div className="text-center p-4 text-neutral-500 text-sm">No pending orders</div>
                          ) : (
                            orders
                              .filter(order => order.status === "pending")
                              .map((order, index) => (
                                <Draggable key={order.id.toString()} draggableId={order.id.toString()} index={index}>
                                  {(provided, snapshot) => (
                                    <div 
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className="border-2 rounded-lg p-3 hover:shadow-md transition-all bg-amber-100 border-amber-400"
                                      style={{
                                        ...provided.draggableProps.style,
                                        backgroundColor: snapshot.isDragging ? '#fcd34d' : '#fef3c7'
                                      }}
                                    >
                                      <div className="flex justify-between items-start mb-2">
                                        <div>
                                          <h3 className="font-medium text-sm">#{order.orderNumber}</h3>
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
                              ))
                          )}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                  
                  {/* Preparing Orders Column */}
                  <div className="flex flex-col space-y-3">
                    <div className="bg-blue-600 text-white font-medium px-3 py-1 rounded-t-md text-center flex items-center justify-center">
                      <ChefHat className="h-4 w-4 mr-2" />
                      Preparing
                    </div>
                    <Droppable droppableId="preparing">
                      {(provided) => (
                        <div 
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className="space-y-2 max-h-[70vh] overflow-y-auto p-3 border-2 border-blue-300 rounded-b-md shadow-md bg-blue-50"
                        >
                          {orders.filter(order => order.status === "preparing").length === 0 ? (
                            <div className="text-center p-4 text-neutral-500 text-sm">No orders in preparation</div>
                          ) : (
                            orders
                              .filter(order => order.status === "preparing")
                              .map((order, index) => (
                                <Draggable key={order.id.toString()} draggableId={order.id.toString()} index={index}>
                                  {(provided, snapshot) => (
                                    <div 
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className="border-2 rounded-lg p-3 hover:shadow-md transition-all bg-blue-100 border-blue-400"
                                      style={{
                                        ...provided.draggableProps.style,
                                        backgroundColor: snapshot.isDragging ? '#bfdbfe' : '#dbeafe'
                                      }}
                                    >
                                      <div className="flex justify-between items-start mb-2">
                                        <div>
                                          <h3 className="font-medium text-sm">#{order.orderNumber}</h3>
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
                              ))
                          )}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                  
                  {/* Ready Orders Column */}
                  <div className="flex flex-col space-y-3">
                    <div className="bg-emerald-500 text-white font-medium px-3 py-1 rounded-t-md text-center flex items-center justify-center">
                      <Utensils className="h-4 w-4 mr-2" />
                      Ready to Serve
                    </div>
                    <Droppable droppableId="ready">
                      {(provided) => (
                        <div 
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className="space-y-2 max-h-[70vh] overflow-y-auto p-3 border-2 border-emerald-300 rounded-b-md shadow-md bg-emerald-50"
                        >
                          {orders.filter(order => order.status === "ready").length === 0 ? (
                            <div className="text-center p-4 text-neutral-500 text-sm">No ready orders</div>
                          ) : (
                            orders
                              .filter(order => order.status === "ready")
                              .map((order, index) => (
                                <Draggable key={order.id.toString()} draggableId={order.id.toString()} index={index}>
                                  {(provided, snapshot) => (
                                    <div 
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className="border-2 rounded-lg p-3 hover:shadow-md transition-all bg-emerald-100 border-emerald-400"
                                      style={{
                                        ...provided.draggableProps.style,
                                        backgroundColor: snapshot.isDragging ? '#a7f3d0' : '#d1fae5'
                                      }}
                                    >
                                      <div className="flex justify-between items-start mb-2">
                                        <div>
                                          <h3 className="font-medium text-sm">#{order.orderNumber}</h3>
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
                              ))
                          )}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                  
                  {/* Completed Orders Column */}
                  <div className="flex flex-col space-y-3">
                    <div className="bg-indigo-500 text-white font-medium px-3 py-1 rounded-t-md text-center flex items-center justify-center">
                      <CircleCheck className="h-4 w-4 mr-2" />
                      Completed
                    </div>
                    <Droppable droppableId="completed">
                      {(provided) => (
                        <div 
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className="space-y-2 max-h-[70vh] overflow-y-auto p-3 border-2 border-indigo-300 rounded-b-md shadow-md bg-indigo-50"
                        >
                          {orders.filter(order => order.status === "completed").length === 0 ? (
                            <div className="text-center p-4 text-neutral-500 text-sm">No completed orders</div>
                          ) : (
                            orders
                              .filter(order => order.status === "completed")
                              .map((order, index) => (
                                <Draggable key={order.id.toString()} draggableId={order.id.toString()} index={index}>
                                  {(provided, snapshot) => (
                                    <div 
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className="border-2 rounded-lg p-3 hover:shadow-md transition-all bg-indigo-100 border-indigo-400"
                                      style={{
                                        ...provided.draggableProps.style,
                                        backgroundColor: snapshot.isDragging ? '#c7d2fe' : '#e0e7ff'
                                      }}
                                    >
                                      <div className="flex justify-between items-start mb-2">
                                        <div>
                                          <h3 className="font-medium text-sm">#{order.orderNumber}</h3>
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
                              ))
                          )}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                  
                  {/* Billed Orders Column */}
                  <div className="flex flex-col space-y-3">
                    <div className="bg-slate-500 text-white font-medium px-3 py-1 rounded-t-md text-center flex items-center justify-center">
                      <ReceiptText className="h-4 w-4 mr-2" />
                      Billed
                    </div>
                    <Droppable droppableId="billed">
                      {(provided) => (
                        <div 
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className="space-y-2 max-h-[70vh] overflow-y-auto p-3 border-2 border-slate-300 rounded-b-md shadow-md bg-slate-50"
                        >
                          {orders.filter(order => order.status === "billed").length === 0 ? (
                            <div className="text-center p-4 text-neutral-500 text-sm">No billed orders</div>
                          ) : (
                            orders
                              .filter(order => order.status === "billed")
                              .map((order, index) => (
                                <Draggable key={order.id.toString()} draggableId={order.id.toString()} index={index}>
                                  {(provided, snapshot) => (
                                    <div 
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className="border-2 rounded-lg p-3 hover:shadow-md transition-all bg-slate-100 border-slate-400"
                                      style={{
                                        ...provided.draggableProps.style,
                                        backgroundColor: snapshot.isDragging ? '#cbd5e1' : '#f1f5f9'
                                      }}
                                    >
                                      <div className="flex justify-between items-start mb-2">
                                        <div>
                                          <h3 className="font-medium text-sm">#{order.orderNumber}</h3>
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
                                        
                                        <Badge variant="secondary" className="text-xs">
                                          <span className="flex items-center">
                                            <ReceiptText className="h-3 w-3 mr-1" />
                                            <span className="ml-1">Paid</span>
                                          </span>
                                        </Badge>
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              ))
                          )}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                </div>
              </DragDropContext>
            )}
          </CardContent>
      </Card>
    </div>
  );
}