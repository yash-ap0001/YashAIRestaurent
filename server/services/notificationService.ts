import { broadcastToAllClients } from './realtime';
import { WS_EVENTS } from './constants';

// Define notification types
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  timestamp: number;
  targetRoles?: string[]; // Optional - specific roles to target
}

/**
 * Sends a notification through WebSocket to all connected clients
 */
function sendNotification(
  title: string,
  message: string,
  type: NotificationType = 'info',
  targetRoles?: string[]
) {
  const notification: Notification = {
    id: `notif-${Date.now()}`,
    title,
    message,
    type,
    timestamp: Date.now(),
    targetRoles
  };

  // Broadcast the notification to all connected clients
  broadcastToAllClients({
    type: WS_EVENTS.NOTIFICATION,
    notification: notification,
    title: notification.title,
    message: notification.message,
    notificationType: notification.type,
    timestamp: notification.timestamp,
    targetRoles: notification.targetRoles,
  });

  console.log(`Notification sent: ${title} - ${message}`);
  return notification;
}

// Pre-defined notification senders for common scenarios
export const notificationService = {
  // Export sendNotification function as part of the service
  sendNotification,
  
  newOrder: (orderNumber: string, tableNumber?: string) => {
    const message = tableNumber 
      ? `New order #${orderNumber} placed from table ${tableNumber}`
      : `New order #${orderNumber} has been placed`;
    return sendNotification('New Order', message, 'info', ['admin', 'kitchen', 'waiter']);
  },

  orderStatusChange: (orderNumber: string, status: string) => {
    return sendNotification(
      'Order Status Updated',
      `Order #${orderNumber} is now ${status}`,
      'info',
      ['admin', 'kitchen', 'waiter', 'customer']
    );
  },

  kitchenAlert: (tokenNumber: string, message: string) => {
    return sendNotification(
      'Kitchen Alert',
      `Token #${tokenNumber}: ${message}`,
      'warning',
      ['admin', 'kitchen']
    );
  },

  paymentReceived: (billNumber: string, amount: number) => {
    return sendNotification(
      'Payment Received',
      `Payment of ₹${amount} received for bill #${billNumber}`,
      'success',
      ['admin', 'manager']
    );
  },

  systemAlert: (message: string) => {
    return sendNotification(
      'System Alert',
      message,
      'warning',
      ['admin']
    );
  },

  error: (message: string) => {
    return sendNotification(
      'Error',
      message,
      'error',
      ['admin']
    );
  },

  // For testing purposes
  testNotification: (type: NotificationType = 'info') => {
    const messages = {
      info: 'This is a test information notification',
      success: 'This is a test success notification',
      warning: 'This is a test warning notification',
      error: 'This is a test error notification'
    };
    
    return sendNotification(
      'Test Notification',
      messages[type],
      type
    );
  }
};