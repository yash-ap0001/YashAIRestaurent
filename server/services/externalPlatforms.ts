import { storage } from '../storage';
import { generateOrderNumber, generateTokenNumber } from '../utils';
import { insertOrderSchema, insertOrderItemSchema, insertKitchenTokenSchema } from '@shared/schema';
import { centralAIController } from './ai';

export interface ExternalOrderData {
  platformId: string;
  platformName: 'zomato' | 'swiggy';
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  orderItems: Array<{
    name: string;
    menuItemId?: number;
    quantity: number;
    price: number;
    notes?: string;
  }>;
  totalAmount: number;
  deliveryAddress?: string;
  specialInstructions?: string;
  paymentMethod?: string;
  isUrgent?: boolean;
}

/**
 * Handles incoming orders from external platforms like Zomato and Swiggy
 */
export async function processExternalOrder(orderData: ExternalOrderData) {
  try {
    console.log(`Processing order from ${orderData.platformName} with ID: ${orderData.platformId}`);
    
    // Check if customer exists
    let customerId: number | null = null;
    if (orderData.customerPhone) {
      const existingCustomer = await storage.getCustomerByPhone(orderData.customerPhone);
      if (existingCustomer) {
        customerId = existingCustomer.id;
        
        // Update visit count
        await storage.updateCustomer(existingCustomer.id, {
          visitCount: (existingCustomer.visitCount || 0) + 1,
          lastVisit: new Date()
        });
      } else {
        // Create new customer
        const newCustomer = await storage.createCustomer({
          name: orderData.customerName,
          phone: orderData.customerPhone,
          email: orderData.customerEmail || null,
          visitCount: 1,
          lastVisit: new Date(),
          preferences: null
        });
        customerId = newCustomer.id;
      }
    }
    
    // Create order in our system
    const orderNumber = generateOrderNumber(); 
    const orderToCreate = {
      orderNumber,
      tableNumber: null,
      status: 'pending',
      totalAmount: orderData.totalAmount,
      notes: orderData.specialInstructions || null,
      orderSource: orderData.platformName,
      useAIAutomation: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const parsedOrder = insertOrderSchema.parse(orderToCreate);
    const createdOrder = await storage.createOrder(parsedOrder);
    
    // Create order items
    for (const item of orderData.orderItems) {
      // Try to find menuItemId if not provided
      let menuItemId = item.menuItemId;
      if (!menuItemId) {
        // Try to find a matching menu item by name
        const menuItems = await storage.getMenuItems();
        const matchingItem = menuItems.find(mi => 
          mi.name.toLowerCase() === item.name.toLowerCase());
        
        if (matchingItem) {
          menuItemId = matchingItem.id;
        }
      }
      
      const orderItem = {
        orderId: createdOrder.id,
        menuItemId: menuItemId || 0, // Fallback if no match
        quantity: item.quantity,
        price: item.price,
        notes: item.notes || null
      };
      
      const parsedOrderItem = insertOrderItemSchema.parse(orderItem);
      await storage.createOrderItem(parsedOrderItem);
    }
    
    // Create kitchen token
    const kitchenToken = {
      orderId: createdOrder.id,
      tokenNumber: generateTokenNumber(),
      status: 'pending',
      isUrgent: orderData.isUrgent || false
    };
    
    const parsedToken = insertKitchenTokenSchema.parse(kitchenToken);
    await storage.createKitchenToken(parsedToken);
    
    // Log activity
    await storage.createActivity({
      type: 'order_created',
      description: `Order #${orderNumber} received from ${orderData.platformName}`,
      entityId: createdOrder.id,
      entityType: 'order',
      createdAt: new Date()
    });
    
    // Send to AI controller for automated processing
    await centralAIController.processNewOrder(createdOrder);
    
    return {
      success: true,
      order: createdOrder
    };
  } catch (error) {
    console.error(`Error processing external order from ${orderData.platformName}:`, error);
    return {
      success: false,
      error: `Failed to process ${orderData.platformName} order: ${error.message}`
    };
  }
}

/**
 * Simulates receiving an order from Zomato
 */
export async function simulateZomatoOrder(orderData: Partial<ExternalOrderData>) {
  const zomatoOrder: ExternalOrderData = {
    platformId: `ZOMATO-${Math.floor(100000 + Math.random() * 900000)}`,
    platformName: 'zomato',
    customerName: orderData.customerName || 'Zomato Customer',
    customerPhone: orderData.customerPhone || null,
    customerEmail: orderData.customerEmail || null,
    orderItems: orderData.orderItems || [],
    totalAmount: orderData.totalAmount || 0,
    deliveryAddress: orderData.deliveryAddress || 'Delivery Address',
    specialInstructions: orderData.specialInstructions || null,
    paymentMethod: orderData.paymentMethod || 'zomato_pay',
    isUrgent: orderData.isUrgent || false
  };
  
  return processExternalOrder(zomatoOrder);
}

/**
 * Simulates receiving an order from Swiggy
 */
export async function simulateSwiggyOrder(orderData: Partial<ExternalOrderData>) {
  const swiggyOrder: ExternalOrderData = {
    platformId: `SWIGGY-${Math.floor(100000 + Math.random() * 900000)}`,
    platformName: 'swiggy',
    customerName: orderData.customerName || 'Swiggy Customer',
    customerPhone: orderData.customerPhone || null,
    customerEmail: orderData.customerEmail || null,
    orderItems: orderData.orderItems || [],
    totalAmount: orderData.totalAmount || 0,
    deliveryAddress: orderData.deliveryAddress || 'Delivery Address',
    specialInstructions: orderData.specialInstructions || null,
    paymentMethod: orderData.paymentMethod || 'swiggy_pay',
    isUrgent: orderData.isUrgent || false
  };
  
  return processExternalOrder(swiggyOrder);
}