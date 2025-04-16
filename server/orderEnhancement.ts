import { broadcastToAllClients, broadcastStatsUpdate } from './services/realtime';

// Function to directly broadcast a new order event 
export function broadcastNewOrder(order: any) {
  console.log(`Broadcasting new order event for order ID ${order.id}:`, order.orderNumber);
  console.log('Order object being broadcast:', JSON.stringify(order, null, 2));
  
  if (!order.id || !order.orderNumber) {
    console.error('WARNING: Order object missing essential fields (id or orderNumber):', order);
    return; // Don't broadcast incomplete orders
  }
  
  // First broadcast as new_order event type (for real-time display)
  const newOrderPayload = {
    type: 'new_order',
    data: order
  };
  console.log('Broadcasting new_order payload:', JSON.stringify(newOrderPayload, null, 2));
  broadcastToAllClients(newOrderPayload);
  
  // Also broadcast as order_created event type (for query cache invalidation)
  const orderCreatedPayload = {
    type: 'order_created',
    data: order
  };
  console.log('Broadcasting order_created payload:', JSON.stringify(orderCreatedPayload, null, 2));
  broadcastToAllClients(orderCreatedPayload);
  
  // Also update dashboard stats
  broadcastStatsUpdate();
}