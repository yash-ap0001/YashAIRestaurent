import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { EventEmitter } from 'events';
import { processNaturalLanguageOrder } from '../aiService';

// Fix for missing declarations
declare module 'qrcode-terminal';

// Types for WhatsApp message events
type MessageHandler = (message: any, customer: { name: string, phone: string }) => Promise<void>;

class WhatsAppClient extends EventEmitter {
  private client: Client;
  private isReady: boolean = false;
  private messageHandlers: Map<string, MessageHandler> = new Map();

  constructor() {
    super();
    
    // Create the WhatsApp client with local authentication
    this.client = new Client({
      authStrategy: new LocalAuth({ dataPath: './whatsapp-sessions' }),
      puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    });

    // Initialize event listeners
    this.initEventListeners();
  }

  private initEventListeners() {
    // Generate QR code for authentication
    this.client.on('qr', (qr) => {
      console.log('WhatsApp QR Code:');
      qrcode.generate(qr, { small: true });
      this.emit('qrCode', qr);
    });

    // Log when client is ready
    this.client.on('ready', () => {
      console.log('WhatsApp client is ready!');
      this.isReady = true;
      this.emit('ready');
    });

    // Handle authentication failures
    this.client.on('auth_failure', (error) => {
      console.error('WhatsApp authentication failed:', error);
      this.emit('authFailure', error);
    });

    // Handle incoming messages
    this.client.on('message', async (message) => {
      try {
        if (message.from.endsWith('@c.us')) { // Only process private chats
          const contact = await message.getContact();
          const customerName = contact.name || contact.pushname || 'Unknown';
          const phone = message.from.replace('@c.us', '');
          
          console.log(`Message from ${customerName} (${phone}): ${message.body}`);
          
          // Check if this is an order message
          if (message.body.toLowerCase().startsWith('order:') || 
              message.body.toLowerCase().startsWith('order ')) {
            await this.handleOrderMessage(message, { name: customerName, phone });
          } 
          // Check for bill request
          else if (message.body.toLowerCase().includes('bill') || 
                   message.body.toLowerCase().includes('pay')) {
            await this.handleBillRequest(message, { name: customerName, phone });
          }
          // Otherwise provide help
          else {
            await this.sendHelpMessage(message.from);
          }
        }
      } catch (error) {
        console.error('Error handling WhatsApp message:', error);
      }
    });

    // Handle disconnections
    this.client.on('disconnected', (reason) => {
      console.log('WhatsApp client disconnected:', reason);
      this.isReady = false;
      this.emit('disconnected', reason);
      
      // Attempt to reconnect
      this.initialize();
    });
  }

  /**
   * Initialize the WhatsApp client
   */
  async initialize() {
    try {
      console.log('Initializing WhatsApp client...');
      await this.client.initialize();
    } catch (error) {
      console.error('Failed to initialize WhatsApp client:', error);
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
      // Format the phone number if needed
      const formattedNumber = to.includes('@c.us') ? to : `${to}@c.us`;
      await this.client.sendMessage(formattedNumber, text);
      return true;
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      throw error;
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
      await this.client.sendMessage(
        message.from, 
        `Thank you for your order, ${customer.name}! We're processing it now...`
      );
      
      // Process the order using our NLP AI service
      // This process would include getting menu items from the database and processing
      // the natural language order
      const menuItems = await this.getMenuItems();
      const processedOrder = await processNaturalLanguageOrder(orderText, menuItems);
      
      // Create actual order in the system
      const createdOrder = await this.createOrder(processedOrder, customer);
      
      // Send confirmation with order details
      const confirmationMessage = this.formatOrderConfirmation(createdOrder);
      await this.client.sendMessage(message.from, confirmationMessage);
      
    } catch (error) {
      console.error('Error processing order from WhatsApp:', error);
      await this.client.sendMessage(
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
        await this.client.sendMessage(
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
        
        await this.client.sendMessage(message.from, orderListMessage);
      } else {
        // If only one order, send the bill directly
        const bill = await this.generateBill(customerOrders[0].id);
        await this.sendBill(message.from, bill);
      }
    } catch (error) {
      console.error('Error handling bill request from WhatsApp:', error);
      await this.client.sendMessage(
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
      "• For assistance, contact us at: +91-XXXXXXXXXX";
    
    await this.client.sendMessage(to, helpMessage);
  }

  /**
   * Helper function to get menu items from the database
   */
  private async getMenuItems() {
    // This would be replaced with actual storage calls
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
      
      // Create the order
      const order = await storage.createOrder({
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
        description: `New order #${order.orderNumber} placed via WhatsApp by ${customer.name}`,
        timestamp: new Date()
      });
      
      // Create kitchen token
      await storage.createKitchenToken({
        orderId: order.id,
        status: "pending",
        isUrgent: false,
        startTime: new Date()
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
          amount: order.totalAmount,
          status: "pending",
          createdAt: new Date()
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
      
      await this.client.sendMessage(to, billMessage);
      
      // In a real implementation, we could also generate and send a PDF bill
      // or provide a payment link
      
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
}

// Singleton instance
let whatsappClient: WhatsAppClient | null = null;

export function getWhatsAppClient() {
  if (!whatsappClient) {
    whatsappClient = new WhatsAppClient();
  }
  return whatsappClient;
}