import React, { useEffect } from 'react';
import { 
  TrendingUp, Utensils, CheckCircle2, Circle, 
  ClipboardList, AlertCircle, ReceiptText, Trash2
} from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import GenericAIAssistant, { AIAssistantConfig } from './GenericAIAssistant';

export interface Order {
  id: number;
  orderNumber: string;
  tableNumber: string | null;
  status: string;
  totalAmount: number;
  createdAt?: Date | string | null;
}

/**
 * OrderManagementAI - An AI assistant for managing restaurant orders through voice commands
 */
const OrderManagementAI: React.FC = () => {
  const { toast } = useToast();
  
  // Fetch orders data
  const { 
    data: orders, 
    isLoading: isLoadingOrders,
    refetch: refetchOrders
  } = useQuery({
    queryKey: ['/api/orders'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/orders');
      return await res.json();
    },
    staleTime: 30000, // Consider data fresh for 30 seconds
  });
  
  // Create a new order
  const createOrderMutation = useMutation({
    mutationFn: async (tableNumber: string) => {
      const res = await apiRequest('POST', '/api/orders', {
        tableNumber,
        status: 'pending',
        totalAmount: 0,
        orderSource: 'ai',
        useAIAutomation: true
      });
      return await res.json();
    },
    onSuccess: (newOrder) => {
      // Invalidate orders cache and refetch
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      
      // Show success toast
      toast({
        title: 'Order Created',
        description: `Order ${newOrder.orderNumber} has been created for table ${newOrder.tableNumber}`,
      });
      
      // Refetch orders
      refetchOrders();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error Creating Order',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  // Update an order's status
  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number, status: string }) => {
      const res = await apiRequest('PATCH', `/api/orders/${orderId}`, { status });
      return await res.json();
    },
    onSuccess: (updatedOrder) => {
      // Invalidate orders cache and refetch
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      
      // Show success toast
      toast({
        title: 'Order Updated',
        description: `Order ${updatedOrder.orderNumber} status is now ${updatedOrder.status}`,
      });
      
      // Refetch orders
      refetchOrders();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error Updating Order',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  // Delete an order
  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const res = await apiRequest('DELETE', `/api/orders/${orderId}`);
      return { success: res.ok, orderId };
    },
    onSuccess: (result) => {
      // Invalidate orders cache and refetch
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      
      // Show success toast
      toast({
        title: 'Order Deleted',
        description: `Order has been deleted successfully`,
      });
      
      // Refetch orders
      refetchOrders();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error Deleting Order',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  // Order management voice commands
  const orderCommandPatterns = [
    // Create order pattern
    {
      pattern: /create (a |an |)(order|table) (for |at |)(table |)(\d+)/i,
      action: (matches, speak) => {
        const tableNumber = matches[5];
        speak(`Creating new order for table ${tableNumber}`);
        createOrderMutation.mutate(tableNumber);
        return true;
      }
    },
    // Update order status pattern - with order number
    {
      pattern: /(set|mark|update|change) (order|) ?(\d+|[a-z0-9-]+) (to |as |status to |status as |)(pending|preparing|ready|complete|completed|done|billed|paid)/i,
      action: (matches, speak) => {
        const orderIdentifier = matches[3];
        let status = matches[5].toLowerCase();
        
        // Map common terms to standard statuses
        if (status === 'done' || status === 'completed') status = 'completed';
        if (status === 'paid') status = 'billed';
        
        // Find matching order
        const order = orders?.find((o: Order) => 
          o.orderNumber.toLowerCase().includes(orderIdentifier.toLowerCase()) ||
          o.id.toString() === orderIdentifier
        );
        
        if (order) {
          speak(`Updating order ${order.orderNumber} status to ${status}`);
          updateOrderMutation.mutate({ orderId: order.id, status });
          return true;
        } else {
          speak(`I couldn't find order ${orderIdentifier}. Please try again.`);
          return true;
        }
      }
    },
    // Update order status pattern - with table number
    {
      pattern: /(set|mark|update|change) (table|) ?(\d+) (order |)(to |as |status to |status as |)(pending|preparing|ready|complete|completed|done|billed|paid)/i,
      action: (matches, speak) => {
        const tableNumber = matches[3];
        let status = matches[6].toLowerCase();
        
        // Map common terms to standard statuses
        if (status === 'done' || status === 'completed') status = 'completed';
        if (status === 'paid') status = 'billed';
        
        // Find matching order by table number
        const order = orders?.find((o: Order) => 
          o.tableNumber === tableNumber || o.tableNumber === `T${tableNumber}`
        );
        
        if (order) {
          speak(`Updating order for table ${tableNumber} status to ${status}`);
          updateOrderMutation.mutate({ orderId: order.id, status });
          return true;
        } else {
          speak(`I couldn't find an order for table ${tableNumber}. Please try again.`);
          return true;
        }
      }
    },
    // Delete order pattern
    {
      pattern: /(delete|remove|cancel) (order|) ?(\d+|[a-z0-9-]+)/i,
      action: (matches, speak) => {
        const orderIdentifier = matches[3];
        
        // Find matching order
        const order = orders?.find((o: Order) => 
          o.orderNumber.toLowerCase().includes(orderIdentifier.toLowerCase()) ||
          o.id.toString() === orderIdentifier
        );
        
        if (order) {
          speak(`Deleting order ${order.orderNumber}. Please confirm by saying yes or cancel.`);
          
          // Add confirmation step
          const confirmDialog = window.confirm(`Are you sure you want to delete order ${order.orderNumber}?`);
          if (confirmDialog) {
            deleteOrderMutation.mutate(order.id);
          } else {
            speak('Order deletion canceled.');
          }
          return true;
        } else {
          speak(`I couldn't find order ${orderIdentifier}. Please try again.`);
          return true;
        }
      }
    },
    // List orders pattern
    {
      pattern: /(list|show|get) (all |)(orders|active orders)/i,
      action: (matches, speak) => {
        if (!orders || orders.length === 0) {
          speak('There are no active orders at the moment.');
          return true;
        }
        
        const orderList = orders.map((order: Order) => 
          `Order ${order.orderNumber} for table ${order.tableNumber || 'unknown'}, status: ${order.status}`
        ).join('. ');
        
        speak(`Here are the current orders: ${orderList}`);
        return true;
      }
    }
  ];
  
  // Custom commands for direct access
  const customOrderCommands = [
    {
      name: "Create Order",
      endpoint: "/api/ai/create-order",
      buttonText: "New Order",
      icon: <Utensils className="h-4 w-4" />,
      processFn: (data) => {
        const tableNum = window.prompt('Enter table number:');
        if (tableNum) {
          createOrderMutation.mutate(tableNum);
          return `Creating new order for table ${tableNum}`;
        }
        return "Order creation canceled";
      }
    },
    {
      name: "List Orders",
      endpoint: "/api/ai/list-orders",
      buttonText: "List Orders",
      icon: <ClipboardList className="h-4 w-4" />,
      processFn: () => {
        if (!orders || orders.length === 0) {
          return "There are no active orders at the moment.";
        }
        
        return "Current orders: " + orders.map((order: Order) => 
          `Order ${order.orderNumber} (${order.status})`
        ).join(", ");
      }
    }
  ];
  
  // Process AI response - extract any order actions
  const processChatResponse = (data: any) => {
    // If the response has specific order actions, process them
    if (data.action === 'create_order' && data.tableNumber) {
      createOrderMutation.mutate(data.tableNumber);
    } else if (data.action === 'update_order' && data.orderId && data.status) {
      updateOrderMutation.mutate({ orderId: data.orderId, status: data.status });
    } else if (data.action === 'delete_order' && data.orderId) {
      // Confirm before deleting
      if (window.confirm(`Are you sure you want to delete this order?`)) {
        deleteOrderMutation.mutate(data.orderId);
      }
    }
    
    // Return the response text
    return data.response || data.message || data;
  };
  
  // Assistant config
  const assistantConfig: AIAssistantConfig = {
    title: "Order Management Assistant",
    description: "Use voice commands to manage restaurant orders",
    icon: <Utensils className="h-6 w-6 text-primary" />,
    buttonText: "Order Assistant",
    dataQueryEndpoint: "/api/orders",
    chatEndpoint: "/api/ai/chatbot",
    voiceEnabled: true,
    welcomeMessage: "I can help you manage orders. Try saying 'Create order for table 5' or 'Mark order 1001 as ready'.",
    commandPatterns: orderCommandPatterns,
    customCommands: customOrderCommands,
    processChatResponse,
    extraDataQueries: [
      {
        name: "kitchen-tokens",
        endpoint: "/api/kitchen-tokens",
      }
    ]
  };
  
  return <GenericAIAssistant {...assistantConfig} />;
};

export default OrderManagementAI;