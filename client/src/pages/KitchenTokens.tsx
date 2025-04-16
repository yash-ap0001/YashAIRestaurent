import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { 
  Search, 
  Clock, 
  Hourglass, 
  CheckCircle, 
  AlertTriangle,
  ArrowRight,
  Utensils,
  Trash,
  Loader2,
  ChefHat,
  Plus,
  ClipboardList,
  Timer
} from "lucide-react";
import { SingleOrderDialog } from "@/components/orders/SingleOrderDialog";
import type { Order, KitchenToken } from "@shared/schema";

// Simplified Kitchen Page that uses Order numbers instead of token numbers
export default function KitchenTokens() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [singleOrderOpen, setSingleOrderOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch orders and kitchen tokens
  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ['/api/orders']
  });

  const { data: kitchenTokens = [], isLoading: tokensLoading } = useQuery<KitchenToken[]>({
    queryKey: ['/api/kitchen-tokens']
  });

  // Update order mutation
  const updateOrderMutation = useMutation({
    mutationFn: async ({id, status}: {id: number, status: string}) => {
      const response = await apiRequest("PATCH", `/api/orders/${id}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/kitchen-tokens'] });
      toast({
        title: "Order updated",
        description: "The order status has been updated successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating order",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Get all active orders (pending and preparing)
  const activeOrders = orders.filter(order => 
    order.status === "pending" || order.status === "preparing"
  ).sort((a, b) => {
    // Sort first by status (pending first, then preparing)
    if (a.status === "pending" && b.status === "preparing") return -1;
    if (a.status === "preparing" && b.status === "pending") return 1;
    
    // Then by creation date (oldest first)
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateA - dateB;
  });

  // Filter orders by search term and status
  const filteredOrders = activeOrders.filter(order => {
    const matchesSearch = 
      (order.orderNumber?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (order.tableNumber?.toLowerCase() || "").includes(searchTerm.toLowerCase());
    
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "pending") return matchesSearch && order.status === "pending";
    if (activeTab === "preparing") return matchesSearch && order.status === "preparing";
    
    return matchesSearch;
  });

  // Get counts for tabs
  const pendingCount = activeOrders.filter(order => order.status === "pending").length;
  const preparingCount = activeOrders.filter(order => order.status === "preparing").length;

  // Update order status
  const handleUpdateStatus = (orderId: number, newStatus: string) => {
    updateOrderMutation.mutate({ id: orderId, status: newStatus });
  };

  // Get display information based on status
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "pending":
        return {
          color: "bg-amber-200 text-amber-800",
          icon: <Clock className="h-4 w-4 mr-1" />,
          label: "Pending",
          nextStatus: "preparing",
          nextAction: "Start Preparing",
          nextColor: "bg-green-600 hover:bg-green-700"
        };
      case "preparing":
        return {
          color: "bg-green-200 text-green-800",
          icon: <Hourglass className="h-4 w-4 mr-1" />,
          label: "Preparing",
          nextStatus: "ready",
          nextAction: "Mark Ready",
          nextColor: "bg-blue-600 hover:bg-blue-700"
        };
      case "ready":
        return {
          color: "bg-blue-200 text-blue-800",
          icon: <CheckCircle className="h-4 w-4 mr-1" />,
          label: "Ready",
          nextStatus: "completed",
          nextAction: "Complete",
          nextColor: "bg-purple-600 hover:bg-purple-700"
        };
      case "delayed":
        return {
          color: "bg-red-200 text-red-800",
          icon: <AlertTriangle className="h-4 w-4 mr-1" />,
          label: "Delayed",
          nextStatus: "preparing",
          nextAction: "Resume Preparing",
          nextColor: "bg-green-600 hover:bg-green-700"
        };
      default:
        return {
          color: "bg-gray-200 text-gray-800",
          icon: <Clock className="h-4 w-4 mr-1" />,
          label: status.charAt(0).toUpperCase() + status.slice(1),
          nextStatus: "pending",
          nextAction: "Reset",
          nextColor: "bg-gray-600 hover:bg-gray-700"
        };
    }
  };

  // Calculate time elapsed for an order
  const getTimeElapsed = (createdAt: string | Date) => {
    if (!createdAt) return "Unknown time";
    return formatDistanceToNow(new Date(createdAt), { addSuffix: true });
  };

  // Loading state
  if (ordersLoading || tokensLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
              Kitchen Queue
            </TabsTrigger>
            <TabsTrigger value="stats" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Timer className="h-4 w-4 mr-2" />
              Queue Stats
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-3">
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => setSingleOrderOpen(true)}
              className="bg-gradient-to-r from-purple-500 to-purple-700 text-white hover:from-purple-600 hover:to-purple-800"
            >
              <Utensils className="h-4 w-4 mr-1" />
              <span>Create Order</span>
            </Button>
            
            {/* Single Order Dialog */}
            <SingleOrderDialog 
              open={singleOrderOpen} 
              onClose={() => setSingleOrderOpen(false)} 
            />

            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by order # or table..."
                className="pl-10 w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <TabsContent value="board" className="space-y-6 mt-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold mr-4">Kitchen Orders</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center text-sm">
                <div className="flex items-center mr-4">
                  <div className="h-3 w-3 rounded-full bg-amber-600 mr-2"></div>
                  <span>Pending: </span>
                  <span className="font-bold ml-1">
                    {pendingCount}
                  </span>
                </div>
                <div className="flex items-center mr-4">
                  <div className="h-3 w-3 rounded-full bg-green-600 mr-2"></div>
                  <span>Preparing: </span>
                  <span className="font-bold ml-1">
                    {preparingCount}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 mb-6">
              <TabsTrigger value="all">
                All ({activeOrders.length})
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pending ({pendingCount})
              </TabsTrigger>
              <TabsTrigger value="preparing">
                Preparing ({preparingCount})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab} className="space-y-4">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No orders found in this queue
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {filteredOrders.map((order) => {
                    const timeElapsed = order.createdAt ? getTimeElapsed(order.createdAt) : "Unknown time";
                    const token = kitchenTokens.find(t => t.orderId === order.id);
                    const isUrgent = token?.isUrgent;
                    
                    // Determine card color based on status
                    let cardBgColor = "";
                    let textColor = "text-white";
                    let actionButton = "";
                    let actionIcon = <></>;
                    let actionLabel = "";
                    let nextStatus = "";
                    
                    switch(order.status) {
                      case "pending":
                        cardBgColor = "bg-gradient-to-r from-amber-500 to-amber-700";
                        actionButton = "bg-white text-orange-800 hover:bg-gray-100";
                        actionIcon = <Utensils className="h-4 w-4 mr-1" />;
                        actionLabel = "Start";
                        nextStatus = "preparing";
                        break;
                      case "preparing":
                        cardBgColor = "bg-gradient-to-r from-green-500 to-green-700";
                        actionButton = "bg-white text-green-800 hover:bg-gray-100";
                        actionIcon = <CheckCircle className="h-4 w-4 mr-1" />;
                        actionLabel = "Ready";
                        nextStatus = "ready";
                        break;
                      case "ready":
                        cardBgColor = "bg-gradient-to-r from-blue-500 to-blue-700";
                        actionButton = "bg-white text-blue-800 hover:bg-gray-100";
                        actionIcon = <CheckCircle className="h-4 w-4 mr-1" />;
                        actionLabel = "Complete";
                        nextStatus = "completed";
                        break;
                      case "completed":
                        cardBgColor = "bg-gradient-to-r from-purple-500 to-purple-700";
                        actionButton = "bg-white text-purple-800 hover:bg-gray-100";
                        actionIcon = <CheckCircle className="h-4 w-4 mr-1" />;
                        actionLabel = "Bill";
                        nextStatus = "billed";
                        break;
                      case "billed":
                        cardBgColor = "bg-gradient-to-r from-gray-600 to-gray-800";
                        actionButton = "bg-white text-gray-800 hover:bg-gray-100";
                        actionIcon = <CheckCircle className="h-4 w-4 mr-1" />;
                        actionLabel = "Complete";
                        nextStatus = "completed";
                        break;
                      default:
                        cardBgColor = "bg-gradient-to-r from-gray-400 to-gray-600";
                        break;
                    }

                    return (
                      <div 
                        key={order.id} 
                        className={`${cardBgColor} rounded-lg overflow-hidden ${isUrgent ? 'ring-2 ring-red-500' : ''}`}
                      >
                        {isUrgent && (
                          <div className="bg-red-500 text-white text-xs font-medium py-1 px-2 text-center">
                            URGENT
                          </div>
                        )}
                        <div className="p-3 space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className={`font-bold text-lg ${textColor}`}>#{order.orderNumber}</h3>
                              <p className={`text-xs ${textColor} opacity-90`}>
                                {order.tableNumber}
                              </p>
                            </div>
                            <div>
                              <p className={`font-bold text-lg ${textColor}`}>
                                ₹{order.totalAmount || "NaN"}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center text-xs mt-1">
                            <span className={`${textColor} opacity-90`}>
                              {timeElapsed}
                            </span>
                          </div>
                          
                          <div className="space-y-1 mt-2">
                            <Button 
                              className={`w-full ${actionButton}`}
                              size="sm"
                              onClick={() => handleUpdateStatus(order.id, nextStatus)}
                            >
                              {actionIcon}
                              {actionLabel}
                            </Button>
                            
                            {order.status !== "delayed" && order.status === "pending" && (
                              <Button 
                                variant="outline" 
                                className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
                                size="sm"
                                onClick={() => handleUpdateStatus(order.id, "delayed")}
                              >
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Delay
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="stats" className="space-y-6 mt-2">
          <Card>
            <CardHeader>
              <CardTitle>Kitchen Queue Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-r from-amber-500 to-amber-700 p-4 rounded-lg text-white">
                  <h3 className="text-xl font-bold">Pending Orders</h3>
                  <p className="text-3xl font-bold mt-2">{pendingCount}</p>
                </div>
                <div className="bg-gradient-to-r from-green-500 to-green-700 p-4 rounded-lg text-white">
                  <h3 className="text-xl font-bold">Preparing Orders</h3>
                  <p className="text-3xl font-bold mt-2">{preparingCount}</p>
                </div>
                <div className="bg-gradient-to-r from-purple-500 to-purple-700 p-4 rounded-lg text-white">
                  <h3 className="text-xl font-bold">Total Orders</h3>
                  <p className="text-3xl font-bold mt-2">{activeOrders.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
