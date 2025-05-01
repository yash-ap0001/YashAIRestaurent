/**
 * WhatsApp Business API Integration
 * 
 * This service handles direct integration with Meta's WhatsApp Business API
 * to send and receive messages from real WhatsApp users.
 */

import axios from 'axios';
import { storage } from '../../storage';
import { processWhatsAppMessage } from '../chatbot/whatsappProcessor';
import { broadcastToAllClients } from '../realtime';

// WhatsApp API configuration
const WHATSAPP_API_URL = 'https://graph.facebook.com/v17.0';

// Verify environment variables are set
function validateEnvironment() {
  const requiredEnvVars = [
    'WHATSAPP_BUSINESS_ACCOUNT_ID',
    'WHATSAPP_PHONE_NUMBER_ID',
    'WHATSAPP_API_TOKEN'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error(`Missing required WhatsApp API environment variables: ${missingVars.join(', ')}`);
    return false;
  }
  
  return true;
}

/**
 * Send a text message to a WhatsApp user
 * 
 * @param to The recipient's phone number (with country code)
 * @param text The text message to send
 * @returns Response data from the WhatsApp API
 */
export async function sendWhatsAppTextMessage(to: string, text: string) {
  if (!validateEnvironment()) {
    throw new Error('WhatsApp API environment variables not configured');
  }
  
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const apiToken = process.env.WHATSAPP_API_TOKEN;
  
  try {
    console.log(`Sending WhatsApp message to ${to}: ${text}`);
    
    const response = await axios({
      method: 'POST',
      url: `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: {
          body: text
        }
      }
    });
    
    // Log success
    console.log(`WhatsApp message sent successfully to ${to}`, response.data);
    
    // Store message in message history
    const messageId = `whatsapp-out-${Date.now()}`;
    const timestamp = new Date().toISOString();
    
    await storage.storeWhatsAppMessage({
      id: messageId,
      from: phoneNumberId as string,
      to,
      content: text,
      timestamp,
      direction: 'outgoing',
      type: 'text'
    });
    
    return response.data;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    throw error;
  }
}

/**
 * Send a template message to a WhatsApp user
 * 
 * @param to The recipient's phone number (with country code)
 * @param templateName The name of the registered template
 * @param components Optional template components
 * @returns Response data from the WhatsApp API
 */
export async function sendWhatsAppTemplateMessage(
  to: string, 
  templateName: string,
  components: any[] = []
) {
  if (!validateEnvironment()) {
    throw new Error('WhatsApp API environment variables not configured');
  }
  
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const apiToken = process.env.WHATSAPP_API_TOKEN;
  
  try {
    console.log(`Sending WhatsApp template message to ${to} using template ${templateName}`);
    
    const response = await axios({
      method: 'POST',
      url: `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: 'en_US'
          },
          components
        }
      }
    });
    
    // Log success
    console.log(`WhatsApp template message sent successfully to ${to}`, response.data);
    
    // Store message in message history
    const messageId = `whatsapp-out-template-${Date.now()}`;
    const timestamp = new Date().toISOString();
    
    await storage.storeWhatsAppMessage({
      id: messageId,
      from: phoneNumberId as string,
      to,
      content: `Template: ${templateName}`,
      timestamp,
      direction: 'outgoing',
      type: 'template'
    });
    
    return response.data;
  } catch (error) {
    console.error('Error sending WhatsApp template message:', error);
    throw error;
  }
}

/**
 * Process an incoming webhook event from the WhatsApp Business API
 * 
 * @param webhookEvent The webhook event from WhatsApp
 * @returns Processing result
 */
export async function handleWhatsAppWebhook(webhookEvent: any) {
  try {
    console.log('Processing WhatsApp webhook event:', JSON.stringify(webhookEvent, null, 2));
    
    // Extract the message data
    const entry = webhookEvent.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    
    if (!value || value.messaging_product !== 'whatsapp') {
      console.log('Not a WhatsApp message event, ignoring');
      return { success: false, error: 'Not a WhatsApp message event' };
    }
    
    const messages = value.messages || [];
    
    if (messages.length === 0) {
      console.log('No messages in the webhook event, ignoring');
      return { success: false, error: 'No messages in webhook event' };
    }
    
    // Process each message in the webhook
    for (const message of messages) {
      const from = message.from; // The customer's phone number
      const messageId = message.id;
      let messageText = '';
      let messageType = 'text';
      
      // Extract message text based on type
      if (message.type === 'text' && message.text) {
        messageText = message.text.body;
      } else if (message.type === 'interactive' && message.interactive) {
        if (message.interactive.type === 'button_reply') {
          messageText = message.interactive.button_reply.title;
          messageType = 'button';
        } else if (message.interactive.type === 'list_reply') {
          messageText = message.interactive.list_reply.title;
          messageType = 'list';
        }
      } else {
        console.log(`Unsupported message type: ${message.type}, ignoring`);
        continue;
      }
      
      console.log(`Received WhatsApp message from ${from}: ${messageText}`);
      
      // Store message in history
      const timestamp = new Date().toISOString();
      
      await storage.storeWhatsAppMessage({
        id: messageId,
        from,
        to: process.env.WHATSAPP_PHONE_NUMBER_ID as string,
        content: messageText,
        timestamp,
        direction: 'incoming',
        type: messageType
      });
      
      // Broadcast real-time event for the new message
      broadcastToAllClients({
        type: 'whatsapp_message',
        data: {
          id: messageId,
          from,
          content: messageText,
          timestamp,
          direction: 'incoming',
          type: messageType
        }
      });
      
      // Process the message with the WhatsApp processor
      // Try to detect contact name from webhook
      const profileName = value.contacts?.[0]?.profile?.name || 'Customer';
      
      const result = await processWhatsAppMessage(from, messageText, profileName);
      
      // If order was created, send confirmation message
      if (result.orderCreated && result.order) {
        const orderConfirmation = `Thank you for your order! Your order #${result.order.orderNumber} has been received and is being processed. Total amount: ₹${result.totalAmount.toFixed(2)}`;
        
        await sendWhatsAppTextMessage(from, orderConfirmation);
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error processing WhatsApp webhook:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Verify a webhook request from WhatsApp
 * Hub verify token should match the one set in your WhatsApp Business Account
 * 
 * @param mode The hub mode
 * @param token The verification token
 * @param challenge The challenge string
 * @returns Whether the verification was successful
 */
export function verifyWhatsAppWebhook(mode: string, token: string, challenge: string) {
  // This should match the token you set in the WhatsApp Business Platform
  const VERIFY_TOKEN = 'whatsApptoken';
  
  console.log(`Verifying WhatsApp webhook: mode=${mode}, token=${token}, challenge=${challenge}`);
  
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('WhatsApp webhook verified successfully! Returning challenge:', challenge);
    return { success: true, challenge };
  } else {
    console.error(`WhatsApp webhook verification failed. Expected token: ${VERIFY_TOKEN}, Got: ${token}`);
    return { success: false };
  }
}