import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ClipboardList, ChefHat, Utensils, CircleCheck, Receipt } from "lucide-react";

// Order status notification icons
const getStatusIcon = (status: string) => {
  switch (status) {
    case "pending":
      return <ClipboardList className="h-4 w-4" />;
    case "preparing":
      return <ChefHat className="h-4 w-4" />;
    case "ready":
      return <Utensils className="h-4 w-4" />;
    case "completed":
      return <CircleCheck className="h-4 w-4" />;
    case "billed":
      return <Receipt className="h-4 w-4" />;
    default:
      return <ClipboardList className="h-4 w-4" />;
  }
};

// Order status descriptions for notifications
const getStatusDescription = (status: string, orderNumber: string, tableNumber: string) => {
  switch (status) {
    case "pending":
      return `Order #${orderNumber} for Table ${tableNumber} has been received and is pending.`;
    case "preparing":
      return `Order #${orderNumber} for Table ${tableNumber} is now being prepared in the kitchen.`;
    case "ready":
      return `Order #${orderNumber} for Table ${tableNumber} is ready to be served.`;
    case "completed":
      return `Order #${orderNumber} for Table ${tableNumber} has been completed.`;
    case "billed":
      return `Order #${orderNumber} for Table ${tableNumber} has been billed.`;
    default:
      return `Order #${orderNumber} for Table ${tableNumber} status has been updated.`;
  }
};

// Toast variants by status
const getToastVariant = (status: string) => {
  switch (status) {
    case "pending":
      return "default";
    case "preparing":
      return "default";
    case "ready":
      return "success";
    case "completed":
      return "success";
    case "billed":
      return "success";
    default:
      return "default";
  }
};

// Get appropriate sound based on status
const getOrderStatusSound = (status: string) => {
  switch (status) {
    case "pending":
      return new Audio("/sounds/order-received.mp3");
    case "preparing":
      return new Audio("/sounds/order-preparing.mp3");
    case "ready":
      return new Audio("/sounds/order-ready.mp3");
    case "completed":
      return new Audio("/sounds/order-completed.mp3");
    case "billed":
      return new Audio("/sounds/order-billed.mp3");
    default:
      return new Audio("/sounds/notification.mp3");
  }
};

// Types for WebSocket events
interface OrderCreatedEvent {
  type: "new_order";
  data: {
    id: number;
    orderNumber: string;
    tableNumber: string;
    createdAt: string;
  };
}

interface OrderUpdatedEvent {
  type: "order_updated";
  data: {
    id: number;
    orderNumber: string;
    tableNumber: string;
    status: string;
    createdAt: string;
    totalAmount?: number;
  };
}

type WebSocketEvent = OrderCreatedEvent | OrderUpdatedEvent;

export function OrderTrackingToasts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Set up WebSocket connection for order updates
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);
    
    // Add connection event handlers
    socket.onopen = () => {
      console.log("Toast notification WebSocket connection established");
    };
    
    socket.onerror = (error) => {
      console.error("Toast notification WebSocket error:", error);
    };
    
    socket.onclose = (event) => {
      console.log(`Toast notification WebSocket closed: ${event.code} ${event.reason}`);
    };
    
    // Track previous order statuses to prevent duplicate notifications
    const orderStatusMap = new Map<number, string>();
    
    socket.onmessage = (event) => {
      try {
        console.log("WebSocket message for toast notification:", event.data);
        const wsEvent = JSON.parse(event.data) as WebSocketEvent;
        
        // Handle new order created
        if (wsEvent.type === "new_order") {
          const { orderNumber, tableNumber } = wsEvent.data;
          
          // Store initial status
          orderStatusMap.set(wsEvent.data.id, "pending");
          
          // Show toast notification
          toast({
            title: "New Order Created",
            description: `Order #${orderNumber} for Table ${tableNumber} has been received.`,
            variant: "default",
          });
          
          // Invalidate orders query to refresh data
          queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
          
          // Play notification sound
          try {
            const sound = getOrderStatusSound("pending");
            sound.volume = 0.5;
            sound.play().catch(err => console.log("Error playing sound:", err));
          } catch (error) {
            console.log("Sound not available:", error);
          }
        }
        
        // Handle order status updates
        if (wsEvent.type === "order_updated" && wsEvent.data.status) {
          const { id, orderNumber, tableNumber, status } = wsEvent.data;
          
          // Prevent duplicate notifications for the same status
          const previousStatus = orderStatusMap.get(id);
          if (previousStatus === status) {
            return;
          }
          
          // Update status in our tracking map
          orderStatusMap.set(id, status);
          
          // Show toast notification
          toast({
            title: `Order ${status.charAt(0).toUpperCase() + status.slice(1)}`,
            description: getStatusDescription(status, orderNumber, tableNumber),
            variant: getToastVariant(status) as any,
          });
          
          // Invalidate orders query to refresh data
          queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
          
          // Play notification sound
          try {
            const sound = getOrderStatusSound(status);
            sound.volume = 0.5;
            sound.play().catch(err => console.log("Error playing sound:", err));
          } catch (error) {
            console.log("Sound not available:", error);
          }
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
      }
    };
    
    // Clean up the WebSocket connection when the component unmounts
    return () => {
      socket.close();
    };
  }, [toast, queryClient]);

  // This component doesn't render anything visible, it just adds the toast notifications
  return null;
}