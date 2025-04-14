import { EventEmitter } from 'events';
import { processNaturalLanguageOrder } from '../aiService';

// Types for WhatsApp message events
type MessageHandler = (message: any, customer: { name: string, phone: string }) => Promise<void>;

/**
 * A mock WhatsApp client for demo purposes.
 * In a real implementation, this would use whatsapp-web.js or the WhatsApp Business API.
 */
class WhatsAppClient extends EventEmitter {
  private isReady: boolean = false;
  private messageHandlers: Map<string, MessageHandler> = new Map();
  private mockMessages: any[] = [];

  constructor() {
    super();
  }

  /**
   * Initialize the WhatsApp client
   */
  async initialize() {
    try {
      console.log('Initializing demo WhatsApp client...');
      
      // Simulate successful connection after a short delay
      setTimeout(() => {
        this.isReady = true;
        this.emit('ready');
        console.log('Demo WhatsApp client is ready!');
      }, 1000);
      
      return true;
    } catch (error) {
      console.error('Failed to initialize demo WhatsApp client:', error);
      throw error;
    }
  }

  /**
   * Send a message to a specific phone number
   */
  async sendMessage(to: string, text: string) {
    if (!this.isReady) {
      throw new Error('WhatsApp client is not ready yet');
    }

    try {
      console.log(`[WhatsApp] Sending message to ${to}: ${text}`);
      
      // Store the message in our mock message array
      this.mockMessages.push({
        to,
        text,
        timestamp: new Date()
      });
      
      return true;
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      throw error;
    }
  }

  /**
   * Simulate receiving a message to test functionality
   */
  async simulateIncomingMessage(from: string, text: string, contact: { name: string }) {
    if (!this.isReady) {
      console.warn('Cannot simulate message, client not ready');
      return;
    }
    
    const message = {
      from,
      body: text,
      getContact: async () => contact
    };
    
    console.log(`[WhatsApp] Received message from ${from}: ${text}`);
    
    try {
      if (text.toLowerCase().startsWith('order:') || text.toLowerCase().startsWith('order ')) {
        await this.handleOrderMessage(message, { name: contact.name, phone: from.replace('@c.us', '') });
      } 
      else if (text.toLowerCase().includes('bill') || text.toLowerCase().includes('pay')) {
        await this.handleBillRequest(message, { name: contact.name, phone: from.replace('@c.us', '') });
      }
      else {
        await this.sendHelpMessage(from);
      }
    } catch (error) {
      console.error('Error handling simulated message:', error);
    }
  }

  /**
   * Handle incoming order messages
   */
  private async handleOrderMessage(message: any, customer: { name: string, phone: string }) {
    try {
      // Extract the order text
      let orderText = message.body;
      if (orderText.toLowerCase().startsWith('order:')) {
        orderText = orderText.substring(6).trim();
      } else if (orderText.toLowerCase().startsWith('order ')) {
        orderText = orderText.substring(6).trim();
      }
      
      // Send acknowledgement
      await this.sendMessage(
        message.from, 
        `Thank you for your order, ${customer.name}! We're processing it now...`
      );
      
      // Process the order using our NLP AI service
      const menuItems = await this.getMenuItems();
      const processedOrder = await processNaturalLanguageOrder(orderText, menuItems);
      
      // Create actual order in the system
      const createdOrder = await this.createOrder(processedOrder, customer);
      
      // Send confirmation with order details
      const confirmationMessage = this.formatOrderConfirmation(createdOrder);
      await this.sendMessage(message.from, confirmationMessage);
      
    } catch (error) {
      console.error('Error processing order from WhatsApp:', error);
      await this.sendMessage(
        message.from, 
        "Sorry, we couldn't process your order. Please try again or call us directly."
      );
    }
  }

  /**
   * Handle bill request messages
   */
  private async handleBillRequest(message: any, customer: { name: string, phone: string }) {
    try {
      // Find recent orders for this customer
      const customerOrders = await this.getCustomerOrders(customer.phone);
      
      if (customerOrders.length === 0) {
        await this.sendMessage(
          message.from, 
          "Sorry, we couldn't find any recent orders for your number. If you believe this is an error, please contact us."
        );
        return;
      }
      
      // If there are multiple orders, ask which one they want the bill for
      if (customerOrders.length > 1) {
        let orderListMessage = "We found multiple orders for you. Please reply with the number of the order you'd like to see the bill for:\n\n";
        
        customerOrders.forEach((order, index) => {
          orderListMessage += `${index + 1}. Order #${order.orderNumber} - ₹${order.totalAmount.toFixed(2)}\n`;
        });
        
        await this.sendMessage(message.from, orderListMessage);
      } else {
        // If only one order, send the bill directly
        const bill = await this.generateBill(customerOrders[0].id);
        await this.sendBill(message.from, bill);
      }
    } catch (error) {
      console.error('Error handling bill request from WhatsApp:', error);
      await this.sendMessage(
        message.from, 
        "Sorry, we couldn't retrieve your bill at the moment. Please try again later or contact us directly."
      );
    }
  }

  /**
   * Send a help message with available commands
   */
  private async sendHelpMessage(to: string) {
    const helpMessage = 
      "Welcome to YashHotelBot! Here's how you can use our service:\n\n" +
      "• To place an order, start your message with 'Order:' followed by your items\n" +
      "  Example: 'Order: 2 butter chicken, 3 naan, 1 paneer tikka'\n\n" +
      "• To request your bill, simply send 'bill' or 'show my bill'\n\n" +
      "• For assistance, contact us at: +91-1234567890";
    
    await this.sendMessage(to, helpMessage);
  }

  /**
   * Helper function to get menu items from the database
   */
  private async getMenuItems() {
    try {
      // Import dynamically to avoid circular dependencies
      const { storage } = await import('../../storage');
      return await storage.getMenuItems();
    } catch (error) {
      console.error('Error fetching menu items:', error);
      return [];
    }
  }

  /**
   * Helper function to create an order in the system
   */
  private async createOrder(processedOrder: any, customer: { name: string, phone: string }) {
    try {
      // Import dynamically to avoid circular dependencies
      const { storage } = await import('../../storage');
      
      // Check if customer exists, create if not
      let customerRecord = await storage.getCustomerByPhone(customer.phone);
      if (!customerRecord) {
        customerRecord = await storage.createCustomer({
          name: customer.name,
          phone: customer.phone,
          email: null,
          visitCount: 1,
          preferences: null
        });
      }
      
      // Create the order with generated order number
      const orderNumber = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
      const order = await storage.createOrder({
        orderNumber,
        tableNumber: "WhatsApp",
        status: "pending",
        totalAmount: processedOrder.items.reduce((sum: number, item: any) => 
          sum + (item.quantity * item.price), 0),
        notes: processedOrder.notes || "Order placed via WhatsApp"
      });
      
      // Create order items
      for (const item of processedOrder.items) {
        await storage.createOrderItem({
          orderId: order.id,
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          price: item.price,
          notes: item.notes || ""
        });
      }
      
      // Create activity record
      await storage.createActivity({
        type: "order_created",
        description: `New order #${order.orderNumber} placed via WhatsApp by ${customer.name}`
      });
      
      // Create kitchen token
      await storage.createKitchenToken({
        orderId: order.id,
        tokenNumber: `T${Math.floor(10 + Math.random() * 90)}`,
        status: "pending",
        isUrgent: false
      });
      
      return order;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  /**
   * Helper function to get customer's orders
   */
  private async getCustomerOrders(phone: string) {
    try {
      // In a real implementation, we would query by customer ID or phone
      // For now, we'll just return all orders as a placeholder
      const { storage } = await import('../../storage');
      const orders = await storage.getOrders();
      return orders.slice(-5); // Return the 5 most recent orders as a placeholder
    } catch (error) {
      console.error('Error fetching customer orders:', error);
      return [];
    }
  }

  /**
   * Helper function to generate a bill for an order
   */
  private async generateBill(orderId: number) {
    try {
      const { storage } = await import('../../storage');
      
      const order = await storage.getOrder(orderId);
      if (!order) throw new Error('Order not found');
      
      const orderItems = await storage.getOrderItems(orderId);
      const billItems = await Promise.all(orderItems.map(async (item) => {
        const menuItem = await storage.getMenuItem(item.menuItemId);
        return {
          name: menuItem?.name || 'Unknown item',
          quantity: item.quantity,
          price: item.price,
          subtotal: item.quantity * item.price
        };
      }));
      
      // Create a bill record if it doesn't exist
      let bill = (await storage.getBills()).find(b => b.orderId === orderId);
      if (!bill) {
        bill = await storage.createBill({
          orderId: orderId,
          billNumber: `BILL-${Math.floor(Math.random() * 10000)}`,
          subtotal: order.totalAmount,
          tax: order.totalAmount * 0.05, // 5% tax
          discount: 0,
          total: order.totalAmount * 1.05, // total with tax
          paymentStatus: "pending",
          paymentMethod: null
        });
      }
      
      return {
        billNumber: bill.billNumber,
        orderNumber: order.orderNumber,
        items: billItems,
        totalAmount: order.totalAmount,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Error generating bill:', error);
      throw error;
    }
  }

  /**
   * Helper function to send a bill to a customer
   */
  private async sendBill(to: string, bill: any) {
    try {
      // Format the bill as a text message
      let billMessage = `*BILL: ${bill.billNumber}*\n`;
      billMessage += `Order: ${bill.orderNumber}\n`;
      billMessage += `Date: ${bill.generatedAt.toLocaleString()}\n\n`;
      billMessage += `*ITEMS*\n`;
      
      bill.items.forEach((item: any) => {
        billMessage += `${item.name} x${item.quantity} - ₹${item.subtotal.toFixed(2)}\n`;
      });
      
      billMessage += `\n*TOTAL: ₹${bill.totalAmount.toFixed(2)}*\n\n`;
      billMessage += "Thank you for your order! Please pay at the counter or use our online payment options.";
      
      await this.sendMessage(to, billMessage);
      
    } catch (error) {
      console.error('Error sending bill:', error);
      throw error;
    }
  }

  /**
   * Helper function to format order confirmation
   */
  private formatOrderConfirmation(order: any) {
    return `*Order Confirmed!*\n\n` +
           `Order Number: ${order.orderNumber}\n` +
           `Status: ${order.status}\n` +
           `Total Amount: ₹${order.totalAmount.toFixed(2)}\n\n` +
           `Your order has been received and is being processed. You can check the status of your order or request your bill by sending 'bill' on WhatsApp.`;
  }

  /**
   * Get all messages sent by this client (for debugging and demo purposes)
   */
  getMessageHistory() {
    return this.mockMessages;
  }
}

// Singleton instance
let whatsappClient: WhatsAppClient | null = null;

export function getWhatsAppClient() {
  if (!whatsappClient) {
    whatsappClient = new WhatsAppClient();
  }
  return whatsappClient;
}