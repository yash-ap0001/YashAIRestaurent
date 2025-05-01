import axios from 'axios';
import { db } from '../db';
import { orders, activities } from '@shared/schema';
import { processWhatsAppMessage as processWithWhatsAppHandler } from './chatbot/whatsappProcessor';
import { notificationService } from './notificationService';

const WHATSAPP_API_BASE_URL = 'https://graph.facebook.com/v17.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

export async function sendWhatsAppMessage(to: string, message: string) {
  try {
    console.log(`Sending WhatsApp message to ${to}: ${message}`);
    
    // Check if we have the required environment variables
    if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
      console.error('Missing WhatsApp API credentials - Demo mode active');
      // In demo mode, just log the message
      console.log(`[DEMO] WhatsApp message to ${to}: ${message}`);
      return { success: true, demo: true };
    }
    
    const url = `${WHATSAPP_API_BASE_URL}/${PHONE_NUMBER_ID}/messages`;
    
    const response = await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formatPhoneNumber(to),
        type: 'text',
        text: {
          preview_url: false,
          body: message
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('WhatsApp message sent successfully');
    return response.data;
  } catch (error: any) {
    console.error('Error sending WhatsApp message:', error.response?.data || error.message);
    // Still return something in demo mode
    return { 
      success: false, 
      demo: !PHONE_NUMBER_ID || !ACCESS_TOKEN,
      error: error.message 
    };
  }
}

export async function sendOrderConfirmation(
  to: string, 
  orderNumber: string, 
  items: string, 
  total: number
) {
  try {
    console.log(`Sending order confirmation to ${to} for order ${orderNumber}`);
    
    // Check if we have the required environment variables
    if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
      console.error('Missing WhatsApp API credentials - Demo mode active');
      // In demo mode, just log what we would send
      console.log(`[DEMO] WhatsApp order confirmation to ${to}:`);
      console.log(`Order #: ${orderNumber}`);
      console.log(`Items: ${items}`);
      console.log(`Total: ₹${total.toFixed(2)}`);
      return { success: true, demo: true };
    }
    
    const url = `${WHATSAPP_API_BASE_URL}/${PHONE_NUMBER_ID}/messages`;
    
    // First check if we can use a template
    try {
      const templateResponse = await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          to: formatPhoneNumber(to),
          type: 'template',
          template: {
            name: 'order_confirmation',
            language: {
              code: 'en'
            },
            components: [
              {
                type: 'body',
                parameters: [
                  {
                    type: 'text',
                    text: orderNumber
                  },
                  {
                    type: 'text',
                    text: items
                  },
                  {
                    type: 'text',
                    text: `₹${total.toFixed(2)}`
                  }
                ]
              }
            ]
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Order confirmation template sent successfully');
      return templateResponse.data;
    } catch (templateError: any) {
      console.warn('Template message failed, falling back to text message:', templateError.message);
      
      // Fallback to regular text message
      const message = `Thank you for your order! 🎉\n\n`
        + `Order #: ${orderNumber}\n`
        + `Items: ${items}\n`
        + `Total: ₹${total.toFixed(2)}\n\n`
        + `Your order is being prepared and you'll receive updates on its status.`;
      
      return await sendWhatsAppMessage(to, message);
    }
  } catch (error: any) {
    console.error('Error sending order confirmation:', error.response?.data || error.message);
    return { 
      success: false, 
      demo: !PHONE_NUMBER_ID || !ACCESS_TOKEN,
      error: error.message 
    };
  }
}

export async function sendOrderStatusUpdate(
  to: string, 
  orderNumber: string, 
  status: string
) {
  try {
    let statusMessage = `Your order #${orderNumber} `;
    
    switch(status.toLowerCase()) {
      case 'preparing':
        statusMessage += 'is now being prepared in our kitchen. 👨‍🍳';
        break;
      case 'ready':
        statusMessage += 'is ready for pickup or delivery! 🍽️';
        break;
      case 'delivered':
        statusMessage += 'has been delivered. Enjoy your meal! 😋';
        break;
      case 'cancelled':
        statusMessage += 'has been cancelled. We apologize for any inconvenience. 🙏';
        break;
      default:
        statusMessage += `status has been updated to: ${status}`;
    }
    
    return await sendWhatsAppMessage(to, statusMessage);
  } catch (error: any) {
    console.error('Error sending status update:', error);
    return { success: false, error: error.message };
  }
}

// Process an incoming WhatsApp message
export async function processWhatsAppMessage(phone: string, message: string, customerName: string = "Customer") {
  try {
    console.log(`Processing WhatsApp message from ${phone}: ${message}`);
    
    // Add to activity log
    await db.insert(activities).values({
      type: 'whatsapp_message',
      description: `WhatsApp message from ${phone}: ${message}`,
      entityType: 'whatsapp',
      createdAt: new Date()
    });
    
    // Process the message with our dedicated WhatsApp processor
    const result = await processWithWhatsAppHandler(phone, message, customerName);
    
    // The response should be an object with text property
    if (result && typeof result.text === 'string') {
      // Send the response back via WhatsApp
      await sendWhatsAppMessage(phone, result.text);
      
      // If this is an order intent, handle notifications
      if (result.intent === 'place_order' && result.orderData) {
        // Send a notification to all clients
        notificationService.sendNotification(
          "New WhatsApp Order", 
          `New order ${result.orderData.orderNumber} received via WhatsApp`,
          "info"
        );
        
        // Get items summary if available
        let itemsSummary = "your items";
        if (result.items && Array.isArray(result.items)) {
          itemsSummary = result.items
            .map((item: any) => `${item.quantity || 1}x ${item.name}`)
            .join(', ');
        }
        
        // Send order confirmation
        await sendOrderConfirmation(
          phone,
          result.orderData.orderNumber,
          itemsSummary,
          result.orderData.totalAmount || 0
        );
        
        return { 
          success: true, 
          orderCreated: true, 
          orderNumber: result.orderData.orderNumber 
        };
      }
      
      return { success: true, response: result.text };
    }
    
    return { success: true, aiResponse: result };
    
  } catch (error: any) {
    console.error('Error processing WhatsApp message:', error);
    // Send an error message to the user
    await sendWhatsAppMessage(
      phone, 
      "I'm sorry, I encountered an error processing your request. Please try again later."
    );
    return { success: false, error: error?.message || 'Unknown error' };
  }
}

// Format phone number to WhatsApp requirements
function formatPhoneNumber(phone: string): string {
  // Remove any non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Ensure phone has country code (add Indian code if missing)
  if (!digitsOnly.startsWith('91') && digitsOnly.length === 10) {
    return `91${digitsOnly}`;
  }
  
  return digitsOnly;
}