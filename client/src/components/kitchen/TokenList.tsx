import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KitchenToken, Order } from "@shared/schema";
import { 
  AlertTriangle, CheckCircle, Clock, Hourglass 
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface KitchenTokenWithOrder extends KitchenToken {
  order?: Order;
  timeElapsed?: string;
}

export function TokenList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [mergedTokens, setMergedTokens] = useState<KitchenTokenWithOrder[]>([]);

  const { data: tokens, isLoading: tokensLoading } = useQuery<KitchenToken[]>({
    queryKey: ['/api/kitchen-tokens'],
  });

  const { data: orders, isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });

  // Merge tokens with their corresponding orders
  useEffect(() => {
    if (!tokens || !orders) return;

    const merged = tokens.map(token => {
      const order = orders.find(o => o.id === token.orderId);
      const timeElapsed = token.startTime ? formatDistanceToNow(new Date(token.startTime)) : '';
      
      return {
        ...token,
        order,
        timeElapsed
      };
    });

    setMergedTokens(merged);
  }, [tokens, orders]);

  const updateTokenMutation = useMutation({
    mutationFn: async ({id, status}: {id: number, status: string}) => {
      const response = await apiRequest("PATCH", `/api/kitchen-tokens/${id}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/kitchen-tokens'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "Token updated",
        description: "The token status has been updated"
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating token",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleUpdateStatus = (id: number, status: string) => {
    updateTokenMutation.mutate({ id, status });
  };

  const getFilteredTokens = () => {
    if (!mergedTokens.length) return [];
    
    switch (activeTab) {
      case "pending":
        return mergedTokens.filter(token => token.status === "pending");
      case "preparing":
        return mergedTokens.filter(token => token.status === "preparing");
      case "ready":
        return mergedTokens.filter(token => token.status === "ready");
      case "urgent":
        return mergedTokens.filter(token => token.isUrgent);
      default:
        return mergedTokens;
    }
  };

  const getTokenStatusDetails = (token: KitchenToken) => {
    switch (token.status) {
      case "pending":
        return {
          color: "bg-neutral-100 text-neutral-800",
          icon: <Clock className="h-4 w-4 mr-1" />,
          label: "Pending"
        };
      case "preparing":
        return {
          color: "bg-warning-100 text-warning-800",
          icon: <Hourglass className="h-4 w-4 mr-1" />,
          label: "Preparing"
        };
      case "delayed":
        return {
          color: "bg-error-100 text-error-800",
          icon: <AlertTriangle className="h-4 w-4 mr-1" />,
          label: "Delayed"
        };
      case "ready":
        return {
          color: "bg-secondary-100 text-secondary-800",
          icon: <CheckCircle className="h-4 w-4 mr-1" />,
          label: "Ready"
        };
      default:
        return {
          color: "bg-neutral-100 text-neutral-800",
          icon: <Clock className="h-4 w-4 mr-1" />,
          label: token.status.charAt(0).toUpperCase() + token.status.slice(1)
        };
    }
  };

  if (tokensLoading || ordersLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Kitchen Tokens</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Loading tokens...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredTokens = getFilteredTokens();
  const pendingCount = mergedTokens.filter(t => t.status === "pending").length;
  const preparingCount = mergedTokens.filter(t => t.status === "preparing").length;
  const readyCount = mergedTokens.filter(t => t.status === "ready").length;
  const urgentCount = mergedTokens.filter(t => t.isUrgent).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Kitchen Tokens</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-5 mb-4">
              <TabsTrigger value="all">
                All ({mergedTokens.length})
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pending ({pendingCount})
              </TabsTrigger>
              <TabsTrigger value="preparing">
                Preparing ({preparingCount})
              </TabsTrigger>
              <TabsTrigger value="ready">
                Ready ({readyCount})
              </TabsTrigger>
              <TabsTrigger value="urgent">
                Urgent ({urgentCount})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab} className="space-y-4">
              {filteredTokens.length === 0 ? (
                <div className="text-center py-8 text-neutral-500">
                  No tokens found
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTokens.map((token) => {
                    const statusDetails = getTokenStatusDetails(token);
                    
                    return (
                      <Card 
                        key={token.id} 
                        className={token.isUrgent ? "border-error-300" : ""}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="font-semibold text-lg flex items-center">
                              #{token.tokenNumber}
                              {token.isUrgent && (
                                <Badge variant="destructive" className="ml-2">Urgent</Badge>
                              )}
                            </h3>
                            <Badge className={statusDetails.color}>
                              <span className="flex items-center">
                                {statusDetails.icon}
                                {statusDetails.label}
                              </span>
                            </Badge>
                          </div>
                          
                          <div className="space-y-2 text-sm text-neutral-600 mb-4">
                            <p>
                              <span className="font-medium text-neutral-700">Table:</span> {token.order?.tableNumber || "Unknown"}
                            </p>
                            <p>
                              <span className="font-medium text-neutral-700">Order:</span> #{token.order?.orderNumber || token.orderId}
                            </p>
                            <p>
                              <span className="font-medium text-neutral-700">Time:</span> {token.timeElapsed || "Just now"}
                            </p>
                            {token.order?.notes && (
                              <p>
                                <span className="font-medium text-neutral-700">Notes:</span> {token.order.notes}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex gap-2 justify-end">
                            {token.status === "pending" && (
                              <Button 
                                size="sm" 
                                onClick={() => handleUpdateStatus(token.id, "preparing")}
                                className="bg-warning-500 hover:bg-warning-600 text-white"
                              >
                                Start Preparing
                              </Button>
                            )}
                            
                            {token.status === "preparing" && (
                              <Button 
                                size="sm" 
                                onClick={() => handleUpdateStatus(token.id, "ready")}
                                className="bg-secondary-500 hover:bg-secondary-600 text-white"
                              >
                                Mark Ready
                              </Button>
                            )}
                            
                            {token.status === "ready" && (
                              <Button 
                                size="sm" 
                                onClick={() => handleUpdateStatus(token.id, "served")}
                                className="bg-primary-500 hover:bg-primary-600"
                              >
                                Serve Order
                              </Button>
                            )}
                            
                            {token.status !== "delayed" && token.status !== "ready" && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleUpdateStatus(token.id, "delayed")}
                                className="text-error-500 border-error-500 hover:bg-error-50"
                              >
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
