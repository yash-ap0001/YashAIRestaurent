import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import PDFDocument from "pdfkit";
import { insertOrderSchema, insertOrderItemSchema, insertKitchenTokenSchema, insertBillSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { getHealthRecommendations, processNaturalLanguageOrder, getPersonalizedRecommendations } from "./services/aiService";
import { aiService, centralAIController, notificationSystem } from "./services";
import { n8nService } from "./services/n8nService";
import { hashPassword } from "./auth";
import { 
  initializeWhatsAppService, 
  handleSendMessage, 
  handleSendBill, 
  handleGetStatus,
  getWhatsAppClient,
  handleSendBillWithHealthTips
} from "./services/whatsapp";

// Import individual functions
import {
  initializeTelephonyService,
  handleIncomingCall,
  processSpeech,
  confirmOrder,
  retryOrder,
  selectLanguage,
  getCalls, 
  getCallStatistics, 
  getAIVoiceSettings, 
  updateAIVoiceSettings, 
  simulateIncomingCall,
  makeOutboundCall,
  CallData
} from "./services/telephony";

// Import the entire module for direct function calls
import * as telephonyService from "./services/telephony";
import { processChatbotRequest } from "./services/chatbot";
import { WebSocketServer } from 'ws';
import { initializeRealTimeService, broadcastStatsUpdate, broadcastToAllClients } from './services/realtime';
import { notificationService } from './services/notificationService';
import { broadcastNewOrder } from './orderEnhancement';
import { generateOrderNumber, generateTokenNumber, generateBillNumber, initializeCounters, handleError } from './utils';
import { simulateZomatoOrder, simulateSwiggyOrder } from './services/externalPlatforms';
// We'll use dynamic import for voiceAssistant.ts to avoid circular dependencies
import { db } from './db';
import { activities } from '@shared/schema';
import { setupAuth } from './auth';

// Role-based access control middleware
export function checkRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const userRole = req.user?.role;
    
    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: "Access forbidden: insufficient permissions" });
    }
    
    next();
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Setup authentication
  setupAuth(app);
  
  // Initialize WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  initializeRealTimeService(wss);

  // Error handling middleware
  const errorHandler = (err: any, res: Response) => {
    if (err instanceof ZodError) {
      return res.status(400).json({
        error: fromZodError(err).message
      });
    }
    
    console.error("API Error:", err);
    return res.status(500).json({
      error: "Internal server error"
    });
  };

  // Initialize counters for sequential ticket numbering
  try {
    // Get the latest data from storage to determine the starting counters
    const orders = await storage.getOrders();
    const tokens = await storage.getKitchenTokens();
    const bills = await storage.getBills();
    
    // Extract the latest order, token, and bill numbers if they exist
    const lastOrderNumber = orders.length > 0 ? 
      orders.sort((a, b) => b.id - a.id)[0].orderNumber : null;
      
    const lastTokenNumber = tokens.length > 0 ? 
      tokens.sort((a, b) => b.id - a.id)[0].tokenNumber : null;
      
    const lastBillNumber = bills.length > 0 ? 
      bills.sort((a, b) => b.id - a.id)[0].billNumber : null;
    
    // Initialize the counters based on the latest numbers
    initializeCounters(lastOrderNumber, lastTokenNumber, lastBillNumber);
    
    console.log('Sequential ticket numbering system initialized');
  } catch (error) {
    console.error('Error initializing sequential counter system:', error);
    // Continue with default counter values if initialization fails
  }

  // Helper function to handle AI-driven automatic order processing
  const setupAIAutomatedOrderProcessing = async (order: any) => {
    if (!order.useAIAutomation) {
      console.log(`Order ${order.id} (${order.orderNumber}) does not have AI automation enabled - skipping automatic processing`);
      return;
    }
    
    console.log(`Setting up AI-driven automation for order ${order.id} (${order.orderNumber})`);
    
    try {
      // Use the Central AI Controller to process this order
      await centralAIController.processNewOrder(order);
      
      // Set up notifications if this is a customer-facing order
      if (order.orderSource && order.orderSource !== 'manual') {
        notificationSystem.setupOrderNotifications(order);
      }
      
      console.log(`AI Controller: Order ${order.id} has been registered for automated processing`);
    } catch (error) {
      console.error(`Error setting up AI automation for order ${order.id}:`, error);
      
      // Fall back to the legacy approach if the AI Controller fails
      console.log(`Falling back to legacy automation for order ${order.id}`);
      
      // Update to 'preparing' status after a short delay (5 seconds)
      setTimeout(async () => {
        try {
          console.log(`Legacy AI Automation: Updating order ${order.id} to 'preparing' status`);
          await storage.updateOrder(order.id, { status: "preparing" });
          
          // Log the activity for the dashboard
          await storage.createActivity({
            type: "status_update",
            description: `Order #${order.orderNumber} is now being prepared (AI Automated)`,
            entityId: order.id,
            entityType: "order"
          });
        } catch (error) {
          console.error(`Error in legacy AI automation for order ${order.id} - preparing stage:`, error);
        }
      }, 5000); // 5 seconds
      
      // Update to 'ready' status after a medium delay (15 seconds)
      setTimeout(async () => {
        try {
          console.log(`Legacy AI Automation: Updating order ${order.id} to 'ready' status`);
          await storage.updateOrder(order.id, { status: "ready" });
          
          // Update the kitchen token status
          const kitchenTokens = await storage.getKitchenTokens();
          const orderToken = kitchenTokens.find(token => token.orderId === order.id);
          if (orderToken) {
            await storage.updateKitchenToken(orderToken.id, { status: "ready" });
          }
          
          // Log the activity for the dashboard
          await storage.createActivity({
            type: "status_update",
            description: `Order #${order.orderNumber} is ready for service (AI Automated)`,
            entityId: order.id,
            entityType: "order"
          });
        } catch (error) {
          console.error(`Error in legacy AI automation for order ${order.id} - ready stage:`, error);
        }
      }, 15000); // 15 seconds
      
      // Update to 'complete' status after a longer delay (30 seconds)
      setTimeout(async () => {
        try {
          console.log(`Legacy AI Automation: Updating order ${order.id} to 'completed' status`);
          await storage.updateOrder(order.id, { status: "completed" });
          
          // Log the activity for the dashboard
          await storage.createActivity({
            type: "status_update",
            description: `Order #${order.orderNumber} has been delivered (AI Automated)`,
            entityId: order.id,
            entityType: "order"
          });
          
          // Create a bill for the order
          console.log(`Legacy AI Automation: Creating bill for order ${order.id}`);
          const orderItems = await storage.getOrderItems(order.id);
          
          // Calculate bill amounts
          const subtotal = orderItems.reduce((total, item) => total + (item.price * item.quantity), 0);
          const taxRate = 0.18; // 18% tax
          const tax = subtotal * taxRate;
          const total = subtotal + tax;
          
          const billData = {
            orderId: order.id,
            billNumber: generateBillNumber(),
            subtotal: subtotal,
            tax: tax,
            discount: 0,
            total: total,
            paymentStatus: "pending",
            paymentMethod: null
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
        } catch (error) {
          console.error(`Error in legacy AI automation for order ${order.id} - completed/billing stage:`, error);
        }
      }, 30000); // 30 seconds
    }
  };

  // API Routes - all prefixed with /api
  // Menu Items
  app.get("/api/menu-items", async (req: Request, res: Response) => {
    try {
      const menuItems = await storage.getMenuItems();
      res.json(menuItems);
    } catch (err) {
      errorHandler(err, res);
    }
  });

  app.get("/api/menu-items/:id", async (req: Request, res: Response) => {
    try {
      const menuItem = await storage.getMenuItem(parseInt(req.params.id));
      if (!menuItem) {
        return res.status(404).json({ error: "Menu item not found" });
      }
      res.json(menuItem);
    } catch (err) {
      errorHandler(err, res);
    }
  });

  // POST - Create new menu item
  app.post("/api/menu-items", async (req: Request, res: Response) => {
    try {
      // Check role permission
      if (!req.isAuthenticated() || !["admin", "manager"].includes(req.user.role)) {
        return res.status(403).json({ error: "Unauthorized: Insufficient permissions" });
      }

      const newMenuItem = await storage.createMenuItem(req.body);
      
      // Log activity
      await storage.createActivity({
        type: "menu_item_created",
        description: `Menu item "${newMenuItem.name}" has been created`,
        entityId: newMenuItem.id,
        entityType: "menu_item"
      });
      
      res.status(201).json(newMenuItem);
    } catch (err) {
      errorHandler(err, res);
    }
  });

  // PATCH - Update menu item
  app.patch("/api/menu-items/:id", async (req: Request, res: Response) => {
    try {
      // Check role permission
      if (!req.isAuthenticated() || !["admin", "manager"].includes(req.user.role)) {
        return res.status(403).json({ error: "Unauthorized: Insufficient permissions" });
      }

      const id = parseInt(req.params.id);
      const menuItem = await storage.getMenuItem(id);
      
      if (!menuItem) {
        return res.status(404).json({ error: "Menu item not found" });
      }
      
      const updatedMenuItem = await storage.updateMenuItem(id, req.body);
      
      // Log activity
      await storage.createActivity({
        type: "menu_item_updated",
        description: `Menu item "${updatedMenuItem.name}" has been updated`,
        entityId: updatedMenuItem.id,
        entityType: "menu_item"
      });
      
      res.json(updatedMenuItem);
    } catch (err) {
      errorHandler(err, res);
    }
  });

  // DELETE - Delete menu item
  app.delete("/api/menu-items/:id", async (req: Request, res: Response) => {
    try {
      // Check role permission
      if (!req.isAuthenticated() || !["admin", "manager"].includes(req.user.role)) {
        return res.status(403).json({ error: "Unauthorized: Insufficient permissions" });
      }

      const id = parseInt(req.params.id);
      const menuItem = await storage.getMenuItem(id);
      
      if (!menuItem) {
        return res.status(404).json({ error: "Menu item not found" });
      }
      
      // We need to add the deleteMenuItem method to storage
      const success = await storage.deleteMenuItem(id);
      
      if (success) {
        // Log activity
        await storage.createActivity({
          type: "menu_item_deleted",
          description: `Menu item "${menuItem.name}" has been deleted`,
          entityId: id,
          entityType: "menu_item"
        });
        
        res.status(204).end();
      } else {
        res.status(500).json({ error: "Failed to delete menu item" });
      }
    } catch (err) {
      errorHandler(err, res);
    }
  });

  // Orders
  app.get("/api/orders", async (req: Request, res: Response) => {
    try {
      const orders = await storage.getOrders();
      res.json(orders);
    } catch (err) {
      errorHandler(err, res);
    }
  });

  app.get("/api/orders/:id", async (req: Request, res: Response) => {
    try {
      const order = await storage.getOrder(parseInt(req.params.id));
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Get order items
      const orderItems = await storage.getOrderItems(order.id);
      
      res.json({
        ...order,
        items: orderItems
      });
    } catch (err) {
      errorHandler(err, res);
    }
  });
  
  app.get("/api/orders/:id/items", async (req: Request, res: Response) => {
    try {
      const orderId = parseInt(req.params.id);
      if (isNaN(orderId)) {
        return res.status(400).json({ error: "Invalid order ID" });
      }
      
      const orderItems = await storage.getOrderItems(orderId);
      
      // For each order item, fetch menu item details to get the name
      const itemsWithDetails = await Promise.all(
        orderItems.map(async (item) => {
          // Get the menu item info to retrieve the name
          try {
            const menuItem = await storage.getMenuItem(item.menuItemId);
            return {
              ...item,
              name: menuItem?.name || `Item #${item.menuItemId}`
            };
          } catch (err) {
            console.error(`Error fetching menu item ${item.menuItemId}:`, err);
            return {
              ...item,
              name: `Item #${item.menuItemId}`
            };
          }
        })
      );
      
      console.log(`Retrieved ${itemsWithDetails.length} items for order ${orderId}:`, itemsWithDetails);
      res.json(itemsWithDetails);
    } catch (err) {
      errorHandler(err, res);
    }
  });

  app.post("/api/orders", async (req: Request, res: Response) => {
    try {
      console.log("Received order creation request:", req.body);
      
      // Create a new order
      const orderData = {
        ...req.body,
        orderNumber: generateOrderNumber()
      };
      
      // Log if AI automation is enabled
      if (req.body.useAIAutomation) {
        console.log("AI Automation enabled for this order - will manage status updates automatically");
      } else {
        console.log("AI Automation disabled for this order - staff will manage status updates manually");
      }
      
      const parsedOrder = insertOrderSchema.parse(orderData);
      const order = await storage.createOrder(parsedOrder);
      
      // Create order items if provided
      const orderItems = req.body.items || req.body.orderItems;
      if (Array.isArray(orderItems)) {
        console.log(`Creating ${orderItems.length} order items`);
        for (const item of orderItems) {
          const orderItem = {
            ...item,
            orderId: order.id
          };
          const parsedOrderItem = insertOrderItemSchema.parse(orderItem);
          await storage.createOrderItem(parsedOrderItem);
        }
      }
      
      // Note: We'll broadcast the order at the end of this function
      // to avoid duplicate broadcasts
 
      // Create a kitchen token if needed
      if (order.status !== "completed" && order.status !== "cancelled") {
        console.log("Creating kitchen token for order:", order.id);
        const tokenData = {
          tokenNumber: generateTokenNumber(),
          orderId: order.id,
          status: "pending",
          isUrgent: req.body.isUrgent || false
        };
        
        const parsedToken = insertKitchenTokenSchema.parse(tokenData);
        await storage.createKitchenToken(parsedToken);
      }
      
      console.log("Order created successfully:", order);
      
      // Set up AI-driven automation if enabled
      if (order.useAIAutomation) {
        setupAIAutomatedOrderProcessing(order);
      }
      
      // Broadcast the new order immediately for real-time updates
      broadcastNewOrder(order);
      
      res.setHeader('Content-Type', 'application/json');
      res.status(201).json(order);
    } catch (err) {
      console.error("Error creating order:", err);
      errorHandler(err, res);
    }
  });
  
  // Special endpoint for regular order creation that might be conflicting with Vite routing
  app.post("/api/simulator/create-order", async (req: Request, res: Response) => {
    try {
      console.log("Simulator - Received order creation request:", req.body);
      
      // Create a new order
      const orderData = {
        ...req.body,
        orderNumber: generateOrderNumber()
      };
      
      // Log if AI automation is enabled
      if (req.body.useAIAutomation) {
        console.log("Simulator - AI Automation enabled for this order - will manage status updates automatically");
      } else {
        console.log("Simulator - AI Automation disabled for this order - staff will manage status updates manually");
      }
      
      const parsedOrder = insertOrderSchema.parse(orderData);
      const order = await storage.createOrder(parsedOrder);
      
      // Create order items if provided
      if (Array.isArray(req.body.items)) {
        console.log(`Simulator - Creating ${req.body.items.length} order items`);
        for (const item of req.body.items) {
          const orderItem = {
            ...item,
            orderId: order.id
          };
          const parsedOrderItem = insertOrderItemSchema.parse(orderItem);
          await storage.createOrderItem(parsedOrderItem);
        }
      }
      
      // Create a kitchen token if needed
      if (order.status !== "completed" && order.status !== "cancelled") {
        console.log("Simulator - Creating kitchen token for order:", order.id);
        const tokenData = {
          tokenNumber: generateTokenNumber(),
          orderId: order.id,
          status: "pending",
          isUrgent: req.body.isUrgent || false
        };
        
        const parsedToken = insertKitchenTokenSchema.parse(tokenData);
        await storage.createKitchenToken(parsedToken);
      }
      
      console.log("Simulator - Order created successfully:", order);
      
      // Set up AI-driven automation if enabled
      if (order.useAIAutomation) {
        setupAIAutomatedOrderProcessing(order);
      }
      
      // Broadcast the new order once with detailed logging
      console.log(`Broadcasting simulator order: ${order.orderNumber}, ID: ${order.id}`);
      console.log('Simulator order object for broadcasting:', JSON.stringify(order, null, 2));
      broadcastNewOrder(order);
      
      res.setHeader('Content-Type', 'application/json');
      res.status(201).json(order);
    } catch (err) {
      console.error("Simulator - Error creating order:", err);
      errorHandler(err, res);
    }
  });

  app.patch("/api/orders/:id", async (req: Request, res: Response) => {
    try {
      const orderId = parseInt(req.params.id);
      const existingOrder = await storage.getOrder(orderId);
      
      if (!existingOrder) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      const updatedOrder = await storage.updateOrder(orderId, req.body);
      res.json(updatedOrder);
    } catch (err) {
      errorHandler(err, res);
    }
  });

  // Kitchen Tokens
  app.get("/api/kitchen-tokens", async (req: Request, res: Response) => {
    try {
      const tokens = await storage.getKitchenTokens();
      res.json(tokens);
    } catch (err) {
      errorHandler(err, res);
    }
  });
  
  app.post("/api/kitchen-tokens", async (req: Request, res: Response) => {
    try {
      console.log("Received kitchen token creation request:", req.body);
      
      const tokenData = {
        ...req.body,
        tokenNumber: generateTokenNumber()
      };
      
      const parsedToken = insertKitchenTokenSchema.parse(tokenData);
      const kitchenToken = await storage.createKitchenToken(parsedToken);
      
      console.log("Created kitchen token:", kitchenToken);
      res.setHeader('Content-Type', 'application/json');
      res.status(201).json(kitchenToken);
    } catch (err) {
      console.error("Kitchen token creation error:", err);
      errorHandler(err, res);
    }
  });
  
  // Special endpoint for the AI simulator to avoid routing conflicts with Vite
  // Special endpoints for AI simulator
app.post("/api/simulator/create-kitchen-token", async (req: Request, res: Response) => {
    try {
      console.log("AI Simulator - Creating kitchen token:", req.body);
      
      const tokenData = {
        ...req.body,
        tokenNumber: generateTokenNumber()
      };
      
      const parsedToken = insertKitchenTokenSchema.parse(tokenData);
      const kitchenToken = await storage.createKitchenToken(parsedToken);
      
      console.log("AI Simulator - Created kitchen token:", kitchenToken);
      res.setHeader('Content-Type', 'application/json');
      res.status(201).json(kitchenToken);
    } catch (err) {
      console.error("AI Simulator - Kitchen token creation error:", err);
      errorHandler(err, res);
    }
  });

  app.patch("/api/kitchen-tokens/:id", async (req: Request, res: Response) => {
    try {
      const tokenId = parseInt(req.params.id);
      const existingToken = await storage.getKitchenToken(tokenId);
      
      if (!existingToken) {
        return res.status(404).json({ error: "Kitchen token not found" });
      }
      
      const updatedToken = await storage.updateKitchenToken(tokenId, req.body);
      
      // Update order status if token is completed
      if (req.body.status === "ready") {
        const order = await storage.getOrder(existingToken.orderId);
        if (order) {
          await storage.updateOrder(order.id, { status: "ready" });
        }
      }
      
      res.json(updatedToken);
    } catch (err) {
      errorHandler(err, res);
    }
  });

  // Bills
  app.get("/api/bills", async (req: Request, res: Response) => {
    try {
      const bills = await storage.getBills();
      res.json(bills);
    } catch (err) {
      errorHandler(err, res);
    }
  });

  app.get("/api/bills/:id", async (req: Request, res: Response) => {
    try {
      const bill = await storage.getBill(parseInt(req.params.id));
      if (!bill) {
        return res.status(404).json({ error: "Bill not found" });
      }
      res.json(bill);
    } catch (err) {
      errorHandler(err, res);
    }
  });

  app.post("/api/bills", async (req: Request, res: Response) => {
    try {
      console.log("Received bill creation request:", req.body);
      
      // Verify that the order exists
      const orderId = req.body.orderId;
      const order = await storage.getOrder(orderId);
      
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      // Create a bill
      const billData = {
        ...req.body,
        billNumber: generateBillNumber()
      };
      
      const parsedBill = insertBillSchema.parse(billData);
      const bill = await storage.createBill(parsedBill);
      
      // Update order status
      await storage.updateOrder(orderId, { status: "billed" });
      
      console.log("Created bill:", bill);
      res.setHeader('Content-Type', 'application/json');
      res.status(201).json(bill);
    } catch (err) {
      console.error("Bill creation error:", err);
      errorHandler(err, res);
    }
  });
  
  // Special endpoint for the AI simulator to avoid routing conflicts
  app.post("/api/simulator/create-bill", async (req: Request, res: Response) => {
    try {
      console.log("AI Simulator - Creating bill:", req.body);
      
      // Verify that the order exists
      const orderId = req.body.orderId;
      const order = await storage.getOrder(orderId);
      
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      // Create a bill
      const billData = {
        ...req.body,
        billNumber: generateBillNumber()
      };
      
      const parsedBill = insertBillSchema.parse(billData);
      const bill = await storage.createBill(parsedBill);
      
      // Update order status
      await storage.updateOrder(orderId, { status: "billed" });
      
      console.log("AI Simulator - Created bill:", bill);
      res.setHeader('Content-Type', 'application/json');
      res.status(201).json(bill);
    } catch (err) {
      console.error("AI Simulator - Bill creation error:", err);
      errorHandler(err, res);
    }
  });

  // Update bill (e.g. mark as paid)
  app.patch("/api/bills/:id", async (req: Request, res: Response) => {
    try {
      const billId = parseInt(req.params.id);
      const bill = await storage.getBill(billId);
      
      if (!bill) {
        return res.status(404).json({ error: "Bill not found" });
      }
      
      const updatedBill = await storage.updateBill(billId, req.body);
      
      // Broadcast the updated bill status via WebSocket
      if (updatedBill) {
        // If marking as paid, this is an important event to broadcast
        if (req.body.paymentStatus === "paid") {
          broadcastToAllClients({ 
            type: "bill_paid", 
            data: updatedBill 
          });
          
          // Update stats after payment is recorded
          broadcastStatsUpdate();
        }
      }
      
      res.json(updatedBill);
    } catch (err) {
      errorHandler(err, res);
    }
  });

  // Generate PDF bill
  app.get("/api/bills/:id/pdf", async (req: Request, res: Response) => {
    try {
      const billId = parseInt(req.params.id);
      const bill = await storage.getBill(billId);
      
      if (!bill) {
        return res.status(404).json({ error: "Bill not found" });
      }
      
      const order = await storage.getOrder(bill.orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      const orderItems = await storage.getOrderItems(order.id);
      const menuItemPromises = orderItems.map(item => storage.getMenuItem(item.menuItemId));
      const menuItems = await Promise.all(menuItemPromises);
      
      // Create PDF document
      const doc = new PDFDocument({ margin: 50 });
      
      // Set response headers for PDF download
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=bill-${bill.billNumber}.pdf`);
      
      // Pipe the PDF to the response
      doc.pipe(res);
      
      // Add content to PDF
      doc.fontSize(25).text("YashHotelBot", { align: "center" });
      doc.fontSize(15).text("Invoice", { align: "center" });
      doc.moveDown();
      
      doc.fontSize(12).text(`Bill Number: ${bill.billNumber}`);
      doc.text(`Date: ${bill.createdAt ? bill.createdAt.toLocaleDateString() : new Date().toLocaleDateString()}`);
      doc.text(`Order Number: ${order.orderNumber}`);
      doc.text(`Table: ${order.tableNumber || "N/A"}`);
      doc.moveDown();
      
      // Add table headers
      doc.fontSize(10);
      const tableTop = doc.y;
      doc.text("Item", 50, tableTop);
      doc.text("Qty", 200, tableTop);
      doc.text("Price", 250, tableTop);
      doc.text("Total", 300, tableTop);
      
      // Add table rows
      let tableRow = tableTop + 20;
      
      for (let i = 0; i < orderItems.length; i++) {
        const item = orderItems[i];
        const menuItem = menuItems.find(m => m?.id === item.menuItemId);
        
        if (menuItem) {
          doc.text(menuItem.name, 50, tableRow);
          doc.text(item.quantity.toString(), 200, tableRow);
          doc.text(`₹${item.price.toFixed(2)}`, 250, tableRow);
          doc.text(`₹${(item.price * item.quantity).toFixed(2)}`, 300, tableRow);
          tableRow += 20;
        }
      }
      
      // Add summary
      doc.moveDown();
      doc.text(`Subtotal: ₹${bill.subtotal.toFixed(2)}`, { align: "right" });
      doc.text(`Tax: ₹${bill.tax.toFixed(2)}`, { align: "right" });
      
      if (bill.discount > 0) {
        doc.text(`Discount: ₹${bill.discount.toFixed(2)}`, { align: "right" });
      }
      
      doc.fontSize(14).text(`Total: ₹${bill.total.toFixed(2)}`, { align: "right" });
      
      doc.moveDown();
      doc.fontSize(10).text("Thank you for dining with us!", { align: "center" });
      
      // Finalize the PDF
      doc.end();
    } catch (err) {
      errorHandler(err, res);
    }
  });

  // Inventory
  app.get("/api/inventory", async (req: Request, res: Response) => {
    try {
      const inventoryItems = await storage.getInventoryItems();
      res.json(inventoryItems);
    } catch (err) {
      errorHandler(err, res);
    }
  });

  // Bulk order creation endpoints
  app.post("/api/simulator/create-bulk-orders", async (req: Request, res: Response) => {
    try {
      console.log("Bulk Order Creation - Received request:", req.body);
      
      const { orderCount, tablePrefix, tableStart, selectedMenuItems } = req.body;
      
      if (!orderCount || orderCount < 1 || !selectedMenuItems || !selectedMenuItems.length) {
        return res.status(400).json({ error: "Invalid request parameters" });
      }
      
      // Fetch menu items
      const menuItemsData = [];
      for (const menuItemId of selectedMenuItems) {
        const menuItem = await storage.getMenuItem(menuItemId);
        if (menuItem) {
          menuItemsData.push(menuItem);
        }
      }
      
      if (menuItemsData.length === 0) {
        return res.status(400).json({ error: "No valid menu items found" });
      }
      
      const createdOrders = [];
      
      // Create multiple orders
      for (let i = 0; i < orderCount; i++) {
        const tableNumber = `${tablePrefix}${tableStart + i}`;
        
        // Calculate total amount based on selected menu items
        const totalAmount = menuItemsData.reduce((sum, item) => sum + item.price, 0);
        
        // Create a new order
        const orderData = {
          orderNumber: generateOrderNumber(),
          tableNumber,
          status: "pending",
          totalAmount,
          orderSource: "bulk_creation",
          useAIAutomation: true,
          notes: "Created via bulk order tool"
        };
        
        const parsedOrder = insertOrderSchema.parse(orderData);
        const order = await storage.createOrder(parsedOrder);
        
        // Create order items
        for (const menuItem of menuItemsData) {
          const orderItemData = {
            orderId: order.id,
            menuItemId: menuItem.id,
            quantity: 1,
            price: menuItem.price
          };
          
          const parsedOrderItem = insertOrderItemSchema.parse(orderItemData);
          await storage.createOrderItem(parsedOrderItem);
        }
        
        // Create kitchen token
        const tokenData = {
          tokenNumber: generateTokenNumber(),
          orderId: order.id,
          status: "pending"
        };
        
        const parsedToken = insertKitchenTokenSchema.parse(tokenData);
        await storage.createKitchenToken(parsedToken);
        
        // Record activity
        await storage.createActivity({
          type: "order_created",
          description: `Bulk order created for table ${tableNumber}`,
          data: { orderId: order.id, orderNumber: order.orderNumber }
        });
        
        createdOrders.push(order);
      }
      
      res.status(201).json({
        message: `Successfully created ${createdOrders.length} orders`,
        orders: createdOrders
      });
    } catch (error) {
      errorHandler(error, res);
    }
  });

  // AI-assisted bulk order creation endpoint
  app.post("/api/ai/process-bulk-order", async (req: Request, res: Response) => {
    try {
      console.log("AI Bulk Order Creation - Received request:", req.body);
      
      const { prompt } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: "No prompt provided" });
      }
      
      // Get all menu items for reference
      const allMenuItems = await storage.getMenuItems();
      
      // Extract information from the prompt using simple pattern matching
      // In a real app, this would use a proper NLP service like OpenAI
      const promptLower = prompt.toLowerCase();
      
      // Extract order count - look for numbers followed by "order" or similar words
      let orderCount = 5; // Default
      const orderCountMatch = promptLower.match(/(\d+)\s*(orders|meals|breakfasts|lunches|dinners)/);
      if (orderCountMatch) {
        orderCount = parseInt(orderCountMatch[1], 10);
      }
      
      // Extract table information - look for "table" followed by prefix or numbers
      let tablePrefix = "T";
      let tableStart = 1;
      
      const tableMatch = promptLower.match(/tables?\s*([a-z])?(\d+)(?:\s*-\s*|\s*to\s*)([a-z])?(\d+)/i);
      if (tableMatch) {
        tablePrefix = tableMatch[1] || "T";
        tableStart = parseInt(tableMatch[2], 10);
      }
      
      // Find menu items mentioned in the prompt
      const menuItemIds: number[] = [];
      const quantities: Record<number, number> = {};
      
      allMenuItems.forEach(item => {
        const itemNameLower = item.name.toLowerCase();
        if (promptLower.includes(itemNameLower)) {
          menuItemIds.push(item.id);
          
          // Try to find quantities for this item
          const quantityMatch = promptLower.match(new RegExp(`(\\d+)\\s*${itemNameLower}s?`, 'i'));
          if (quantityMatch) {
            quantities[item.id] = parseInt(quantityMatch[1], 10);
          } else {
            quantities[item.id] = 1;
          }
        }
      });
      
      // If no menu items found, add some defaults based on meal type
      if (menuItemIds.length === 0) {
        if (promptLower.includes("breakfast")) {
          // Add breakfast items by looking for them in the menu
          allMenuItems.forEach(item => {
            const itemNameLower = item.name.toLowerCase();
            if (["dosa", "idli", "coffee", "tea", "breakfast"].some(word => itemNameLower.includes(word))) {
              menuItemIds.push(item.id);
            }
          });
        } else if (promptLower.includes("lunch")) {
          // Add lunch items
          allMenuItems.forEach(item => {
            const itemNameLower = item.name.toLowerCase();
            if (["rice", "curry", "thali", "roti", "lunch"].some(word => itemNameLower.includes(word))) {
              menuItemIds.push(item.id);
            }
          });
        } else if (promptLower.includes("dinner")) {
          // Add dinner items
          allMenuItems.forEach(item => {
            const itemNameLower = item.name.toLowerCase();
            if (["biryani", "naan", "dinner", "special"].some(word => itemNameLower.includes(word))) {
              menuItemIds.push(item.id);
            }
          });
        }
      }
      
      // If still no menu items, just add the first few
      if (menuItemIds.length === 0 && allMenuItems.length > 0) {
        menuItemIds.push(...allMenuItems.slice(0, Math.min(3, allMenuItems.length)).map(item => item.id));
      }
      
      const createdOrders = [];
      
      // Create orders based on analysis
      for (let i = 0; i < orderCount; i++) {
        const tableNumber = `${tablePrefix}${tableStart + i}`;
        
        // Get menu items by IDs
        const menuItemsData = allMenuItems.filter(item => 
          menuItemIds.includes(item.id)
        );
        
        // Calculate total amount
        const totalAmount = menuItemsData.reduce((sum, item) => {
          const quantity = quantities[item.id] || 1;
          return sum + (item.price * quantity);
        }, 0);
        
        // Create a new order
        const orderData = {
          orderNumber: generateOrderNumber(),
          tableNumber,
          status: "pending",
          totalAmount,
          orderSource: "ai_bulk_creation",
          useAIAutomation: true,
          notes: `Created via AI assistant: "${prompt}"`
        };
        
        const parsedOrder = insertOrderSchema.parse(orderData);
        const order = await storage.createOrder(parsedOrder);
        
        // Create order items
        for (const menuItem of menuItemsData) {
          const quantity = quantities[menuItem.id] || 1;
          
          const orderItemData = {
            orderId: order.id,
            menuItemId: menuItem.id,
            quantity,
            price: menuItem.price * quantity
          };
          
          const parsedOrderItem = insertOrderItemSchema.parse(orderItemData);
          await storage.createOrderItem(parsedOrderItem);
        }
        
        // Create kitchen token
        const tokenData = {
          tokenNumber: generateTokenNumber(),
          orderId: order.id,
          status: "pending"
        };
        
        const parsedToken = insertKitchenTokenSchema.parse(tokenData);
        await storage.createKitchenToken(parsedToken);
        
        // Record activity
        await storage.createActivity({
          type: "order_created",
          description: `AI bulk order created for table ${tableNumber}`,
          data: { orderId: order.id, orderNumber: order.orderNumber }
        });
        
        createdOrders.push(order);
      }
      
      // Analysis results for debugging/UI
      const analysis = {
        orderCount,
        tablePrefix,
        tableStart,
        menuItemIds,
        quantities
      };
      
      res.status(201).json({
        message: `Successfully created ${createdOrders.length} orders based on AI analysis`,
        prompt,
        createdCount: createdOrders.length,
        analysis,
        orders: createdOrders
      });
    } catch (error) {
      errorHandler(error, res);
    }
  });

  // Customers
  app.get("/api/customers", async (req: Request, res: Response) => {
    try {
      const dietaryPrefs = req.query.dietaryPreferences as string;
      
      if (dietaryPrefs) {
        const preferences = dietaryPrefs.split(',');
        const customers = await storage.getCustomersByDietaryPreferences(preferences);
        res.json(customers);
      } else {
        const customers = await storage.getCustomers();
        res.json(customers);
      }
    } catch (err) {
      errorHandler(err, res);
    }
  });
  
  app.get("/api/customers/:id/diet-plan", async (req: Request, res: Response) => {
    try {
      const customerId = parseInt(req.params.id);
      const scheduledOrders = await storage.getScheduledOrdersByCustomerId(customerId);
      res.json(scheduledOrders);
    } catch (err) {
      errorHandler(err, res);
    }
  });
  
  // Customer Registration API - used for self-service registration
  app.post("/api/customers/register", async (req: Request, res: Response) => {
    try {
      const { username, password, fullName, phone, email, dietaryPreferences, allergies } = req.body;
      
      // Basic validation
      if (!username || !password || !fullName || !phone || !email) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }
      
      // Check if phone number already exists
      const existingCustomer = await storage.getCustomerByPhone(phone);
      if (existingCustomer) {
        return res.status(400).json({ error: "Phone number already registered" });
      }
      
      // Hash the password
      const hashedPassword = await hashPassword(password);
      
      // Create user account with 'customer' role
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        fullName,
        role: "customer",
      });
      
      // Prepare dietary preferences in the correct format
      const formattedDietaryPreferences = {
        restrictions: allergies ? allergies.split(',').map((a: string) => a.trim()) : [],
        allergens: allergies ? allergies.split(',').map((a: string) => a.trim()) : [],
        healthGoals: [] as string[],
        favoriteItems: [] as number[]
      };
      
      // Create customer profile linked to user account
      const customer = await storage.createCustomer({
        name: fullName,
        phone,
        email,
        dietaryPreferences: formattedDietaryPreferences,
        preferences: dietaryPreferences ? dietaryPreferences.split(',').map((p: string) => p.trim()) : []
      });
      
      // Log activity
      await storage.createActivity({
        type: "customer_created",
        description: `New customer account created: ${fullName}`,
        entityId: customer.id,
        entityType: "customer"
      });
      
      // Return success without sensitive data
      res.status(201).json({
        success: true,
        message: "Customer account created successfully",
        customer: {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email
        }
      });
    } catch (err) {
      console.error("Customer registration error:", err);
      errorHandler(err, res);
    }
  });
  
  // Scheduled Orders CRUD endpoints
  app.get("/api/scheduled-orders", async (req: Request, res: Response) => {
    try {
      const activeOnly = req.query.active === 'true';
      const dueOnly = req.query.due === 'true';
      
      if (dueOnly) {
        // Get orders that need to be executed now
        const dueOrders = await storage.getDueScheduledOrders();
        res.json(dueOrders);
      } else if (activeOnly) {
        // Get all active orders
        const activeOrders = await storage.getActiveScheduledOrders();
        res.json(activeOrders);
      } else {
        // Get all orders by customer ID if provided
        const customerId = req.query.customerId ? parseInt(req.query.customerId as string) : null;
        
        if (customerId) {
          const customerOrders = await storage.getScheduledOrdersByCustomerId(customerId);
          res.json(customerOrders);
        } else {
          // Default - get all active orders
          const activeOrders = await storage.getActiveScheduledOrders();
          res.json(activeOrders);
        }
      }
    } catch (err) {
      errorHandler(err, res);
    }
  });
  
  app.get("/api/scheduled-orders/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const scheduledOrder = await storage.getScheduledOrder(id);
      
      if (!scheduledOrder) {
        return res.status(404).json({ error: `Scheduled order with ID ${id} not found` });
      }
      
      res.json(scheduledOrder);
    } catch (err) {
      errorHandler(err, res);
    }
  });
  
  app.post("/api/scheduled-orders", async (req: Request, res: Response) => {
    try {
      const { customerId, menuItemIds, quantities, recurrencePattern, startDate, endDate, specialInstructions, dietPlanName } = req.body;
      
      if (!customerId || !menuItemIds || !quantities || !recurrencePattern || !startDate) {
        return res.status(400).json({ 
          error: "Missing required fields: customerId, menuItemIds, quantities, recurrencePattern, startDate" 
        });
      }
      
      // Ensure customer exists
      const customer = await storage.getCustomer(customerId);
      if (!customer) {
        return res.status(404).json({ error: `Customer with ID ${customerId} not found` });
      }
      
      // Ensure all menu items exist
      for (const menuItemId of menuItemIds) {
        const menuItem = await storage.getMenuItem(menuItemId);
        if (!menuItem) {
          return res.status(404).json({ error: `Menu item with ID ${menuItemId} not found` });
        }
      }
      
      const scheduledOrder = await storage.createScheduledOrder({
        customerId,
        menuItemIds,
        quantities,
        recurrencePattern,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        specialInstructions: specialInstructions || null,
        isActive: true,
        lastExecuted: null,
        dietPlanName: dietPlanName || null,
        totalAmount: 0, // Will be calculated when executed
        healthNotes: null
      });
      
      // Log activity
      await storage.createActivity({
        type: 'diet_plan_created',
        description: `New diet plan "${dietPlanName || 'Unnamed'}" created for customer ${customerId}`,
        entityId: scheduledOrder.id,
        entityType: 'scheduled_order'
      });
      
      res.status(201).json(scheduledOrder);
    } catch (err) {
      errorHandler(err, res);
    }
  });
  
  app.patch("/api/scheduled-orders/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { isActive, endDate, specialInstructions, healthNotes, dietPlanName } = req.body;
      
      const existingOrder = await storage.getScheduledOrder(id);
      if (!existingOrder) {
        return res.status(404).json({ error: `Scheduled order with ID ${id} not found` });
      }
      
      const updatedOrder = await storage.updateScheduledOrder(id, {
        isActive: isActive !== undefined ? isActive : existingOrder.isActive,
        endDate: endDate !== undefined ? new Date(endDate) : existingOrder.endDate,
        specialInstructions: specialInstructions !== undefined ? specialInstructions : existingOrder.specialInstructions,
        healthNotes: healthNotes !== undefined ? healthNotes : existingOrder.healthNotes,
        dietPlanName: dietPlanName !== undefined ? dietPlanName : existingOrder.dietPlanName
      });
      
      res.json(updatedOrder);
    } catch (err) {
      errorHandler(err, res);
    }
  });
  
  app.delete("/api/scheduled-orders/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      const existingOrder = await storage.getScheduledOrder(id);
      if (!existingOrder) {
        return res.status(404).json({ error: `Scheduled order with ID ${id} not found` });
      }
      
      const success = await storage.deleteScheduledOrder(id);
      
      if (success) {
        res.status(204).send();
      } else {
        res.status(500).json({ error: `Failed to delete scheduled order with ID ${id}` });
      }
    } catch (err) {
      errorHandler(err, res);
    }
  });
  
  app.post("/api/scheduled-orders/:id/execute", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      const scheduledOrder = await storage.getScheduledOrder(id);
      if (!scheduledOrder) {
        return res.status(404).json({ error: `Scheduled order with ID ${id} not found` });
      }
      
      if (!scheduledOrder.isActive) {
        return res.status(400).json({ error: "Cannot execute inactive scheduled order" });
      }
      
      // Create new order from scheduled order
      const { generateOrderNumber } = await import('./utils');
      const orderNumber = generateOrderNumber();
      
      // Calculate total amount based on current menu prices
      let totalAmount = 0;
      const orderItems = [];
      
      for (let i = 0; i < scheduledOrder.menuItemIds.length; i++) {
        const menuItemId = scheduledOrder.menuItemIds[i];
        const quantity = scheduledOrder.quantities[i] || 1;
        
        const menuItem = await storage.getMenuItem(menuItemId);
        if (!menuItem) continue;
        
        totalAmount += menuItem.price * quantity;
        
        orderItems.push({
          menuItemId,
          quantity,
          price: menuItem.price,
          notes: scheduledOrder.specialInstructions || 'From scheduled diet plan'
        });
      }
      
      // Create the order
      const order = await storage.createOrder({
        orderNumber,
        status: 'pending',
        tableNumber: null,
        totalAmount,
        notes: `Auto-generated from diet plan "${scheduledOrder.dietPlanName || 'Unnamed'}"`,
        orderSource: 'diet_plan',
        useAIAutomation: true,
        customerId: scheduledOrder.customerId
      });
      
      // Create order items
      for (const item of orderItems) {
        await storage.createOrderItem({
          orderId: order.id,
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          price: item.price,
          notes: item.notes
        });
      }
      
      // Update the scheduled order's last executed timestamp
      await storage.updateScheduledOrder(id, {
        lastExecuted: new Date()
      });
      
      // Log activity
      await storage.createActivity({
        type: 'scheduled_order_executed',
        description: `Scheduled diet plan "${scheduledOrder.dietPlanName || 'Unnamed'}" automatically executed`,
        entityId: order.id,
        entityType: 'order'
      });
      
      res.status(201).json({
        success: true,
        message: "Scheduled order executed successfully",
        order
      });
    } catch (err) {
      errorHandler(err, res);
    }
  });

  // Activities (for dashboard)
  app.get("/api/activities", async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const activities = await storage.getActivities(limit);
      res.json(activities);
    } catch (err) {
      errorHandler(err, res);
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", async (req: Request, res: Response) => {
    try {
      // Use the realtime service to get stats and broadcast them
      // We're importing the broadcastStatsUpdate function at the top of the file
      const stats = await broadcastStatsUpdate();
      
      // If stats is null (due to an error), generate them directly
      if (!stats) {
        const orders = await storage.getOrders();
        const bills = await storage.getBills();
        const kitchenTokens = await storage.getKitchenTokens();
        
        // Get current date
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Filter for today's data
        const todaysOrders = orders.filter(order => {
          if (order.createdAt) {
            return new Date(order.createdAt).getTime() >= today.getTime();
          }
          return false;
        });
        
        const todaysSales = todaysOrders.reduce((sum, order) => sum + order.totalAmount, 0);
        
        // Count active tables (tables with in-progress orders)
        const activeTableNumbers = new Set(
          orders
            .filter(order => order.status === "pending" || order.status === "in-progress")
            .map(order => order.tableNumber)
            .filter(Boolean)
        );
        
        // Count kitchen queue items
        const kitchenQueue = kitchenTokens.filter(token => 
          token.status === "pending" || token.status === "preparing" || token.status === "delayed"
        );
        
        const urgentTokens = kitchenTokens.filter(token => token.isUrgent);
        
        return res.json({
          todaysSales,
          ordersCount: todaysOrders.length,
          activeTables: activeTableNumbers.size,
          totalTables: 20, // Hardcoded for now
          kitchenQueueCount: kitchenQueue.length,
          urgentTokensCount: urgentTokens.length
        });
      }
      
      // Respond with the stats from broadcastStatsUpdate
      res.json(stats);
    } catch (err) {
      errorHandler(err, res);
    }
  });

  // AI-powered APIs
  
  // Health Recommendations
  app.post("/api/ai/health-recommendations", async (req: Request, res: Response) => {
    try {
      const { customerPhone, preferences, restrictions } = req.body;
      
      // Use the new AI service to get health recommendations
      const recommendations = await aiService.getHealthRecommendations(
        customerPhone,
        restrictions || []
      );
      
      res.json(recommendations);
    } catch (err) {
      console.error("Health recommendations error:", err);
      errorHandler(err, res);
    }
  });

  // Natural Language Order Processing
  app.post("/api/ai/process-order", async (req: Request, res: Response) => {
    try {
      const { orderText, source = "ai" } = req.body;
      
      if (!orderText) {
        return res.status(400).json({ error: "Order text is required" });
      }
      
      // Use the new AI service to process natural language orders
      const processedOrder = await aiService.processNaturalLanguageOrder(orderText, source);
      
      res.json(processedOrder);
    } catch (err) {
      console.error("Order processing error:", err);
      errorHandler(err, res);
    }
  });
  
  // AI-driven Automatic Order Creation and Management
  app.post("/api/ai/create-order", async (req: Request, res: Response) => {
    try {
      const { 
        orderText, 
        orderSource = "ai", 
        tableNumber = null,
        phoneNumber = null,
        naturalLanguageOrder = null,
        simulatedCall = false 
      } = req.body;
      
      // Allow natural language order as alternative to orderText
      const orderContent = orderText || naturalLanguageOrder;
      
      if (!orderContent) {
        return res.status(400).json({ error: "Order text is required" });
      }
      
      console.log(`AI-driven order creation received for text: "${orderContent}" (source: ${orderSource})`);
      
      // Use the new AI service to process natural language orders
      const result = await aiService.processNaturalLanguageOrder(orderContent, orderSource);
      
      if (!result.success) {
        return res.status(400).json({
          error: result.message || "Failed to process natural language order",
          details: result
        });
      }
      
      // Record activity for the dashboard
      await storage.createActivity({
        type: "order_created",
        description: `AI created and processing order #${result.order.orderNumber} automatically`,
        entityId: result.order.id,
        entityType: "order"
      });
      
      // Return success response with details
      res.status(201).json({
        success: true,
        message: "AI-driven order created successfully and being processed automatically",
        order: result.order,
        items: result.items
      });
    } catch (err) {
      console.error("AI order creation error:", err);
      errorHandler(err, res);
    }
  });

  // Personalized Menu Recommendations
  app.post("/api/ai/menu-recommendations", async (req: Request, res: Response) => {
    try {
      const { customerPhone } = req.body;
      
      // Use the new AI service to get personalized recommendations
      const recommendations = await aiService.getPersonalizedRecommendations(customerPhone);
      
      res.json(recommendations);
    } catch (err) {
      console.error("Menu recommendations error:", err);
      errorHandler(err, res);
    }
  });
  
  // Diet Plan Creation
  app.post("/api/ai/create-diet-plan", async (req: Request, res: Response) => {
    try {
      const { customerPhone, dietGoal, durationDays = 7 } = req.body;
      
      if (!customerPhone) {
        return res.status(400).json({ error: "Customer phone number is required" });
      }
      
      if (!dietGoal) {
        return res.status(400).json({ error: "Diet goal is required" });
      }
      
      // Create personalized diet plan
      const result = await aiService.createDietPlan(customerPhone, dietGoal, durationDays);
      
      res.json(result);
    } catch (err) {
      console.error("Diet plan creation error:", err);
      errorHandler(err, res);
    }
  });
  
  // Chatbot endpoint - process requests for user, client, or admin
  app.post("/api/ai/chatbot", async (req: Request, res: Response) => {
    try {
      console.log("Processing chatbot request for userType:", req.body.userType);
      
      const { message, userType, messageHistory, customerId, orderId } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }
      
      if (!userType || !["customer", "admin", "kitchen", "waiter", "manager", "delivery"].includes(userType)) {
        return res.status(400).json({ error: "Valid userType is required (customer, admin, kitchen, waiter, manager, or delivery)" });
      }
      
      // Process the chatbot request
      const response = await processChatbotRequest({
        message,
        userType,
        messageHistory: messageHistory || [],
        customerId: customerId ? Number(customerId) : undefined,
        orderId: orderId ? Number(orderId) : undefined
      });
      
      // Log activity
      await storage.createActivity({
        type: "chatbot_interaction",
        description: `${userType.charAt(0).toUpperCase() + userType.slice(1)} chatbot conversation`,
        entityId: customerId || 0,
        entityType: customerId ? "customer" : "general"
      });
      
      res.json({ response });
    } catch (err) {
      console.error("Error processing chatbot request:", err);
      errorHandler(err, res);
    }
  });

  // WhatsApp Integration APIs
  
  // Initialize WhatsApp service when the server starts
  try {
    console.log("Initializing WhatsApp service...");
    initializeWhatsAppService()
      .then(() => console.log("WhatsApp service initialized successfully"))
      .catch(error => console.error("Failed to initialize WhatsApp service:", error));
  } catch (error) {
    console.error("Error setting up WhatsApp service:", error);
  }
  
  // Send a WhatsApp message
  app.post("/api/whatsapp/send-message", handleSendMessage);
  
  // Send a bill via WhatsApp
  app.post("/api/whatsapp/send-bill", handleSendBill);
  
  // Send a bill with health tips via WhatsApp
  app.post("/api/whatsapp/send-bill-with-health-tips", handleSendBillWithHealthTips);
  
  // Get WhatsApp connection status
  app.get("/api/whatsapp/status", handleGetStatus);
  
  // Simulate an incoming WhatsApp message (for testing only)
  app.post("/api/whatsapp/simulate-message", async (req: Request, res: Response) => {
    try {
      const { phone, message, name } = req.body;
      
      if (!phone || !message || !name) {
        return res.status(400).json({
          error: 'Phone number, message text, and contact name are required'
        });
      }
      
      const client = getWhatsAppClient();
      // Use type assertion to access the simulateIncomingMessage method
      const simulatedClient = client as any;
      
      if (!simulatedClient.simulateIncomingMessage) {
        return res.status(400).json({
          error: 'Simulation is only available with the simulated WhatsApp client'
        });
      }
      
      const formattedPhone = phone.includes('@c.us') ? phone : `${phone}@c.us`;
      await simulatedClient.simulateIncomingMessage(formattedPhone, message, { name });
      
      res.json({
        success: true,
        message: 'WhatsApp message simulated successfully'
      });
    } catch (err) {
      errorHandler(err, res);
    }
  });
  
  // Get WhatsApp message history (for testing only)
  app.get("/api/whatsapp/message-history", async (req: Request, res: Response) => {
    try {
      const client = getWhatsAppClient();
      // Use type assertion to access the getMessageHistory method
      const simulatedClient = client as any;
      
      if (!simulatedClient.getMessageHistory) {
        return res.status(400).json({
          error: 'Message history is only available with the simulated WhatsApp client'
        });
      }
      
      const messages = simulatedClient.getMessageHistory();
      
      res.json(messages);
    } catch (err) {
      errorHandler(err, res);
    }
  });

  // Telephony Integration APIs
  
  // Initialize Telephony service when the server starts
  try {
    console.log("Initializing Telephony service...");
    initializeTelephonyService()
      .then((success) => {
        if (success) {
          console.log("Telephony service initialized successfully");
        } else {
          console.warn("Telephony service initialization failed - using simulation mode");
        }
      })
      .catch(error => console.error("Failed to initialize Telephony service:", error));
  } catch (error) {
    console.error("Error setting up Telephony service:", error);
  }
  
  // Incoming call webhook (for Twilio)
  app.post("/api/telephony/incoming-call", handleIncomingCall);
  
  // Speech processing webhook (for Twilio)
  app.post("/api/telephony/process-speech", processSpeech);
  
  // Order confirmation webhook (for Twilio)
  app.post("/api/telephony/confirm-order", confirmOrder);
  
  // Retry order webhook (for Twilio)
  app.post("/api/telephony/retry-order", retryOrder);
  
  // Handle language selection for voice calls
  app.post("/api/telephony/select-language", selectLanguage);
  
  // Get call history
  app.get("/api/telephony/calls", async (req: Request, res: Response) => {
    try {
      const calls = getCalls();
      res.json(calls);
    } catch (err) {
      errorHandler(err, res);
    }
  });
  
  // Get call statistics
  app.get("/api/telephony/stats", async (req: Request, res: Response) => {
    try {
      const stats = getCallStatistics();
      res.json(stats);
    } catch (err) {
      errorHandler(err, res);
    }
  });
  
  // Get AI voice settings
  app.get("/api/telephony/voice-settings", async (req: Request, res: Response) => {
    try {
      const settings = getAIVoiceSettings();
      res.json(settings);
    } catch (err) {
      errorHandler(err, res);
    }
  });
  
  // Update AI voice settings
  app.post("/api/telephony/voice-settings", async (req: Request, res: Response) => {
    try {
      const updatedSettings = updateAIVoiceSettings(req.body);
      res.json(updatedSettings);
    } catch (err) {
      errorHandler(err, res);
    }
  });
  
  // Simulate an incoming call (for testing only)
  app.post("/api/telephony/simulate-call", async (req: Request, res: Response) => {
    try {
      const { phoneNumber } = req.body;
      
      const callData = simulateIncomingCall(phoneNumber);
      console.log(`Simulated incoming call initiated: ${callData.id}`);
      res.json({
        success: true,
        message: "Simulated call started and automatic order creation process begun",
        callData
      });
    } catch (err) {
      errorHandler(err, res);
    }
  });
  
  // Create an immediate order from a phone call
  app.post("/api/telephony/create-immediate-order", async (req: Request, res: Response) => {
    try {
      const { phoneNumber, orderText = "", callId } = req.body;
      
      console.log(`Processing immediate order request with text: ${orderText || "No text provided"}`);
      
      let callData: any;
      let callSid: string;
      
      // If an existing call ID is provided, use that call
      if (callId) {
        console.log(`Looking for existing call with ID: ${callId}`);
        // Get the call from telephony service
        const calls = telephonyService.getCalls();
        callData = calls.find(c => c.id === callId);
        
        if (!callData) {
          return res.status(404).json({
            success: false,
            message: "Call not found",
            error: `No call found with ID ${callId}`
          });
        }
        
        callSid = callId;
        console.log(`Found existing call: ${callSid}`);
      } else {
        // Create a simulated call with the specified order text
        callSid = 'SIM-IMMEDIATE-' + Date.now().toString();
        
        // Create a call data object with the phone number and transcript
        callData = {
          id: callSid,
          phoneNumber: phoneNumber || '+919876543210',
          startTime: new Date().toISOString(),
          status: 'completed',
          transcript: `AI: Welcome to our restaurant! How can I help you today?\nCustomer: ${orderText || "I'd like to order butter chicken and garlic naan"}\nAI: Your order has been confirmed!`,
          endTime: new Date().toISOString(), // Already completed
          orderData: {
            orderText: orderText || "I'd like to order butter chicken and garlic naan"
          }
        };
        
        console.log(`Created new simulated call: ${callSid}`);
      }
      
      console.log(`Creating immediate order from call ${callSid} with text: ${orderText || "default order text"}`);
      
      // Get all menu items from database for better matching
      const dbMenuItems = await storage.getMenuItems();
      
      // Use menu items from database if available, fallback to hardcoded demo items
      const menuItems = dbMenuItems.length > 0 ? dbMenuItems : [
        { id: 1, name: "Butter Chicken", price: 350 },
        { id: 2, name: "Garlic Naan", price: 60 },
        { id: 3, name: "Paneer Tikka", price: 300 },
        { id: 4, name: "Biryani", price: 250 },
        { id: 5, name: "Dal Makhani", price: 220 }
      ];
      
      // Use text from orderData if available, otherwise use provided orderText
      const processText = callData.orderData?.orderText || orderText || "butter chicken and garlic naan";
      console.log(`Processing order text: "${processText}"`);
      
      // Basic text matching for demo purposes
      const orderItems = [];
      const orderTextLower = processText.toLowerCase();
      
      for (const item of menuItems) {
        // Check if item name appears in order text
        if (orderTextLower.includes((item.name || '').toLowerCase())) {
          // Try to extract quantity with regex
          const quantityRegex = new RegExp(`(\\d+)\\s+${item.name}`, 'i');
          const match = orderTextLower.match(quantityRegex);
          const quantity = match ? parseInt(match[1]) : 1;
          
          orderItems.push({
            menuItemId: item.id,
            name: item.name,
            quantity: quantity,
            price: item.price
          });
          
          console.log(`Added item to order: ${item.name} x${quantity}`);
        }
      }
      
      // Ensure at least one item in order
      if (orderItems.length === 0) {
        orderItems.push({
          menuItemId: 1,
          name: "Butter Chicken",
          quantity: 1,
          price: 350
        });
        orderItems.push({
          menuItemId: 2, 
          name: "Garlic Naan",
          quantity: 2,
          price: 60
        });
      }
      
      // Calculate total amount
      const totalAmount = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      // Create the order directly in the database
      const orderNumber = `PH-${Math.floor(1000 + Math.random() * 9000)}`;
      const newOrder = {
        orderNumber,
        status: "pending", // Start in pending state
        totalAmount,
        orderSource: "phone",
        notes: `Order created from phone call ${callSid}. Customer said: "${orderText || "Order food"}"`,
        items: orderItems
      };
      
      console.log("Creating order in database:", newOrder);
      
      try {
        // Add to orders
        const order = await storage.createOrder(newOrder);
        
        console.log("Order created successfully:", order);
        
        // Update the call with the order ID
        if (!callData.orderId) {
          // Update the call in telephony service
          const activeCalls = telephonyService.getActiveCalls();
          const activeCall = activeCalls.find(c => c.id === callSid);
          if (activeCall) {
            activeCall.orderId = order.id;
            console.log(`Updated active call ${callSid} with order ID ${order.id}`);
          }
          
          // Update the call in call history
          const calls = telephonyService.getCalls();
          const historyCall = calls.find(c => c.id === callSid);
          if (historyCall) {
            historyCall.orderId = order.id;
            console.log(`Updated call history for ${callSid} with order ID ${order.id}`);
          } else {
            console.log(`Call ${callSid} not found in call history`);
          }
        }
        
        // Create activity for the order
        await storage.createActivity({
          type: "order_created",
          description: `Phone order created: ${orderNumber}`,
          entityId: String(order.id),
          entityType: "order"
        });
        
        // Broadcast the new order to all connected clients
        broadcastNewOrder({
          ...order,
          items: orderItems
        });
        
        res.json({
          success: true,
          message: "Order created successfully from phone call",
          callData,
          order,
          orderItems
        });
      } catch (storageError) {
        console.error("Storage error creating order:", storageError);
        
        // Create a fallback order
        const fallbackOrder = {
          id: Math.floor(1000 + Math.random() * 9000),
          orderNumber,
          status: "pending",
          totalAmount,
          items: orderItems,
          orderSource: "phone",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Broadcast the fallback order too
        console.log("Broadcasting fallback order:", fallbackOrder);
        broadcastNewOrder(fallbackOrder);
        
        res.json({
          success: true,
          message: "Immediate order simulated from call (storage error occurred)",
          callData,
          order: fallbackOrder
        });
      }
    } catch (err) {
      console.error("Error creating immediate order:", err);
      errorHandler(err, res);
    }
  });

  // External platforms integration (Zomato, Swiggy, etc.)
  
  // Simulate receiving an order from Zomato
  app.post("/api/external/zomato/simulate", async (req: Request, res: Response) => {
    try {
      console.log("Simulating Zomato order:", req.body);
      
      const result = await simulateZomatoOrder(req.body);
      res.json(result);
    } catch (err) {
      console.error("Error simulating Zomato order:", err);
      errorHandler(err, res);
    }
  });
  
  // Simulate receiving an order from Swiggy
  app.post("/api/external/swiggy/simulate", async (req: Request, res: Response) => {
    try {
      console.log("Simulating Swiggy order:", req.body);
      
      const result = await simulateSwiggyOrder(req.body);
      res.json(result);
    } catch (err) {
      console.error("Error simulating Swiggy order:", err);
      errorHandler(err, res);
    }
  });
  
  // Generic endpoint for external orders (can be used for future integrations)
  app.post("/api/external/process-order", async (req: Request, res: Response) => {
    try {
      const { platformName } = req.body;
      
      if (!platformName) {
        return res.status(400).json({
          success: false,
          error: "Platform name is required"
        });
      }
      
      console.log(`Processing external order from ${platformName}:`, req.body);
      
      // Route to the appropriate platform handler
      let result;
      if (platformName.toLowerCase() === 'zomato') {
        result = await simulateZomatoOrder(req.body);
      } else if (platformName.toLowerCase() === 'swiggy') {
        result = await simulateSwiggyOrder(req.body);
      } else {
        return res.status(400).json({
          success: false,
          error: `Unsupported platform: ${platformName}`
        });
      }
      
      res.json(result);
    } catch (err) {
      console.error("Error processing external order:", err);
      errorHandler(err, res);
    }
  });

  // Voice Assistant API endpoints
  app.post("/api/voice-assistant/process", async (req: Request, res: Response) => {
    try {
      const { command, userType } = req.body;
      
      if (!command || typeof command !== 'string') {
        return res.status(400).json({
          success: false,
          error: "Command is required and must be a string"
        });
      }
      
      if (!userType || !["customer", "admin", "kitchen", "waiter", "manager", "delivery"].includes(userType)) {
        return res.status(400).json({ 
          error: "Valid userType is required (customer, admin, kitchen, waiter, manager, or delivery)",
          success: false
        });
      }
      
      console.log(`Processing voice command: ${command} (${userType})`);
      
      // Import the voice assistant service
      const voiceAssistant = await import('./services/voiceAssistant');
      
      // Process the voice command
      const result = await voiceAssistant.processVoiceCommand(command, userType);
      
      // Log successful commands
      if (result.success) {
        // Record activity
        await db.insert(activities).values({
          type: 'voice_command',
          description: `Voice command: ${command}`,
          createdAt: new Date(),
          entityType: 'voice_assistant',
        });
      }
      
      return res.status(200).json(result);
    } catch (error) {
      console.error(`Error processing voice command:`, error);
      return res.status(500).json({
        success: false,
        response: "An error occurred while processing your command",
        error: handleError(error, "processing voice command").message
      });
    }
  });

  // n8n Integration API endpoints
  app.get("/api/n8n/webhooks", async (req: Request, res: Response) => {
    try {
      const webhooks = n8nService.getWebhooks();
      
      // Convert Map to array for JSON response
      const webhooksArray = Array.from(webhooks.entries()).map(([id, config]) => ({
        id,
        ...config
      }));
      
      res.json(webhooksArray);
    } catch (err) {
      errorHandler(err, res);
    }
  });
  
  app.post("/api/n8n/webhooks", async (req: Request, res: Response) => {
    try {
      const { id, url, secret, events } = req.body;
      
      if (!id || !url || !secret || !events) {
        return res.status(400).json({
          success: false,
          error: "Missing required webhook parameters: id, url, secret, and events are required"
        });
      }
      
      n8nService.registerWebhook(id, {
        url,
        secret,
        events,
        active: req.body.active !== false // default to active if not specified
      });
      
      // Create activity log
      await storage.createActivity({
        type: "webhook_created",
        description: `Webhook registered for events: ${events.join(', ')}`,
        entityType: "webhook"
      });
      
      res.status(201).json({
        success: true,
        message: "Webhook registered successfully",
        id
      });
    } catch (err) {
      console.error("Error registering webhook:", err);
      errorHandler(err, res);
    }
  });
  
  app.delete("/api/n8n/webhooks/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const result = n8nService.removeWebhook(id);
      
      if (result) {
        // Create activity log
        await storage.createActivity({
          type: "webhook_deleted",
          description: `Webhook ${id} was removed`,
          entityType: "webhook"
        });
        
        res.json({
          success: true,
          message: "Webhook removed successfully"
        });
      } else {
        res.status(404).json({
          success: false,
          error: "Webhook not found"
        });
      }
    } catch (err) {
      errorHandler(err, res);
    }
  });
  
  app.post("/api/n8n/test-webhook/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { event, payload } = req.body;
      
      if (!event) {
        return res.status(400).json({
          success: false,
          error: "Event name is required"
        });
      }
      
      const webhooks = n8nService.getWebhooks();
      if (!webhooks.has(id)) {
        return res.status(404).json({
          success: false,
          error: "Webhook not found"
        });
      }
      
      const testPayload = payload || {
        test: true,
        timestamp: new Date().toISOString(),
        message: "This is a test webhook from YashHotelBot"
      };
      
      const success = await n8nService.triggerWebhook(event, testPayload);
      
      if (success) {
        res.json({
          success: true,
          message: `Test webhook for event '${event}' triggered successfully`
        });
      } else {
        res.status(500).json({
          success: false,
          error: `Failed to trigger test webhook for event '${event}'`
        });
      }
    } catch (err) {
      console.error("Error triggering test webhook:", err);
      errorHandler(err, res);
    }
  });
  
  app.get("/api/n8n/documentation", async (req: Request, res: Response) => {
    try {
      const docs = n8nService.getWebhooksDocumentation();
      res.json(docs);
    } catch (err) {
      errorHandler(err, res);
    }
  });
  
  // Test notification endpoint
  app.post("/api/notifications/test", async (req: Request, res: Response) => {
    try {
      const { type = 'info', message = 'Test notification', title = 'Test' } = req.body;
      
      // Validate notification type
      if (!['info', 'success', 'warning', 'error'].includes(type)) {
        return res.status(400).json({ 
          error: "Invalid notification type. Must be one of: info, success, warning, error" 
        });
      }
      
      // Send the notification
      // Using our custom test notification method
      const notification = title && message 
        ? notificationService.sendNotification(title, message, type as any)
        : notificationService.testNotification(type as any);
      
      res.status(200).json({ 
        success: true, 
        message: "Notification sent successfully",
        notification
      });
    } catch (err) {
      errorHandler(err, res);
    }
  });
  
  // Send predefined notification types
  app.post("/api/notifications/send", async (req: Request, res: Response) => {
    try {
      const { notificationType, data } = req.body;
      
      let notification;
      
      switch (notificationType) {
        case 'newOrder':
          notification = notificationService.newOrder(data.orderNumber, data.tableNumber);
          break;
        case 'orderStatusChange':
          notification = notificationService.orderStatusChange(data.orderNumber, data.status);
          break;
        case 'kitchenAlert':
          notification = notificationService.kitchenAlert(data.tokenNumber, data.message);
          break;
        case 'paymentReceived':
          notification = notificationService.paymentReceived(data.billNumber, data.amount);
          break;
        case 'systemAlert':
          notification = notificationService.systemAlert(data.message);
          break;
        case 'error':
          notification = notificationService.error(data.message);
          break;
        default:
          return res.status(400).json({ 
            error: "Invalid notification type" 
          });
      }
      
      res.status(200).json({ 
        success: true, 
        message: "Notification sent successfully",
        notification
      });
    } catch (err) {
      errorHandler(err, res);
    }
  });
  
  app.post("/api/n8n/config", async (req: Request, res: Response) => {
    try {
      const { n8nBaseUrl, apiKey } = req.body;
      
      if (n8nBaseUrl) {
        n8nService.setN8nBaseUrl(n8nBaseUrl);
      }
      
      if (apiKey) {
        n8nService.setApiKey(apiKey);
      }
      
      // Create activity log
      await storage.createActivity({
        type: "system_config",
        description: "n8n integration configuration updated",
        entityType: "system"
      });
      
      res.json({
        success: true,
        message: "n8n configuration updated successfully"
      });
    } catch (err) {
      console.error("Error updating n8n configuration:", err);
      errorHandler(err, res);
    }
  });
  
  app.get("/api/n8n/workflows", async (req: Request, res: Response) => {
    try {
      const workflows = await n8nService.fetchWorkflows();
      
      // Log the workflows for debugging
      console.log("Fetched workflows:", workflows);
      
      res.json(workflows);
    } catch (err: any) {
      console.error("Error fetching n8n workflows:", err);
      res.status(500).json({
        success: false,
        error: err.message || "Error fetching n8n workflows"
      });
    }
  });
  
  app.post("/api/n8n/workflows/:id/execute", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { data } = req.body;
      
      const result = await n8nService.triggerWorkflow(id, data);
      
      res.json({
        success: true,
        result
      });
    } catch (err: any) {
      console.error(`Error executing n8n workflow ${req.params.id}:`, err);
      res.status(500).json({
        success: false,
        error: err.message || "Error executing n8n workflow"
      });
    }
  });
  
  // Admin AI analytics endpoints
  app.post("/api/admin/ai/insights", async (req: Request, res: Response) => {
    try {
      // Check role permission
      if (!req.isAuthenticated() || !["admin", "manager"].includes(req.user.role)) {
        return res.status(403).json({ error: "Unauthorized: Insufficient permissions" });
      }
      
      const { query } = req.body;
      
      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }
      
      // Import adminAI functions
      const { processBusinessInquiry } = await import('./services/adminAI');
      
      // Generate dashboard data - in a real app this would be fetched from a database
      const adminData = {
        revenue: {
          total: 1920, // Today's sales in rupees
          lastWeek: 12480,
          lastMonth: 52350,
          growth: 0.12 // 12% growth from previous month
        },
        orders: {
          total: 3, // Active orders
          completed: 242,
          average: 622.36, // Average order value
          topCategories: [
            { name: "Main Course", percentage: 38.3 },
            { name: "Beverages", percentage: 24.0 },
            { name: "Appetizers", percentage: 20.3 },
            { name: "Desserts", percentage: 17.4 }
          ]
        },
        performance: {
          profitMargin: 0.184, // 18.4%
          costOfGoods: 0.323, // 32.3% of revenue
          laborCosts: 0.287, // 28.7% of revenue
          tableUtilization: 0.65, // 65% of tables utilized during peak hours
          customerSatisfaction: 4.3 // Average rating out of 5
        }
      };
      
      // Process the business inquiry with our new AI service
      const insights = await processBusinessInquiry(query, adminData);
      
      res.status(200).json(insights);
    } catch (error) {
      errorHandler(error, res);
    }
  });
  
  app.get("/api/admin/dashboard-data", async (req: Request, res: Response) => {
    try {
      // Check role permission
      if (!req.isAuthenticated() || !["admin", "manager"].includes(req.user.role)) {
        return res.status(403).json({ error: "Unauthorized: Insufficient permissions" });
      }
      
      // Generate dashboard data - in a real app this would be fetched from a database
      const adminData = {
        revenue: {
          total: 1920, // Today's sales in rupees
          lastWeek: 12480,
          lastMonth: 52350,
          growth: 0.12 // 12% growth from previous month
        },
        orders: {
          total: 3, // Active orders
          completed: 242,
          average: 622.36, // Average order value
          topCategories: [
            { name: "Main Course", percentage: 38.3 },
            { name: "Beverages", percentage: 24.0 },
            { name: "Appetizers", percentage: 20.3 },
            { name: "Desserts", percentage: 17.4 }
          ]
        },
        performance: {
          profitMargin: 0.184, // 18.4%
          costOfGoods: 0.323, // 32.3% of revenue
          laborCosts: 0.287, // 28.7% of revenue
          tableUtilization: 0.65, // 65% of tables utilized during peak hours
          customerSatisfaction: 4.3 // Average rating out of 5
        },
        kpi: {
          dailyRevenue: {
            value: 1920,
            trend: "+15%",
            status: "positive"
          },
          monthlyRevenue: {
            value: 52350,
            trend: "+12%",
            status: "positive"
          },
          averageOrderValue: {
            value: 622.36,
            trend: "+3.6%",
            status: "positive"
          },
          profitMargin: {
            value: "18.4%",
            trend: "+1.2%",
            status: "positive"
          },
          customerSatisfaction: {
            value: "4.3/5.0",
            trend: "+0.2",
            status: "positive"
          },
          tableUtilization: {
            value: "65%",
            trend: "+5%",
            status: "positive"
          }
        }
      };
      
      res.status(200).json(adminData);
    } catch (error) {
      errorHandler(error, res);
    }
  });
  
  app.post("/api/admin/ai/business-health", async (req: Request, res: Response) => {
    try {
      // Check role permission
      if (!req.isAuthenticated() || !["admin", "manager"].includes(req.user.role)) {
        return res.status(403).json({ error: "Unauthorized: Insufficient permissions" });
      }
      
      // Import adminAI functions
      const { processBusinessInquiry } = await import('./services/adminAI');
      
      // Generate dashboard data - in a real app this would be fetched from a database
      const adminData = {
        revenue: {
          total: 1920, // Today's sales in rupees
          lastWeek: 12480,
          lastMonth: 52350,
          growth: 0.12 // 12% growth from previous month
        },
        orders: {
          total: 3, // Active orders
          completed: 242,
          average: 622.36, // Average order value
          topCategories: [
            { name: "Main Course", percentage: 38.3 },
            { name: "Beverages", percentage: 24.0 },
            { name: "Appetizers", percentage: 20.3 },
            { name: "Desserts", percentage: 17.4 }
          ]
        },
        performance: {
          profitMargin: 0.184, // 18.4%
          costOfGoods: 0.323, // 32.3% of revenue
          laborCosts: 0.287, // 28.7% of revenue
          tableUtilization: 0.65, // 65% of tables utilized during peak hours
          customerSatisfaction: 4.3 // Average rating out of 5
        }
      };
      
      // Process the business health inquiry with our new AI service
      const insights = await processBusinessInquiry("Analyze our business health and overall performance", adminData);
      
      res.status(200).json(insights);
    } catch (error) {
      errorHandler(error, res);
    }
  });
  
  app.post("/api/admin/ai/growth-opportunities", async (req: Request, res: Response) => {
    try {
      // Check role permission
      if (!req.isAuthenticated() || !["admin", "manager"].includes(req.user.role)) {
        return res.status(403).json({ error: "Unauthorized: Insufficient permissions" });
      }
      
      // Import adminAI functions
      const { processBusinessInquiry } = await import('./services/adminAI');
      
      // Generate dashboard data - in a real app this would be fetched from a database
      const adminData = {
        revenue: {
          total: 1920, // Today's sales in rupees
          lastWeek: 12480,
          lastMonth: 52350,
          growth: 0.12 // 12% growth from previous month
        },
        orders: {
          total: 3, // Active orders
          completed: 242,
          average: 622.36, // Average order value
          topCategories: [
            { name: "Main Course", percentage: 38.3 },
            { name: "Beverages", percentage: 24.0 },
            { name: "Appetizers", percentage: 20.3 },
            { name: "Desserts", percentage: 17.4 }
          ]
        },
        performance: {
          profitMargin: 0.184, // 18.4%
          costOfGoods: 0.323, // 32.3% of revenue
          laborCosts: 0.287, // 28.7% of revenue
          tableUtilization: 0.65, // 65% of tables utilized during peak hours
          customerSatisfaction: 4.3 // Average rating out of 5
        }
      };
      
      // Process the growth opportunities inquiry with our new AI service
      const insights = await processBusinessInquiry("Analyze our growth opportunities and expansion potential", adminData);
      
      res.status(200).json(insights);
    } catch (error) {
      errorHandler(error, res);
    }
  });
  
  app.post("/api/admin/ai/competitive-analysis", async (req: Request, res: Response) => {
    try {
      // Check role permission
      if (!req.isAuthenticated() || !["admin", "manager"].includes(req.user.role)) {
        return res.status(403).json({ error: "Unauthorized: Insufficient permissions" });
      }
      
      // Import adminAI functions
      const { processBusinessInquiry } = await import('./services/adminAI');
      
      // Generate dashboard data - in a real app this would be fetched from a database
      const adminData = {
        revenue: {
          total: 1920, // Today's sales in rupees
          lastWeek: 12480,
          lastMonth: 52350,
          growth: 0.12 // 12% growth from previous month
        },
        orders: {
          total: 3, // Active orders
          completed: 242,
          average: 622.36, // Average order value
          topCategories: [
            { name: "Main Course", percentage: 38.3 },
            { name: "Beverages", percentage: 24.0 },
            { name: "Appetizers", percentage: 20.3 },
            { name: "Desserts", percentage: 17.4 }
          ]
        },
        performance: {
          profitMargin: 0.184, // 18.4%
          costOfGoods: 0.323, // 32.3% of revenue
          laborCosts: 0.287, // 28.7% of revenue
          tableUtilization: 0.65, // 65% of tables utilized during peak hours
          customerSatisfaction: 4.3 // Average rating out of 5
        }
      };
      
      // Process the competitive analysis inquiry with our new AI service
      const insights = await processBusinessInquiry("Provide a competitive market analysis for our restaurant", adminData);
      
      res.status(200).json(insights);
    } catch (error) {
      errorHandler(error, res);
    }
  });

  return httpServer;
}
