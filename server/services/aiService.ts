import OpenAI from "openai";
import { storage } from "../storage";
import { InsertScheduledOrder } from "@shared/schema";

// The newest OpenAI model is "gpt-4o" which was released May 13, 2024. Do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Health recommendations based on dietary preferences and restrictions
export async function getHealthRecommendations(
  customerPhone: string,
  restrictions: string[]
): Promise<{ recommendations: any[], reasoning: string, dietPlan?: any }> {
  
  try {
    // Get customer information by phone
    let customer = null;
    let customerPreferences = null;
    let dietaryRestrictions = [...restrictions]; // Start with provided restrictions
    
    if (customerPhone) {
      customer = await storage.getCustomerByPhone(customerPhone);
      if (customer && customer.dietaryPreferences) {
        customerPreferences = customer.dietaryPreferences;
        
        // Add customer's dietary restrictions to the provided restrictions
        if (customerPreferences.restrictions && customerPreferences.restrictions.length > 0) {
          dietaryRestrictions = [...dietaryRestrictions, ...customerPreferences.restrictions];
        }
        
        // Add allergens as restrictions
        if (customerPreferences.allergens && customerPreferences.allergens.length > 0) {
          dietaryRestrictions = [...dietaryRestrictions, ...customerPreferences.allergens];
        }
      }
    }
    
    // Get menu items with dietary tags that match the restrictions
    const menuItems = await storage.getMenuItems();
    const healthyMenuItems = menuItems.filter(item => 
      item.nutritionalInfo && // Must have nutritional information
      item.dietaryTags && // Must have dietary tags
      !dietaryRestrictions.some(r => 
        // Ensure no restricted items are included
        item.dietaryTags?.includes(r.toLowerCase())
      )
    );
    
    // Format menu items with nutritional info for the AI
    const formattedItems = healthyMenuItems.map(item => ({
      id: item.id,
      name: item.name,
      category: item.category,
      price: item.price,
      nutritionalInfo: item.nutritionalInfo,
      dietaryTags: item.dietaryTags,
      healthBenefits: item.healthBenefits
    }));
    
    const menuItemsString = JSON.stringify(formattedItems);
    const customerPrefsString = customerPreferences 
      ? JSON.stringify(customerPreferences) 
      : 'No specific preferences';
    
    // Create a health-focused diet plan
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            "You are a nutritionist and health-conscious culinary expert. Analyze menu items and customer dietary preferences to provide healthy recommendations and personalized diet plans."
        },
        {
          role: "user",
          content: 
            `Based on the following menu items with nutritional information: ${menuItemsString}
             
             Customer dietary preferences: ${customerPrefsString}
             Dietary restrictions: ${dietaryRestrictions.join(", ")}
             
             Provide the following:
             1. Up to 5 healthy menu options with reasoning for why each is recommended based on nutrition and health benefits
             2. A suggested weekly diet plan (breakfast, lunch, dinner) using these menu items that balances nutrition
             
             Format your response as a JSON object with this structure: 
             { 
               "recommendations": [{"id": number, "name": string, "reasoning": string}], 
               "reasoning": "overall explanation of recommendations",
               "dietPlan": {
                 "name": "Name of plan",
                 "description": "Description of the diet plan",
                 "weeklySchedule": [
                   {
                     "day": "Monday",
                     "meals": [
                       {"meal": "Breakfast", "menuItemIds": [1, 2], "notes": "Explanation"},
                       {"meal": "Lunch", "menuItemIds": [3, 4], "notes": "Explanation"},
                       {"meal": "Dinner", "menuItemIds": [5, 6], "notes": "Explanation"}
                     ]
                   }
                   // Repeat for each day of the week
                 ],
                 "healthBenefits": "Expected health benefits from following the plan",
                 "tips": "Additional dietary and lifestyle tips"
               }
             }`
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content || "{}";
    const result = JSON.parse(content) as { 
      recommendations: any[], 
      reasoning: string,
      dietPlan: any
    };
    
    console.log("Generated health recommendations and diet plan successfully");
    
    return result;
  } catch (error) {
    console.error("Error getting health recommendations:", error);
    throw new Error("Failed to generate health recommendations");
  }
}

// Process natural language order and convert to structured order items
export async function processNaturalLanguageOrder(
  orderText: string,
  source: string = "ai"
): Promise<{ success: boolean, message: string, order?: any, items?: any[] }> {
  
  try {
    // Get all available menu items
    const menuItems = await storage.getMenuItems();
    
    // Format menu items to include ID and make them more visible to the AI
    const menuItemsFormatted = menuItems.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      category: item.category,
      dietaryTags: item.dietaryTags || []
    }));
    
    const menuItemsString = JSON.stringify(menuItemsFormatted);
    
    console.log(`Processing natural language order: "${orderText}" (Source: ${source})`);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            "You are an expert restaurant order parser. Extract menu items, quantities, and special instructions from natural language orders. Always ensure that you use the exact menuItemId from the available menu items list."
        },
        {
          role: "user",
          content: 
            `Parse the following customer order into structured data: "${orderText}"
             
             Available menu items: ${menuItemsString}
             
             VERY IMPORTANT: You must use the exact menuItemId from the provided menu items list.
             If an item isn't in the menu items list, find the closest match from the available items.
             For example, if the customer asks for "naan" and there's no exact match, but "Naan Bread" exists with id 6, use id 6.
             
             Format your response as a JSON object with this structure: 
             { "items": [{"menuItemId": number, "name": string, "quantity": number, "notes": string}], "notes": "any general order notes" }`
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content || "{}";
    let parsedResponse = JSON.parse(content) as { items: any[], notes: string };
    
    if (!parsedResponse.items || parsedResponse.items.length === 0) {
      return {
        success: false,
        message: "Could not parse any menu items from the order text"
      };
    }
    
    // Validate menuItemId in each item, and fix any issues
    parsedResponse.items = parsedResponse.items.map(item => {
      if (!item.menuItemId || typeof item.menuItemId !== 'number') {
        // Try to find the item by name
        const matchedItem = menuItems.find(
          menuItem => menuItem.name.toLowerCase() === (item.name || '').toLowerCase()
        );
        
        if (matchedItem) {
          console.log(`Matched item "${item.name}" to menu item ID ${matchedItem.id}`);
          item.menuItemId = matchedItem.id;
        } else {
          // Find closest match
          console.log(`No exact match found for "${item.name}", finding closest match...`);
          
          // Simple matching logic - check if menu item name contains the ordered item name or vice versa
          for (const menuItem of menuItems) {
            if (
              menuItem.name.toLowerCase().includes((item.name || '').toLowerCase()) ||
              (item.name || '').toLowerCase().includes(menuItem.name.toLowerCase())
            ) {
              console.log(`Found closest match: "${item.name}" matched to "${menuItem.name}" (ID: ${menuItem.id})`);
              item.menuItemId = menuItem.id;
              break;
            }
          }
          
          // If still no match, default to the first menu item
          if (!item.menuItemId) {
            console.log(`No match found for "${item.name}", using default menu item ID ${menuItems[0].id}`);
            item.menuItemId = menuItems[0].id;
          }
        }
      }
      
      return item;
    });
    
    // Calculate total price based on menu items
    const totalAmount = parsedResponse.items.reduce((total, item) => {
      const menuItem = menuItems.find(mi => mi.id === item.menuItemId);
      const price = menuItem ? menuItem.price : 0;
      return total + (price * (item.quantity || 1));
    }, 0);
    
    // Generate a unique order number
    const { generateOrderNumber } = await import('../utils');
    const orderNumber = generateOrderNumber();
    
    // Create the order
    const order = await storage.createOrder({
      orderNumber,
      status: "pending",
      tableNumber: null,
      totalAmount,
      notes: parsedResponse.notes || `AI processed order from ${source}`,
      orderSource: source,
      useAIAutomation: true,
      customerId: null // Can be added later if customer is identified
    });
    
    // Create order items
    const orderItems = [];
    for (const item of parsedResponse.items) {
      const menuItem = menuItems.find(mi => mi.id === item.menuItemId);
      if (!menuItem) continue;
      
      const orderItem = await storage.createOrderItem({
        orderId: order.id,
        menuItemId: item.menuItemId,
        quantity: item.quantity || 1,
        price: menuItem.price,
        notes: item.notes || null
      });
      
      orderItems.push(orderItem);
    }
    
    // Log activity
    await storage.createActivity({
      type: "order_created",
      description: `Natural language order #${orderNumber} processed by AI (Source: ${source})`,
      entityId: order.id,
      entityType: "order"
    });
    
    // Add detailed logging of the final processed order
    console.log("Successfully processed natural language order:", JSON.stringify({
      order,
      items: orderItems
    }, null, 2));
    
    return {
      success: true,
      message: "Order successfully processed",
      order,
      items: orderItems
    };
  } catch (error) {
    console.error("Error processing natural language order:", error);
    return {
      success: false,
      message: `Failed to process natural language order: ${error.message}`
    };
  }
}

// Generate personalized menu suggestions based on order history and dietary preferences
export async function getPersonalizedRecommendations(
  customerPhone: string
): Promise<{ recommendations: any[], reasoning: string }> {
  
  try {
    // Get customer information by phone
    let customer = null;
    let customerPreferences = null;
    let dietaryRestrictions: string[] = [];
    
    if (customerPhone) {
      customer = await storage.getCustomerByPhone(customerPhone);
    }
    
    if (!customer) {
      throw new Error(`Customer with phone ${customerPhone} not found`);
    }
    
    // Get customer's dietary preferences
    if (customer.dietaryPreferences) {
      customerPreferences = customer.dietaryPreferences;
      
      // Add restrictions to filter out unsuitable items
      if (customerPreferences.restrictions && customerPreferences.restrictions.length > 0) {
        dietaryRestrictions = [...dietaryRestrictions, ...customerPreferences.restrictions];
      }
      
      // Add allergens as restrictions
      if (customerPreferences.allergens && customerPreferences.allergens.length > 0) {
        dietaryRestrictions = [...dietaryRestrictions, ...customerPreferences.allergens];
      }
    }
    
    // Get customer's order history
    const customerOrders = await storage.getOrdersByCustomerId(customer.id);
    
    // Get all order items for these orders to analyze patterns
    const orderItems = [];
    for (const order of customerOrders) {
      const items = await storage.getOrderItems(order.id);
      orderItems.push(...items);
    }
    
    // Get menu items that match customer preferences
    const menuItems = await storage.getMenuItems();
    const suitableMenuItems = menuItems.filter(item => 
      !dietaryRestrictions.some(r => 
        // Ensure no restricted items are included
        item.dietaryTags?.includes(r.toLowerCase())
      )
    );
    
    // Format menu items for the AI
    const formattedItems = suitableMenuItems.map(item => ({
      id: item.id,
      name: item.name,
      category: item.category,
      price: item.price,
      dietaryTags: item.dietaryTags || [],
      healthBenefits: item.healthBenefits
    }));
    
    // Format order history for the AI
    const formattedOrderHistory = orderItems.map(item => {
      const menuItem = menuItems.find(mi => mi.id === item.menuItemId);
      return {
        menuItemId: item.menuItemId,
        name: menuItem ? menuItem.name : `Unknown Item (${item.menuItemId})`,
        quantity: item.quantity
      };
    });
    
    const orderHistoryString = JSON.stringify(formattedOrderHistory);
    const menuItemsString = JSON.stringify(formattedItems);
    const customerPrefsString = customerPreferences 
      ? JSON.stringify(customerPreferences) 
      : 'No specific preferences';
    
    const favoriteCategories = new Set(
      formattedOrderHistory
        .map(item => {
          const menuItem = menuItems.find(mi => mi.id === item.menuItemId);
          return menuItem ? menuItem.category : null;
        })
        .filter(Boolean)
    );
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            "You are a sophisticated restaurant recommendation engine that understands customer preferences and ordering patterns. Consider dietary preferences, order history patterns, and health goals when making recommendations."
        },
        {
          role: "user",
          content: 
            `Based on the following customer order history: ${orderHistoryString}
             
             Available menu items: ${menuItemsString}
             
             Customer dietary preferences: ${customerPrefsString}
             
             Customer's favorite categories: ${Array.from(favoriteCategories).join(', ')}
             
             Recommend 3-5 menu items this customer might enjoy based on their ordering patterns and dietary preferences.
             Focus on healthy options that align with their dietary preferences and past orders.
             
             Format your response as a JSON object with this structure: 
             { 
               "recommendations": [
                 {"id": number, "name": string, "reasoning": string}
               ], 
               "reasoning": "overall explanation of recommendations" 
             }`
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content || "{}";
    const result = JSON.parse(content) as { recommendations: any[], reasoning: string };
    
    console.log(`Generated personalized recommendations for customer ${customer.name} (${customerPhone})`);
    
    return result;
  } catch (error) {
    console.error("Error getting personalized recommendations:", error);
    throw new Error("Failed to generate personalized recommendations");
  }
}