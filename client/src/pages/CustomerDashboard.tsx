import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  PlusCircle, 
  ShoppingBag, 
  Apple, 
  Calendar, 
  HeartPulse,
  ClipboardList,
  MapPin,
  Clock,
  Receipt,
  AlertCircle,
  BarChart4,
  CalendarClock,
  LucideIcon,
  BookOpen
} from "lucide-react";

// Feature card component for dashboard
interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  color: string;
}

function FeatureCard({ title, description, icon: Icon, onClick, color }: FeatureCardProps) {
  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow" 
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-full ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription>{description}</CardDescription>
      </CardContent>
    </Card>
  );
}

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("my-orders");
  const [healthTip, setHealthTip] = useState("");
  
  // Fetch customer orders
  const { 
    data: orders,
    isLoading: isLoadingOrders,
  } = useQuery({
    queryKey: ["/api/orders"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/orders");
      const allOrders = await res.json();
      return allOrders.filter((order: any) => order.customerId === user?.id || !order.customerId);
    },
    enabled: !!user,
  });

  // Fetch active order if there is one (for live tracking)
  const activeOrder = orders?.find((o: any) => 
    o.status !== "billed" && o.status !== "delivered" && o.status !== "cancelled"
  );

  // Fetch menu items
  const {
    data: menuItems,
    isLoading: isLoadingMenuItems,
  } = useQuery({
    queryKey: ["/api/menu-items"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/menu-items");
      return res.json();
    },
  });

  // Fetch diet plans
  const {
    data: dietPlans,
    isLoading: isLoadingDietPlans,
  } = useQuery({
    queryKey: ["/api/scheduled-orders"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/scheduled-orders?customerId=${user?.id}`);
      return res.json();
    },
    enabled: !!user,
  });
  
  // Fetch bills
  const {
    data: bills,
    isLoading: isLoadingBills,
  } = useQuery({
    queryKey: ["/api/bills"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/bills");
      const allBills = await res.json();
      
      // Filter bills for orders belonging to this customer
      if (orders) {
        const customerOrderIds = orders.map((order: any) => order.id);
        return allBills.filter((bill: any) => customerOrderIds.includes(bill.orderId));
      }
      return [];
    },
    enabled: !!orders,
  });
  
  // Get health tips from the AI service
  useEffect(() => {
    const fetchHealthTip = async () => {
      try {
        if (user) {
          const res = await apiRequest("POST", "/api/ai/health-recommendations", {
            customerId: user.id,
            requestType: "dailyTip"
          });
          const data = await res.json();
          if (data.recommendation) {
            setHealthTip(data.recommendation);
          }
        }
      } catch (error) {
        console.error("Error fetching health tip:", error);
        setHealthTip("Stay hydrated and aim for balanced nutrition throughout the day.");
      }
    };
    
    fetchHealthTip();
  }, [user]);

  // Get order status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-amber-500";
      case "preparing": return "bg-blue-500";
      case "ready": return "bg-emerald-500";
      case "completed": return "bg-indigo-500";
      case "delivered": return "bg-violet-500";
      case "billed": return "bg-slate-500";
      default: return "bg-gray-500";
    }
  };

  // Function to get order status progression percentage
  const getOrderProgress = (status: string) => {
    const statuses = ["pending", "preparing", "ready", "completed", "delivered", "billed"];
    const index = statuses.indexOf(status);
    if (index === -1) return 0;
    return ((index + 1) / statuses.length) * 100;
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Welcome, {user?.fullName}</h1>
          <p className="text-muted-foreground">
            Manage your orders, explore menu items, and track your diet plans
          </p>
        </div>
        <Button onClick={() => setLocation("/new-order")} className="flex gap-2">
          <PlusCircle className="h-4 w-4" /> Place New Order
        </Button>
      </div>
      
      {/* Health tip alert */}
      {healthTip && (
        <Alert className="bg-green-50 border-green-200 text-green-800">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Daily Health Tip</AlertTitle>
          <AlertDescription>
            {healthTip}
          </AlertDescription>
        </Alert>
      )}
      
      {/* Active order tracking if there is one */}
      {activeOrder && (
        <Card className="overflow-hidden border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Active Order: #{activeOrder.orderNumber}
              </CardTitle>
              <Badge>{activeOrder.status.charAt(0).toUpperCase() + activeOrder.status.slice(1)}</Badge>
            </div>
            <CardDescription>
              Placed on {new Date(activeOrder.createdAt).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Status:</span>
                  <span className="font-medium text-primary">{activeOrder.status.toUpperCase()}</span>
                </div>
                <Progress value={getOrderProgress(activeOrder.status)} className="h-2" />
              </div>
              <div className="grid grid-cols-5 gap-1 text-center text-xs">
                <div className={`${activeOrder.status === "pending" ? "text-primary font-medium" : activeOrder.status === "preparing" || activeOrder.status === "ready" || activeOrder.status === "completed" || activeOrder.status === "delivered" || activeOrder.status === "billed" ? "text-green-600 font-medium" : ""}`}>Order Received</div>
                <div className={`${activeOrder.status === "preparing" ? "text-primary font-medium" : activeOrder.status === "ready" || activeOrder.status === "completed" || activeOrder.status === "delivered" || activeOrder.status === "billed" ? "text-green-600 font-medium" : ""}`}>Preparation</div>
                <div className={`${activeOrder.status === "ready" ? "text-primary font-medium" : activeOrder.status === "completed" || activeOrder.status === "delivered" || activeOrder.status === "billed" ? "text-green-600 font-medium" : ""}`}>Ready</div>
                <div className={`${activeOrder.status === "completed" ? "text-primary font-medium" : activeOrder.status === "delivered" || activeOrder.status === "billed" ? "text-green-600 font-medium" : ""}`}>Completed</div>
                <div className={`${activeOrder.status === "delivered" || activeOrder.status === "billed" ? "text-green-600 font-medium" : ""}`}>Delivered</div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              variant="outline"
              className="w-full text-sm" 
              onClick={() => setLocation(`/track-order/${activeOrder.orderNumber}`)}
            >
              View Detailed Tracking
            </Button>
          </CardFooter>
        </Card>
      )}
      
      {/* Quick action cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FeatureCard
          title="Place New Order"
          description="Browse our menu and place a new food order"
          icon={ShoppingBag}
          onClick={() => setLocation("/new-order")}
          color="bg-blue-500"
        />
        <FeatureCard
          title="Create Diet Plan"
          description="Schedule recurring healthy meals with AI recommendations"
          icon={HeartPulse}
          onClick={() => setLocation("/diet-plan")}
          color="bg-green-500"
        />
        <FeatureCard
          title="View Bills"
          description="Access your order history and payment receipts"
          icon={Receipt}
          onClick={() => setActiveTab("bills")}
          color="bg-amber-500"
        />
      </div>

      <Tabs defaultValue="my-orders" onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-md">
          <TabsTrigger value="my-orders">Orders</TabsTrigger>
          <TabsTrigger value="diet-plans">Diet Plans</TabsTrigger>
          <TabsTrigger value="bills">Bills</TabsTrigger>
          <TabsTrigger value="menu">Menu</TabsTrigger>
        </TabsList>

        {/* My Orders Tab */}
        <TabsContent value="my-orders" className="space-y-4">
          {isLoadingOrders ? (
            <div className="h-40 flex items-center justify-center">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : orders && orders.length > 0 ? (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {orders.map((order: any) => (
                <Card key={order.id} className="overflow-hidden">
                  <div className={`h-2 ${getStatusColor(order.status)}`} />
                  <CardHeader className="pb-2">
                    <div className="flex justify-between">
                      <CardTitle className="text-lg">Order #{order.orderNumber}</CardTitle>
                      <Badge variant={order.status === "pending" ? "destructive" : 
                              order.status === "ready" ? "outline" : "default"}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Badge>
                    </div>
                    <CardDescription className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> 
                      {new Date(order.createdAt).toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <p className="font-medium">Total: ₹{order.totalAmount.toFixed(2)}</p>
                    {order.notes && (
                      <p className="text-sm text-muted-foreground mt-1">{order.notes}</p>
                    )}
                  </CardContent>
                  <CardFooter className="pt-0">
                    <Button 
                      variant="outline" 
                      className="w-full text-sm" 
                      onClick={() => setLocation(`/track-order/${order.orderNumber}`)}
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      Track Order
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No orders yet</CardTitle>
                <CardDescription>
                  You haven't placed any orders yet. Start by exploring our menu and placing your first order.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button onClick={() => setActiveTab("menu")}>
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Browse Menu
                </Button>
              </CardFooter>
            </Card>
          )}
        </TabsContent>

        {/* Diet Plans Tab */}
        <TabsContent value="diet-plans" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Your Diet Plans</h2>
            <Button onClick={() => setLocation("/diet-plan")} variant="outline" size="sm">
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Diet Plan
            </Button>
          </div>
          
          {isLoadingDietPlans ? (
            <div className="h-40 flex items-center justify-center">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : dietPlans && dietPlans.length > 0 ? (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              {dietPlans.map((plan: any) => (
                <Card key={plan.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle>{plan.dietPlanName || "Unnamed Diet Plan"}</CardTitle>
                      <Badge variant={plan.isActive ? "outline" : "secondary"}>
                        {plan.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <CardDescription className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {plan.recurrencePattern}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Start Date:</span>
                        <span>{new Date(plan.startDate).toLocaleDateString()}</span>
                      </div>
                      {plan.endDate && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">End Date:</span>
                          <span>{new Date(plan.endDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      {plan.lastExecuted && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Last Delivery:</span>
                          <span>{new Date(plan.lastExecuted).toLocaleDateString()}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="pt-2">
                        <h4 className="font-medium mb-1">Diet Items:</h4>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {plan.menuItemIds.map((itemId: number, index: number) => {
                            const menuItem = menuItems?.find((item: any) => item.id === itemId);
                            return (
                              <li key={itemId} className="text-sm">
                                {menuItem?.name || `Item #${itemId}`}
                                {plan.quantities[index] > 1 && ` (x${plan.quantities[index]})`}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No diet plans yet</CardTitle>
                <CardDescription>
                  You haven't created any diet plans yet. Create your first personalized diet plan to get started.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button onClick={() => setLocation("/diet-plan")}>
                  <HeartPulse className="h-4 w-4 mr-2" />
                  Create Diet Plan
                </Button>
              </CardFooter>
            </Card>
          )}
        </TabsContent>

        {/* Bills Tab */}
        <TabsContent value="bills" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Your Bills & Payment History</h2>
          </div>
          
          {isLoadingBills ? (
            <div className="h-40 flex items-center justify-center">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : bills && bills.length > 0 ? (
            <div className="space-y-4">
              <Card>
                <CardContent className="p-0">
                  <ScrollArea className="h-[400px]">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-background">
                        <tr className="border-b">
                          <th className="text-left p-3 font-medium">Bill #</th>
                          <th className="text-left p-3 font-medium">Date</th>
                          <th className="text-left p-3 font-medium">Order</th>
                          <th className="text-right p-3 font-medium">Amount</th>
                          <th className="text-right p-3 font-medium">Status</th>
                          <th className="text-right p-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bills.map((bill: any) => {
                          // Find corresponding order
                          const order = orders?.find((o: any) => o.id === bill.orderId);
                          return (
                            <tr key={bill.id} className="border-b hover:bg-muted/50">
                              <td className="p-3">{bill.billNumber}</td>
                              <td className="p-3">{new Date(bill.createdAt).toLocaleDateString()}</td>
                              <td className="p-3">
                                {order ? (
                                  <span className="flex items-center gap-1">
                                    <span>#{order.orderNumber}</span>
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">Unknown</span>
                                )}
                              </td>
                              <td className="p-3 text-right">₹{bill.totalAmount ? bill.totalAmount.toFixed(2) : '0.00'}</td>
                              <td className="p-3 text-right">
                                <Badge variant={bill.isPaid ? "outline" : "secondary"}>
                                  {bill.isPaid ? "Paid" : "Pending"}
                                </Badge>
                              </td>
                              <td className="p-3 text-right">
                                <Button variant="ghost" size="icon" onClick={() => {
                                  window.open(`/api/bills/${bill.id}/pdf`, '_blank');
                                }}>
                                  <Receipt className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </ScrollArea>
                </CardContent>
              </Card>
              
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Total Spent:</span>
                  <span className="font-semibold">
                    ₹{bills.reduce((total: number, bill: any) => total + (bill.totalAmount || 0), 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bills Count:</span>
                  <span>{bills.length}</span>
                </div>
              </div>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No bills yet</CardTitle>
                <CardDescription>
                  You don't have any bills in your history yet. They will appear here after you complete orders.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>
        
        {/* Menu Tab */}
        <TabsContent value="menu" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Our Menu</h2>
            <Button onClick={() => setLocation("/new-order")} variant="outline" size="sm">
              <ClipboardList className="h-4 w-4 mr-2" />
              Place Order
            </Button>
          </div>
          
          {isLoadingMenuItems ? (
            <div className="h-40 flex items-center justify-center">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : menuItems && (
            <div className="space-y-8">
              {/* Group items by category */}
              {Array.from(new Set(menuItems.map((item: any) => item.category))).map((category) => {
                const categoryString = String(category);
                return (
                <div key={categoryString} className="space-y-4">
                  <h3 className="text-lg font-medium capitalize">{categoryString}</h3>
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {menuItems
                      .filter((item: any) => item.category === category)
                      .map((item: any) => (
                        <Card key={item.id} className="flex flex-col h-full">
                          <CardHeader className="pb-2">
                            <div className="flex justify-between">
                              <CardTitle className="text-lg">{item.name}</CardTitle>
                              <Badge variant="outline">₹{item.price}</Badge>
                            </div>
                            <CardDescription>
                              {item.description || "A delicious dish from our kitchen"}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="flex-grow pb-2">
                            {item.dietaryTags && item.dietaryTags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {item.dietaryTags.map((tag: string) => (
                                  <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            
                            {item.calories && (
                              <div className="mt-2 text-sm text-muted-foreground flex items-center gap-1">
                                <Apple className="h-3.5 w-3.5" /> {item.calories} calories
                              </div>
                            )}
                          </CardContent>
                          <CardFooter className="pt-0">
                            <Button 
                              variant="outline" 
                              className="w-full" 
                              onClick={() => {
                                // Add item to order
                                setLocation("/new-order");
                              }}
                            >
                              <ShoppingBag className="h-4 w-4 mr-2" />
                              Add to Order
                            </Button>
                          </CardFooter>
                        </Card>
                      ))}
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}