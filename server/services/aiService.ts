import OpenAI from "openai";

// The newest OpenAI model is "gpt-4o" which was released May 13, 2024. Do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Health recommendations based on dietary preferences and restrictions
export async function getHealthRecommendations(
  menuItems: any[],
  preferences: string,
  restrictions: string[]
): Promise<{ recommendations: any[], reasoning: string }> {
  
  try {
    const menuItemsString = JSON.stringify(menuItems);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            "You are a health-conscious culinary expert. Analyze menu items and provide healthy recommendations based on dietary preferences and restrictions."
        },
        {
          role: "user",
          content: 
            `Based on the following menu items: ${menuItemsString}
             
             Dietary preferences: ${preferences}
             Dietary restrictions: ${restrictions.join(", ")}
             
             Recommend up to 3 healthy menu options with reasoning for each recommendation.
             Format your response as a JSON object with this structure: 
             { "recommendations": [{"id": number, "name": string, "reasoning": string}], "reasoning": "overall explanation" }`
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content || "{}";
    return JSON.parse(content) as { recommendations: any[], reasoning: string };
  } catch (error) {
    console.error("Error getting health recommendations:", error);
    throw new Error("Failed to generate health recommendations");
  }
}

// Process natural language order and convert to structured order items
export async function processNaturalLanguageOrder(
  orderText: string,
  menuItems: any[]
): Promise<{ items: any[], notes: string }> {
  
  try {
    // Format menu items to include ID and make them more visible to the AI
    const menuItemsFormatted = menuItems.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      category: item.category
    }));
    
    const menuItemsString = JSON.stringify(menuItemsFormatted);
    
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
    
    // Add detailed logging of the final processed order
    console.log("Processed natural language order:", JSON.stringify(parsedResponse, null, 2));
    
    return parsedResponse;
  } catch (error) {
    console.error("Error processing natural language order:", error);
    throw new Error("Failed to process natural language order");
  }
}

// Generate personalized menu suggestions based on order history
export async function getPersonalizedRecommendations(
  customerOrderHistory: any[],
  menuItems: any[],
  customerPreferences: string = "None specified"
): Promise<{ recommendations: any[], reasoning: string }> {
  
  try {
    const orderHistoryString = JSON.stringify(customerOrderHistory);
    const menuItemsString = JSON.stringify(menuItems);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            "You are a sophisticated restaurant recommendation engine that understands customer preferences and ordering patterns."
        },
        {
          role: "user",
          content: 
            `Based on the following customer order history: ${orderHistoryString}
             
             Available menu items: ${menuItemsString}
             Customer preferences (if any): ${customerPreferences}
             
             Recommend 3-5 menu items this customer might enjoy based on their ordering patterns.
             Format your response as a JSON object with this structure: 
             { "recommendations": [{"id": number, "name": string, "reasoning": string}], "reasoning": "overall explanation" }`
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content || "{}";
    return JSON.parse(content) as { recommendations: any[], reasoning: string };
  } catch (error) {
    console.error("Error getting personalized recommendations:", error);
    throw new Error("Failed to generate personalized recommendations");
  }
}