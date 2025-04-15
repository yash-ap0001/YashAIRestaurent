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
import { 
  initializeTelephonyService, 
  handleIncomingCall, 
  processSpeech, 
  confirmOrder, 
  retryOrder, 
  getCalls, 
  getCallStatistics, 
  getAIVoiceSettings, 
  updateAIVoiceSettings, 
  simulateIncomingCall,
  makeOutboundCall,
  CallData 
} from "./services/telephony";
import { processChatbotRequest } from "./services/chatbot";
import { WebSocketServer } from 'ws';
import { initializeRealTimeService } from './services/realtime';
import { generateOrderNumber, generateTokenNumber, generateBillNumber, handleError } from './utils';
import { simulateZomatoOrder, simulateSwiggyOrder } from './services/externalPlatforms';
import { handleVoiceCommand } from './services/voiceAssistant';
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

  // Helper functions
  const generateOrderNumber = () => {
    return `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
  };

  const generateTokenNumber = () => {
    return `T${Math.floor(10 + Math.random() * 90)}`;
  };

  const generateBillNumber = () => {
    return `BILL-${Math.floor(1000 + Math.random() * 9000)}`;
  };

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
      if (Array.isArray(req.body.items)) {
        console.log(`Creating ${req.body.items.length} order items`);
        for (const item of req.body.items) {
          const orderItem = {
            ...item,
            orderId: order.id
          };
          const parsedOrderItem = insertOrderItemSchema.parse(orderItem);
          await storage.createOrderItem(parsedOrderItem);
        }
      } else {
        console.log("No order items provided in request");
      }
      
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
      
      res.json({
        todaysSales,
        ordersCount: todaysOrders.length,
        activeTables: activeTableNumbers.size,
        totalTables: 20, // Hardcoded for now
        kitchenQueueCount: kitchenQueue.length,
        urgentTokensCount: urgentTokens.length
      });
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
  
  // Create an immediate order from a simulated call (for testing only)
  app.post("/api/telephony/create-immediate-order", async (req: Request, res: Response) => {
    try {
      const { phoneNumber, orderText } = req.body;
      
      // Create a simulated call with the specified order text
      const callSid = 'SIM-IMMEDIATE-' + Date.now().toString();
      
      // Create a call data object with the phone number and transcript
      const callData: CallData = {
        id: callSid,
        phoneNumber: phoneNumber || '+919876543210',
        startTime: new Date().toISOString(),
        status: 'completed',
        transcript: `AI: Welcome to our restaurant! How can I help you today?\nCustomer: ${orderText || "I'd like to order butter chicken and garlic naan"}\nAI: Your order has been confirmed!`,
        endTime: new Date().toISOString() // Already completed
      };
      
      // Create the order directly
      const result = await createOrderFromCall(callData);
      
      res.json({
        success: true,
        message: "Immediate order created successfully from simulated call",
        callData,
        orderResult: result
      });
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
      const { command } = req.body;
      
      if (!command || typeof command !== 'string') {
        return res.status(400).json({
          success: false,
          error: "Command is required and must be a string"
        });
      }
      
      console.log(`Processing voice command: ${command}`);
      
      const result = await handleVoiceCommand(command);
      
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

  return httpServer;
}
