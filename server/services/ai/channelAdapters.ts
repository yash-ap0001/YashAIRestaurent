import { Order } from '@shared/schema';
import { centralAIController } from './centralController';

/**
 * Channel Adapter Interface
 * 
 * Defines the standard interface that all channel-specific adapters must implement.
 * This ensures consistent handling of orders across different input channels.
 */
export interface ChannelAdapter {
  channelType: 'phone' | 'whatsapp' | 'zomato' | 'swiggy' | 'manual' | 'ai';
  processIncomingOrder(rawData: any): Promise<Order>;
  sendOrderConfirmation(order: Order): Promise<boolean>;
  sendStatusUpdate(order: Order, status: string): Promise<boolean>;
  sendBill(order: Order, billId: number): Promise<boolean>;
}

/**
 * WhatsApp Channel Adapter
 * 
 * Handles WhatsApp-specific order processing and notifications.
 */
export class WhatsAppChannelAdapter implements ChannelAdapter {
  channelType: 'whatsapp' = 'whatsapp';
  
  /**
   * Process an order coming from WhatsApp
   */
  async processIncomingOrder(rawData: any): Promise<Order> {
    console.log('WhatsApp Adapter: Processing incoming order', rawData);
    
    // Extract customer contact
    const customerPhone = rawData.customerPhone || rawData.from;
    
    // Prepare standardized order data
    const orderData = {
      ...rawData,
      orderSource: this.channelType,
      useAIAutomation: true
    };
    
    // Hand off to central controller
    return centralAIController.processOrderFromChannel(this.channelType, orderData);
  }
  
  /**
   * Send order confirmation via WhatsApp
   */
  async sendOrderConfirmation(order: Order): Promise<boolean> {
    console.log(`WhatsApp Adapter: Sending confirmation for order ${order.id}`);
    
    // TODO: Implement actual WhatsApp messaging
    // This would connect to the WhatsApp Business API
    
    return true;
  }
  
  /**
   * Send status update via WhatsApp
   */
  async sendStatusUpdate(order: Order, status: string): Promise<boolean> {
    console.log(`WhatsApp Adapter: Sending status update for order ${order.id} - ${status}`);
    
    // TODO: Implement actual WhatsApp messaging
    // This would connect to the WhatsApp Business API
    
    return true;
  }
  
  /**
   * Send bill via WhatsApp
   */
  async sendBill(order: Order, billId: number): Promise<boolean> {
    console.log(`WhatsApp Adapter: Sending bill ${billId} for order ${order.id}`);
    
    // TODO: Implement actual WhatsApp messaging
    // This would connect to the WhatsApp Business API
    
    return true;
  }
}

/**
 * Phone Channel Adapter
 * 
 * Handles phone call order processing and SMS notifications.
 */
export class PhoneChannelAdapter implements ChannelAdapter {
  channelType: 'phone' = 'phone';
  
  /**
   * Process an order coming from a phone call
   */
  async processIncomingOrder(rawData: any): Promise<Order> {
    console.log('Phone Adapter: Processing incoming order', rawData);
    
    // Extract customer contact
    const customerPhone = rawData.customerPhone || rawData.from;
    
    // Prepare standardized order data
    const orderData = {
      ...rawData,
      orderSource: this.channelType,
      useAIAutomation: true
    };
    
    // Hand off to central controller
    return centralAIController.processOrderFromChannel(this.channelType, orderData);
  }
  
  /**
   * Send order confirmation via SMS
   */
  async sendOrderConfirmation(order: Order): Promise<boolean> {
    console.log(`Phone Adapter: Sending confirmation for order ${order.id}`);
    
    // TODO: Implement actual SMS messaging
    // This would connect to the Twilio API or similar service
    
    return true;
  }
  
  /**
   * Send status update via SMS
   */
  async sendStatusUpdate(order: Order, status: string): Promise<boolean> {
    console.log(`Phone Adapter: Sending status update for order ${order.id} - ${status}`);
    
    // TODO: Implement actual SMS messaging
    // This would connect to the Twilio API or similar service
    
    return true;
  }
  
  /**
   * Send bill information via SMS
   */
  async sendBill(order: Order, billId: number): Promise<boolean> {
    console.log(`Phone Adapter: Sending bill ${billId} for order ${order.id}`);
    
    // TODO: Implement actual SMS messaging
    // This would connect to the Twilio API or similar service
    
    return true;
  }
}

/**
 * Zomato Channel Adapter
 * 
 * Handles Zomato-specific order processing and API callbacks.
 */
export class ZomatoChannelAdapter implements ChannelAdapter {
  channelType: 'zomato' = 'zomato';
  
  /**
   * Process an order coming from Zomato
   */
  async processIncomingOrder(rawData: any): Promise<Order> {
    console.log('Zomato Adapter: Processing incoming order', rawData);
    
    // Extract Zomato order ID for reference
    const zomatoOrderId = rawData.zomatoOrderId || rawData.external_id;
    
    // Prepare standardized order data
    const orderData = {
      ...rawData,
      orderSource: this.channelType,
      notes: `Zomato Order ID: ${zomatoOrderId}`,
      useAIAutomation: true
    };
    
    // Hand off to central controller
    return centralAIController.processOrderFromChannel(this.channelType, orderData);
  }
  
  /**
   * Send order confirmation to Zomato API
   */
  async sendOrderConfirmation(order: Order): Promise<boolean> {
    console.log(`Zomato Adapter: Sending confirmation for order ${order.id}`);
    
    // TODO: Implement actual Zomato API callback
    // This would hit Zomato's API to confirm the order
    
    return true;
  }
  
  /**
   * Send status update to Zomato API
   */
  async sendStatusUpdate(order: Order, status: string): Promise<boolean> {
    console.log(`Zomato Adapter: Sending status update for order ${order.id} - ${status}`);
    
    // TODO: Implement actual Zomato API callback
    // This would hit Zomato's API to update the order status
    
    return true;
  }
  
  /**
   * Send bill to Zomato API
   */
  async sendBill(order: Order, billId: number): Promise<boolean> {
    console.log(`Zomato Adapter: Sending bill ${billId} for order ${order.id}`);
    
    // TODO: Implement actual Zomato API callback
    // This would hit Zomato's API to send bill information
    
    return true;
  }
}

/**
 * Swiggy Channel Adapter
 * 
 * Handles Swiggy-specific order processing and API callbacks.
 */
export class SwiggyChannelAdapter implements ChannelAdapter {
  channelType: 'swiggy' = 'swiggy';
  
  /**
   * Process an order coming from Swiggy
   */
  async processIncomingOrder(rawData: any): Promise<Order> {
    console.log('Swiggy Adapter: Processing incoming order', rawData);
    
    // Extract Swiggy order ID for reference
    const swiggyOrderId = rawData.swiggyOrderId || rawData.external_id;
    
    // Prepare standardized order data
    const orderData = {
      ...rawData,
      orderSource: this.channelType,
      notes: `Swiggy Order ID: ${swiggyOrderId}`,
      useAIAutomation: true
    };
    
    // Hand off to central controller
    return centralAIController.processOrderFromChannel(this.channelType, orderData);
  }
  
  /**
   * Send order confirmation to Swiggy API
   */
  async sendOrderConfirmation(order: Order): Promise<boolean> {
    console.log(`Swiggy Adapter: Sending confirmation for order ${order.id}`);
    
    // TODO: Implement actual Swiggy API callback
    // This would hit Swiggy's API to confirm the order
    
    return true;
  }
  
  /**
   * Send status update to Swiggy API
   */
  async sendStatusUpdate(order: Order, status: string): Promise<boolean> {
    console.log(`Swiggy Adapter: Sending status update for order ${order.id} - ${status}`);
    
    // TODO: Implement actual Swiggy API callback
    // This would hit Swiggy's API to update the order status
    
    return true;
  }
  
  /**
   * Send bill to Swiggy API
   */
  async sendBill(order: Order, billId: number): Promise<boolean> {
    console.log(`Swiggy Adapter: Sending bill ${billId} for order ${order.id}`);
    
    // TODO: Implement actual Swiggy API callback
    // This would hit Swiggy's API to send bill information
    
    return true;
  }
}

/**
 * Manual Channel Adapter
 * 
 * Handles orders entered manually through the app UI.
 */
export class ManualChannelAdapter implements ChannelAdapter {
  channelType: 'manual' = 'manual';
  
  /**
   * Process an order entered manually
   */
  async processIncomingOrder(rawData: any): Promise<Order> {
    console.log('Manual Adapter: Processing incoming order', rawData);
    
    // Prepare standardized order data
    const orderData = {
      ...rawData,
      orderSource: this.channelType,
      // For manual orders, respect the useAIAutomation flag as set by staff
      useAIAutomation: rawData.useAIAutomation !== undefined ? rawData.useAIAutomation : true
    };
    
    // Hand off to central controller
    return centralAIController.processOrderFromChannel(this.channelType, orderData);
  }
  
  /**
   * No external confirmation needed for manual orders
   */
  async sendOrderConfirmation(order: Order): Promise<boolean> {
    console.log(`Manual Adapter: Order ${order.id} confirmed (no external notification needed)`);
    return true;
  }
  
  /**
   * No external status update needed for manual orders
   */
  async sendStatusUpdate(order: Order, status: string): Promise<boolean> {
    console.log(`Manual Adapter: Order ${order.id} status updated to ${status} (no external notification needed)`);
    return true;
  }
  
  /**
   * No external bill notification needed for manual orders
   */
  async sendBill(order: Order, billId: number): Promise<boolean> {
    console.log(`Manual Adapter: Bill ${billId} created for order ${order.id} (no external notification needed)`);
    return true;
  }
}

/**
 * AI Channel Adapter
 * 
 * Handles orders created directly by AI (e.g., from natural language processing).
 */
export class AIChannelAdapter implements ChannelAdapter {
  channelType: 'ai' = 'ai';
  
  /**
   * Process an order created by AI
   */
  async processIncomingOrder(rawData: any): Promise<Order> {
    console.log('AI Adapter: Processing incoming order', rawData);
    
    // Prepare standardized order data
    const orderData = {
      ...rawData,
      orderSource: this.channelType,
      useAIAutomation: true // AI-created orders are always AI-automated
    };
    
    // Hand off to central controller
    return centralAIController.processOrderFromChannel(this.channelType, orderData);
  }
  
  /**
   * Send confirmation through applicable channel if customer contact is available
   */
  async sendOrderConfirmation(order: Order): Promise<boolean> {
    console.log(`AI Adapter: Sending confirmation for order ${order.id}`);
    
    // If customer contact is available, route to appropriate channel
    if (order.notes && order.notes.includes('phone:')) {
      // Route to phone adapter
      const phoneAdapter = new PhoneChannelAdapter();
      return phoneAdapter.sendOrderConfirmation(order);
    } else if (order.notes && order.notes.includes('whatsapp:')) {
      // Route to WhatsApp adapter
      const whatsappAdapter = new WhatsAppChannelAdapter();
      return whatsappAdapter.sendOrderConfirmation(order);
    }
    
    return true;
  }
  
  /**
   * Send status update through applicable channel if customer contact is available
   */
  async sendStatusUpdate(order: Order, status: string): Promise<boolean> {
    console.log(`AI Adapter: Sending status update for order ${order.id} - ${status}`);
    
    // If customer contact is available, route to appropriate channel
    if (order.notes && order.notes.includes('phone:')) {
      // Route to phone adapter
      const phoneAdapter = new PhoneChannelAdapter();
      return phoneAdapter.sendStatusUpdate(order, status);
    } else if (order.notes && order.notes.includes('whatsapp:')) {
      // Route to WhatsApp adapter
      const whatsappAdapter = new WhatsAppChannelAdapter();
      return whatsappAdapter.sendStatusUpdate(order, status);
    }
    
    return true;
  }
  
  /**
   * Send bill through applicable channel if customer contact is available
   */
  async sendBill(order: Order, billId: number): Promise<boolean> {
    console.log(`AI Adapter: Sending bill ${billId} for order ${order.id}`);
    
    // If customer contact is available, route to appropriate channel
    if (order.notes && order.notes.includes('phone:')) {
      // Route to phone adapter
      const phoneAdapter = new PhoneChannelAdapter();
      return phoneAdapter.sendBill(order, billId);
    } else if (order.notes && order.notes.includes('whatsapp:')) {
      // Route to WhatsApp adapter
      const whatsappAdapter = new WhatsAppChannelAdapter();
      return whatsappAdapter.sendBill(order, billId);
    }
    
    return true;
  }
}

// Export adapter factory
export function getChannelAdapter(channelType: 'phone' | 'whatsapp' | 'zomato' | 'swiggy' | 'manual' | 'ai'): ChannelAdapter {
  switch (channelType) {
    case 'whatsapp':
      return new WhatsAppChannelAdapter();
    case 'phone':
      return new PhoneChannelAdapter();
    case 'zomato':
      return new ZomatoChannelAdapter();
    case 'swiggy':
      return new SwiggyChannelAdapter();
    case 'manual':
      return new ManualChannelAdapter();
    case 'ai':
      return new AIChannelAdapter();
    default:
      throw new Error(`Unknown channel type: ${channelType}`);
  }
}