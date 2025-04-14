import {
  User, InsertUser, users,
  MenuItem, InsertMenuItem, menuItems,
  Order, InsertOrder, orders,
  OrderItem, InsertOrderItem, orderItems,
  KitchenToken, InsertKitchenToken, kitchenTokens,
  Bill, InsertBill, bills,
  Inventory, InsertInventory, inventory,
  Customer, InsertCustomer, customers,
  Activity, InsertActivity, activities
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
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: number, item: Partial<InsertMenuItem>): Promise<MenuItem | undefined>;
  
  // Order operations
  getOrder(id: number): Promise<Order | undefined>;
  getOrderByNumber(orderNumber: string): Promise<Order | undefined>;
  getOrders(): Promise<Order[]>;
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
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  
  // Activity operations
  getActivities(limit?: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
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
  
  private userId: number = 1;
  private menuItemId: number = 1;
  private orderId: number = 1;
  private orderItemId: number = 1;
  private kitchenTokenId: number = 1;
  private billId: number = 1;
  private inventoryId: number = 1;
  private customerId: number = 1;
  private activityId: number = 1;
  
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
      ...user, 
      id,
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
  
  // Order operations
  async getOrder(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }
  
  async getOrderByNumber(orderNumber: string): Promise<Order | undefined> {
    return Array.from(this.orders.values()).find(order => order.orderNumber === orderNumber);
  }
  
  async getOrders(): Promise<Order[]> {
    return Array.from(this.orders.values());
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
  
  // Initialize with sample data for development
  private initSampleData() {
    // Sample admin user
    this.createUser({
      username: "admin",
      password: "admin123",
      fullName: "Yash Sharma",
      role: "admin"
    });
    
    // Sample menu items
    const menuItemsToCreate = [
      { name: "Butter Chicken", price: 320, category: "Main Course", description: "Tender chicken cooked in creamy tomato sauce", isAvailable: true },
      { name: "Paneer Tikka", price: 280, category: "Appetizer", description: "Grilled cottage cheese with spices", isAvailable: true },
      { name: "Veg Biryani", price: 250, category: "Rice", description: "Aromatic rice with mixed vegetables", isAvailable: true },
      { name: "Masala Chai", price: 50, category: "Beverage", description: "Spiced Indian tea", isAvailable: true },
      { name: "Gulab Jamun", price: 120, category: "Dessert", description: "Sweet milk solids with sugar syrup", isAvailable: true }
    ];
    
    menuItemsToCreate.forEach(item => this.createMenuItem(item));
    
    // Sample orders
    const ordersToCreate = [
      { orderNumber: "ORD-7652", tableNumber: "Table 5", status: "completed", totalAmount: 1290, notes: "" },
      { orderNumber: "ORD-7651", tableNumber: "Table 12", status: "in-progress", totalAmount: 540, notes: "" },
      { orderNumber: "ORD-7650", tableNumber: "Table 3", status: "billed", totalAmount: 2350, notes: "" },
      { orderNumber: "ORD-7649", tableNumber: "Takeaway", status: "completed", totalAmount: 180, notes: "" },
      { orderNumber: "ORD-7648", tableNumber: "Table 8", status: "completed", totalAmount: 890, notes: "" }
    ];
    
    ordersToCreate.forEach(order => this.createOrder(order));
    
    // Sample kitchen tokens
    const tokensToCreate = [
      { tokenNumber: "T45", orderId: 2, status: "preparing", isUrgent: false },
      { tokenNumber: "T44", orderId: 2, status: "preparing", isUrgent: false },
      { tokenNumber: "T43", orderId: 1, status: "delayed", isUrgent: true },
      { tokenNumber: "T42", orderId: 5, status: "ready", isUrgent: false }
    ];
    
    tokensToCreate.forEach(token => this.createKitchenToken(token));
    
    // Sample inventory items
    const inventoryToCreate = [
      { name: "Chicken", category: "Meat", quantity: 5, unit: "kg", minQuantity: 2 },
      { name: "Paneer", category: "Dairy", quantity: 3, unit: "kg", minQuantity: 1 },
      { name: "Rice", category: "Grains", quantity: 20, unit: "kg", minQuantity: 5 },
      { name: "Tomatoes", category: "Vegetables", quantity: 2, unit: "kg", minQuantity: 3 },
      { name: "Milk", category: "Dairy", quantity: 10, unit: "liter", minQuantity: 3 }
    ];
    
    inventoryToCreate.forEach(item => this.createInventoryItem(item));
    
    // Sample customers
    const customersToCreate = [
      { name: "Rahul Singh", phone: "9876543210", email: "rahul@example.com", visitCount: 5, preferences: ["Veg Biryani", "Masala Chai"] },
      { name: "Priya Sharma", phone: "9876543211", email: "priya@example.com", visitCount: 2, preferences: ["Paneer Tikka"] }
    ];
    
    customersToCreate.forEach(customer => this.createCustomer(customer));
    
    // Sample bills
    const billsToCreate = [
      { billNumber: "BILL-3245", orderId: 1, subtotal: 1200, tax: 90, discount: 0, total: 1290, paymentStatus: "paid", paymentMethod: "cash" },
      { billNumber: "BILL-3244", orderId: 3, subtotal: 2150, tax: 200, discount: 0, total: 2350, paymentStatus: "paid", paymentMethod: "card" },
      { billNumber: "BILL-3243", orderId: 4, subtotal: 170, tax: 10, discount: 0, total: 180, paymentStatus: "paid", paymentMethod: "cash" }
    ];
    
    billsToCreate.forEach(bill => this.createBill(bill));
  }
}

export const storage = new MemStorage();
