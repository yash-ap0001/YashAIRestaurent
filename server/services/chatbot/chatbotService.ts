import { storage } from "../../storage";
import { OpenAI } from "openai";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// The newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const MODEL = "gpt-4o";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatbotRequest {
  message: string;
  userType: "customer" | "admin" | "kitchen";
  messageHistory: ChatMessage[];
  customerId?: number;
  orderId?: number;
}

export async function processChatbotRequest(request: ChatbotRequest): Promise<string> {
  try {
    const { message, userType, messageHistory, customerId, orderId } = request;

    // Create a contextual system message based on user type
    let systemMessage = "";
    let contextData = await getContextData(userType, customerId, orderId);

    switch (userType) {
      case "customer":
        systemMessage = `You are YashBot, a helpful assistant for customers of Yash Hotel Restaurant. 
        Your primary role is to assist customers with menu inquiries, order placement, order tracking, and general questions.
        
        Today's date is ${new Date().toLocaleDateString()}.
        
        Context information:
        ${contextData}
        
        Guidelines:
        - Be friendly, courteous, and helpful
        - Always provide concise responses
        - If asked about order status, check the context information
        - For menu questions, provide information from the context
        - If the customer wants to order, guide them through the process
        - Never make up information that's not in your context`;
        break;
        
      case "admin":
        systemMessage = `You are YashBot, an administrative assistant for staff at Yash Hotel Restaurant.
        Your primary role is to help administrators with data analysis, inventory management, operational insights, and decision support.
        
        Today's date is ${new Date().toLocaleDateString()}.
        
        Context information:
        ${contextData}
        
        Guidelines:
        - Provide concise, data-driven responses
        - Highlight important trends and anomalies
        - If asked about inventory, sales, or customers, use the context information
        - For operational questions, provide actionable insights
        - Help prioritize tasks based on data
        - Present numerical data in an easy-to-understand format
        - Never make up information that's not in your context`;
        break;
        
      case "kitchen":
        systemMessage = `You are YashBot, a kitchen assistant for the staff at Yash Hotel Restaurant.
        Your primary role is to help kitchen staff with order prioritization, food preparation guidelines, inventory usage, and operational efficiency.
        
        Today's date is ${new Date().toLocaleDateString()}.
        
        Context information:
        ${contextData}
        
        Guidelines:
        - Provide concise, actionable information
        - Help prioritize orders based on urgency and time
        - If asked about specific recipes or preparation, provide details from the context
        - For inventory questions, check available supplies
        - Help optimize kitchen workflows
        - Suggest efficient preparation sequences
        - Never make up information that's not in your context`;
        break;
    }

    // Construct the full message array
    const messages: ChatMessage[] = [
      { role: "system", content: systemMessage },
      ...messageHistory,
      { role: "user", content: message }
    ];

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: messages as any,
      temperature: 0.7,
      max_tokens: 1000,
    });

    // Return the assistant's response
    return completion.choices[0]?.message?.content || "I'm having trouble processing your request. Please try again.";
  } catch (error) {
    console.error("Error in chatbot service:", error);
    return "I'm currently experiencing technical difficulties. Please try again later.";
  }
}

async function getContextData(userType: string, customerId?: number, orderId?: number): Promise<string> {
  try {
    let contextData = "";

    // Get menu items data
    const menuItems = await storage.getMenuItems();
    const menuData = menuItems.map(item => 
      `${item.name}: ₹${item.price} - ${item.category}${item.description ? ` - ${item.description}` : ''}`
    ).join('\\n');

    // Common context for all user types
    contextData += `MENU ITEMS:\\n${menuData}\\n\\n`;

    // Add user-specific context
    switch (userType) {
      case "customer":
        // Add order information if orderId is provided
        if (orderId) {
          const order = await storage.getOrder(orderId);
          if (order) {
            const orderItems = await storage.getOrderItems(orderId);
            
            contextData += `ORDER INFORMATION:\\n`;
            contextData += `Order #${order.orderNumber}\\n`;
            contextData += `Status: ${order.status}\\n`;
            contextData += `Items: ${orderItems.map(item => `${item.quantity}x ${item.name}`).join(', ')}\\n`;
            contextData += `Total: ₹${order.totalAmount}\\n\\n`;
            
            // Add kitchen token info if available
            const kitchenTokens = await storage.getKitchenTokens();
            const kitchenToken = kitchenTokens.find(token => token.orderId === order.id);
            if (kitchenToken) {
              contextData += `Kitchen Token: ${kitchenToken.tokenNumber}\\n`;
              contextData += `Kitchen Status: ${kitchenToken.status}\\n\\n`;
            }
          }
        }
        
        // Add customer information if customerId is provided
        if (customerId) {
          const customer = await storage.getCustomer(customerId);
          if (customer) {
            contextData += `CUSTOMER INFORMATION:\\n`;
            contextData += `Name: ${customer.name}\\n`;
            contextData += `Phone: ${customer.phone}\\n`;
            contextData += `Email: ${customer.email || 'Not provided'}\\n`;
            contextData += `Preferences: ${customer.preferences || 'None recorded'}\\n\\n`;
            
            // Add previous orders
            const orders = await storage.getOrders();
            const customerOrders = orders.filter(order => order.customerId === customerId);
            if (customerOrders && customerOrders.length > 0) {
              contextData += `Previous Order History: ${customerOrders.length} orders\\n`;
              contextData += `Most recent order: ${new Date(customerOrders[0].orderDate).toLocaleDateString()}\\n\\n`;
            }
          }
        }
        break;
        
      case "admin":
        // Add business metrics
        const orders = await storage.getOrders();
        const customers = await storage.getCustomers();
        const inventory = await storage.getInventoryItems();
        
        const todaysOrders = orders.filter(order => 
          new Date(order.orderDate).toLocaleDateString() === new Date().toLocaleDateString()
        );
        
        contextData += `BUSINESS METRICS:\\n`;
        contextData += `Total Orders: ${orders.length}\\n`;
        contextData += `Today's Orders: ${todaysOrders.length}\\n`;
        contextData += `Total Customers: ${customers.length}\\n`;
        
        // Low inventory warning
        const lowInventoryItems = inventory.filter(item => item.quantity <= item.minQuantity);
        if (lowInventoryItems.length > 0) {
          contextData += `\\nLOW INVENTORY WARNING:\\n`;
          contextData += lowInventoryItems.map(item => 
            `${item.name}: ${item.quantity} ${item.unit} remaining (min: ${item.minQuantity})`
          ).join('\\n');
          contextData += `\\n\\n`;
        }
        
        if (orderId) {
          const order = await storage.getOrder(orderId);
          if (order) {
            const orderItems = await storage.getOrderItems(orderId);
            const customer = order.customerId ? await storage.getCustomer(order.customerId) : null;
            
            contextData += `ORDER DETAILS:\\n`;
            contextData += `Order #${order.orderNumber}\\n`;
            contextData += `Date: ${new Date(order.orderDate).toLocaleString()}\\n`;
            contextData += `Status: ${order.status}\\n`;
            contextData += `Items: ${orderItems.map(item => `${item.quantity}x ${item.name}`).join(', ')}\\n`;
            contextData += `Total: ₹${order.totalAmount}\\n`;
            if (customer) {
              contextData += `Customer: ${customer.name} (${customer.phone})\\n`;
            }
            contextData += `\\n`;
          }
        }
        break;
        
      case "kitchen":
        // Get active orders and kitchen tokens
        const kitchenTokens = await storage.getKitchenTokens();
        const activeTokens = kitchenTokens.filter(token => 
          token.status !== "completed" && token.status !== "cancelled"
        );
        
        contextData += `KITCHEN OPERATIONS:\\n`;
        contextData += `Active Orders: ${activeTokens.length}\\n\\n`;
        
        if (activeTokens.length > 0) {
          contextData += `ACTIVE ORDERS:\\n`;
          
          for (const token of activeTokens) {
            const order = await storage.getOrder(token.orderId);
            if (order) {
              const orderItems = await storage.getOrderItems(order.id);
              
              contextData += `Token #${token.tokenNumber} (${token.status}):\\n`;
              contextData += `Items: ${orderItems.map(item => `${item.quantity}x ${item.name}`).join(', ')}\\n`;
              contextData += `Priority: ${token.isUrgent ? 'URGENT' : 'Normal'}\\n`;
              contextData += `Order Time: ${new Date(order.orderDate).toLocaleTimeString()}\\n\\n`;
            }
          }
        }
        
        // Low inventory relevant to kitchen
        const inventory = await storage.getInventoryItems();
        const lowKitchenInventory = inventory.filter(item => 
          item.quantity <= item.minQuantity && 
          (item.category === "Ingredients" || item.category === "Fresh Produce" || item.category === "Meat & Seafood")
        );
        
        if (lowKitchenInventory.length > 0) {
          contextData += `LOW KITCHEN INVENTORY:\\n`;
          contextData += lowKitchenInventory.map(item => 
            `${item.name}: ${item.quantity} ${item.unit} remaining`
          ).join('\\n');
          contextData += `\\n\\n`;
        }
        
        if (orderId) {
          const order = await storage.getOrder(orderId);
          if (order) {
            const orderItems = await storage.getOrderItems(orderId);
            
            contextData += `SPECIFIC ORDER DETAILS:\\n`;
            contextData += `Order #${order.orderNumber}\\n`;
            contextData += `Items: ${orderItems.map(item => {
              // Add preparation notes if available
              const menuItem = menuItems.find(m => m.name === item.name);
              return `${item.quantity}x ${item.name}${item.specialInstructions ? ` (${item.specialInstructions})` : ''}`;
            }).join('\\n')}\\n\\n`;
          }
        }
        break;
    }

    return contextData;
  } catch (error) {
    console.error("Error getting context data:", error);
    return "Error retrieving context data.";
  }
}