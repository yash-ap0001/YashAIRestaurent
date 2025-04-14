import { getWhatsAppClient } from './client';
import { Request, Response } from 'express';

/**
 * Initialize the WhatsApp service
 */
export async function initializeWhatsAppService() {
  try {
    const client = getWhatsAppClient();
    await client.initialize();
    
    // Set up event listeners for the client
    client.on('qrCode', (qrCode) => {
      console.log('WhatsApp QR Code generated. Scan with your phone to authenticate.');
    });
    
    client.on('ready', () => {
      console.log('WhatsApp service is ready to use!');
    });
    
    client.on('disconnected', (reason) => {
      console.log(`WhatsApp service disconnected: ${reason}`);
    });
    
    return client;
  } catch (error) {
    console.error('Failed to initialize WhatsApp service:', error);
    throw error;
  }
}

/**
 * Send a WhatsApp message to a customer
 */
export async function sendWhatsAppMessage(phone: string, message: string) {
  try {
    const client = getWhatsAppClient();
    await client.sendMessage(phone, message);
    return true;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    throw error;
  }
}

/**
 * API handler for sending WhatsApp messages
 */
export async function handleSendMessage(req: Request, res: Response) {
  try {
    const { phone, message } = req.body;
    
    if (!phone || !message) {
      return res.status(400).json({
        error: 'Phone number and message are required'
      });
    }
    
    await sendWhatsAppMessage(phone, message);
    
    res.json({
      success: true,
      message: 'WhatsApp message sent successfully'
    });
  } catch (error) {
    console.error('Error in WhatsApp send message handler:', error);
    res.status(500).json({
      error: 'Failed to send WhatsApp message',
      details: error.message
    });
  }
}

/**
 * API handler for sending a bill via WhatsApp
 */
export async function handleSendBill(req: Request, res: Response) {
  try {
    const { phone, billId } = req.body;
    
    if (!phone || !billId) {
      return res.status(400).json({
        error: 'Phone number and bill ID are required'
      });
    }
    
    // Import dynamically to avoid circular dependencies
    const { storage } = await import('../../storage');
    
    // Get the bill from the database
    const bill = await storage.getBill(parseInt(billId));
    if (!bill) {
      return res.status(404).json({
        error: 'Bill not found'
      });
    }
    
    // Get the associated order
    const order = await storage.getOrder(bill.orderId);
    if (!order) {
      return res.status(404).json({
        error: 'Order not found for this bill'
      });
    }
    
    // Get the order items
    const orderItems = await storage.getOrderItems(order.id);
    
    // Format the bill as a WhatsApp message
    let billMessage = `*BILL: ${bill.billNumber}*\n`;
    billMessage += `Order: ${order.orderNumber}\n`;
    billMessage += `Date: ${new Date().toLocaleString()}\n\n`;
    billMessage += `*ITEMS*\n`;
    
    // Add order items
    for (const item of orderItems) {
      const menuItem = await storage.getMenuItem(item.menuItemId);
      billMessage += `${menuItem?.name || 'Item'} x${item.quantity} - ₹${(item.price * item.quantity).toFixed(2)}\n`;
    }
    
    billMessage += `\n*TOTAL: ₹${bill.amount.toFixed(2)}*\n\n`;
    billMessage += "Thank you for your order! Please pay at the counter or use our online payment options.";
    
    // Send the bill via WhatsApp
    await sendWhatsAppMessage(phone, billMessage);
    
    res.json({
      success: true,
      message: 'Bill sent via WhatsApp successfully'
    });
  } catch (error) {
    console.error('Error in WhatsApp send bill handler:', error);
    res.status(500).json({
      error: 'Failed to send bill via WhatsApp',
      details: error.message
    });
  }
}

/**
 * API handler for getting WhatsApp connection status
 */
export async function handleGetStatus(req: Request, res: Response) {
  try {
    const client = getWhatsAppClient();
    const status = client ? 'active' : 'inactive';
    
    res.json({
      status,
      message: `WhatsApp service is ${status}`
    });
  } catch (error) {
    console.error('Error in WhatsApp status handler:', error);
    res.status(500).json({
      error: 'Failed to get WhatsApp service status',
      details: error.message
    });
  }
}