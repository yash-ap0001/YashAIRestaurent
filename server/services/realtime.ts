import WebSocket, { WebSocketServer } from 'ws';
import { storage } from '../storage';

// Custom interface for WebSocket with isAlive property
interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
}

// Event types for WebSocket messages
const WS_EVENTS = {
  CONNECT: 'connect',
  ORDER_UPDATED: 'order_updated',
  KITCHEN_TOKEN_UPDATED: 'kitchen_token_updated',
  BILL_UPDATED: 'bill_updated',
  NEW_ORDER: 'new_order',
  NEW_KITCHEN_TOKEN: 'new_kitchen_token',
  NEW_BILL: 'new_bill',
  STATS_UPDATED: 'stats_updated', // Added event for dashboard stats
  ERROR: 'error',
  PING: 'ping',
  PONG: 'pong'
};

// Store active clients
let activeClients: Map<string, ExtendedWebSocket> = new Map();

// Initialize the real-time service with WebSocket server
export function initializeRealTimeService(wss: WebSocketServer) {
  console.log('Initializing real-time service with WebSocket server');
  
  wss.on('connection', (ws: WebSocket) => {
    // Cast to our extended interface
    const extWs = ws as ExtendedWebSocket;
    
    // Generate a unique client ID
    const clientId = generateUniqueId();
    activeClients.set(clientId, extWs);
    
    console.log(`WebSocket client connected. Total clients: ${activeClients.size}`);
    
    // Send initial connection confirmation
    sendToClient(extWs, {
      type: WS_EVENTS.CONNECT,
      message: 'Connected to YashHotelBot real-time updates service',
      clientId
    });
    
    // Set up heartbeat check to detect disconnected clients
    extWs.isAlive = true;
    extWs.on('pong', () => {
      extWs.isAlive = true;
    });
    
    // Handle incoming messages
    extWs.on('message', async (message: string) => {
      try {
        const parsedMessage = JSON.parse(message.toString());
        console.log('WebSocket received message:', parsedMessage);
        
        // Handle different message types
        switch (parsedMessage.type) {
          case WS_EVENTS.PING:
            sendToClient(extWs, { type: WS_EVENTS.PONG });
            break;
            
          default:
            console.log('Unknown message type received:', parsedMessage.type);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
        sendToClient(extWs, {
          type: WS_EVENTS.ERROR,
          message: 'Invalid message format'
        });
      }
    });
    
    // Clean up on close
    extWs.on('close', () => {
      activeClients.delete(clientId);
      console.log(`WebSocket client disconnected. Remaining clients: ${activeClients.size}`);
    });
  });
  
  // Set up heartbeat interval to check for disconnected clients
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const extWs = ws as ExtendedWebSocket;
      if (extWs.isAlive === false) {
        // Remove if not responding
        return extWs.terminate();
      }
      
      extWs.isAlive = false;
      extWs.ping();
    });
  }, 30000); // 30 second interval
  
  // Clean up interval on server close
  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });
  
  // Register order change listeners
  setupDataChangeListeners();
}

// Set up listeners for data changes to broadcast updates
function setupDataChangeListeners() {
  // Use a proxy to wrap storage operations that need to broadcast changes
  const originalUpdateOrder = storage.updateOrder;
  storage.updateOrder = async (id: number, orderData: any) => {
    const result = await originalUpdateOrder.call(storage, id, orderData);
    broadcastToAllClients({
      type: WS_EVENTS.ORDER_UPDATED,
      data: result
    });
    
    // Broadcast updated stats when orders change
    broadcastStatsUpdate();
    
    return result;
  };
  
  const originalUpdateKitchenToken = storage.updateKitchenToken;
  storage.updateKitchenToken = async (id: number, tokenData: any) => {
    const result = await originalUpdateKitchenToken.call(storage, id, tokenData);
    broadcastToAllClients({
      type: WS_EVENTS.KITCHEN_TOKEN_UPDATED,
      data: result
    });
    
    // Broadcast updated stats when kitchen tokens change
    broadcastStatsUpdate();
    
    return result;
  };
  
  const originalUpdateBill = storage.updateBill;
  storage.updateBill = async (id: number, billData: any) => {
    const result = await originalUpdateBill.call(storage, id, billData);
    broadcastToAllClients({
      type: WS_EVENTS.BILL_UPDATED,
      data: result
    });
    
    // Broadcast updated stats when bills change
    broadcastStatsUpdate();
    
    return result;
  };
  
  const originalCreateOrder = storage.createOrder;
  storage.createOrder = async (orderData: any) => {
    const result = await originalCreateOrder.call(storage, orderData);
    broadcastToAllClients({
      type: WS_EVENTS.NEW_ORDER,
      data: result
    });
    
    // Broadcast updated stats when new orders are created
    broadcastStatsUpdate();
    
    return result;
  };
  
  const originalCreateKitchenToken = storage.createKitchenToken;
  storage.createKitchenToken = async (tokenData: any) => {
    const result = await originalCreateKitchenToken.call(storage, tokenData);
    broadcastToAllClients({
      type: WS_EVENTS.NEW_KITCHEN_TOKEN,
      data: result
    });
    
    // Broadcast updated stats when new kitchen tokens are created
    broadcastStatsUpdate();
    
    return result;
  };
  
  const originalCreateBill = storage.createBill;
  storage.createBill = async (billData: any) => {
    const result = await originalCreateBill.call(storage, billData);
    broadcastToAllClients({
      type: WS_EVENTS.NEW_BILL,
      data: result
    });
    
    // Broadcast updated stats when new bills are created
    broadcastStatsUpdate();
    
    return result;
  };
}

// Utility to send messages to a specific client
function sendToClient(client: ExtendedWebSocket | WebSocket, data: any) {
  if (client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(data));
  }
}

// Broadcast to all active clients
function broadcastToAllClients(data: any) {
  console.log(`Broadcasting to ${activeClients.size} clients:`, data.type, 
    data.type === WS_EVENTS.NEW_ORDER ? 'New order ID: ' + (data.data?.id || 'unknown') : '');
  
  // Add timestamp to help with debugging and caching issues
  const enhancedData = {
    ...data,
    timestamp: Date.now()
  };
  
  activeClients.forEach(client => {
    sendToClient(client, enhancedData);
  });
}

// Generate dashboard stats from storage data
async function getDashboardStats() {
  const orders = await storage.getOrders();
  const bills = await storage.getBills();
  const kitchenTokens = await storage.getKitchenTokens();
  
  // Get current date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Filter for today's data
  const todaysOrders = orders.filter(order => {
    if (order.createdAt) {
      return new Date(order.createdAt).getTime() >= today.getTime();
    }
    return false;
  });
  
  const todaysSales = todaysOrders.reduce((sum, order) => sum + order.totalAmount, 0);
  
  // Count active tables (tables with in-progress orders)
  const activeTableNumbers = new Set(
    orders
      .filter(order => order.status === "pending" || order.status === "in-progress")
      .map(order => order.tableNumber)
      .filter(Boolean)
  );
  
  // Count kitchen queue items
  const kitchenQueue = kitchenTokens.filter(token => 
    token.status === "pending" || token.status === "preparing" || token.status === "delayed"
  );
  
  const urgentTokens = kitchenTokens.filter(token => token.isUrgent);
  
  return {
    todaysSales,
    ordersCount: todaysOrders.length,
    activeTables: activeTableNumbers.size,
    totalTables: 20, // Hardcoded for now
    kitchenQueueCount: kitchenQueue.length,
    urgentTokensCount: urgentTokens.length
  };
}

// Export function to broadcast stats updates
export async function broadcastStatsUpdate() {
  try {
    const stats = await getDashboardStats();
    broadcastToAllClients({
      type: WS_EVENTS.STATS_UPDATED,
      data: stats
    });
    return stats;
  } catch (error) {
    console.error('Error broadcasting stats update:', error);
    return null;
  }
}

// Generate a unique ID for clients
function generateUniqueId(): string {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}