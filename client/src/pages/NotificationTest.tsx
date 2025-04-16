import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function NotificationTest() {
  const [loading, setLoading] = useState(false);

  const createTestOrder = async () => {
    setLoading(true);
    try {
      // Create a test order via the simulator API
      const response = await apiRequest("POST", "/api/simulator/create-order", {
        tableNumber: "T1",
        orderItems: [
          {
            menuItemId: 1,
            quantity: 1,
            price: 370,
            specialInstructions: "Test notification order"
          }
        ]
      });
      
      const data = await response.json();
      
      console.log("Test order created:", data);
      toast({
        title: "Test Order Initiated",
        description: `Order ${data.orderNumber} was created. You should see a real-time toast notification shortly.`,
        variant: "default"
      });
    } catch (error) {
      console.error("Error creating test order:", error);
      toast({
        title: "Error",
        description: "Failed to create test order. Check console for details.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (status: string) => {
    setLoading(true);
    try {
      // Update the most recent order status
      const ordersResponse = await apiRequest("GET", "/api/orders");
      const orders = await ordersResponse.json();
      
      // Get the latest order
      const latestOrder = [...orders].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
      
      if (!latestOrder) {
        toast({
          title: "No orders found",
          description: "Please create a test order first",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
      
      const updateResponse = await apiRequest("PATCH", `/api/orders/${latestOrder.id}`, {
        status
      });
      
      if (updateResponse.ok) {
        toast({
          title: "Order Status Updated",
          description: `Order ${latestOrder.orderNumber} status updated to ${status}`,
          variant: "default"
        });
      } else {
        toast({
          title: "Update Failed",
          description: "Failed to update order status",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      toast({
        title: "Error",
        description: "Failed to update order status. Check console for details.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Notification System Test</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Create Test Order</CardTitle>
          <CardDescription>
            This will create a new order and trigger real-time toast notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            Click the button below to create a test order. A toast notification should appear
            to confirm the creation of the order through the WebSocket connection.
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={createTestOrder} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create Test Order
          </Button>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Update Order Status</CardTitle>
          <CardDescription>
            Update the status of the most recent order to test different notification sounds
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            Click on one of the buttons below to update the status of the most recent order
            and trigger a status change notification.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => updateOrderStatus("preparing")}
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Set to Preparing
            </Button>
            <Button
              variant="outline"
              onClick={() => updateOrderStatus("ready")}
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Set to Ready
            </Button>
            <Button
              variant="outline"
              onClick={() => updateOrderStatus("completed")}
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Set to Completed
            </Button>
            <Button
              variant="outline"
              onClick={() => updateOrderStatus("billed")}
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Set to Billed
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}