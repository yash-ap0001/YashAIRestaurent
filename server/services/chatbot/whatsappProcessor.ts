/**
 * WhatsApp Message Processor
 * This service handles processing incoming WhatsApp messages, analyzing their intent,
 * and creating orders when appropriate. It's designed to work with the chatbot service
 * and provides specialized handling for WhatsApp-specific interactions.
 */

import { storage } from "../../storage";
import { processChatbotRequest } from "./chatbotService";
import { generateOrderNumber } from "../../utils";
import { menuItems } from "@shared/schema"; 
import { db } from "../../db";
import { orders } from "@shared/schema";

// Simple menu item extraction from text using pattern matching
async function extractMenuItems(text: string): Promise<Array<{id: number, name: string, quantity: number, price: number}>> {
  try {
    // Get menu items from storage
    const menuItemsArray = await storage.getMenuItems();
    
    // Lower case the text for case-insensitive matching
    const lowerText = text.toLowerCase();
    const extractedItems: Array<{id: number, name: string, quantity: number, price: number}> = [];
    
    // Go through each menu item and see if it appears in the text
    for (const item of menuItemsArray) {
      if (!item.name) continue;
      
      const itemName = item.name.toLowerCase();
      if (lowerText.includes(itemName)) {
        // Try to extract quantity
        const quantityRegex = new RegExp(`(\\d+)\\s+${itemName}`, 'i');
        const match = lowerText.match(quantityRegex);
        const quantity = match ? parseInt(match[1]) : 1;
        
        extractedItems.push({
          id: item.id,
          name: item.name,
          quantity,
          price: item.price || 0
        });
      }
    }
    
    return extractedItems;
  } catch (error) {
    console.error('Error extracting menu items:', error);
    return [];
  }
}

// Process an order from WhatsApp
export async function processWhatsAppOrder(message: string, phone: string): Promise<any> {
  try {
    // Try to extract items from the message
    const items = await extractMenuItems(message);
    
    // If no items found, return early
    if (items.length === 0) {
      return { 
        success: false, 
        error: "No menu items found in message" 
      };
    }
    
    // Calculate total amount
    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Create order record
    const orderNumber = generateOrderNumber();
    const [order] = await db.insert(orders).values({
      orderNumber,
      status: "received",
      totalAmount,
      // customerPhone isn't in the schema, so store in notes
      notes: `WhatsApp order from ${phone}`,
      orderSource: "whatsapp",
      createdAt: new Date()
    }).returning();
    
    // Create order items for each extracted item
    for (const item of items) {
      await storage.createOrderItem({
        orderId: order.id,
        menuItemId: item.id,
        quantity: item.quantity,
        price: item.price,
        notes: null // Use notes instead of specialInstructions per schema
      });
    }
    
    return {
      success: true,
      orderCreated: true,
      order,
      items,
      totalAmount
    };
  } catch (error: unknown) {
    console.error('Error processing WhatsApp order:', error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error processing order";
    return { 
      success: false, 
      error: errorMessage
    };
  }
}

// Process and analyze a WhatsApp message for chatbot handling
export async function processWhatsAppMessage(phone: string, message: string, name: string = "Customer"): Promise<any> {
  try {
    console.log(`Processing WhatsApp message from ${phone}: ${message}`);
    
    // First check if this is likely an order intent
    const orderKeywords = ["order", "buy", "get", "send", "deliver", "would like", "want", "please send"];
    const isLikelyOrderIntent = orderKeywords.some(keyword => message.toLowerCase().includes(keyword));
    
    if (isLikelyOrderIntent) {
      console.log(`Detected potential order intent in WhatsApp message: ${message}`);
      // Try to process as an order
      const orderResult = await processWhatsAppOrder(message, phone);
      
      if (orderResult.success) {
        return {
          text: `Thank you for your order! We've received your order for:\n\n${orderResult.items.map((item: any) => 
            `${item.quantity}x ${item.name}`).join('\n')}\n\nTotal: ₹${orderResult.totalAmount.toFixed(2)}\n\nYour order number is ${orderResult.order.orderNumber} and we'll start preparing it right away!`,
          intent: "place_order",
          orderData: orderResult.order
        };
      }
    }
    
    // Process with the chatbot if not an order or if order processing failed
    const response = await processChatbotRequest({
      message,
      userType: "customer",
      messageHistory: [],
      customerId: undefined,
      orderId: undefined
    });
    
    return { text: response };
  } catch (error: unknown) {
    console.error('Error processing WhatsApp message:', error);
    return { 
      text: "I'm sorry, I encountered an error processing your message. Please try again or contact our customer support."
    };
  }
}