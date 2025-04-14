import { LiveOrderTracker } from "@/components/orders/LiveOrderTracker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QRCodeSVG } from "qrcode.react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Share2, Printer, Copy, PlusCircle, ChefHat, CheckCircle, DollarSign, RotateCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

export default function LiveTracking() {
  const { toast } = useToast();
  const [isSimulating, setIsSimulating] = useState(false);
  
  // Get all orders for ShareTrackingView
  const { data: orders = [] } = useQuery({ 
    queryKey: ['/api/orders'],
    refetchInterval: 5000
  });
  
  // Get menu items for simulator
  const { data: menuItems = [] } = useQuery({
    queryKey: ['/api/menu-items'],
  });
  
  // Get public URL base
  const baseUrl = window.location.origin;
  
  // Create a simulated order to test tracking
  const createSimulatedOrder = async () => {
    if (isSimulating) return;
    
    setIsSimulating(true);
    
    try {
      // Random order details
      const randomItems = getRandomMenuItems(menuItems, Math.floor(Math.random() * 3) + 1);
      
      const orderData = {
        tableNumber: `T${Math.floor(Math.random() * 20) + 1}`,
        items: randomItems.map(item => ({
          menuItemId: item.id,
          quantity: Math.floor(Math.random() * 2) + 1,
          price: item.price,
          notes: ''
        })),
        orderSource: "simulator",
        useAIAutomation: true
      };
      
      // Create order
      await apiRequest('/api/simulator/create-order', {
        method: 'POST',
        body: JSON.stringify(orderData)
      });
      
      toast({
        title: "Order Created",
        description: "A simulated order has been created. Watch it progress automatically!",
        duration: 3000,
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to create order",
        description: "There was an error creating the simulated order.",
        duration: 3000,
      });
    } finally {
      setIsSimulating(false);
    }
  };
  
  // Helper to get random menu items
  const getRandomMenuItems = (items: any[], count: number) => {
    const shuffled = [...items].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  };
  
  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Live Order Tracking</h1>
          <p className="text-neutral-400">
            Monitor all orders in real-time and share tracking links with customers
          </p>
        </div>
        <Button onClick={createSimulatedOrder} disabled={isSimulating} className="gap-2">
          {isSimulating ? (
            <>
              <RotateCw className="h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <PlusCircle className="h-4 w-4" />
              Create Test Order
            </>
          )}
        </Button>
      </div>
      
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="dashboard">Staff Dashboard</TabsTrigger>
          <TabsTrigger value="share">Share With Customers</TabsTrigger>
          <TabsTrigger value="simulator">Simulator Controls</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard">
          <div className="grid gap-6">
            <LiveOrderTracker />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard title="Active Orders" value={orders.filter((o: any) => ["pending", "preparing", "ready"].includes(o.status)).length} description="Orders currently being processed" />
              <StatCard title="Avg. Preparation Time" value="12 min" description="Average time from order to ready" />
              <StatCard title="Orders Today" value={orders.length} description="Total orders processed today" />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="share">
          <div className="grid gap-6">
            <ShareTrackingView orders={orders} baseUrl={baseUrl} />
          </div>
        </TabsContent>
        
        <TabsContent value="simulator">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Status Simulator</CardTitle>
                <CardDescription>
                  Test the order tracking system by simulating order status changes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-neutral-400">
                    Select any active order from below to manually progress its status through the system:
                  </p>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {orders.length === 0 ? (
                      <div className="text-center py-8 border-2 border-dashed rounded-lg">
                        <p className="text-neutral-400">No orders available</p>
                        <p className="text-sm text-neutral-500 mt-1">Create a test order to begin</p>
                      </div>
                    ) : (
                      orders.map((order: any) => (
                        <Card key={order.id} className="overflow-hidden">
                          <div className="p-4 border-b">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-semibold">Order #{order.orderNumber}</p>
                                <p className="text-sm text-neutral-400">
                                  {order.tableNumber ? `Table ${order.tableNumber}` : 'Takeaway'} • 
                                  Status: <span className="font-medium">{order.status}</span>
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">₹{order.totalAmount !== undefined ? order.totalAmount.toFixed(2) : '0.00'}</p>
                              </div>
                            </div>
                          </div>
                          
                          <CardFooter className="flex justify-between p-4 gap-2">
                            <StatusButton 
                              order={order}
                              targetStatus="preparing"
                              currentStatus="pending"
                              icon={<ChefHat className="h-4 w-4 mr-2" />}
                              label="Start Preparing"
                            />
                            <StatusButton 
                              order={order}
                              targetStatus="ready"
                              currentStatus="preparing"
                              icon={<CheckCircle className="h-4 w-4 mr-2" />}
                              label="Mark Ready"
                            />
                            <StatusButton 
                              order={order}
                              targetStatus="completed"
                              currentStatus="ready"
                              icon={<CheckCircle className="h-4 w-4 mr-2" />}
                              label="Complete Order"
                            />
                            <StatusButton 
                              order={order}
                              targetStatus="billed"
                              currentStatus="completed"
                              icon={<DollarSign className="h-4 w-4 mr-2" />}
                              label="Generate Bill"
                            />
                          </CardFooter>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Status button component
function StatusButton({ 
  order, 
  targetStatus, 
  currentStatus, 
  icon, 
  label 
}: { 
  order: any, 
  targetStatus: string, 
  currentStatus: string, 
  icon: React.ReactNode, 
  label: string 
}) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const updateStatus = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      await apiRequest(`/api/orders/${order.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: targetStatus })
      });
      
      toast({
        title: "Status Updated",
        description: `Order #${order.orderNumber} is now ${targetStatus}`,
        duration: 3000,
      });
      
      // Refresh order data
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to update status",
        description: "There was an error updating the order status.",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const isCurrentStatus = order.status === currentStatus;
  const isPastCurrentStatus = ["pending", "preparing", "ready", "completed", "billed"].indexOf(order.status) > 
                              ["pending", "preparing", "ready", "completed", "billed"].indexOf(currentStatus);
  
  return (
    <Button
      size="sm"
      variant={isCurrentStatus ? "default" : "outline"}
      onClick={updateStatus}
      disabled={!isCurrentStatus || isLoading || isPastCurrentStatus}
      className="flex-1"
    >
      {isLoading ? <RotateCw className="h-4 w-4 animate-spin mr-2" /> : icon}
      {label}
    </Button>
  );
}

// Stat card component for dashboard metrics
function StatCard({ title, value, description }: { title: string, value: string | number, description: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

// Share tracking view component
function ShareTrackingView({ orders, baseUrl }: { orders: any[], baseUrl: string }) {
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const { toast } = useToast();
  
  // Filter active orders
  const activeOrders = orders.filter((o: any) => 
    ["pending", "preparing", "ready"].includes(o.status)
  );
  
  // Generate tracking URL
  const trackingUrl = selectedOrder 
    ? `${baseUrl}/track-order/${selectedOrder.orderNumber}`
    : "";
  
  // Copy tracking link to clipboard
  const copyTrackingLink = () => {
    if (!trackingUrl) return;
    
    navigator.clipboard.writeText(trackingUrl)
      .then(() => {
        toast({
          title: "Link Copied",
          description: "Tracking link has been copied to clipboard",
        });
      })
      .catch((err) => {
        toast({
          variant: "destructive",
          title: "Failed to Copy",
          description: "Could not copy the tracking link",
        });
      });
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle>Select Order to Share</CardTitle>
          <CardDescription>
            Choose an active order to generate a shareable tracking link
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No active orders available</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeOrders.map((order: any) => (
                <div 
                  key={order.id}
                  className={`p-3 rounded-md cursor-pointer border transition-colors ${
                    selectedOrder?.id === order.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-accent"
                  }`}
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">Order #{order.orderNumber}</h3>
                      <p className="text-sm text-muted-foreground">
                        Status: {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        {order.tableNumber && ` • Table ${order.tableNumber}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">₹{order.totalAmount !== undefined ? order.totalAmount.toFixed(2) : '0.00'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle>Order Tracking Link</CardTitle>
          <CardDescription>
            Share this QR code or link with customers to track their order
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedOrder ? (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-md">
              <p>Select an order to generate tracking link</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-lg">
                  <QRCodeSVG 
                    value={trackingUrl} 
                    size={200}
                    level="H"
                    includeMargin={true}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Tracking URL:</p>
                <div className="flex items-center gap-2">
                  <div className="bg-muted p-2 rounded-md text-sm flex-1 truncate">
                    {trackingUrl}
                  </div>
                  <Button size="icon" variant="outline" onClick={copyTrackingLink}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="flex justify-between gap-2 pt-2">
                <Button variant="outline" className="w-1/2">
                  <Printer className="h-4 w-4 mr-2" />
                  Print QR
                </Button>
                <Button className="w-1/2">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}