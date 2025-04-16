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

import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
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
  ReceiptText,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";

// Order status colors
const statusColors = {
  pending: "bg-amber-500",
  preparing: "bg-blue-600",
  ready: "bg-emerald-500",
  completed: "bg-indigo-500",
  delivered: "bg-violet-500",
  billed: "bg-slate-500",
};

// Order status card background colors
const statusCardColors = {
  pending: "bg-amber-100 border-amber-400 hover:bg-amber-200",
  preparing: "bg-blue-100 border-blue-400 hover:bg-blue-200",
  ready: "bg-emerald-100 border-emerald-400 hover:bg-emerald-200",
  completed: "bg-indigo-100 border-indigo-400 hover:bg-indigo-200",
  delivered: "bg-violet-100 border-violet-400 hover:bg-violet-200",
  billed: "bg-slate-100 border-slate-400 hover:bg-slate-200",
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
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [isCreateOrderDialogOpen, setIsCreateOrderDialogOpen] = useState(false);
  const ordersPerPage = 20; // Number of orders to display per page - increased to fit more orders on screen

  // Fetch orders
  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  // Fetch menu items for the order creation
  const { data: menuItems = [], isLoading: menuItemsLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"],
  });

  // Fetch kitchen tokens
  const { data: kitchenTokens = [], isLoading: tokensLoading } = useQuery<KitchenToken[]>({
    queryKey: ["/api/kitchen-tokens"],
  });

  // Fetch bills
  const { data: bills = [], isLoading: billsLoading } = useQuery<Bill[]>({
    queryKey: ["/api/bills"],
  });
  
  // New order form state
  const [newOrder, setNewOrder] = useState<NewOrderFormData>({
    tableNumber: "",
    orderItems: [{ menuItemId: 0, quantity: 1 }]
  });
  
  // Create new order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: NewOrderFormData) => {
      const res = await apiRequest("POST", "/api/orders", {
        ...orderData,
        orderSource: "manual"
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Order Created",
        description: "New order has been created successfully",
      });
      setIsCreateOrderDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Order Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
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

  // Handle adding a new menu item to the order
  const addMenuItem = () => {
    setNewOrder({
      ...newOrder,
      orderItems: [
        ...newOrder.orderItems,
        { menuItemId: 0, quantity: 1 }
      ]
    });
  };

  // Handle removing a menu item from the order
  const removeMenuItem = (index: number) => {
    const newItems = [...newOrder.orderItems];
    newItems.splice(index, 1);
    setNewOrder({
      ...newOrder,
      orderItems: newItems
    });
  };

  // Handle updating a menu item in the order
  const updateOrderItem = (index: number, field: string, value: any) => {
    const newItems = [...newOrder.orderItems];
    newItems[index] = {
      ...newItems[index],
      [field]: field === 'menuItemId' ? Number(value) : value
    };
    
    // If the menu item was changed, update the price
    if (field === 'menuItemId') {
      const menuItem = menuItems.find(item => item.id === Number(value));
      if (menuItem) {
        newItems[index].price = menuItem.price;
      }
    }
    
    setNewOrder({
      ...newOrder,
      orderItems: newItems
    });
  };

  // Handle form submission for new order
  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Remove any items with menuItemId === 0
    const validItems = newOrder.orderItems.filter(item => item.menuItemId !== 0);
    
    if (validItems.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one menu item",
        variant: "destructive"
      });
      return;
    }
    
    if (!newOrder.tableNumber) {
      toast({
        title: "Validation Error",
        description: "Please enter a table number",
        variant: "destructive"
      });
      return;
    }
    
    createOrderMutation.mutate({
      tableNumber: newOrder.tableNumber,
      orderItems: validItems
    });
  };

  // Filter and sort orders
  const filteredOrders = orders
    .filter((order: Order) => {
      // Filter by status
      if (statusFilter !== "all" && order.status !== statusFilter) {
        return false;
      }
      
      // Filter by search query
      if (searchQuery && !order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !order.tableNumber.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      return true;
    })
    .sort((a: Order, b: Order) => {
      // Sort by selected option
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
    
  // Paginate orders
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
  const startIndex = (currentPage - 1) * ordersPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + ordersPerPage);
  
  // Calculate total amount for each status
  const pendingAmount = orders
    .filter(order => ["pending", "preparing"].includes(order.status))
    .reduce((sum, order) => sum + order.totalAmount, 0);
    
  const readyAmount = orders
    .filter(order => order.status === "ready")
    .reduce((sum, order) => sum + order.totalAmount, 0);
    
  const billedAmount = orders
    .filter(order => order.status === "billed")
    .reduce((sum, order) => sum + order.totalAmount, 0);

  // Loading state
  if (ordersLoading || tokensLoading || billsLoading || menuItemsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Simple Dashboard</h1>
          <p className="text-neutral-500">
            Manage all your orders in one place.
          </p>
        </div>
        
        <Dialog open={isCreateOrderDialogOpen} onOpenChange={setIsCreateOrderDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Order</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleCreateOrder} className="space-y-6 mt-4">
              <div>
                <Label htmlFor="tableNumber">Table Number</Label>
                <Input 
                  id="tableNumber"
                  value={newOrder.tableNumber}
                  onChange={(e) => setNewOrder({...newOrder, tableNumber: e.target.value})}
                  placeholder="Enter table number"
                  className="mt-1"
                />
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Menu Items</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={addMenuItem}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
                
                {newOrder.orderItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-7">
                      <Label htmlFor={`item-${index}`}>Item</Label>
                      <Select 
                        value={item.menuItemId.toString()} 
                        onValueChange={(value) => updateOrderItem(index, "menuItemId", value)}
                      >
                        <SelectTrigger id={`item-${index}`}>
                          <SelectValue placeholder="Select an item" />
                        </SelectTrigger>
                        <SelectContent>
                          {menuItems.filter(item => item.isAvailable).map((menuItem) => (
                            <SelectItem key={menuItem.id} value={menuItem.id.toString()}>
                              {menuItem.name} - {formatCurrency(menuItem.price)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <Label htmlFor={`quantity-${index}`}>Quantity</Label>
                      <Input 
                        id={`quantity-${index}`}
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateOrderItem(index, "quantity", parseInt(e.target.value))}
                      />
                    </div>
                    <div className="col-span-2">
                      <Button 
                        type="button"
                        variant="outline"
                        onClick={() => removeMenuItem(index)}
                        className="w-full"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={createOrderMutation.isPending || newOrder.orderItems.length === 0}
                >
                  {createOrderMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</>
                  ) : (
                    <>Create Order</>
                  )}
                </Button>
              </DialogFooter>
            </form>
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
            <div className="text-sm text-neutral-500">
              Value: {formatCurrency(pendingAmount)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Ready to Serve</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-bold">
              {orders.filter((order: Order) => order.status === "ready").length}
            </div>
            <div className="text-sm text-neutral-500">
              Value: {formatCurrency(readyAmount)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Total Sales Today</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-bold">
              {formatCurrency(billedAmount)}
            </div>
            <div className="text-sm text-neutral-500">
              Orders: {orders.filter(order => order.status === "billed").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Management */}
      <Card className="overflow-hidden">
          <CardHeader className="pb-0">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <CardTitle>All Orders</CardTitle>
              
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-neutral-500" />
                  <Input
                    placeholder="Search orders..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Sort by" />
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
              <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {/* Pending Orders Column */}
                <div className="flex flex-col space-y-3">
                  <div className="bg-amber-500 text-white font-medium px-3 py-1 rounded-t-md text-center flex items-center justify-center">
                    <Clock className="h-4 w-4 mr-2" />
                    Pending Orders
                  </div>
                  <div className="space-y-2 max-h-[70vh] overflow-y-auto p-3 border-2 border-amber-300 rounded-b-md shadow-md bg-amber-50">
                    {orders.filter(order => order.status === "pending").length === 0 ? (
                      <div className="text-center p-4 text-neutral-500 text-sm">No pending orders</div>
                    ) : (
                      orders
                        .filter(order => order.status === "pending")
                        .map((order) => (
                          <div 
                            key={order.id} 
                            className="border-2 rounded-lg p-3 hover:shadow-md transition-all bg-amber-100 border-amber-400"
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
                        ))
                    )}
                  </div>
                </div>
                
                {/* Preparing Orders Column */}
                <div className="flex flex-col space-y-3">
                  <div className="bg-blue-600 text-white font-medium px-3 py-1 rounded-t-md text-center flex items-center justify-center">
                    <ChefHat className="h-4 w-4 mr-2" />
                    Preparing
                  </div>
                  <div className="space-y-2 max-h-[70vh] overflow-y-auto p-3 border-2 border-blue-300 rounded-b-md shadow-md bg-blue-50">
                    {orders.filter(order => order.status === "preparing").length === 0 ? (
                      <div className="text-center p-4 text-neutral-500 text-sm">No orders in preparation</div>
                    ) : (
                      orders
                        .filter(order => order.status === "preparing")
                        .map((order) => (
                          <div 
                            key={order.id} 
                            className="border-2 rounded-lg p-3 hover:shadow-md transition-all bg-blue-100 border-blue-400"
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
                        ))
                    )}
                  </div>
                </div>
                
                {/* Ready Orders Column */}
                <div className="flex flex-col space-y-3">
                  <div className="bg-emerald-500 text-white font-medium px-3 py-1 rounded-t-md text-center flex items-center justify-center">
                    <HandPlatter className="h-4 w-4 mr-2" />
                    Ready to Serve
                  </div>
                  <div className="space-y-2 max-h-[70vh] overflow-y-auto p-3 border-2 border-emerald-300 rounded-b-md shadow-md bg-emerald-50">
                    {orders.filter(order => order.status === "ready").length === 0 ? (
                      <div className="text-center p-4 text-neutral-500 text-sm">No ready orders</div>
                    ) : (
                      orders
                        .filter(order => order.status === "ready")
                        .map((order) => (
                          <div 
                            key={order.id} 
                            className="border-2 rounded-lg p-3 hover:shadow-md transition-all bg-emerald-100 border-emerald-400"
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
                        ))
                    )}
                  </div>
                </div>
                
                {/* Completed Orders Column */}
                <div className="flex flex-col space-y-3">
                  <div className="bg-indigo-500 text-white font-medium px-3 py-1 rounded-t-md text-center flex items-center justify-center">
                    <CircleCheck className="h-4 w-4 mr-2" />
                    Completed
                  </div>
                  <div className="space-y-2 max-h-[70vh] overflow-y-auto p-3 border-2 border-indigo-300 rounded-b-md shadow-md bg-indigo-50">
                    {orders.filter(order => order.status === "completed").length === 0 ? (
                      <div className="text-center p-4 text-neutral-500 text-sm">No completed orders</div>
                    ) : (
                      orders
                        .filter(order => order.status === "completed")
                        .map((order) => (
                          <div 
                            key={order.id} 
                            className="border-2 rounded-lg p-3 hover:shadow-md transition-all bg-indigo-100 border-indigo-400"
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
                        ))
                    )}
                  </div>
                </div>
                
                {/* Billed Orders Column */}
                <div className="flex flex-col space-y-3">
                  <div className="bg-slate-500 text-white font-medium px-3 py-1 rounded-t-md text-center">
                    Billed
                  </div>
                  <div className="space-y-2 max-h-[70vh] overflow-y-auto p-2 border-2 border-slate-300 rounded-b-md">
                    {orders.filter(order => order.status === "billed").length === 0 ? (
                      <div className="text-center p-4 text-neutral-500 text-sm">No billed orders</div>
                    ) : (
                      orders
                        .filter(order => order.status === "billed")
                        .map((order) => (
                          <div 
                            key={order.id} 
                            className="border-2 rounded-lg p-3 hover:shadow-md transition-all bg-slate-100 border-slate-400"
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
                                variant="outline"
                                size="sm"
                                disabled={true}
                                className="h-7 px-2"
                              >
                                <CircleCheck className="h-3 w-3 mr-1" />
                                <span className="text-xs">Done</span>
                              </Button>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Pagination - removed since we're now displaying all orders by status */}
          </CardContent>
      </Card>
    </div>
  );
}