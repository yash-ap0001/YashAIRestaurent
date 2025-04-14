import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import PDFDocument from "pdfkit";
import { insertOrderSchema, insertOrderItemSchema, insertKitchenTokenSchema, insertBillSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

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
      // Create a new order
      const orderData = {
        ...req.body,
        orderNumber: generateOrderNumber()
      };
      
      const parsedOrder = insertOrderSchema.parse(orderData);
      const order = await storage.createOrder(parsedOrder);
      
      // Create order items if provided
      if (Array.isArray(req.body.items)) {
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
        const tokenData = {
          tokenNumber: generateTokenNumber(),
          orderId: order.id,
          status: "pending",
          isUrgent: req.body.isUrgent || false
        };
        
        const parsedToken = insertKitchenTokenSchema.parse(tokenData);
        await storage.createKitchenToken(parsedToken);
      }
      
      res.status(201).json(order);
    } catch (err) {
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
      
      res.status(201).json(bill);
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
      doc.text(`Date: ${bill.createdAt.toLocaleDateString()}`);
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
      const customers = await storage.getCustomers();
      res.json(customers);
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
      const todaysOrders = orders.filter(order => 
        new Date(order.createdAt).getTime() >= today.getTime()
      );
      
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

  return httpServer;
}
