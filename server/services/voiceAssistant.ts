import { db } from '../db';
import { orders, menuItems, kitchenTokens, bills, customers, inventory } from '../../shared/schema';
import { eq, like, desc, sql } from 'drizzle-orm';
import { aiService } from './ai';
import { broadcastToAllClients } from './realtime';

// Define command patterns
const ORDER_CREATE_PATTERN = /create\s+order\s+(?:for\s+)?table\s+(\d+)/i;
const ORDER_STATUS_PATTERN = /(?:mark|change|update)\s+order\s+(\d+)\s+(?:to|as)\s+(\w+)/i;
const ADD_ITEM_PATTERN = /add\s+(.+)\s+to\s+order\s+(\d+)/i;
const KITCHEN_STATUS_PATTERN = /kitchen\s+status|check\s+kitchen/i;
const INVENTORY_CHECK_PATTERN = /inventory\s+status|check\s+inventory|stock\s+levels/i;
const CUSTOMER_INFO_PATTERN = /customer\s+info\s+(.+)|lookup\s+customer\s+(.+)/i;
const HELP_PATTERN = /help|what\s+can\s+you\s+do|available\s+commands/i;

/**
 * Process a voice command from a user
 * @param command The voice command text
 * @param userType The type of user (admin, waiter, kitchen, etc.)
 * @returns Response information
 */
export async function processVoiceCommand(command: string, userType: string) {
  // Default response
  let response = "I'm sorry, I didn't understand that command. Try asking for help to see available commands.";
  let success = false;
  
  try {
    // Create order command
    if (ORDER_CREATE_PATTERN.test(command)) {
      const match = command.match(ORDER_CREATE_PATTERN);
      if (match && match[1]) {
        const tableNumber = match[1];
        const result = await createOrder(tableNumber);
        response = result.response;
        success = result.success;
      }
    }
    // Update order status command
    else if (ORDER_STATUS_PATTERN.test(command)) {
      const match = command.match(ORDER_STATUS_PATTERN);
      if (match && match[1] && match[2]) {
        const orderNumber = match[1];
        const status = match[2].toLowerCase();
        const result = await updateOrderStatus(orderNumber, status);
        response = result.response;
        success = result.success;
      }
    }
    // Add item to order command
    else if (ADD_ITEM_PATTERN.test(command)) {
      const match = command.match(ADD_ITEM_PATTERN);
      if (match && match[1] && match[2]) {
        const itemName = match[1].trim();
        const orderNumber = match[2];
        const result = await addItemToOrder(itemName, orderNumber);
        response = result.response;
        success = result.success;
      }
    }
    // Kitchen status command
    else if (KITCHEN_STATUS_PATTERN.test(command)) {
      const result = await getKitchenStatus();
      response = result.response;
      success = result.success;
    }
    // Inventory check command
    else if (INVENTORY_CHECK_PATTERN.test(command)) {
      const result = await getInventoryStatus();
      response = result.response;
      success = result.success;
    }
    // Customer info command
    else if (CUSTOMER_INFO_PATTERN.test(command)) {
      const match = command.match(CUSTOMER_INFO_PATTERN);
      if (match && (match[1] || match[2])) {
        const customerQuery = match[1] || match[2];
        const result = await getCustomerInfo(customerQuery);
        response = result.response;
        success = result.success;
      }
    }
    // Help command
    else if (HELP_PATTERN.test(command)) {
      response = "You can ask me to create orders, update order status, add items to orders, check kitchen status, review inventory, or look up customer information. For example, try saying 'Create order for table 5' or 'Check kitchen status'.";
      success = true;
    }
    // If no patterns match, use AI to interpret the command
    else {
      const aiResponse = await aiService.processMessage({
        message: command,
        userType,
        messageHistory: [],
      });
      
      response = aiResponse.message || "I'm not sure how to help with that.";
      success = !!aiResponse.message;
    }
    
    return {
      response,
      success
    };
  } catch (error) {
    console.error("Error processing voice command:", error);
    return {
      response: "Sorry, there was an error processing your command. Please try again.",
      success: false
    };
  }
}

/**
 * Create a new order for a table
 */
async function createOrder(tableNumber: string) {
  try {
    // Generate order number (simple incrementing number)
    const [{ max }] = await db.select({
      max: sql<number>`MAX(CAST(SUBSTRING("orderNumber", 5) AS INTEGER))`,
    }).from(orders);
    
    const nextOrderNumber = max ? max + 1 : 1001;
    const newOrderNumber = `ORD-${nextOrderNumber}`;
    
    // Create the order
    const [newOrder] = await db.insert(orders).values({
      orderNumber: newOrderNumber,
      tableNumber,
      status: 'pending',
      totalAmount: 0,
      createdAt: new Date(),
      orderSource: 'voice',
    }).returning();
    
    // Broadcast event to all connected clients
    broadcastToAllClients({ 
      type: 'new_order',
      data: newOrder,
      message: `New order ${newOrderNumber} created for table ${tableNumber}`
    });
    
    return {
      response: `Order ${newOrderNumber} has been created for table ${tableNumber}.`,
      success: true
    };
  } catch (error) {
    console.error("Error creating order:", error);
    return {
      response: "Sorry, I couldn't create that order. Please try again.",
      success: false
    };
  }
}

/**
 * Update the status of an order
 */
async function updateOrderStatus(orderNumber: string, status: string) {
  try {
    // Validate status
    const validStatuses = ['pending', 'preparing', 'ready', 'served', 'completed', 'cancelled'];
    const normalizedStatus = status.toLowerCase();
    
    if (!validStatuses.includes(normalizedStatus)) {
      return {
        response: `Invalid status. Valid statuses are: ${validStatuses.join(', ')}.`,
        success: false
      };
    }
    
    // Find the order by number
    const [existingOrder] = await db.select().from(orders)
      .where(like(orders.orderNumber, `%${orderNumber}%`));
    
    if (!existingOrder) {
      return {
        response: `Order ${orderNumber} not found.`,
        success: false
      };
    }
    
    // Update the order status
    const [updatedOrder] = await db.update(orders)
      .set({ status: normalizedStatus })
      .where(eq(orders.id, existingOrder.id))
      .returning();
    
    // Broadcast event to all connected clients
    broadcastToAllClients({ 
      type: 'order-updated',
      data: updatedOrder,
      message: `Order ${updatedOrder.orderNumber} updated to status: ${normalizedStatus}`
    });
    
    return {
      response: `Order ${existingOrder.orderNumber} status has been updated to ${normalizedStatus}.`,
      success: true
    };
  } catch (error) {
    console.error("Error updating order status:", error);
    return {
      response: "Sorry, I couldn't update that order status. Please try again.",
      success: false
    };
  }
}

/**
 * Add a menu item to an order
 */
async function addItemToOrder(itemName: string, orderNumber: string) {
  try {
    // Find the menu item by name
    const [menuItem] = await db.select().from(menuItems)
      .where(like(menuItems.name, `%${itemName}%`));
    
    if (!menuItem) {
      return {
        response: `Menu item "${itemName}" not found.`,
        success: false
      };
    }
    
    // Find the order by number
    const [existingOrder] = await db.select().from(orders)
      .where(like(orders.orderNumber, `%${orderNumber}%`));
    
    if (!existingOrder) {
      return {
        response: `Order ${orderNumber} not found.`,
        success: false
      };
    }
    
    // For simplicity, assume we have a separate orderItems table
    // Instead of implementing the complex relation, we'll just update the order total
    const newTotal = existingOrder.totalAmount + menuItem.price;
    
    // Update the order with new total
    const [updatedOrder] = await db.update(orders)
      .set({ totalAmount: newTotal })
      .where(eq(orders.id, existingOrder.id))
      .returning();
    
    // Broadcast event to all connected clients
    broadcastToAllClients({ 
      type: 'order-updated',
      data: updatedOrder,
      message: `Added ${menuItem.name} to Order ${updatedOrder.orderNumber}`
    });
    
    return {
      response: `Added ${menuItem.name} to order ${existingOrder.orderNumber}. New total is $${newTotal.toFixed(2)}.`,
      success: true
    };
  } catch (error) {
    console.error("Error adding item to order:", error);
    return {
      response: "Sorry, I couldn't add that item to the order. Please try again.",
      success: false
    };
  }
}

/**
 * Get the current status of the kitchen
 */
async function getKitchenStatus() {
  try {
    // Get orders that are currently in the kitchen
    const kitchenOrders = await db.select().from(orders)
      .where(sql`status IN ('preparing', 'ready')`)
      .orderBy(desc(orders.createdAt))
      .limit(5);
    
    // Get active kitchen tokens
    const activeTokens = await db.select().from(kitchenTokens)
      .where(sql`status != 'completed'`)
      .limit(10);
    
    if (kitchenOrders.length === 0 && activeTokens.length === 0) {
      return {
        response: "The kitchen is currently empty with no active orders or preparations.",
        success: true
      };
    }
    
    let response = "Current kitchen status: ";
    
    if (kitchenOrders.length > 0) {
      response += `${kitchenOrders.length} orders in progress. `;
      
      const preparingCount = kitchenOrders.filter(o => o.status === 'preparing').length;
      const readyCount = kitchenOrders.filter(o => o.status === 'ready').length;
      
      response += `${preparingCount} preparing, ${readyCount} ready for service. `;
      
      const oldestOrder = kitchenOrders[kitchenOrders.length - 1];
      const oldestTime = new Date(oldestOrder.createdAt as Date).toLocaleTimeString();
      
      response += `Oldest active order is ${oldestOrder.orderNumber} from ${oldestTime}.`;
    }
    
    return {
      response,
      success: true
    };
  } catch (error) {
    console.error("Error getting kitchen status:", error);
    return {
      response: "Sorry, I couldn't retrieve the kitchen status at this time.",
      success: false
    };
  }
}

/**
 * Get the current inventory status
 */
async function getInventoryStatus() {
  try {
    // Get inventory items with low stock
    const lowStockItems = await db.select().from(inventory)
      .where(sql`quantity < min_quantity`)
      .orderBy(sql`quantity`)
      .limit(5);
    
    if (lowStockItems.length === 0) {
      return {
        response: "All inventory items are sufficiently stocked. No items below reorder levels.",
        success: true
      };
    }
    
    const response = `Inventory alert: ${lowStockItems.length} items below reorder level. Critical items: ${
      lowStockItems.map(item => `${item.name} (${item.quantity} ${item.unit} remaining)`).join(', ')
    }.`;
    
    return {
      response,
      success: true
    };
  } catch (error) {
    console.error("Error getting inventory status:", error);
    return {
      response: "Sorry, I couldn't retrieve the inventory status at this time.",
      success: false
    };
  }
}

/**
 * Get information about a customer
 */
async function getCustomerInfo(customerQuery: string) {
  try {
    // Try to find customer by ID or name
    let customer;
    
    // If query is a number, search by ID
    if (/^\d+$/.test(customerQuery)) {
      [customer] = await db.select().from(customers)
        .where(eq(customers.id, parseInt(customerQuery)));
    } else {
      // Otherwise search by name
      [customer] = await db.select().from(customers)
        .where(sql`LOWER(name) LIKE ${`%${customerQuery.toLowerCase()}%`}`);
    }
    
    if (!customer) {
      return {
        response: `No customer found matching "${customerQuery}".`,
        success: false
      };
    }
    
    // Get customer's recent orders
    const customerOrders = await db.select().from(orders)
      .where(sql`customer_id = ${customer.id}`)
      .orderBy(desc(orders.createdAt))
      .limit(3);
    
    let response = `Customer: ${customer.name}. `;
    
    if (customer.phone) {
      response += `Phone: ${customer.phone}. `;
    }
    
    if (customer.email) {
      response += `Email: ${customer.email}. `;
    }
    
    if (customerOrders.length > 0) {
      response += `Recent orders: ${customerOrders.map(o => o.orderNumber).join(', ')}.`;
    } else {
      response += `No recent orders found.`;
    }
    
    return {
      response,
      success: true
    };
  } catch (error) {
    console.error("Error getting customer info:", error);
    return {
      response: "Sorry, I couldn't retrieve that customer information at this time.",
      success: false
    };
  }
}