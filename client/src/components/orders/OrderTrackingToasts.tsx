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
const getStatusDescription = (status: string, orderNumber: string, tableNumber: string | null) => {
  // Handle table display text
  const tableDisplay = tableNumber ? `Table ${tableNumber}` : 'Takeaway';
  
  switch (status) {
    case "pending":
      return `Order #${orderNumber} for ${tableDisplay} has been received and is pending.`;
    case "preparing":
      return `Order #${orderNumber} for ${tableDisplay} is now being prepared in the kitchen.`;
    case "ready":
      return `Order #${orderNumber} for ${tableDisplay} is ready to be served.`;
    case "completed":
      return `Order #${orderNumber} for ${tableDisplay} has been completed.`;
    case "billed":
      return `Order #${orderNumber} for ${tableDisplay} has been billed.`;
    default:
      return `Order #${orderNumber} for ${tableDisplay} status has been updated.`;
  }
};

// Toast variants by status
const getToastVariant = (status: string): "default" | "destructive" => {
  switch (status) {
    case "pending":
    case "preparing":
    case "ready":
    case "completed":
    case "billed":
      return "default";
    default:
      return "default";
  }
};

// Toast custom class by status
const getToastClassName = (status: string): string => {
  switch (status) {
    case "pending":
      return "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700";
    case "preparing":
      return "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700";
    case "ready":
      return "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700";
    case "completed":
      return "bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-700";
    case "billed":
      return "bg-pink-50 border-pink-200 dark:bg-pink-900/20 dark:border-pink-700";
    default:
      return "";
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
    // Track previous order statuses to prevent duplicate notifications
    const orderStatusMap = new Map<number, string>();
    let socket: WebSocket | null = null;
    let reconnectAttempts = 0;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    const maxReconnectAttempts = 5;

    // Initialize connection with exponential backoff
    function connectWebSocket() {
      // Clear any existing timeout
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }

      // Set up WebSocket connection for order updates
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
      
      // Close existing socket if it exists
      if (socket) {
        socket.close();
      }
      
      // Create new socket
      socket = new WebSocket(wsUrl);
      
      // Add connection event handlers
      socket.onopen = () => {
        console.log("Toast notification WebSocket connection established");
        // Reset reconnect attempts on successful connection
        reconnectAttempts = 0;
        
        // Show success toast after reconnection (only if it's not the first connect)
        if (reconnectAttempts > 0) {
          toast({
            title: "Reconnected",
            description: "Order notifications restored",
            variant: "default",
            className: "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700",
          });
        }
      };
      
      socket.onerror = (error) => {
        console.error("Toast notification WebSocket error:", error);
      };
      
      socket.onclose = (event) => {
        console.log(`Toast notification WebSocket closed: ${event.code} ${event.reason}`);
        
        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
          console.log(`Attempting to reconnect (${reconnectAttempts + 1}/${maxReconnectAttempts})...`);
          
          reconnectTimeout = setTimeout(() => {
            reconnectAttempts++;
            connectWebSocket();
          }, delay);
        } else {
          // Show error toast when max reconnects reached
          toast({
            title: "Connection Lost",
            description: "Unable to receive real-time order updates. Please refresh the page.",
            variant: "destructive",
          });
        }
      };
      
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
            const tableDisplay = tableNumber ? `Table ${tableNumber}` : 'Takeaway';
            toast({
              title: "New Order Created",
              description: `Order #${orderNumber} for ${tableDisplay} has been received.`,
              variant: "default",
              className: getToastClassName("pending"),
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
              variant: getToastVariant(status),
              className: getToastClassName(status),
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
    }
    
    // Initialize the WebSocket connection
    connectWebSocket();
    
    // Clean up the WebSocket connection when the component unmounts
    return () => {
      console.log("Closing WebSocket connection");
      if (socket) {
        socket.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [toast, queryClient]);

  // This component doesn't render anything visible, it just adds the toast notifications
  return null;
}