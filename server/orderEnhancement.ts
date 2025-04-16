import { broadcastToAllClients, broadcastStatsUpdate } from './services/realtime';

// Function to directly broadcast a new order event 
export function broadcastNewOrder(order: any) {
  console.log(`Broadcasting new order event for order ID ${order.id}:`, order.orderNumber);
  
  // First broadcast as new_order event type (for real-time display)
  broadcastToAllClients({
    type: 'new_order',
    data: order
  });
  
  // Also broadcast as order_created event type (for query cache invalidation)
  broadcastToAllClients({
    type: 'order_created',
    data: order
  });
  
  // Also update dashboard stats
  broadcastStatsUpdate();
}