import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
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
  Loader2
} from "lucide-react";
import type { Order, KitchenToken } from "@shared/schema";

// Simplified Kitchen Page that uses Order numbers instead of token numbers
export default function KitchenTokens() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
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
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  // Filter orders by search term and status
  const filteredOrders = activeOrders.filter(order => {
    const matchesSearch = 
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.tableNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
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
  const getTimeElapsed = (createdAt: string) => {
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kitchen Queue</h1>
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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Kitchen Queue</CardTitle>
        </CardHeader>
        <CardContent>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredOrders.map((order) => {
                    const statusDisplay = getStatusDisplay(order.status);
                    const timeElapsed = getTimeElapsed(order.createdAt);
                    const token = kitchenTokens.find(t => t.orderId === order.id);
                    const isUrgent = token?.isUrgent;

                    return (
                      <Card 
                        key={order.id} 
                        className={`${isUrgent ? 'border-red-400' : ''} overflow-hidden`}
                      >
                        {isUrgent && (
                          <div className="bg-red-500 text-white text-xs font-medium py-1 px-3 text-center">
                            URGENT ORDER
                          </div>
                        )}
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-bold text-lg">#{order.orderNumber}</h3>
                              <p className="text-sm text-muted-foreground">Table: {order.tableNumber}</p>
                            </div>
                            <Badge className={statusDisplay.color}>
                              <span className="flex items-center">
                                {statusDisplay.icon}
                                {statusDisplay.label}
                              </span>
                            </Badge>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm mb-4">
                            <span className="text-muted-foreground flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {timeElapsed}
                            </span>
                            <span className="font-medium">
                              ₹{order.totalAmount}
                            </span>
                          </div>
                          
                          <div className="space-y-2 mt-4">
                            <Button 
                              className={`w-full ${statusDisplay.nextColor} text-white`}
                              size="sm"
                              onClick={() => handleUpdateStatus(order.id, statusDisplay.nextStatus)}
                            >
                              <Utensils className="h-4 w-4 mr-2" />
                              {statusDisplay.nextAction}
                            </Button>
                            
                            {order.status !== "delayed" && (
                              <Button 
                                variant="outline" 
                                className="w-full border-red-300 text-red-600 hover:bg-red-50"
                                size="sm"
                                onClick={() => handleUpdateStatus(order.id, "delayed")}
                              >
                                <AlertTriangle className="h-4 w-4 mr-2" />
                                Mark Delayed
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
