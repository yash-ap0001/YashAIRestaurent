import WebSocket, { WebSocketServer } from 'ws';
import { storage } from '../storage';

// Extend WebSocket interface with isAlive property
declare module 'ws' {
  interface WebSocket {
    isAlive: boolean;
  }
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
  ERROR: 'error',
  PING: 'ping',
  PONG: 'pong'
};

// Store active clients
let activeClients: Map<string, WebSocket> = new Map();

// Initialize the real-time service with WebSocket server
export function initializeRealTimeService(wss: WebSocketServer) {
  console.log('Initializing real-time service with WebSocket server');
  
  wss.on('connection', (ws: WebSocket) => {
    // Generate a unique client ID
    const clientId = generateUniqueId();
    activeClients.set(clientId, ws);
    
    console.log(`WebSocket client connected. Total clients: ${activeClients.size}`);
    
    // Send initial connection confirmation
    sendToClient(ws, {
      type: WS_EVENTS.CONNECT,
      message: 'Connected to YashHotelBot real-time updates service',
      clientId
    });
    
    // Set up heartbeat check to detect disconnected clients
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });
    
    // Handle incoming messages
    ws.on('message', async (message: string) => {
      try {
        const parsedMessage = JSON.parse(message);
        console.log('WebSocket received message:', parsedMessage);
        
        // Handle different message types
        switch (parsedMessage.type) {
          case WS_EVENTS.PING:
            sendToClient(ws, { type: WS_EVENTS.PONG });
            break;
            
          default:
            console.log('Unknown message type received:', parsedMessage.type);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
        sendToClient(ws, {
          type: WS_EVENTS.ERROR,
          message: 'Invalid message format'
        });
      }
    });
    
    // Clean up on close
    ws.on('close', () => {
      activeClients.delete(clientId);
      console.log(`WebSocket client disconnected. Remaining clients: ${activeClients.size}`);
    });
  });
  
  // Set up heartbeat interval to check for disconnected clients
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        // Remove if not responding
        return ws.terminate();
      }
      
      ws.isAlive = false;
      ws.ping();
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
    return result;
  };
  
  const originalUpdateKitchenToken = storage.updateKitchenToken;
  storage.updateKitchenToken = async (id: number, tokenData: any) => {
    const result = await originalUpdateKitchenToken.call(storage, id, tokenData);
    broadcastToAllClients({
      type: WS_EVENTS.KITCHEN_TOKEN_UPDATED,
      data: result
    });
    return result;
  };
  
  const originalUpdateBill = storage.updateBill;
  storage.updateBill = async (id: number, billData: any) => {
    const result = await originalUpdateBill.call(storage, id, billData);
    broadcastToAllClients({
      type: WS_EVENTS.BILL_UPDATED,
      data: result
    });
    return result;
  };
  
  const originalCreateOrder = storage.createOrder;
  storage.createOrder = async (orderData: any) => {
    const result = await originalCreateOrder.call(storage, orderData);
    broadcastToAllClients({
      type: WS_EVENTS.NEW_ORDER,
      data: result
    });
    return result;
  };
  
  const originalCreateKitchenToken = storage.createKitchenToken;
  storage.createKitchenToken = async (tokenData: any) => {
    const result = await originalCreateKitchenToken.call(storage, tokenData);
    broadcastToAllClients({
      type: WS_EVENTS.NEW_KITCHEN_TOKEN,
      data: result
    });
    return result;
  };
  
  const originalCreateBill = storage.createBill;
  storage.createBill = async (billData: any) => {
    const result = await originalCreateBill.call(storage, billData);
    broadcastToAllClients({
      type: WS_EVENTS.NEW_BILL,
      data: result
    });
    return result;
  };
}

// Utility to send messages to a specific client
function sendToClient(client: WebSocket, data: any) {
  if (client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(data));
  }
}

// Broadcast to all active clients
function broadcastToAllClients(data: any) {
  console.log(`Broadcasting to ${activeClients.size} clients:`, data.type);
  activeClients.forEach(client => {
    sendToClient(client, data);
  });
}

// Generate a unique ID for clients
function generateUniqueId(): string {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}