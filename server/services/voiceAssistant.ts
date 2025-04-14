import { storage } from "../storage";
import { Order, MenuItem, Inventory, KitchenToken, Bill, Customer } from "@shared/schema";
import { generateOrderNumber, generateTokenNumber, generateBillNumber } from "../utils";
import { insertOrderSchema, insertOrderItemSchema, insertKitchenTokenSchema, insertBillSchema } from "@shared/schema";

// Command types that the voice assistant can handle
enum CommandType {
  ORDER_STATUS = "order_status",
  TABLE_STATUS = "table_status",
  KITCHEN_STATUS = "kitchen_status",
  CREATE_ORDER = "create_order",
  UPDATE_ORDER = "update_order",
  GET_ORDERS = "get_orders",
  GET_MENU = "get_menu",
  CHECK_INVENTORY = "check_inventory",
  GET_CUSTOMER = "get_customer",
  GET_STATS = "get_stats",
  UNKNOWN = "unknown"
}

// Regular expressions to match command patterns
const COMMAND_PATTERNS = {
  ORDER_STATUS: /(?:status|info|details).*(?:order|id).*(\w+-\d+|\d+)/i,
  TABLE_STATUS: /(?:status|info|details).*(?:table|number).*(\d+)/i,
  KITCHEN_STATUS: /(?:status|info|details).*(?:kitchen)/i,
  CREATE_ORDER: /(?:create|make|new|add).*(?:order|takeaway)/i,
  UPDATE_ORDER: /(?:update|change|mark|set).*(?:order|id).*(\w+-\d+|\d+).*(?:as|to).*(\w+)/i,
  GET_ORDERS: /(?:show|list|get|display).*(?:orders)/i,
  GET_MENU: /(?:show|list|get|display).*(?:menu|items)/i,
  CHECK_INVENTORY: /(?:check|show|get).*(?:inventory|stock).*(?:of|for)?.*(\w+)/i,
  GET_CUSTOMER: /(?:customer|info|details).*(\w+)/i,
  GET_STATS: /(?:stats|statistics|numbers|dashboard)/i
};

// Interface for processed commands
interface ProcessedCommand {
  type: CommandType;
  params: Record<string, any>;
}

/**
 * Process a voice command and extract the command type and parameters
 */
function processCommand(command: string): ProcessedCommand {
  const processed: ProcessedCommand = {
    type: CommandType.UNKNOWN,
    params: {}
  };
  
  // Check for order status command
  const orderStatusMatch = command.match(COMMAND_PATTERNS.ORDER_STATUS);
  if (orderStatusMatch) {
    processed.type = CommandType.ORDER_STATUS;
    const orderIdentifier = orderStatusMatch[1];
    processed.params.orderIdentifier = orderIdentifier;
    return processed;
  }
  
  // Check for table status command
  const tableStatusMatch = command.match(COMMAND_PATTERNS.TABLE_STATUS);
  if (tableStatusMatch) {
    processed.type = CommandType.TABLE_STATUS;
    const tableNumber = tableStatusMatch[1];
    processed.params.tableNumber = tableNumber;
    return processed;
  }
  
  // Check for kitchen status command
  if (COMMAND_PATTERNS.KITCHEN_STATUS.test(command)) {
    processed.type = CommandType.KITCHEN_STATUS;
    return processed;
  }
  
  // Check for create order command
  if (COMMAND_PATTERNS.CREATE_ORDER.test(command)) {
    processed.type = CommandType.CREATE_ORDER;
    // Extract order items if possible
    const items = extractOrderItems(command);
    if (items.length > 0) {
      processed.params.items = items;
    }
    return processed;
  }
  
  // Check for update order command
  const updateOrderMatch = command.match(COMMAND_PATTERNS.UPDATE_ORDER);
  if (updateOrderMatch) {
    processed.type = CommandType.UPDATE_ORDER;
    const orderIdentifier = updateOrderMatch[1];
    const status = updateOrderMatch[2].toLowerCase();
    processed.params.orderIdentifier = orderIdentifier;
    processed.params.status = mapStatusTerm(status);
    return processed;
  }
  
  // Check for get orders command
  if (COMMAND_PATTERNS.GET_ORDERS.test(command)) {
    processed.type = CommandType.GET_ORDERS;
    // Check for status filter
    if (command.match(/pending|preparing|ready|completed|billed/i)) {
      const status = command.match(/pending|preparing|ready|completed|billed/i)?.[0];
      if (status) {
        processed.params.status = status.toLowerCase();
      }
    }
    return processed;
  }
  
  // Check for menu items command
  if (COMMAND_PATTERNS.GET_MENU.test(command)) {
    processed.type = CommandType.GET_MENU;
    // Check for category filter
    if (command.match(/main|starters|desserts|beverages|drinks/i)) {
      const category = command.match(/main|starters|desserts|beverages|drinks/i)?.[0];
      if (category) {
        processed.params.category = category.toLowerCase();
      }
    }
    return processed;
  }
  
  // Check for inventory check command
  const checkInventoryMatch = command.match(COMMAND_PATTERNS.CHECK_INVENTORY);
  if (checkInventoryMatch) {
    processed.type = CommandType.CHECK_INVENTORY;
    const item = checkInventoryMatch[1]?.toLowerCase();
    if (item) {
      processed.params.item = item;
    }
    return processed;
  }
  
  // Check for customer info command
  const customerMatch = command.match(COMMAND_PATTERNS.GET_CUSTOMER);
  if (customerMatch) {
    processed.type = CommandType.GET_CUSTOMER;
    const customerIdentifier = customerMatch[1];
    processed.params.customerIdentifier = customerIdentifier;
    return processed;
  }
  
  // Check for stats command
  if (COMMAND_PATTERNS.GET_STATS.test(command)) {
    processed.type = CommandType.GET_STATS;
    return processed;
  }
  
  return processed;
}

/**
 * Extract order items from a command string
 */
function extractOrderItems(command: string): { name: string, quantity: number }[] {
  const items: { name: string, quantity: number }[] = [];
  
  // Define common menu items to match against
  const menuItems = [
    "butter chicken", "naan", "tandoori chicken", "biryani", "paneer tikka",
    "dal makhani", "chicken curry", "roti", "paratha", "samosa", "pakora",
    "chicken biryani", "veg biryani", "masala dosa", "idli", "vada",
    "chicken tikka", "malai kofta", "palak paneer", "chana masala",
    "gulab jamun", "rasmalai", "kheer", "jalebi", "lassi", "chai", 
    "mango lassi", "soda", "water", "beer", "wine", "whiskey"
  ];
  
  // Look for menu items in the command
  for (const menuItem of menuItems) {
    const regex = new RegExp(`(\\d+)\\s+${menuItem}|${menuItem}\\s+(\\d+)|${menuItem}`, "i");
    const match = command.match(regex);
    
    if (match) {
      const quantity = parseInt(match[1] || match[2]) || 1;
      items.push({
        name: menuItem,
        quantity
      });
    }
  }
  
  return items;
}

/**
 * Map common status terms to system status values
 */
function mapStatusTerm(status: string): string {
  const statusMap: Record<string, string> = {
    "ready": "ready",
    "done": "ready",
    "complete": "completed",
    "completed": "completed",
    "finished": "completed",
    "delivered": "completed",
    "served": "completed",
    "prepare": "preparing",
    "preparing": "preparing",
    "cooking": "preparing",
    "in progress": "preparing",
    "pending": "pending",
    "waiting": "pending",
    "new": "pending",
    "bill": "billed",
    "billed": "billed",
    "paid": "billed",
    "cancelled": "cancelled",
    "cancel": "cancelled"
  };
  
  return statusMap[status.toLowerCase()] || "pending";
}

/**
 * Main function to handle voice commands
 */
export async function handleVoiceCommand(command: string): Promise<{
  success: boolean;
  response: string;
  invalidateQueries?: string[];
  error?: string;
}> {
  try {
    console.log(`Processing voice command: "${command}"`);
    
    const processedCommand = processCommand(command);
    
    console.log("Processed command:", processedCommand);
    
    // Handle different command types
    switch (processedCommand.type) {
      case CommandType.ORDER_STATUS:
        return await handleOrderStatusCommand(processedCommand.params);
      
      case CommandType.TABLE_STATUS:
        return await handleTableStatusCommand(processedCommand.params);
      
      case CommandType.KITCHEN_STATUS:
        return await handleKitchenStatusCommand();
      
      case CommandType.CREATE_ORDER:
        return await handleCreateOrderCommand(processedCommand.params);
      
      case CommandType.UPDATE_ORDER:
        return await handleUpdateOrderCommand(processedCommand.params);
      
      case CommandType.GET_ORDERS:
        return await handleGetOrdersCommand(processedCommand.params);
      
      case CommandType.GET_MENU:
        return await handleGetMenuCommand(processedCommand.params);
      
      case CommandType.CHECK_INVENTORY:
        return await handleCheckInventoryCommand(processedCommand.params);
      
      case CommandType.GET_CUSTOMER:
        return await handleGetCustomerCommand(processedCommand.params);
      
      case CommandType.GET_STATS:
        return await handleGetStatsCommand();
      
      default:
        return {
          success: false,
          response: "I'm sorry, I couldn't understand that command. Please try again with a different phrasing.",
          error: "Unrecognized command"
        };
    }
  } catch (error) {
    console.error("Error handling voice command:", error);
    return {
      success: false,
      response: "Sorry, there was an error processing your command. Please try again.",
      error: error.message
    };
  }
}

/**
 * Handle order status command
 */
async function handleOrderStatusCommand(params: Record<string, any>): Promise<{
  success: boolean;
  response: string;
  invalidateQueries?: string[];
  error?: string;
}> {
  const { orderIdentifier } = params;
  
  // Check if the order identifier is an order number or ID
  let order: Order | undefined;
  
  if (/^\d+$/.test(orderIdentifier)) {
    // If it's a numeric ID
    order = await storage.getOrder(parseInt(orderIdentifier));
  } else {
    // If it's an order number (e.g., ORD-1234)
    order = await storage.getOrderByNumber(orderIdentifier);
  }
  
  if (!order) {
    return {
      success: false,
      response: `Sorry, I couldn't find an order with the identifier ${orderIdentifier}.`,
      error: "Order not found"
    };
  }
  
  // Get the order items to provide more info
  const orderItems = await storage.getOrderItems(order.id);
  const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);
  
  // Format response
  let response = `Order ${order.orderNumber} is currently ${order.status}. `;
  response += `It contains ${totalItems} items totaling ${order.totalAmount} rupees.`;
  
  if (order.status === "pending") {
    response += " The kitchen has not started preparing this order yet.";
  } else if (order.status === "preparing") {
    response += " The order is being prepared in the kitchen now.";
  } else if (order.status === "ready") {
    response += " The order is ready to be served or delivered.";
  } else if (order.status === "completed") {
    response += " The order has been delivered to the customer.";
  } else if (order.status === "billed") {
    response += " The order has been billed and payment is complete.";
  }
  
  return {
    success: true,
    response,
    invalidateQueries: ['/api/orders']
  };
}

/**
 * Handle table status command
 */
async function handleTableStatusCommand(params: Record<string, any>): Promise<{
  success: boolean;
  response: string;
  invalidateQueries?: string[];
  error?: string;
}> {
  const { tableNumber } = params;
  
  // Get all orders
  const allOrders = await storage.getOrders();
  
  // Filter orders for the specified table
  const tableOrders = allOrders.filter(order => 
    order.tableNumber === tableNumber && 
    ['pending', 'preparing', 'ready'].includes(order.status)
  );
  
  if (tableOrders.length === 0) {
    return {
      success: true,
      response: `Table ${tableNumber} does not have any active orders.`,
      invalidateQueries: ['/api/orders']
    };
  }
  
  // Format response
  let response = `Table ${tableNumber} has ${tableOrders.length} active ${tableOrders.length === 1 ? 'order' : 'orders'}. `;
  
  // Add details for each order
  for (const order of tableOrders) {
    const orderItems = await storage.getOrderItems(order.id);
    const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);
    
    response += `Order ${order.orderNumber} is ${order.status} with ${totalItems} items. `;
  }
  
  return {
    success: true,
    response,
    invalidateQueries: ['/api/orders']
  };
}

/**
 * Handle kitchen status command
 */
async function handleKitchenStatusCommand(): Promise<{
  success: boolean;
  response: string;
  invalidateQueries?: string[];
  error?: string;
}> {
  // Get all kitchen tokens
  const allTokens = await storage.getKitchenTokens();
  
  // Count tokens by status
  const pendingTokens = allTokens.filter(token => token.status === "pending").length;
  const inProgressTokens = allTokens.filter(token => token.status === "in_progress").length;
  const urgentTokens = allTokens.filter(token => token.isUrgent).length;
  
  // Get all orders that are in progress
  const allOrders = await storage.getOrders();
  const preparingOrders = allOrders.filter(order => order.status === "preparing").length;
  const readyOrders = allOrders.filter(order => order.status === "ready").length;
  
  // Format response
  let response = `The kitchen currently has `;
  
  if (pendingTokens === 0 && inProgressTokens === 0) {
    response += `no orders to prepare. All caught up!`;
  } else {
    response += `${pendingTokens} pending and ${inProgressTokens} in-progress orders. `;
    
    if (urgentTokens > 0) {
      response += `${urgentTokens} of these orders are marked as urgent. `;
    }
    
    response += `There are ${readyOrders} orders ready to be served.`;
  }
  
  return {
    success: true,
    response,
    invalidateQueries: ['/api/kitchen-tokens', '/api/orders']
  };
}

/**
 * Handle create order command
 */
async function handleCreateOrderCommand(params: Record<string, any>): Promise<{
  success: boolean;
  response: string;
  invalidateQueries?: string[];
  error?: string;
}> {
  const { items = [] } = params;
  
  if (items.length === 0) {
    return {
      success: false,
      response: "I need to know what items to add to the order. Please specify the food items.",
      error: "No items specified"
    };
  }
  
  try {
    // Get menu items to match against
    const menuItems = await storage.getMenuItems();
    
    // Match provided items with menu items
    const matchedItems = [];
    let totalAmount = 0;
    
    for (const item of items) {
      const menuItem = menuItems.find(mi => 
        mi.name.toLowerCase().includes(item.name.toLowerCase()) ||
        item.name.toLowerCase().includes(mi.name.toLowerCase())
      );
      
      if (menuItem) {
        matchedItems.push({
          menuItemId: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          quantity: item.quantity,
          notes: ""
        });
        
        totalAmount += menuItem.price * item.quantity;
      }
    }
    
    if (matchedItems.length === 0) {
      return {
        success: false,
        response: "I couldn't match any of the items you mentioned with our menu. Please try again with items from our menu.",
        error: "No matching menu items"
      };
    }
    
    // Create order
    const orderData = {
      orderNumber: generateOrderNumber(),
      tableNumber: null, // Setting null for takeaway/voice orders
      status: "pending",
      totalAmount,
      notes: "Created via voice assistant",
      orderSource: "voice",
      useAIAutomation: true
    };
    
    const parsedOrder = insertOrderSchema.parse(orderData);
    const order = await storage.createOrder(parsedOrder);
    
    // Create order items
    for (const item of matchedItems) {
      const orderItem = {
        orderId: order.id,
        menuItemId: item.menuItemId,
        price: item.price,
        quantity: item.quantity,
        notes: item.notes
      };
      
      const parsedOrderItem = insertOrderItemSchema.parse(orderItem);
      await storage.createOrderItem(parsedOrderItem);
    }
    
    // Create a kitchen token
    const tokenData = {
      tokenNumber: generateTokenNumber(),
      orderId: order.id,
      status: "pending",
      isUrgent: false
    };
    
    const parsedToken = insertKitchenTokenSchema.parse(tokenData);
    await storage.createKitchenToken(parsedToken);
    
    // Format response
    const itemsText = matchedItems.map(item => `${item.quantity} ${item.name}`).join(", ");
    
    const response = `I've created a new order number ${order.orderNumber} with ${matchedItems.length} items: ${itemsText}. The total amount is ${totalAmount} rupees. The order has been sent to the kitchen.`;
    
    return {
      success: true,
      response,
      invalidateQueries: ['/api/orders', '/api/kitchen-tokens']
    };
  } catch (error) {
    console.error("Error creating order:", error);
    return {
      success: false,
      response: "Sorry, there was an error creating the order. Please try again.",
      error: error.message
    };
  }
}

/**
 * Handle update order command
 */
async function handleUpdateOrderCommand(params: Record<string, any>): Promise<{
  success: boolean;
  response: string;
  invalidateQueries?: string[];
  error?: string;
}> {
  const { orderIdentifier, status } = params;
  
  if (!orderIdentifier || !status) {
    return {
      success: false,
      response: "Please specify both the order identifier and the status to update to.",
      error: "Missing parameters"
    };
  }
  
  // Check if the order identifier is an order number or ID
  let order: Order | undefined;
  
  if (/^\d+$/.test(orderIdentifier)) {
    // If it's a numeric ID
    order = await storage.getOrder(parseInt(orderIdentifier));
  } else {
    // If it's an order number (e.g., ORD-1234)
    order = await storage.getOrderByNumber(orderIdentifier);
  }
  
  if (!order) {
    return {
      success: false,
      response: `Sorry, I couldn't find an order with the identifier ${orderIdentifier}.`,
      error: "Order not found"
    };
  }
  
  try {
    // Update the order status
    const updatedOrder = await storage.updateOrder(order.id, { status });
    
    if (!updatedOrder) {
      return {
        success: false,
        response: `Failed to update order ${order.orderNumber}.`,
        error: "Order update failed"
      };
    }
    
    // If the status is "ready" or "completed", update the kitchen token as well
    if (status === "ready" || status === "completed") {
      const kitchenTokens = await storage.getKitchenTokens();
      const orderToken = kitchenTokens.find(token => token.orderId === order.id);
      
      if (orderToken) {
        const tokenStatus = status === "ready" ? "completed" : "completed";
        await storage.updateKitchenToken(orderToken.id, { 
          status: tokenStatus,
          completionTime: new Date()
        });
      }
    }
    
    // If the status is "billed", create a bill
    if (status === "billed") {
      // Get order items to calculate bill amount
      const orderItems = await storage.getOrderItems(order.id);
      const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const taxRate = 0.18; // 18% tax
      const tax = subtotal * taxRate;
      const total = subtotal + tax;
      
      const billData = {
        orderId: order.id,
        billNumber: generateBillNumber(),
        subtotal,
        tax,
        discount: 0,
        total,
        paymentStatus: "pending",
        paymentMethod: null
      };
      
      const parsedBill = insertBillSchema.parse(billData);
      await storage.createBill(parsedBill);
    }
    
    // Format response
    let response = `Order ${order.orderNumber} has been updated to status "${status}". `;
    
    if (status === "ready") {
      response += "The kitchen has completed preparing this order and it's ready to be served.";
    } else if (status === "completed") {
      response += "The order has been marked as delivered or served.";
    } else if (status === "billed") {
      response += "The order has been billed and is ready for payment.";
    }
    
    return {
      success: true,
      response,
      invalidateQueries: ['/api/orders', '/api/kitchen-tokens', '/api/bills']
    };
  } catch (error) {
    console.error("Error updating order:", error);
    return {
      success: false,
      response: "Sorry, there was an error updating the order. Please try again.",
      error: error.message
    };
  }
}

/**
 * Handle get orders command
 */
async function handleGetOrdersCommand(params: Record<string, any>): Promise<{
  success: boolean;
  response: string;
  invalidateQueries?: string[];
  error?: string;
}> {
  const { status } = params;
  
  // Get all orders
  const allOrders = await storage.getOrders();
  
  // Filter orders by status if specified
  const filteredOrders = status
    ? allOrders.filter(order => order.status === status)
    : allOrders.filter(order => ['pending', 'preparing', 'ready'].includes(order.status));
  
  if (filteredOrders.length === 0) {
    const statusText = status ? `with status "${status}"` : "active";
    return {
      success: true,
      response: `There are no orders ${statusText} at the moment.`,
      invalidateQueries: ['/api/orders']
    };
  }
  
  // Sort orders by creation time (newest first)
  filteredOrders.sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });
  
  // Take only the first 5 orders for the response
  const displayOrders = filteredOrders.slice(0, 5);
  
  // Format response
  const statusText = status ? `with status "${status}"` : "active";
  let response = `There are ${filteredOrders.length} orders ${statusText}. `;
  
  if (filteredOrders.length > 5) {
    response += `Here are the 5 most recent ones: `;
  } else {
    response += `Here they are: `;
  }
  
  for (const order of displayOrders) {
    response += `Order ${order.orderNumber} (${order.status}), `;
  }
  
  // Remove trailing comma and space
  response = response.slice(0, -2) + ".";
  
  return {
    success: true,
    response,
    invalidateQueries: ['/api/orders']
  };
}

/**
 * Handle get menu command
 */
async function handleGetMenuCommand(params: Record<string, any>): Promise<{
  success: boolean;
  response: string;
  invalidateQueries?: string[];
  error?: string;
}> {
  const { category } = params;
  
  // Get all menu items
  const allMenuItems = await storage.getMenuItems();
  
  // Filter by category if specified
  const filteredItems = category
    ? allMenuItems.filter(item => item.category.toLowerCase().includes(category.toLowerCase()))
    : allMenuItems;
  
  if (filteredItems.length === 0) {
    const categoryText = category ? `in category "${category}"` : "";
    return {
      success: true,
      response: `There are no menu items ${categoryText} available.`,
      invalidateQueries: ['/api/menu-items']
    };
  }
  
  // Group items by category
  const itemsByCategory: Record<string, MenuItem[]> = {};
  
  for (const item of filteredItems) {
    if (!itemsByCategory[item.category]) {
      itemsByCategory[item.category] = [];
    }
    itemsByCategory[item.category].push(item);
  }
  
  // Format response
  let response = "";
  
  if (category) {
    const items = filteredItems.slice(0, 10); // Limit to 10 items
    
    response = `Here are ${items.length} items in the ${category} category: `;
    
    for (const item of items) {
      response += `${item.name} (${item.price} rupees), `;
    }
    
    // Remove trailing comma and space
    response = response.slice(0, -2) + ".";
    
    if (filteredItems.length > 10) {
      response += ` And ${filteredItems.length - 10} more items.`;
    }
  } else {
    response = `Our menu has ${filteredItems.length} items across ${Object.keys(itemsByCategory).length} categories. `;
    
    for (const category in itemsByCategory) {
      response += `${category} (${itemsByCategory[category].length} items), `;
    }
    
    // Remove trailing comma and space
    response = response.slice(0, -2) + ".";
    
    response += " You can ask for specific categories to hear more details.";
  }
  
  return {
    success: true,
    response,
    invalidateQueries: ['/api/menu-items']
  };
}

/**
 * Handle check inventory command
 */
async function handleCheckInventoryCommand(params: Record<string, any>): Promise<{
  success: boolean;
  response: string;
  invalidateQueries?: string[];
  error?: string;
}> {
  const { item } = params;
  
  if (!item) {
    // If no specific item, give summary of inventory
    const inventoryItems = await storage.getInventoryItems();
    
    // Count items by category
    const categories: Record<string, number> = {};
    const lowStockItems: Inventory[] = [];
    
    for (const inv of inventoryItems) {
      if (!categories[inv.category]) {
        categories[inv.category] = 0;
      }
      categories[inv.category]++;
      
      // Check for low stock
      if (inv.quantity <= inv.minQuantity) {
        lowStockItems.push(inv);
      }
    }
    
    // Format response
    let response = `There are ${inventoryItems.length} items in the inventory across ${Object.keys(categories).length} categories. `;
    
    if (lowStockItems.length > 0) {
      response += `There are ${lowStockItems.length} items that are low on stock: `;
      
      for (let i = 0; i < Math.min(lowStockItems.length, 5); i++) {
        const item = lowStockItems[i];
        response += `${item.name} (${item.quantity} ${item.unit}), `;
      }
      
      // Remove trailing comma and space
      response = response.slice(0, -2);
      
      if (lowStockItems.length > 5) {
        response += `, and ${lowStockItems.length - 5} more items`;
      }
      
      response += ".";
    } else {
      response += "All items are adequately stocked.";
    }
    
    return {
      success: true,
      response,
      invalidateQueries: ['/api/inventory']
    };
  }
  
  // Find the specific inventory item
  const inventoryItems = await storage.getInventoryItems();
  const matchingItems = inventoryItems.filter(inv => 
    inv.name.toLowerCase().includes(item.toLowerCase())
  );
  
  if (matchingItems.length === 0) {
    return {
      success: false,
      response: `Sorry, I couldn't find any inventory item matching "${item}".`,
      error: "Inventory item not found"
    };
  }
  
  // Format response
  let response = "";
  
  if (matchingItems.length === 1) {
    const inv = matchingItems[0];
    
    response = `${inv.name} currently has ${inv.quantity} ${inv.unit} in stock. `;
    
    if (inv.quantity <= inv.minQuantity) {
      response += `This is below the minimum required quantity of ${inv.minQuantity} ${inv.unit}. Please restock soon.`;
    } else {
      const buffer = inv.quantity - inv.minQuantity;
      response += `This is ${buffer} ${inv.unit} above the minimum required quantity.`;
    }
  } else {
    response = `I found ${matchingItems.length} items matching "${item}": `;
    
    for (const inv of matchingItems) {
      response += `${inv.name} (${inv.quantity} ${inv.unit}), `;
    }
    
    // Remove trailing comma and space
    response = response.slice(0, -2) + ".";
  }
  
  return {
    success: true,
    response,
    invalidateQueries: ['/api/inventory']
  };
}

/**
 * Handle get customer command
 */
async function handleGetCustomerCommand(params: Record<string, any>): Promise<{
  success: boolean;
  response: string;
  invalidateQueries?: string[];
  error?: string;
}> {
  const { customerIdentifier } = params;
  
  if (!customerIdentifier) {
    // If no specific customer, give summary of customers
    const customers = await storage.getCustomers();
    
    let response = `There are ${customers.length} customers in the database. `;
    
    // Sort by visit count
    customers.sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0));
    
    // Take top 3 customers by visit count
    const topCustomers = customers.slice(0, 3);
    
    if (topCustomers.length > 0) {
      response += `The top ${topCustomers.length} customers by visit count are: `;
      
      for (const customer of topCustomers) {
        response += `${customer.name} (${customer.visitCount || 0} visits), `;
      }
      
      // Remove trailing comma and space
      response = response.slice(0, -2) + ".";
    }
    
    return {
      success: true,
      response,
      invalidateQueries: ['/api/customers']
    };
  }
  
  // Find the specific customer
  const customers = await storage.getCustomers();
  const matchingCustomers = customers.filter(cust => 
    cust.name.toLowerCase().includes(customerIdentifier.toLowerCase()) ||
    (cust.phone && cust.phone.includes(customerIdentifier))
  );
  
  if (matchingCustomers.length === 0) {
    return {
      success: false,
      response: `Sorry, I couldn't find any customer matching "${customerIdentifier}".`,
      error: "Customer not found"
    };
  }
  
  // Format response
  let response = "";
  
  if (matchingCustomers.length === 1) {
    const cust = matchingCustomers[0];
    
    response = `${cust.name} has visited ${cust.visitCount || 0} times. `;
    
    if (cust.phone) {
      response += `Phone: ${cust.phone}. `;
    }
    
    if (cust.email) {
      response += `Email: ${cust.email}. `;
    }
    
    if (cust.lastVisit) {
      const lastVisitDate = new Date(cust.lastVisit);
      response += `Last visit was on ${lastVisitDate.toLocaleDateString()}.`;
    }
    
    // Get recent orders for this customer
    const orders = await storage.getOrdersByCustomerId(cust.id);
    
    if (orders.length > 0) {
      response += ` Has ${orders.length} total orders, with the most recent on ${new Date(orders[0].createdAt).toLocaleDateString()}.`;
    }
  } else {
    response = `I found ${matchingCustomers.length} customers matching "${customerIdentifier}": `;
    
    for (const cust of matchingCustomers) {
      response += `${cust.name} (${cust.visitCount || 0} visits), `;
    }
    
    // Remove trailing comma and space
    response = response.slice(0, -2) + ".";
  }
  
  return {
    success: true,
    response,
    invalidateQueries: ['/api/customers']
  };
}

/**
 * Handle get stats command
 */
async function handleGetStatsCommand(): Promise<{
  success: boolean;
  response: string;
  invalidateQueries?: string[];
  error?: string;
}> {
  // Get orders
  const orders = await storage.getOrders();
  
  // Get today's orders
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todaysOrders = orders.filter(order => {
    const orderDate = new Date(order.createdAt);
    return orderDate >= today;
  });
  
  // Calculate total sales
  let todaysSales = 0;
  for (const order of todaysOrders) {
    todaysSales += order.totalAmount;
  }
  
  // Get active orders
  const activeOrders = orders.filter(order => 
    ['pending', 'preparing', 'ready'].includes(order.status)
  );
  
  // Get kitchen tokens
  const kitchenTokens = await storage.getKitchenTokens();
  const pendingTokens = kitchenTokens.filter(token => token.status === "pending").length;
  
  // Format response
  let response = `Today's stats: ${todaysOrders.length} orders with ${todaysSales} rupees in sales. `;
  response += `There are currently ${activeOrders.length} active orders and ${pendingTokens} pending kitchen tokens.`;
  
  return {
    success: true,
    response,
    invalidateQueries: ['/api/dashboard/stats', '/api/orders', '/api/kitchen-tokens']
  };
}