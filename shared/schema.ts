import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("staff"),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  role: true
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Menu item model
export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  price: doublePrecision("price").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  isAvailable: boolean("is_available").notNull().default(true),
});

export const insertMenuItemSchema = createInsertSchema(menuItems).pick({
  name: true,
  price: true,
  category: true,
  description: true,
  isAvailable: true,
});

export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type MenuItem = typeof menuItems.$inferSelect;

// Order model
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  tableNumber: text("table_number"),
  status: text("status").notNull().default("pending"),
  totalAmount: doublePrecision("total_amount").notNull().default(0),
  notes: text("notes"),
  orderSource: text("order_source").default("manual"), // "manual", "ai_simulator", "whatsapp", "phone"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertOrderSchema = createInsertSchema(orders).pick({
  orderNumber: true,
  tableNumber: true,
  status: true,
  totalAmount: true,
  notes: true,
  orderSource: true,
});

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

// Order item model
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  menuItemId: integer("menu_item_id").notNull(),
  quantity: integer("quantity").notNull().default(1),
  price: doublePrecision("price").notNull(),
  notes: text("notes"),
});

export const insertOrderItemSchema = createInsertSchema(orderItems).pick({
  orderId: true,
  menuItemId: true,
  quantity: true,
  price: true,
  notes: true,
});

export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItems.$inferSelect;

// Kitchen token model
export const kitchenTokens = pgTable("kitchen_tokens", {
  id: serial("id").primaryKey(),
  tokenNumber: text("token_number").notNull().unique(),
  orderId: integer("order_id").notNull(),
  status: text("status").notNull().default("pending"), // pending, preparing, ready, served
  isUrgent: boolean("is_urgent").notNull().default(false),
  startTime: timestamp("start_time").defaultNow(),
  completionTime: timestamp("completion_time"),
});

export const insertKitchenTokenSchema = createInsertSchema(kitchenTokens).pick({
  tokenNumber: true,
  orderId: true,
  status: true,
  isUrgent: true,
});

export type InsertKitchenToken = z.infer<typeof insertKitchenTokenSchema>;
export type KitchenToken = typeof kitchenTokens.$inferSelect;

// Bill model
export const bills = pgTable("bills", {
  id: serial("id").primaryKey(),
  billNumber: text("bill_number").notNull().unique(),
  orderId: integer("order_id").notNull(),
  subtotal: doublePrecision("subtotal").notNull(),
  tax: doublePrecision("tax").notNull(),
  discount: doublePrecision("discount").notNull().default(0),
  total: doublePrecision("total").notNull(),
  paymentStatus: text("payment_status").notNull().default("pending"),
  paymentMethod: text("payment_method"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBillSchema = createInsertSchema(bills).pick({
  billNumber: true,
  orderId: true,
  subtotal: true,
  tax: true,
  discount: true,
  total: true,
  paymentStatus: true,
  paymentMethod: true,
});

export type InsertBill = z.infer<typeof insertBillSchema>;
export type Bill = typeof bills.$inferSelect;

// Inventory model
export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  quantity: doublePrecision("quantity").notNull().default(0),
  unit: text("unit").notNull(),
  minQuantity: doublePrecision("min_quantity").notNull().default(0),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const insertInventorySchema = createInsertSchema(inventory).pick({
  name: true,
  category: true,
  quantity: true,
  unit: true,
  minQuantity: true,
});

export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type Inventory = typeof inventory.$inferSelect;

// Customer model
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").unique(),
  email: text("email").unique(),
  visitCount: integer("visit_count").notNull().default(0),
  lastVisit: timestamp("last_visit").defaultNow(),
  preferences: json("preferences").$type<string[]>().default([]),
});

export const insertCustomerSchema = createInsertSchema(customers).pick({
  name: true,
  phone: true,
  email: true,
  visitCount: true,
  preferences: true,
});

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

// Activity model for tracking system activities
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  entityId: integer("entity_id"),
  entityType: text("entity_type"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertActivitySchema = createInsertSchema(activities).pick({
  type: true,
  description: true,
  entityId: true,
  entityType: true,
});

export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;
