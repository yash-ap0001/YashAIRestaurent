import { storage } from '../../storage';
import { Bill, InsertBill, KitchenToken, InsertKitchenToken, Order, OrderItem } from '@shared/schema';
import { 
  insertBillSchema, 
  insertKitchenTokenSchema 
} from '@shared/schema';

/**
 * Central AI Controller
 * 
 * This service orchestrates all AI-driven automation processes in the hotel management system.
 * It handles the end-to-end lifecycle of orders across all channels:
 * - Order intake and processing
 * - Kitchen token management
 * - Status progression
 * - Billing
 * - Customer notifications
 */
export class CentralAIController {
  private static instance: CentralAIController;
  private automationEnabled: boolean = true;
  private automationTimers: Map<number, NodeJS.Timeout[]> = new Map();
  
  // Private constructor to enforce singleton pattern
  private constructor() {
    console.log('Central AI Controller initialized');
  }
  
  /**
   * Get singleton instance of the controller
   */
  public static getInstance(): CentralAIController {
    if (!CentralAIController.instance) {
      CentralAIController.instance = new CentralAIController();
    }
    return CentralAIController.instance;
  }
  
  /**
   * Enable/disable automation globally
   */
  public setAutomationEnabled(enabled: boolean): void {
    this.automationEnabled = enabled;
    console.log(`AI Automation globally ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Check if automation is enabled
   */
  public isAutomationEnabled(): boolean {
    return this.automationEnabled;
  }
  
  /**
   * Initiate automated order processing for a new order
   */
  public async processNewOrder(order: Order): Promise<void> {
    if (!this.automationEnabled || !order.useAIAutomation) {
      console.log(`Skipping AI automation for order ${order.id} - automation is disabled`);
      return;
    }
    
    console.log(`AI Controller: Starting automated processing for order ${order.id}`);
    
    try {
      // Create a kitchen token immediately
      await this.createKitchenToken(order);
      
      // Set up automated status progression
      await this.setupStatusProgression(order);
      
      // Log the activity
      await storage.createActivity({
        type: "ai_automation",
        description: `AI automation initiated for Order #${order.orderNumber}`,
        entityId: order.id,
        entityType: "order"
      });
    } catch (error) {
      console.error(`Error in AI Controller processing order ${order.id}:`, error);
    }
  }
  
  /**
   * Create a kitchen token for the order
   */
  private async createKitchenToken(order: Order): Promise<KitchenToken> {
    try {
      // Generate a unique token number (format: K + random 3-digit number)
      const tokenNumber = `K${Math.floor(Math.random() * 900) + 100}`;
      
      const tokenData: InsertKitchenToken = {
        orderId: order.id,
        tokenNumber,
        status: "pending",
        isUrgent: false,
        startTime: new Date(),
        completionTime: null
      };
      
      const parsedToken = insertKitchenTokenSchema.parse(tokenData);
      const kitchenToken = await storage.createKitchenToken(parsedToken);
      
      console.log(`AI Controller: Created kitchen token ${kitchenToken.tokenNumber} for order ${order.id}`);
      
      // Log activity
      await storage.createActivity({
        type: "kitchen_token_created",
        description: `Kitchen Token #${kitchenToken.tokenNumber} created for Order #${order.orderNumber}`,
        entityId: kitchenToken.id,
        entityType: "kitchen_token"
      });
      
      return kitchenToken;
    } catch (error) {
      console.error(`Error creating kitchen token for order ${order.id}:`, error);
      throw error;
    }
  }
  
  /**
   * Set up automated status progression for the order
   */
  private async setupStatusProgression(order: Order): Promise<void> {
    // Initialize timers array for this order
    const timers: NodeJS.Timeout[] = [];
    
    // Determine progression times based on order complexity
    const orderItems = await storage.getOrderItems(order.id);
    const complexityFactor = this.calculateOrderComplexity(orderItems);
    
    // Base times in milliseconds
    const preparingTime = 10000 * complexityFactor; // 10 seconds * complexity
    const readyTime = preparingTime + 15000; // +15 seconds after preparing starts
    const completedTime = readyTime + 15000; // +15 seconds after ready
    const billedTime = completedTime + 5000; // +5 seconds after completed
    
    // Update to 'preparing' status after a short delay
    const preparingTimer = setTimeout(async () => {
      try {
        console.log(`AI Controller: Updating order ${order.id} to 'preparing' status`);
        await storage.updateOrder(order.id, { status: "preparing" });
        
        // Update kitchen token status
        const kitchenToken = await this.getKitchenTokenForOrder(order.id);
        if (kitchenToken) {
          await storage.updateKitchenToken(kitchenToken.id, { status: "in_progress" });
        }
        
        // Log the activity
        await storage.createActivity({
          type: "status_update",
          description: `Order #${order.orderNumber} is being prepared (AI Automated)`,
          entityId: order.id,
          entityType: "order"
        });
      } catch (error) {
        console.error(`Error in AI automation for order ${order.id} - preparing stage:`, error);
      }
    }, 5000); // 5 seconds initial delay
    
    // Update to 'ready' status after preparing time
    const readyTimer = setTimeout(async () => {
      try {
        console.log(`AI Controller: Updating order ${order.id} to 'ready' status`);
        await storage.updateOrder(order.id, { status: "ready" });
        
        // Update kitchen token status
        const kitchenToken = await this.getKitchenTokenForOrder(order.id);
        if (kitchenToken) {
          await storage.updateKitchenToken(kitchenToken.id, { 
            status: "completed",
            completionTime: new Date()
          });
        }
        
        // Log the activity
        await storage.createActivity({
          type: "status_update",
          description: `Order #${order.orderNumber} is ready for service (AI Automated)`,
          entityId: order.id,
          entityType: "order"
        });
      } catch (error) {
        console.error(`Error in AI automation for order ${order.id} - ready stage:`, error);
      }
    }, readyTime);
    
    // Update to 'completed' status after ready time
    const completedTimer = setTimeout(async () => {
      try {
        console.log(`AI Controller: Updating order ${order.id} to 'completed' status`);
        await storage.updateOrder(order.id, { status: "completed" });
        
        // Log the activity
        await storage.createActivity({
          type: "status_update",
          description: `Order #${order.orderNumber} has been completed (AI Automated)`,
          entityId: order.id,
          entityType: "order"
        });
        
        // Create bill shortly after order is completed
        setTimeout(async () => {
          try {
            await this.createBill(order);
          } catch (error) {
            console.error(`Error creating bill for order ${order.id}:`, error);
          }
        }, billedTime - completedTime);
        
      } catch (error) {
        console.error(`Error in AI automation for order ${order.id} - completed stage:`, error);
      }
    }, completedTime);
    
    // Store timers for potential cancellation
    timers.push(preparingTimer, readyTimer, completedTimer);
    this.automationTimers.set(order.id, timers);
    
    console.log(`AI Controller: Scheduled automated progression for order ${order.id}`);
  }
  
  /**
   * Create a bill for a completed order
   */
  private async createBill(order: Order): Promise<Bill> {
    try {
      console.log(`AI Controller: Creating bill for order ${order.id}`);
      
      // Get order items
      const orderItems = await storage.getOrderItems(order.id);
      
      // Calculate subtotal and tax
      const subtotal = orderItems.reduce((total, item) => total + (item.price * item.quantity), 0);
      const taxRate = 0.18; // 18% GST
      const tax = subtotal * taxRate;
      const total = subtotal + tax;
      
      // Generate bill number (format: B + random 4-digit number)
      const billNumber = `B${Math.floor(Math.random() * 9000) + 1000}`;
      
      const billData: InsertBill = {
        orderId: order.id,
        billNumber,
        subtotal,
        tax,
        discount: 0,
        total,
        paymentStatus: "pending",
        paymentMethod: null,
        createdAt: new Date()
      };
      
      const parsedBill = insertBillSchema.parse(billData);
      const bill = await storage.createBill(parsedBill);
      
      // Update order status to 'billed'
      await storage.updateOrder(order.id, { status: "billed" });
      
      // Log the activity
      await storage.createActivity({
        type: "bill_created",
        description: `Bill #${bill.billNumber} created for Order #${order.orderNumber} (AI Automated)`,
        entityId: bill.id,
        entityType: "bill"
      });
      
      console.log(`AI Controller: Bill created for order ${order.id}: ${bill.billNumber}`);
      return bill;
    } catch (error) {
      console.error(`Error creating bill for order ${order.id}:`, error);
      throw error;
    }
  }
  
  /**
   * Cancel AI automation for an order
   */
  public cancelAutomation(orderId: number): void {
    const timers = this.automationTimers.get(orderId);
    if (timers) {
      console.log(`AI Controller: Cancelling automation for order ${orderId}`);
      timers.forEach(timer => clearTimeout(timer));
      this.automationTimers.delete(orderId);
    }
  }
  
  /**
   * Calculate order complexity based on items and quantities
   * Returns a factor from 1.0 (simple) to 3.0 (complex)
   */
  private calculateOrderComplexity(orderItems: OrderItem[]): number {
    if (!orderItems || orderItems.length === 0) return 1.0;
    
    // Base complexity on number of items and total quantity
    const itemCount = orderItems.length;
    const totalQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0);
    
    let complexityFactor = 1.0;
    
    // Adjust based on number of unique items
    if (itemCount > 5) complexityFactor += 0.5;
    if (itemCount > 10) complexityFactor += 0.5;
    
    // Adjust based on total quantity
    if (totalQuantity > 10) complexityFactor += 0.5;
    if (totalQuantity > 20) complexityFactor += 0.5;
    
    return Math.min(complexityFactor, 3.0);
  }
  
  /**
   * Get kitchen token for an order
   */
  private async getKitchenTokenForOrder(orderId: number): Promise<KitchenToken | undefined> {
    const tokens = await storage.getKitchenTokens();
    return tokens.find(token => token.orderId === orderId);
  }
  
  /**
   * Process order intake from various channels
   */
  public async processOrderFromChannel(
    channelType: 'phone' | 'whatsapp' | 'zomato' | 'swiggy' | 'manual' | 'ai',
    orderData: any
  ): Promise<Order> {
    // Standardize order data regardless of source
    const standardizedOrder = this.standardizeOrderData(channelType, orderData);
    
    // Create the order in the system
    const order = await storage.createOrder(standardizedOrder);
    
    // Create order items
    if (orderData.items && Array.isArray(orderData.items)) {
      for (const item of orderData.items) {
        await storage.createOrderItem({
          orderId: order.id,
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          price: item.price,
          notes: item.notes || null
        });
      }
    }
    
    // Start automated processing if enabled
    if (order.useAIAutomation) {
      await this.processNewOrder(order);
    }
    
    return order;
  }
  
  /**
   * Standardize order data from different channels
   */
  private standardizeOrderData(channelType: string, orderData: any): any {
    // Generate order number (format: O + random 5-digit number)
    const orderNumber = `O${Math.floor(Math.random() * 90000) + 10000}`;
    
    // Base standardized structure
    const standardizedOrder = {
      orderNumber,
      tableNumber: orderData.tableNumber || null,
      status: "pending",
      totalAmount: this.calculateTotalAmount(orderData.items || []),
      notes: orderData.notes || null,
      orderSource: channelType,
      useAIAutomation: orderData.useAIAutomation !== false, // Default to true
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    return standardizedOrder;
  }
  
  /**
   * Calculate total amount from items
   */
  private calculateTotalAmount(items: any[]): number {
    if (!items || !Array.isArray(items)) return 0;
    
    return items.reduce((total, item) => {
      const price = parseFloat(item.price) || 0;
      const quantity = parseInt(item.quantity) || 1;
      return total + (price * quantity);
    }, 0);
  }
}

// Export singleton instance
export const centralAIController = CentralAIController.getInstance();