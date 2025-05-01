/**
 * WhatsApp integration service - wrapper for WhatsApp Business API integration
 * 
 * This module currently uses whatsapp-web.js library for demonstrations 
 * and easier local testing. For production, it should be replaced with 
 * the official WhatsApp Business API integration.
 * 
 * Note: Most of the functionality has been moved to metaWhatsappService.ts
 * This module serves as a compatibility layer for existing imports.
 */

import { 
  sendWhatsAppMessage, 
  sendOrderConfirmation,
  sendOrderStatusUpdate,
  processWhatsAppMessage
} from './metaWhatsappService';

/**
 * Initialize the WhatsApp service
 */
export async function initializeWhatsAppService() {
  console.log('WhatsApp service initialized');
  return true;
}

/**
 * Get WhatsApp client
 */
export function getWhatsAppClient() {
  return {
    ready: true,
    status: 'connected'
  };
}

/**
 * Send a message to a WhatsApp number
 */
export async function handleSendMessage(to: string, message: string) {
  return await sendWhatsAppMessage(to, message);
}

/**
 * Get connection status
 */
export function handleGetStatus() {
  return {
    status: 'connected',
    qrCode: null
  };
}

/**
 * Send a bill to a WhatsApp number
 */
export async function handleSendBill(to: string, orderNumber: string, items: string, total: number) {
  return await sendOrderConfirmation(to, orderNumber, items, total);
}

/**
 * Send a bill with health tips to a WhatsApp number
 */
export async function handleSendBillWithHealthTips(
  to: string, 
  orderNumber: string, 
  items: string, 
  total: number, 
  healthTips: string
) {
  // First send the bill
  await sendOrderConfirmation(to, orderNumber, items, total);
  
  // Then send health tips as a separate message
  if (healthTips) {
    await sendWhatsAppMessage(to, `🌿 Health Tips for Your Order:\n\n${healthTips}`);
  }
  
  return { 
    success: true,
    billSent: true,
    healthTipsSent: !!healthTips
  };
}

// Re-export from metaWhatsappService for backwards compatibility
export { processWhatsAppMessage };