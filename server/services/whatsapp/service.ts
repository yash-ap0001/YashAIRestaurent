import { getWhatsAppClient } from './simulatedClient';
import { Request, Response } from 'express';
import { getHealthRecommendations } from '../aiService';

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
      details: error instanceof Error ? error.message : String(error)
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
    
    billMessage += `\n*TOTAL: ₹${bill.total.toFixed(2)}*\n\n`;
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
      details: error instanceof Error ? error.message : String(error)
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
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Calculate approximate calories for a menu item based on name and category
 */
function calculateApproximateCalories(menuItem: any): { calories: number, protein: number, carbs: number, fat: number } {
  // Default values
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  
  const name = menuItem.name.toLowerCase();
  const category = menuItem.category.toLowerCase();
  
  // Estimate based on common Indian dishes
  if (name.includes('chicken') || name.includes('murgh')) {
    if (name.includes('butter') || name.includes('makhan')) {
      calories = 350; // Butter chicken
      protein = 20;
      carbs = 10;
      fat = 25;
    } else if (name.includes('tikka')) {
      calories = 250; // Chicken tikka
      protein = 25;
      carbs = 5;
      fat = 15;
    } else {
      calories = 300; // Generic chicken dish
      protein = 22;
      carbs = 10;
      fat = 18;
    }
  } else if (name.includes('paneer')) {
    if (name.includes('butter') || name.includes('makhan')) {
      calories = 320; // Butter paneer
      protein = 15;
      carbs = 12;
      fat = 24;
    } else if (name.includes('tikka')) {
      calories = 280; // Paneer tikka
      protein = 16;
      carbs = 8;
      fat = 20;
    } else {
      calories = 300; // Generic paneer dish
      protein = 15;
      carbs = 10;
      fat = 22;
    }
  } else if (name.includes('dal')) {
    calories = 150; // Dal
    protein = 9;
    carbs = 20;
    fat = 5;
  } else if (name.includes('rice') || name.includes('biryani') || name.includes('pulao')) {
    calories = 250; // Rice dish
    protein = 6;
    carbs = 45;
    fat = 6;
  } else if (name.includes('naan') || name.includes('roti') || name.includes('bread')) {
    calories = 150; // Bread
    protein = 4;
    carbs = 30;
    fat = 2;
  } else {
    // Default for unknown items
    calories = 250;
    protein = 12;
    carbs = 25;
    fat = 12;
  }
  
  return { calories, protein, carbs, fat };
}

/**
 * API handler for sending a bill with health tips via WhatsApp
 */
export async function handleSendBillWithHealthTips(req: Request, res: Response) {
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
    
    // Get menu items for nutritional analysis
    const menuItemDetails = [];
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    
    for (const item of orderItems) {
      const menuItem = await storage.getMenuItem(item.menuItemId);
      if (menuItem) {
        const nutrition = calculateApproximateCalories(menuItem);
        const itemCalories = nutrition.calories * item.quantity;
        const itemProtein = nutrition.protein * item.quantity;
        const itemCarbs = nutrition.carbs * item.quantity;
        const itemFat = nutrition.fat * item.quantity;
        
        totalCalories += itemCalories;
        totalProtein += itemProtein;
        totalCarbs += itemCarbs;
        totalFat += itemFat;
        
        menuItemDetails.push({
          ...menuItem,
          quantity: item.quantity,
          nutrition: {
            ...nutrition,
            totalCalories: itemCalories,
            totalProtein: itemProtein,
            totalCarbs: itemCarbs,
            totalFat: itemFat
          }
        });
      }
    }
    
    // Format the bill as a WhatsApp message
    let billMessage = `*BILL: ${bill.billNumber}*\n`;
    billMessage += `Order: ${order.orderNumber}\n`;
    billMessage += `Date: ${new Date().toLocaleString()}\n\n`;
    billMessage += `*ITEMS*\n`;
    
    // Add order items with calorie information
    for (const item of menuItemDetails) {
      billMessage += `${item.name} x${item.quantity} - ₹${(item.price * item.quantity).toFixed(2)}\n`;
      billMessage += `   _~${item.nutrition.totalCalories} calories_ | _${item.nutrition.totalProtein}g protein_\n`;
    }
    
    billMessage += `\n*TOTAL: ₹${bill.total.toFixed(2)}*\n`;
    billMessage += `*NUTRITION SUMMARY*\n`;
    billMessage += `Total Calories: ${totalCalories} kcal\n`;
    billMessage += `Protein: ${totalProtein}g | Carbs: ${totalCarbs}g | Fat: ${totalFat}g\n\n`;
    
    // Get AI-powered health recommendations for these menu items
    try {
      const healthRecommendations = await getHealthRecommendations(menuItemDetails, "balanced diet", []);
      
      // Add health tips
      billMessage += `*HEALTH TIPS*\n`;
      billMessage += `${healthRecommendations.reasoning}\n\n`;
      billMessage += `*RECOMMENDED NEXT TIME*\n`;
      
      for (const rec of healthRecommendations.recommendations.slice(0, 2)) {
        billMessage += `• ${rec.name}: ${rec.reasoning}\n`;
      }
    } catch (error) {
      console.error('Failed to get health recommendations:', error);
      // Fallback tips if AI fails
      billMessage += `*HEALTH TIPS*\n`;
      billMessage += `• Stay hydrated by drinking water after your meal\n`;
      billMessage += `• Take a short walk to aid digestion\n`;
      billMessage += `• Include fiber-rich foods in your next meal\n`;
    }
    
    billMessage += `\nThank you for your order! Please pay at the counter or use our online payment options.`;
    
    // Send the bill with health tips via WhatsApp
    await sendWhatsAppMessage(phone, billMessage);
    
    res.json({
      success: true,
      message: 'Bill with health tips sent via WhatsApp successfully'
    });
  } catch (error) {
    console.error('Error in WhatsApp send bill with health tips handler:', error);
    res.status(500).json({
      error: 'Failed to send bill with health tips via WhatsApp',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}