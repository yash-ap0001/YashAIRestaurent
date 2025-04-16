import { broadcastToAllClients, broadcastStatsUpdate } from './services/realtime';

// Function to directly broadcast a new order event 
export function broadcastNewOrder(order: any) {
  console.log(`Broadcasting new order event for order ID ${order.id}:`, order.orderNumber);
  
  broadcastToAllClients({
    type: 'new_order',
    data: order
  });
  
  // Also update dashboard stats
  broadcastStatsUpdate();
}