import {
  User, InsertUser, users,
  MenuItem, InsertMenuItem, menuItems,
  Order, InsertOrder, orders,
  OrderItem, InsertOrderItem, orderItems,
  KitchenToken, InsertKitchenToken, kitchenTokens,
  Bill, InsertBill, bills,
  Inventory, InsertInventory, inventory,
  Customer, InsertCustomer, customers,
  Activity, InsertActivity, activities,
  ScheduledOrder, InsertScheduledOrder, scheduledOrders
} from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Menu item operations
  getMenuItem(id: number): Promise<MenuItem | undefined>;
  getMenuItems(): Promise<MenuItem[]>;
  getMenuItemsByDietaryTags(tags: string[]): Promise<MenuItem[]>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: number, item: Partial<InsertMenuItem>): Promise<MenuItem | undefined>;
  deleteMenuItem(id: number): Promise<boolean>;
  
  // Order operations
  getOrder(id: number): Promise<Order | undefined>;
  getOrderByNumber(orderNumber: string): Promise<Order | undefined>;
  getOrders(): Promise<Order[]>;
  getOrdersByCustomerId(customerId: number): Promise<Order[]>;
  getLastOrderNumber(): Promise<string | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, order: Partial<InsertOrder>): Promise<Order | undefined>;
  
  // Order item operations
  getOrderItems(orderId: number): Promise<OrderItem[]>;
  createOrderItem(item: InsertOrderItem): Promise<OrderItem>;
  
  // Kitchen token operations
  getKitchenToken(id: number): Promise<KitchenToken | undefined>;
  getKitchenTokenByNumber(tokenNumber: string): Promise<KitchenToken | undefined>;
  getKitchenTokens(): Promise<KitchenToken[]>;
  createKitchenToken(token: InsertKitchenToken): Promise<KitchenToken>;
  updateKitchenToken(id: number, token: Partial<InsertKitchenToken>): Promise<KitchenToken | undefined>;
  
  // Bill operations
  getBill(id: number): Promise<Bill | undefined>;
  getBillByNumber(billNumber: string): Promise<Bill | undefined>;
  getBills(): Promise<Bill[]>;
  createBill(bill: InsertBill): Promise<Bill>;
  updateBill(id: number, bill: Partial<InsertBill>): Promise<Bill | undefined>;
  
  // Inventory operations
  getInventoryItem(id: number): Promise<Inventory | undefined>;
  getInventoryItems(): Promise<Inventory[]>;
  createInventoryItem(item: InsertInventory): Promise<Inventory>;
  updateInventoryItem(id: number, item: Partial<InsertInventory>): Promise<Inventory | undefined>;
  
  // Customer operations
  getCustomer(id: number): Promise<Customer | undefined>;
  getCustomerByPhone(phone: string): Promise<Customer | undefined>;
  getCustomers(): Promise<Customer[]>;
  getCustomersByDietaryPreferences(preferences: string[]): Promise<Customer[]>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  
  // Activity operations
  getActivities(limit?: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;

  // Scheduled order operations
  getScheduledOrder(id: number): Promise<ScheduledOrder | undefined>;
  getScheduledOrdersByCustomerId(customerId: number): Promise<ScheduledOrder[]>;
  getActiveScheduledOrders(): Promise<ScheduledOrder[]>;
  getDueScheduledOrders(): Promise<ScheduledOrder[]>;
  createScheduledOrder(scheduledOrder: InsertScheduledOrder): Promise<ScheduledOrder>;
  updateScheduledOrder(id: number, scheduledOrder: Partial<InsertScheduledOrder>): Promise<ScheduledOrder | undefined>;
  deleteScheduledOrder(id: number): Promise<boolean>;
  
  // WhatsApp message operations
  storeWhatsAppMessage(messageData: {
    id: string,
    from: string,
    to: string,
    content: string,
    timestamp: string,
    direction: string,
    type: string
  }): Promise<any>;
  getWhatsAppMessages(): Promise<any[]>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private menuItems: Map<number, MenuItem>;
  private orders: Map<number, Order>;
  private orderItems: Map<number, OrderItem>;
  private kitchenTokens: Map<number, KitchenToken>;
  private bills: Map<number, Bill>;
  private inventoryItems: Map<number, Inventory>;
  private customers: Map<number, Customer>;
  private activities: Map<number, Activity>;
  private scheduledOrders: Map<number, ScheduledOrder>;
  
  private userId: number = 1;
  private menuItemId: number = 1;
  private orderId: number = 1;
  private orderItemId: number = 1;
  private kitchenTokenId: number = 1;
  private billId: number = 1;
  private inventoryId: number = 1;
  private customerId: number = 1;
  private activityId: number = 1;
  private scheduledOrderId: number = 1;
  
  constructor() {
    this.users = new Map();
    this.menuItems = new Map();
    this.orders = new Map();
    this.orderItems = new Map();
    this.kitchenTokens = new Map();
    this.bills = new Map();
    this.inventoryItems = new Map();
    this.customers = new Map();
    this.activities = new Map();
    this.scheduledOrders = new Map();
    
    // Initialize with sample data
    this.initSampleData();
  }
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }
  
  async createUser(user: InsertUser): Promise<User> {
    const id = this.userId++;
    const newUser: User = { 
      id,
      username: user.username, 
      password: user.password,
      fullName: user.fullName,
      role: user.role || "customer", // Default to customer if role not specified
      createdAt: new Date()
    };
    this.users.set(id, newUser);
    return newUser;
  }
  
  // Menu item operations
  async getMenuItem(id: number): Promise<MenuItem | undefined> {
    return this.menuItems.get(id);
  }
  
  async getMenuItems(): Promise<MenuItem[]> {
    return Array.from(this.menuItems.values());
  }
  
  async getMenuItemsByDietaryTags(tags: string[]): Promise<MenuItem[]> {
    if (!tags || tags.length === 0) {
      return this.getMenuItems();
    }
    
    return Array.from(this.menuItems.values())
      .filter(item => {
        if (!item.dietaryTags) return false;
        return tags.some(tag => item.dietaryTags?.includes(tag));
      });
  }
  
  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    const id = this.menuItemId++;
    const newItem: MenuItem = { ...item, id };
    this.menuItems.set(id, newItem);
    return newItem;
  }
  
  async updateMenuItem(id: number, item: Partial<InsertMenuItem>): Promise<MenuItem | undefined> {
    const existingItem = this.menuItems.get(id);
    if (!existingItem) return undefined;
    
    const updatedItem = { ...existingItem, ...item };
    this.menuItems.set(id, updatedItem);
    return updatedItem;
  }
  
  async deleteMenuItem(id: number): Promise<boolean> {
    if (!this.menuItems.has(id)) return false;
    
    const menuItem = this.menuItems.get(id);
    
    // Log activity
    await this.createActivity({
      type: 'menu_item_deleted',
      description: `Menu item "${menuItem?.name}" was deleted`,
      entityId: id,
      entityType: 'menu_item'
    });
    
    return this.menuItems.delete(id);
  }
  
  // Order operations
  async getOrder(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }
  
  async getOrderByNumber(orderNumber: string): Promise<Order | undefined> {
    return Array.from(this.orders.values()).find(order => order.orderNumber === orderNumber);
  }
  
  async getOrders(): Promise<Order[]> {
    const orders = Array.from(this.orders.values());
    console.log(`[DEBUG] getOrders returning ${orders.length} orders:`, orders.map(o => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      source: o.orderSource
    })));
    return orders;
  }
  
  async getOrdersByCustomerId(customerId: number): Promise<Order[]> {
    return Array.from(this.orders.values())
      .filter(order => order.customerId === customerId)
      .sort((a, b) => {
        // Sort by createdAt in descending order (most recent first)
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
  }
  
  async getLastOrderNumber(): Promise<string | undefined> {
    // Get all orders
    const allOrders = Array.from(this.orders.values());
    console.log(`DEBUG: Found ${allOrders.length} total orders`);
    
    // Get all orders that follow the ORD-XXXX pattern
    const orders = allOrders
      .filter(order => order.orderNumber.startsWith('ORD-'))
      .sort((a, b) => {
        // Extract the numeric part of the order number
        const numA = parseInt(a.orderNumber.replace('ORD-', ''));
        const numB = parseInt(b.orderNumber.replace('ORD-', ''));
        // Sort in descending order to get the highest number first
        return numB - numA;
      });
    
    console.log(`DEBUG: Found ${orders.length} orders with ORD- prefix`);
    if (orders.length > 0) {
      console.log(`DEBUG: Highest order number: ${orders[0].orderNumber}`);
    } else {
      console.log(`DEBUG: No orders with ORD- prefix found`);
      console.log(`DEBUG: All order numbers: ${allOrders.map(o => o.orderNumber).join(', ')}`);
    }
    
    // Return the order number with the highest numeric value
    return orders.length > 0 ? orders[0].orderNumber : undefined;
  }
  
  async createOrder(order: InsertOrder): Promise<Order> {
    const id = this.orderId++;
    const now = new Date();
    const newOrder: Order = { 
      ...order, 
      id,
      createdAt: now,
      updatedAt: now
    };
    this.orders.set(id, newOrder);
    
    // Log activity
    await this.createActivity({
      type: 'order_created',
      description: `New order ${order.orderNumber} created`,
      entityId: id,
      entityType: 'order'
    });
    
    return newOrder;
  }
  
  async updateOrder(id: number, order: Partial<InsertOrder>): Promise<Order | undefined> {
    const existingOrder = this.orders.get(id);
    if (!existingOrder) return undefined;
    
    const updatedOrder = { 
      ...existingOrder, 
      ...order,
      updatedAt: new Date()
    };
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }
  
  // Order item operations
  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    return Array.from(this.orderItems.values()).filter(item => item.orderId === orderId);
  }
  
  async createOrderItem(item: InsertOrderItem): Promise<OrderItem> {
    const id = this.orderItemId++;
    const newItem: OrderItem = { ...item, id };
    this.orderItems.set(id, newItem);
    return newItem;
  }
  
  // Kitchen token operations
  async getKitchenToken(id: number): Promise<KitchenToken | undefined> {
    return this.kitchenTokens.get(id);
  }
  
  async getKitchenTokenByNumber(tokenNumber: string): Promise<KitchenToken | undefined> {
    return Array.from(this.kitchenTokens.values()).find(token => token.tokenNumber === tokenNumber);
  }
  
  async getKitchenTokens(): Promise<KitchenToken[]> {
    return Array.from(this.kitchenTokens.values());
  }
  
  async createKitchenToken(token: InsertKitchenToken): Promise<KitchenToken> {
    const id = this.kitchenTokenId++;
    const newToken: KitchenToken = { 
      ...token, 
      id,
      startTime: new Date(),
      completionTime: null
    };
    this.kitchenTokens.set(id, newToken);
    
    // Log activity
    await this.createActivity({
      type: 'token_created',
      description: `New kitchen token ${token.tokenNumber} created`,
      entityId: id,
      entityType: 'kitchen_token'
    });
    
    return newToken;
  }
  
  async updateKitchenToken(id: number, token: Partial<InsertKitchenToken>): Promise<KitchenToken | undefined> {
    const existingToken = this.kitchenTokens.get(id);
    if (!existingToken) return undefined;
    
    let updatedToken: KitchenToken = { ...existingToken, ...token };
    
    // If status is being updated to "ready", set completion time
    if (token.status === "ready" && existingToken.status !== "ready") {
      updatedToken = { ...updatedToken, completionTime: new Date() };
    }
    
    this.kitchenTokens.set(id, updatedToken);
    return updatedToken;
  }
  
  // Bill operations
  async getBill(id: number): Promise<Bill | undefined> {
    return this.bills.get(id);
  }
  
  async getBillByNumber(billNumber: string): Promise<Bill | undefined> {
    return Array.from(this.bills.values()).find(bill => bill.billNumber === billNumber);
  }
  
  async getBills(): Promise<Bill[]> {
    return Array.from(this.bills.values());
  }
  
  async createBill(bill: InsertBill): Promise<Bill> {
    const id = this.billId++;
    const newBill: Bill = { 
      ...bill, 
      id,
      createdAt: new Date()
    };
    this.bills.set(id, newBill);
    
    // Log activity
    await this.createActivity({
      type: 'bill_created',
      description: `New bill ${bill.billNumber} created`,
      entityId: id,
      entityType: 'bill'
    });
    
    return newBill;
  }
  
  async updateBill(id: number, bill: Partial<InsertBill>): Promise<Bill | undefined> {
    const existingBill = this.bills.get(id);
    if (!existingBill) return undefined;
    
    const updatedBill = { ...existingBill, ...bill };
    this.bills.set(id, updatedBill);
    return updatedBill;
  }
  
  // Inventory operations
  async getInventoryItem(id: number): Promise<Inventory | undefined> {
    return this.inventoryItems.get(id);
  }
  
  async getInventoryItems(): Promise<Inventory[]> {
    return Array.from(this.inventoryItems.values());
  }
  
  async createInventoryItem(item: InsertInventory): Promise<Inventory> {
    const id = this.inventoryId++;
    const newItem: Inventory = { 
      ...item, 
      id,
      lastUpdated: new Date()
    };
    this.inventoryItems.set(id, newItem);
    return newItem;
  }
  
  async updateInventoryItem(id: number, item: Partial<InsertInventory>): Promise<Inventory | undefined> {
    const existingItem = this.inventoryItems.get(id);
    if (!existingItem) return undefined;
    
    const updatedItem = { 
      ...existingItem, 
      ...item,
      lastUpdated: new Date()
    };
    this.inventoryItems.set(id, updatedItem);
    
    // If quantity is below minimum, log an alert
    if (updatedItem.quantity < updatedItem.minQuantity) {
      await this.createActivity({
        type: 'inventory_alert',
        description: `Low inventory alert for ${updatedItem.name} (${updatedItem.quantity}${updatedItem.unit} remaining)`,
        entityId: id,
        entityType: 'inventory'
      });
    }
    
    return updatedItem;
  }
  
  // Customer operations
  async getCustomer(id: number): Promise<Customer | undefined> {
    return this.customers.get(id);
  }
  
  async getCustomerByPhone(phone: string): Promise<Customer | undefined> {
    return Array.from(this.customers.values()).find(customer => customer.phone === phone);
  }
  
  async getCustomers(): Promise<Customer[]> {
    return Array.from(this.customers.values());
  }
  
  async getCustomersByDietaryPreferences(preferences: string[]): Promise<Customer[]> {
    if (!preferences || preferences.length === 0) {
      return this.getCustomers();
    }
    
    return Array.from(this.customers.values())
      .filter(customer => {
        if (!customer.dietaryPreferences?.restrictions) return false;
        return preferences.some(pref => 
          customer.dietaryPreferences?.restrictions.includes(pref) || 
          customer.dietaryPreferences?.healthGoals.includes(pref)
        );
      });
  }
  
  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const id = this.customerId++;
    const newCustomer: Customer = { 
      ...customer, 
      id,
      lastVisit: new Date()
    };
    this.customers.set(id, newCustomer);
    
    // Log activity
    await this.createActivity({
      type: 'customer_created',
      description: `New customer ${customer.name} registered`,
      entityId: id,
      entityType: 'customer'
    });
    
    return newCustomer;
  }
  
  async updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const existingCustomer = this.customers.get(id);
    if (!existingCustomer) return undefined;
    
    const updatedCustomer = { ...existingCustomer, ...customer };
    this.customers.set(id, updatedCustomer);
    return updatedCustomer;
  }
  
  // Activity operations
  async getActivities(limit?: number): Promise<Activity[]> {
    const activities = Array.from(this.activities.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return limit ? activities.slice(0, limit) : activities;
  }
  
  async createActivity(activity: InsertActivity): Promise<Activity> {
    const id = this.activityId++;
    const newActivity: Activity = { 
      ...activity, 
      id,
      createdAt: new Date()
    };
    this.activities.set(id, newActivity);
    return newActivity;
  }
  
  // Scheduled order operations
  async getScheduledOrder(id: number): Promise<ScheduledOrder | undefined> {
    return this.scheduledOrders.get(id);
  }
  
  async getScheduledOrdersByCustomerId(customerId: number): Promise<ScheduledOrder[]> {
    return Array.from(this.scheduledOrders.values())
      .filter(order => order.customerId === customerId)
      .sort((a, b) => {
        // Sort by startDate in ascending order (soonest first)
        const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
        return dateA - dateB;
      });
  }
  
  async getActiveScheduledOrders(): Promise<ScheduledOrder[]> {
    const now = new Date();
    return Array.from(this.scheduledOrders.values())
      .filter(order => {
        if (!order.isActive) return false;
        if (order.endDate && new Date(order.endDate) < now) return false;
        return true;
      });
  }
  
  async getDueScheduledOrders(): Promise<ScheduledOrder[]> {
    const now = new Date();
    // Get all active orders that need to be executed now
    return Array.from(this.scheduledOrders.values())
      .filter(order => {
        // Check if the order is active and not ended
        if (!order.isActive) return false;
        if (order.endDate && new Date(order.endDate) < now) return false;
        
        // Check if it's due according to the recurrence pattern
        const lastExecuted = order.lastExecuted ? new Date(order.lastExecuted) : null;
        
        if (!lastExecuted) {
          // If it hasn't been executed yet, check if the start date is in the past
          return new Date(order.startDate) <= now;
        }
        
        // Check based on recurrence pattern
        switch (order.recurrencePattern) {
          case 'daily':
            // Check if 24 hours have passed since last execution
            return (now.getTime() - lastExecuted.getTime()) >= 24 * 60 * 60 * 1000;
          case 'weekly':
            // Check if 7 days have passed since last execution
            return (now.getTime() - lastExecuted.getTime()) >= 7 * 24 * 60 * 60 * 1000;
          case 'monthly':
            // Check if at least 28 days have passed since last execution
            return (now.getTime() - lastExecuted.getTime()) >= 28 * 24 * 60 * 60 * 1000;
          default:
            // For custom patterns, just check if a day has passed (simplification)
            return (now.getTime() - lastExecuted.getTime()) >= 24 * 60 * 60 * 1000;
        }
      });
  }
  
  async createScheduledOrder(scheduledOrder: InsertScheduledOrder): Promise<ScheduledOrder> {
    const id = this.scheduledOrderId++;
    const newScheduledOrder: ScheduledOrder = {
      ...scheduledOrder,
      id,
      createdAt: new Date()
    };
    this.scheduledOrders.set(id, newScheduledOrder);
    
    // Log activity
    await this.createActivity({
      type: 'scheduled_order_created',
      description: `New scheduled order created for customer ${scheduledOrder.customerId}`,
      entityId: id,
      entityType: 'scheduled_order'
    });
    
    return newScheduledOrder;
  }
  
  async updateScheduledOrder(id: number, scheduledOrder: Partial<InsertScheduledOrder>): Promise<ScheduledOrder | undefined> {
    const existingOrder = this.scheduledOrders.get(id);
    if (!existingOrder) return undefined;
    
    const updatedOrder = { ...existingOrder, ...scheduledOrder };
    this.scheduledOrders.set(id, updatedOrder);
    return updatedOrder;
  }
  
  async deleteScheduledOrder(id: number): Promise<boolean> {
    if (!this.scheduledOrders.has(id)) return false;
    
    // Log activity
    await this.createActivity({
      type: 'scheduled_order_deleted',
      description: `Scheduled order ${id} was deleted`,
      entityId: id,
      entityType: 'scheduled_order'
    });
    
    return this.scheduledOrders.delete(id);
  }
  
  // Initialize sample data for the application
  private initSampleData() {
    // Sample users with different roles using simple passwords
    this.users.set(1, {
      id: 1,
      username: "admin",
      password: "password123",
      fullName: "Yash Sharma",
      role: "admin",
      createdAt: new Date()
    });
    this.userId++;
    
    this.users.set(2, {
      id: 2,
      username: "kitchen",
      password: "password123",
      fullName: "Chef Ravi Kumar",
      role: "kitchen",
      createdAt: new Date()
    });
    this.userId++;
    
    this.users.set(3, {
      id: 3,
      username: "waiter",
      password: "password123",
      fullName: "Anil Patel",
      role: "waiter",
      createdAt: new Date()
    });
    this.userId++;
    
    this.users.set(4, {
      id: 4,
      username: "manager",
      password: "password123",
      fullName: "Priya Verma",
      role: "manager",
      createdAt: new Date()
    });
    this.userId++;
    
    this.users.set(5, {
      id: 5,
      username: "delivery",
      password: "password123",
      fullName: "Suresh Singh",
      role: "delivery",
      createdAt: new Date()
    });
    this.userId++;
    
    // Sample menu items with comprehensive categories and variety
    const menuItemsToCreate = [
      // RICE AND BIRYANI - VEGETARIAN
      { 
        name: "Veg Biryani", 
        price: 250, 
        category: "Rice and Biryani - Veg", 
        description: "Fragrant basmati rice cooked with mixed vegetables and aromatic spices", 
        isAvailable: true,
        dietaryTags: ["vegetarian"],
        imageUrl: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?q=80&w=987&auto=format&fit=crop"
      },
      { 
        name: "Jeera Rice", 
        price: 180, 
        category: "Rice and Biryani - Veg", 
        description: "Steamed basmati rice tempered with cumin seeds", 
        isAvailable: true,
        dietaryTags: ["vegetarian"]
      },
      { 
        name: "Kashmiri Pulao", 
        price: 220, 
        category: "Rice and Biryani - Veg", 
        description: "Fragrant rice with dried fruits, nuts and mild spices", 
        isAvailable: true,
        dietaryTags: ["vegetarian"]
      },
      
      // RICE AND BIRYANI - NON-VEGETARIAN
      { 
        name: "Chicken Biryani", 
        price: 320, 
        category: "Rice and Biryani - Non-Veg", 
        description: "Fragrant basmati rice cooked with tender chicken and aromatic spices", 
        isAvailable: true,
        dietaryTags: ["non-vegetarian"],
        imageUrl: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=80&w=2070&auto=format&fit=crop"
      },
      { 
        name: "Mutton Biryani", 
        price: 380, 
        category: "Rice and Biryani - Non-Veg", 
        description: "Fragrant basmati rice cooked with tender mutton pieces and aromatic spices", 
        isAvailable: true,
        dietaryTags: ["non-vegetarian"] 
      },
      { 
        name: "Prawn Biryani", 
        price: 350, 
        category: "Rice and Biryani - Non-Veg", 
        description: "Fragrant basmati rice cooked with marinated prawns and aromatic spices", 
        isAvailable: true,
        dietaryTags: ["non-vegetarian", "seafood"] 
      },
      
      // CURRIES - VEGETARIAN
      { 
        name: "Paneer Butter Masala", 
        price: 290, 
        category: "Curries - Veg", 
        description: "Cottage cheese cubes in rich, creamy tomato gravy", 
        isAvailable: true,
        dietaryTags: ["vegetarian"],
        imageUrl: "https://images.unsplash.com/photo-1631452180539-96aca7d48617?q=80&w=2070&auto=format&fit=crop"
      },
      { 
        name: "Dal Makhani", 
        price: 250, 
        category: "Curries - Veg", 
        description: "Black lentils and kidney beans simmered with butter and cream", 
        isAvailable: true,
        dietaryTags: ["vegetarian"] 
      },
      { 
        name: "Palak Paneer", 
        price: 280, 
        category: "Curries - Veg", 
        description: "Cottage cheese cubes in spinach gravy", 
        isAvailable: true,
        dietaryTags: ["vegetarian"] 
      },
      { 
        name: "Malai Kofta", 
        price: 300, 
        category: "Curries - Veg", 
        description: "Soft potato and paneer dumplings in rich cream sauce", 
        isAvailable: true,
        dietaryTags: ["vegetarian"] 
      },
      
      // CURRIES - NON-VEGETARIAN
      { 
        name: "Butter Chicken", 
        price: 320, 
        category: "Curries - Non-Veg", 
        description: "Tender chicken cooked in creamy tomato sauce", 
        isAvailable: true,
        dietaryTags: ["non-vegetarian"] 
      },
      { 
        name: "Chicken Tikka Masala", 
        price: 330, 
        category: "Curries - Non-Veg", 
        description: "Grilled chicken pieces in spiced tomato gravy", 
        isAvailable: true,
        dietaryTags: ["non-vegetarian"] 
      },
      { 
        name: "Mutton Rogan Josh", 
        price: 380, 
        category: "Curries - Non-Veg", 
        description: "Tender mutton in aromatic Kashmiri gravy", 
        isAvailable: true,
        dietaryTags: ["non-vegetarian"] 
      },
      { 
        name: "Fish Curry", 
        price: 350, 
        category: "Curries - Non-Veg", 
        description: "Fish fillets in tangy and spicy coconut gravy", 
        isAvailable: true,
        dietaryTags: ["non-vegetarian", "seafood"] 
      },
      
      // STARTERS
      { 
        name: "Paneer Tikka", 
        price: 280, 
        category: "Starters", 
        description: "Grilled cottage cheese with spices", 
        isAvailable: true,
        dietaryTags: ["vegetarian"] 
      },
      { 
        name: "Veg Pakora", 
        price: 180, 
        category: "Starters", 
        description: "Assorted vegetables dipped in spiced gram flour batter and deep-fried", 
        isAvailable: true,
        dietaryTags: ["vegetarian"] 
      },
      { 
        name: "Chicken Tikka", 
        price: 320, 
        category: "Starters", 
        description: "Grilled chicken pieces marinated in yogurt and spices", 
        isAvailable: true,
        dietaryTags: ["non-vegetarian"] 
      },
      { 
        name: "Seekh Kebab", 
        price: 340, 
        category: "Starters", 
        description: "Minced meat mixed with spices and grilled on skewers", 
        isAvailable: true,
        dietaryTags: ["non-vegetarian"] 
      },
      
      // MAIN COURSE
      { 
        name: "Veg Kofta", 
        price: 280, 
        category: "Main Course", 
        description: "Mixed vegetable dumplings in rich gravy", 
        isAvailable: true,
        dietaryTags: ["vegetarian"] 
      },
      { 
        name: "Chole Bhature", 
        price: 260, 
        category: "Main Course", 
        description: "Spicy chickpea curry served with fried bread", 
        isAvailable: true,
        dietaryTags: ["vegetarian"] 
      },
      { 
        name: "Tandoori Chicken", 
        price: 380, 
        category: "Main Course", 
        description: "Whole chicken marinated in yogurt and spices, cooked in clay oven", 
        isAvailable: true,
        dietaryTags: ["non-vegetarian"] 
      },
      { 
        name: "Lamb Chops", 
        price: 450, 
        category: "Main Course", 
        description: "Marinated lamb chops grilled to perfection", 
        isAvailable: true,
        dietaryTags: ["non-vegetarian"] 
      },
      
      // FRIED RICE AND NOODLES
      { 
        name: "Veg Fried Rice", 
        price: 220, 
        category: "Fried Rice and Noodles", 
        description: "Rice stir-fried with mixed vegetables", 
        isAvailable: true,
        dietaryTags: ["vegetarian"] 
      },
      { 
        name: "Chicken Fried Rice", 
        price: 260, 
        category: "Fried Rice and Noodles", 
        description: "Rice stir-fried with chicken and vegetables", 
        isAvailable: true,
        dietaryTags: ["non-vegetarian"] 
      },
      { 
        name: "Veg Hakka Noodles", 
        price: 220, 
        category: "Fried Rice and Noodles", 
        description: "Noodles stir-fried with mixed vegetables", 
        isAvailable: true,
        dietaryTags: ["vegetarian"] 
      },
      { 
        name: "Chicken Noodles", 
        price: 260, 
        category: "Fried Rice and Noodles", 
        description: "Noodles stir-fried with chicken and vegetables", 
        isAvailable: true,
        dietaryTags: ["non-vegetarian"] 
      },
      
      // DESSERTS
      { 
        name: "Gulab Jamun", 
        price: 120, 
        category: "Dessert", 
        description: "Sweet milk solids with sugar syrup", 
        isAvailable: true,
        dietaryTags: ["vegetarian"],
        imageUrl: "https://images.unsplash.com/photo-1582716401301-b2407dc7563d?q=80&w=2075&auto=format&fit=crop"
      },
      { 
        name: "Rasmalai", 
        price: 150, 
        category: "Dessert", 
        description: "Soft cottage cheese patties in sweet, flavored milk", 
        isAvailable: true,
        dietaryTags: ["vegetarian"],
        imageUrl: "https://images.unsplash.com/photo-1611095210561-67f0e131a360?q=80&w=2070&auto=format&fit=crop"
      },
      { 
        name: "Kheer", 
        price: 130, 
        category: "Dessert", 
        description: "Rice pudding with nuts and flavored with cardamom", 
        isAvailable: true,
        dietaryTags: ["vegetarian"],
        imageUrl: "https://images.unsplash.com/photo-1615744455856-d363164144c0?q=80&w=1974&auto=format&fit=crop"
      },
      { 
        name: "Ice Cream", 
        price: 120, 
        category: "Dessert", 
        description: "Choice of vanilla, chocolate, or strawberry", 
        isAvailable: true,
        dietaryTags: ["vegetarian"],
        imageUrl: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?q=80&w=2012&auto=format&fit=crop"
      },
      
      // GRILLED SANDWICHES
      { 
        name: "Veg Grilled Sandwich", 
        price: 180, 
        category: "Grilled Sandwiches", 
        description: "Grilled sandwich with mixed vegetables and cheese", 
        isAvailable: true,
        dietaryTags: ["vegetarian"],
        imageUrl: "https://images.unsplash.com/photo-1554433607-66b5efe9d304?q=80&w=2070&auto=format&fit=crop"
      },
      { 
        name: "Paneer Tikka Sandwich", 
        price: 200, 
        category: "Grilled Sandwiches", 
        description: "Grilled sandwich with spiced paneer tikka filling", 
        isAvailable: true,
        dietaryTags: ["vegetarian"] 
      },
      { 
        name: "Chicken Tikka Sandwich", 
        price: 220, 
        category: "Grilled Sandwiches", 
        description: "Grilled sandwich with spiced chicken tikka filling", 
        isAvailable: true,
        dietaryTags: ["non-vegetarian"] 
      },
      { 
        name: "Club Sandwich", 
        price: 240, 
        category: "Grilled Sandwiches", 
        description: "Triple-decker sandwich with chicken, egg, vegetables and cheese", 
        isAvailable: true,
        dietaryTags: ["non-vegetarian"] 
      },
      
      // BEVERAGES
      { 
        name: "Masala Chai", 
        price: 50, 
        category: "Beverage", 
        description: "Spiced Indian tea", 
        isAvailable: true,
        dietaryTags: ["vegetarian"] 
      },
      { 
        name: "Cold Coffee", 
        price: 120, 
        category: "Beverage", 
        description: "Chilled coffee with ice cream", 
        isAvailable: true,
        dietaryTags: ["vegetarian"] 
      },
      { 
        name: "Fresh Lime Soda", 
        price: 80, 
        category: "Beverage", 
        description: "Refreshing lime juice with soda, sweet or salty", 
        isAvailable: true,
        dietaryTags: ["vegetarian", "vegan"] 
      },
      { 
        name: "Mango Lassi", 
        price: 120, 
        category: "Beverage", 
        description: "Chilled yogurt drink with mango flavor", 
        isAvailable: true,
        dietaryTags: ["vegetarian"],
        imageUrl: "https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?q=80&w=1974&auto=format&fit=crop"
      }
    ];
    
    menuItemsToCreate.forEach(item => this.createMenuItem(item));
    
    // Sample customers for orders
    const customers = [
      { name: "Rahul Gupta", phone: "9876543210", email: "rahul@example.com", visitCount: 3 },
      { name: "Priya Sharma", phone: "9876543211", email: "priya@example.com", visitCount: 5 },
      { name: "Amit Singh", phone: "9876543212", email: "amit@example.com", visitCount: 2 }
    ];
    
    customers.forEach(customer => this.createCustomer(customer));
    
    // Create some sample orders to populate dashboard
    const today = new Date();
    
    // Active pending order
    this.createOrder({
      orderNumber: "ORD-1001",
      tableNumber: "T1",
      status: "pending",
      totalAmount: 650,
      notes: "Extra spicy",
      orderSource: "manual",
      useAIAutomation: false,
      createdAt: today
    });
    
    // Active preparing order
    this.createOrder({
      orderNumber: "ORD-1002",
      tableNumber: "T2",
      status: "preparing",
      totalAmount: 450,
      notes: null,
      orderSource: "whatsapp",
      useAIAutomation: true,
      createdAt: today
    });
    
    // Completed order
    this.createOrder({
      orderNumber: "ORD-1003",
      tableNumber: "T3",
      status: "completed",
      totalAmount: 820,
      notes: "No onions",
      orderSource: "manual",
      useAIAutomation: false,
      createdAt: today
    });
    
    // Order items
    this.createOrderItem({
      orderId: 1,
      menuItemId: 1,
      quantity: 1,
      price: 320,
      notes: null
    });
    
    this.createOrderItem({
      orderId: 1,
      menuItemId: 2,
      quantity: 1,
      price: 280,
      notes: "Extra spicy"
    });
    
    this.createOrderItem({
      orderId: 1,
      menuItemId: 4,
      quantity: 1,
      price: 50,
      notes: null
    });
    
    // Kitchen tokens
    this.createKitchenToken({
      tokenNumber: "T01",
      orderId: 1,
      status: "pending",
      isUrgent: false,
      startTime: today
    });
    
    this.createKitchenToken({
      tokenNumber: "T02",
      orderId: 2,
      status: "preparing",
      isUrgent: true,
      startTime: today
    });
    
    // Sample bill
    this.createBill({
      billNumber: "BILL-1001",
      orderId: 3,
      subtotal: 750,
      tax: 70,
      discount: 0,
      total: 820,
      paymentStatus: "paid",
      paymentMethod: "card"
    });
    
    // Sample activities
    this.createActivity({
      type: "order_created",
      description: "New order ORD-1001 created",
      entityId: 1,
      entityType: "order"
    });
    
    this.createActivity({
      type: "kitchen_update",
      description: "Kitchen token T02 marked as urgent",
      entityId: 2,
      entityType: "kitchen_token"
    });
    
    this.createActivity({
      type: "payment_received",
      description: "Payment of ₹820 received for order ORD-1003",
      entityId: 3,
      entityType: "bill"
    });
  }
}

export const storage = new MemStorage();
