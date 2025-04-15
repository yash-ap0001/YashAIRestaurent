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
import { 
  PlusCircle, 
  ShoppingBag, 
  Apple, 
  Calendar, 
  HeartPulse,
  ClipboardList,
  MapPin,
  Clock
} from "lucide-react";

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("my-orders");

  // Fetch customer orders
  const { 
    data: orders,
    isLoading: isLoadingOrders,
  } = useQuery({
    queryKey: ["/api/orders"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/orders");
      const allOrders = await res.json();
      // Filter orders for this customer
      return allOrders.filter((order: any) => order.customerId === user?.id);
    },
    enabled: !!user,
  });

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

      <Tabs defaultValue="my-orders" onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="my-orders">My Orders</TabsTrigger>
          <TabsTrigger value="diet-plans">Diet Plans</TabsTrigger>
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
              {Array.from(new Set(menuItems.map((item: any) => item.category))).map((category: string) => (
                <div key={category} className="space-y-4">
                  <h3 className="text-lg font-medium capitalize">{category}</h3>
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
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}