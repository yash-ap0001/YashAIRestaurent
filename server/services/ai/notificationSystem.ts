import { storage } from '../../storage';
import { Order, Bill } from '@shared/schema';
import { getChannelAdapter } from './channelAdapters';

/**
 * AI Notification System
 * 
 * This service manages all customer and staff notifications:
 * - Order confirmations
 * - Status updates
 * - Billing notifications
 * - Feedback requests
 */
export class NotificationSystem {
  private static instance: NotificationSystem;
  
  // Private constructor to enforce singleton pattern
  private constructor() {
    console.log('AI Notification System initialized');
  }
  
  /**
   * Get singleton instance of the system
   */
  public static getInstance(): NotificationSystem {
    if (!NotificationSystem.instance) {
      NotificationSystem.instance = new NotificationSystem();
    }
    return NotificationSystem.instance;
  }
  
  /**
   * Send order confirmation to customer
   */
  public async sendOrderConfirmation(order: Order): Promise<boolean> {
    try {
      console.log(`Notification System: Sending order confirmation for order ${order.id}`);
      
      // Get the appropriate channel adapter
      const adapter = this.getAdapterForOrder(order);
      if (!adapter) return false;
      
      // Send confirmation through the adapter
      const result = await adapter.sendOrderConfirmation(order);
      
      // Log the activity
      await storage.createActivity({
        type: "notification_sent",
        description: `Order confirmation sent to customer for Order #${order.orderNumber}`,
        entityId: order.id,
        entityType: "order"
      });
      
      return result;
    } catch (error) {
      console.error(`Error sending order confirmation for order ${order.id}:`, error);
      return false;
    }
  }
  
  /**
   * Send status update to customer
   */
  public async sendStatusUpdate(order: Order, status: string): Promise<boolean> {
    try {
      console.log(`Notification System: Sending status update (${status}) for order ${order.id}`);
      
      // Get the appropriate channel adapter
      const adapter = this.getAdapterForOrder(order);
      if (!adapter) return false;
      
      // Send status update through the adapter
      const result = await adapter.sendStatusUpdate(order, status);
      
      // Log the activity
      await storage.createActivity({
        type: "notification_sent",
        description: `Status update (${status}) sent to customer for Order #${order.orderNumber}`,
        entityId: order.id,
        entityType: "order"
      });
      
      return result;
    } catch (error) {
      console.error(`Error sending status update for order ${order.id}:`, error);
      return false;
    }
  }
  
  /**
   * Send bill to customer
   */
  public async sendBill(order: Order, bill: Bill): Promise<boolean> {
    try {
      console.log(`Notification System: Sending bill ${bill.id} for order ${order.id}`);
      
      // Get the appropriate channel adapter
      const adapter = this.getAdapterForOrder(order);
      if (!adapter) return false;
      
      // Send bill through the adapter
      const result = await adapter.sendBill(order, bill.id);
      
      // Log the activity
      await storage.createActivity({
        type: "notification_sent",
        description: `Bill #${bill.billNumber} sent to customer for Order #${order.orderNumber}`,
        entityId: bill.id,
        entityType: "bill"
      });
      
      return result;
    } catch (error) {
      console.error(`Error sending bill for order ${order.id}:`, error);
      return false;
    }
  }
  
  /**
   * Send feedback request to customer
   */
  public async sendFeedbackRequest(order: Order): Promise<boolean> {
    try {
      console.log(`Notification System: Sending feedback request for order ${order.id}`);
      
      // Only send feedback requests for completed orders
      if (order.status !== 'completed' && order.status !== 'billed') {
        console.log(`Order ${order.id} not completed yet, skipping feedback request`);
        return false;
      }
      
      // Get the appropriate channel adapter
      const adapter = this.getAdapterForOrder(order);
      if (!adapter) return false;
      
      // For now, repurpose the status update method for feedback requests
      // In a real implementation, this would be a separate method on the adapter
      const result = await adapter.sendStatusUpdate(order, 'feedback_request');
      
      // Log the activity
      await storage.createActivity({
        type: "notification_sent",
        description: `Feedback request sent to customer for Order #${order.orderNumber}`,
        entityId: order.id,
        entityType: "order"
      });
      
      return result;
    } catch (error) {
      console.error(`Error sending feedback request for order ${order.id}:`, error);
      return false;
    }
  }
  
  /**
   * Send staff notification about an order or issue
   */
  public async sendStaffNotification(
    title: string,
    message: string,
    priority: 'low' | 'medium' | 'high' = 'medium',
    entityId?: number,
    entityType?: string
  ): Promise<boolean> {
    try {
      console.log(`Notification System: Sending staff notification - ${title}`);
      
      // In a real implementation, this would send push notifications, emails, etc.
      // For now, just log it and record the activity
      
      // Log the activity
      await storage.createActivity({
        type: "staff_notification",
        description: `${priority.toUpperCase()} PRIORITY: ${title} - ${message}`,
        entityId: entityId || null,
        entityType: entityType || null
      });
      
      return true;
    } catch (error) {
      console.error(`Error sending staff notification:`, error);
      return false;
    }
  }
  
  /**
   * Setup automatic notifications for an order
   */
  public setupOrderNotifications(order: Order): void {
    // Skip if this is not a customer-facing order
    if (order.orderSource === 'manual') return;
    
    // Send order confirmation immediately
    this.sendOrderConfirmation(order).catch(error => {
      console.error(`Error in automatic order confirmation for order ${order.id}:`, error);
    });
    
    // Setup status update listeners
    this.setupStatusUpdateListeners(order);
  }
  
  /**
   * Setup listeners for order status changes to send automatic notifications
   */
  private setupStatusUpdateListeners(order: Order): void {
    // In a real implementation, this would set up database triggers or event listeners
    // For now, we'll use polling as a simple demonstration
    
    // Check for status changes every 10 seconds
    let lastKnownStatus = order.status;
    
    const intervalId = setInterval(async () => {
      try {
        // Fetch the latest order status
        const updatedOrder = await storage.getOrder(order.id);
        if (!updatedOrder) {
          clearInterval(intervalId);
          return;
        }
        
        // If status has changed, send notification
        if (updatedOrder.status !== lastKnownStatus) {
          console.log(`Order ${order.id} status changed from ${lastKnownStatus} to ${updatedOrder.status}`);
          
          // Send status update notification
          await this.sendStatusUpdate(updatedOrder, updatedOrder.status);
          
          // If the order is now billed, send bill notification
          if (updatedOrder.status === 'billed') {
            const bills = await storage.getBills();
            const bill = bills.find(b => b.orderId === order.id);
            
            if (bill) {
              await this.sendBill(updatedOrder, bill);
              
              // Schedule feedback request for 30 minutes after billing
              setTimeout(() => {
                this.sendFeedbackRequest(updatedOrder).catch(error => {
                  console.error(`Error sending feedback request for order ${order.id}:`, error);
                });
              }, 30 * 60 * 1000); // 30 minutes
            }
            
            // Clear the interval since order is complete
            clearInterval(intervalId);
          }
          
          // Update the last known status
          lastKnownStatus = updatedOrder.status;
        }
      } catch (error) {
        console.error(`Error checking order status for notifications:`, error);
      }
    }, 10000); // 10 seconds
    
    // Clean up after 2 hours (should be completed by then)
    setTimeout(() => {
      clearInterval(intervalId);
    }, 2 * 60 * 60 * 1000); // 2 hours
  }
  
  /**
   * Get the appropriate channel adapter for an order
   */
  private getAdapterForOrder(order: Order): any {
    if (!order.orderSource) {
      console.error(`Order ${order.id} has no source, cannot determine notification channel`);
      return null;
    }
    
    try {
      // Convert order source to channel type
      const channelType = order.orderSource as any;
      return getChannelAdapter(channelType);
    } catch (error) {
      console.error(`Error getting channel adapter for order ${order.id}:`, error);
      return null;
    }
  }
}

// Export singleton instance
export const notificationSystem = NotificationSystem.getInstance();