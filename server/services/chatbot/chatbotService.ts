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
  userType: "customer" | "admin" | "kitchen" | "waiter" | "manager" | "delivery";
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

      case "waiter":
        systemMessage = `You are YashBot, a waiter assistant for the staff at Yash Hotel Restaurant.
        Your primary role is to help waiters with table management, order taking, customer service, and providing recommendations.
        
        Today's date is ${new Date().toLocaleDateString()}.
        
        Context information:
        ${contextData}
        
        Guidelines:
        - Provide quick, actionable responses for busy waitstaff
        - Help track table assignments and status
        - Suggest menu items based on customer preferences
        - Assist with order modifications and special requests
        - Provide information on preparation time for dishes
        - Suggest upsell opportunities when appropriate
        - Never make up information that's not in your context`;
        break;

      case "manager":
        systemMessage = `You are YashBot, a manager assistant for the staff at Yash Hotel Restaurant.
        Your primary role is to help managers with staff scheduling, performance metrics, financial data, and strategic decision-making.
        
        Today's date is ${new Date().toLocaleDateString()}.
        
        Context information:
        ${contextData}
        
        Guidelines:
        - Provide comprehensive, data-driven insights
        - Analyze operational efficiency and suggest improvements
        - Track key performance indicators and highlight trends
        - Help with staff allocation and resource management
        - Identify revenue opportunities and cost-saving measures
        - Provide competitive analysis and market insights
        - Never make up information that's not in your context`;
        break;

      case "delivery":
        systemMessage = `You are YashBot, a delivery assistant for the staff at Yash Hotel Restaurant.
        Your primary role is to help delivery personnel with route optimization, order tracking, delivery status updates, and customer communication.
        
        Today's date is ${new Date().toLocaleDateString()}.
        
        Context information:
        ${contextData}
        
        Guidelines:
        - Provide clear, concise delivery instructions
        - Help prioritize deliveries based on time, distance, and urgency
        - Track delivery status and estimated arrival times
        - Assist with customer communications regarding delays
        - Provide order verification and packaging information
        - Suggest optimal routes based on multiple deliveries
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
    ).join('\n');

    // Common context for all user types
    contextData += `MENU ITEMS:\n${menuData}\n\n`;

    // Add user-specific context
    switch (userType) {
      case "customer":
        // Add order information if orderId is provided
        if (orderId) {
          const order = await storage.getOrder(orderId);
          if (order) {
            const orderItems = await storage.getOrderItems(orderId);
            // Connect menu items to order items to get item names
            const itemsWithNames = orderItems.map(item => {
              const menuItem = menuItems.find(m => m.id === item.menuItemId);
              return {
                ...item,
                itemName: menuItem ? menuItem.name : `Item #${item.menuItemId}`
              };
            });
            
            contextData += `ORDER INFORMATION:\n`;
            contextData += `Order #${order.orderNumber}\n`;
            contextData += `Status: ${order.status}\n`;
            contextData += `Items: ${itemsWithNames.map(item => `${item.quantity}x ${item.itemName}`).join(', ')}\n`;
            contextData += `Total: ₹${order.totalAmount}\n\n`;
            
            // Add kitchen token info if available
            const kitchenTokens = await storage.getKitchenTokens();
            const kitchenToken = kitchenTokens.find(token => token.orderId === order.id);
            if (kitchenToken) {
              contextData += `Kitchen Token: ${kitchenToken.tokenNumber}\n`;
              contextData += `Kitchen Status: ${kitchenToken.status}\n\n`;
            }
          }
        }
        
        // Add customer information if customerId is provided
        if (customerId) {
          const customer = await storage.getCustomer(customerId);
          if (customer) {
            contextData += `CUSTOMER INFORMATION:\n`;
            contextData += `Name: ${customer.name}\n`;
            contextData += `Phone: ${customer.phone || 'Not provided'}\n`;
            contextData += `Email: ${customer.email || 'Not provided'}\n`;
            
            // Check if preferences exists and is an array
            const preferencesText = customer.preferences && Array.isArray(customer.preferences) 
              ? customer.preferences.join(', ') 
              : 'None recorded';
            
            contextData += `Preferences: ${preferencesText}\n\n`;
            
            // Add previous orders
            const customerOrders = await storage.getOrdersByCustomerId(customerId);
            if (customerOrders && customerOrders.length > 0) {
              contextData += `Previous Order History: ${customerOrders.length} orders\n`;
              
              const orderDate = customerOrders[0].createdAt 
                ? new Date(customerOrders[0].createdAt).toLocaleDateString() 
                : 'Unknown date';
                
              contextData += `Most recent order: ${orderDate}\n\n`;
            }
          }
        }
        break;
        
      case "admin":
        // Add business metrics
        const orders = await storage.getOrders();
        const customers = await storage.getCustomers();
        const adminInventory = await storage.getInventoryItems();
        
        const todaysOrders = orders.filter(order => {
          if (!order.createdAt) return false;
          return new Date(order.createdAt).toLocaleDateString() === new Date().toLocaleDateString();
        });
        
        contextData += `BUSINESS METRICS:\n`;
        contextData += `Total Orders: ${orders.length}\n`;
        contextData += `Today's Orders: ${todaysOrders.length}\n`;
        contextData += `Total Customers: ${customers.length}\n`;
        
        // Low inventory warning
        const lowInventoryItems = adminInventory.filter(item => {
          return typeof item.quantity === 'number' && 
                 typeof item.minQuantity === 'number' && 
                 item.quantity <= item.minQuantity;
        });
        
        if (lowInventoryItems.length > 0) {
          contextData += `\nLOW INVENTORY WARNING:\n`;
          contextData += lowInventoryItems.map(item => 
            `${item.name}: ${item.quantity} ${item.unit} remaining (min: ${item.minQuantity})`
          ).join('\n');
          contextData += `\n\n`;
        }
        
        if (orderId) {
          const order = await storage.getOrder(orderId);
          if (order) {
            const orderItems = await storage.getOrderItems(orderId);
            // Connect menu items to order items to get item names
            const itemsWithNames = orderItems.map(item => {
              const menuItem = menuItems.find(m => m.id === item.menuItemId);
              return {
                ...item,
                itemName: menuItem ? menuItem.name : `Item #${item.menuItemId}`
              };
            });
            
            // Try to get customer information if there's a note with customer info
            const relatedCustomer = order.notes && order.notes.includes("Customer:") 
              ? customers.find(c => order.notes?.includes(c.name)) 
              : null;
            
            contextData += `ORDER DETAILS:\n`;
            contextData += `Order #${order.orderNumber}\n`;
            contextData += `Date: ${order.createdAt ? new Date(order.createdAt).toLocaleString() : 'Unknown'}\n`;
            contextData += `Status: ${order.status}\n`;
            contextData += `Items: ${itemsWithNames.map(item => `${item.quantity}x ${item.itemName}`).join(', ')}\n`;
            contextData += `Total: ₹${order.totalAmount}\n`;
            
            if (relatedCustomer) {
              contextData += `Customer: ${relatedCustomer.name} (${relatedCustomer.phone || 'No phone'})\n`;
            }
            
            contextData += `\n`;
          }
        }
        break;
        
      case "kitchen":
        // Get active orders and kitchen tokens
        const kitchenTokens = await storage.getKitchenTokens();
        const activeTokens = kitchenTokens.filter(token => 
          token.status !== "completed" && token.status !== "cancelled"
        );
        
        contextData += `KITCHEN OPERATIONS:\n`;
        contextData += `Active Orders: ${activeTokens.length}\n\n`;
        
        if (activeTokens.length > 0) {
          contextData += `ACTIVE ORDERS:\n`;
          
          for (const token of activeTokens) {
            const order = await storage.getOrder(token.orderId);
            if (order) {
              const orderItems = await storage.getOrderItems(order.id);
              // Connect menu items to order items to get item names
              const itemsWithNames = orderItems.map(item => {
                const menuItem = menuItems.find(m => m.id === item.menuItemId);
                return {
                  ...item,
                  itemName: menuItem ? menuItem.name : `Item #${item.menuItemId}`
                };
              });
              
              contextData += `Token #${token.tokenNumber} (${token.status}):\n`;
              contextData += `Items: ${itemsWithNames.map(item => `${item.quantity}x ${item.itemName}`).join(', ')}\n`;
              contextData += `Priority: ${token.isUrgent ? 'URGENT' : 'Normal'}\n`;
              contextData += `Order Time: ${order.createdAt ? new Date(order.createdAt).toLocaleTimeString() : 'Unknown'}\n\n`;
            }
          }
        }
        
        // Low inventory relevant to kitchen
        const kitchenInventory = await storage.getInventoryItems();
        const kitchenCategories = ["Ingredients", "Fresh Produce", "Meat & Seafood"];
        
        const lowKitchenInventory = kitchenInventory.filter(item => {
          return typeof item.quantity === 'number' && 
                 typeof item.minQuantity === 'number' && 
                 item.quantity <= item.minQuantity &&
                 kitchenCategories.includes(item.category);
        });
        
        if (lowKitchenInventory.length > 0) {
          contextData += `LOW KITCHEN INVENTORY:\n`;
          contextData += lowKitchenInventory.map(item => 
            `${item.name}: ${item.quantity} ${item.unit} remaining`
          ).join('\n');
          contextData += `\n\n`;
        }
        
        if (orderId) {
          const order = await storage.getOrder(orderId);
          if (order) {
            const orderItems = await storage.getOrderItems(orderId);
            // Connect menu items to order items to get item names
            const itemsWithNames = orderItems.map(item => {
              const menuItem = menuItems.find(m => m.id === item.menuItemId);
              return {
                ...item,
                itemName: menuItem ? menuItem.name : `Item #${item.menuItemId}`
              };
            });
            
            contextData += `SPECIFIC ORDER DETAILS:\n`;
            contextData += `Order #${order.orderNumber}\n`;
            contextData += `Items: ${itemsWithNames.map(item => 
              `${item.quantity}x ${item.itemName}${item.notes ? ` (${item.notes})` : ''}`
            ).join('\n')}\n\n`;
          }
        }
        break;

      case "waiter":
        // Get all active orders 
        const waiterOrders = await storage.getOrders();
        const activeOrders = waiterOrders.filter(order => 
          order.status !== "completed" && order.status !== "cancelled" && order.status !== "billed"
        );
        
        contextData += `WAITER OPERATIONS:\n`;
        contextData += `Active Orders: ${activeOrders.length}\n\n`;
        
        if (activeOrders.length > 0) {
          contextData += `ACTIVE TABLE ORDERS:\n`;
          
          for (const order of activeOrders) {
            if (order.tableNumber) {  // Only include table orders, not delivery/takeaway
              const orderItems = await storage.getOrderItems(order.id);
              // Connect menu items to order items to get item names
              const itemsWithNames = orderItems.map(item => {
                const menuItem = menuItems.find(m => m.id === item.menuItemId);
                return {
                  ...item,
                  itemName: menuItem ? menuItem.name : `Item #${item.menuItemId}`
                };
              });
              
              contextData += `Table #${order.tableNumber} (${order.status}):\n`;
              contextData += `Order #${order.orderNumber}\n`;
              contextData += `Items: ${itemsWithNames.map(item => `${item.quantity}x ${item.itemName}`).join(', ')}\n`;
              
              // Add kitchen token info if available
              const waiterKitchenTokens = await storage.getKitchenTokens();
              const kitchenToken = waiterKitchenTokens.find(token => token.orderId === order.id);
              if (kitchenToken) {
                contextData += `Kitchen Status: ${kitchenToken.status}\n`;
              }
              
              contextData += `Order Time: ${order.createdAt ? new Date(order.createdAt).toLocaleTimeString() : 'Unknown'}\n\n`;
            }
          }
        }

        // Popular menu items for recommendations
        const popularItems = menuItems
          .filter(item => item.isAvailable)
          .slice(0, 5);  // Get top 5 items for recommendations
        
        if (popularItems.length > 0) {
          contextData += `RECOMMENDED ITEMS:\n`;
          contextData += popularItems.map(item => 
            `${item.name}: ₹${item.price} - ${item.description || ''}`
          ).join('\n');
          contextData += `\n\n`;
        }
        
        if (orderId) {
          const order = await storage.getOrder(orderId);
          if (order) {
            const orderItems = await storage.getOrderItems(orderId);
            // Connect menu items to order items to get item names
            const itemsWithNames = orderItems.map(item => {
              const menuItem = menuItems.find(m => m.id === item.menuItemId);
              return {
                ...item,
                itemName: menuItem ? menuItem.name : `Item #${item.menuItemId}`
              };
            });
            
            // Get token status if available
            const waiterKitchenTokens = await storage.getKitchenTokens();
            const kitchenToken = waiterKitchenTokens.find(token => token.orderId === order.id);
            
            contextData += `SPECIFIC ORDER DETAILS:\n`;
            contextData += `Table #${order.tableNumber || 'N/A'}\n`;
            contextData += `Order #${order.orderNumber}\n`;
            contextData += `Status: ${order.status}\n`;
            contextData += `Kitchen Status: ${kitchenToken?.status || 'No kitchen token'}\n`;
            contextData += `Items: ${itemsWithNames.map(item => 
              `${item.quantity}x ${item.itemName}${item.notes ? ` (${item.notes})` : ''}`
            ).join('\n')}\n`;
            contextData += `Total: ₹${order.totalAmount}\n\n`;
          }
        }
        break;

      case "manager":
        // Get business metrics and statistics
        const managerOrders = await storage.getOrders();
        const managerCustomers = await storage.getCustomers();
        const bills = await storage.getBills();
        
        const todaysBills = bills.filter(bill => {
          if (!bill.createdAt) return false;
          return new Date(bill.createdAt).toLocaleDateString() === new Date().toLocaleDateString();
        });
        
        const todaysRevenue = todaysBills.reduce((sum, bill) => sum + bill.total, 0);
        const todaysOrderCount = todaysBills.length;
        
        contextData += `BUSINESS METRICS:\n`;
        contextData += `Total Orders: ${managerOrders.length}\n`;
        contextData += `Today's Orders: ${todaysOrderCount}\n`;
        contextData += `Today's Revenue: ₹${todaysRevenue}\n`;
        contextData += `Total Customers: ${managerCustomers.length}\n\n`;
        
        // Order status breakdown
        const pendingOrders = managerOrders.filter(order => order.status === "pending").length;
        const preparingOrders = managerOrders.filter(order => order.status === "preparing").length;
        const readyOrders = managerOrders.filter(order => order.status === "ready").length;
        const completedOrders = managerOrders.filter(order => order.status === "completed").length;
        
        contextData += `ORDER STATUS BREAKDOWN:\n`;
        contextData += `Pending: ${pendingOrders}\n`;
        contextData += `Preparing: ${preparingOrders}\n`;
        contextData += `Ready: ${readyOrders}\n`;
        contextData += `Completed: ${completedOrders}\n\n`;
        
        // Inventory status
        const managerInventory = await storage.getInventoryItems();
        const lowInventoryCount = managerInventory.filter(item => {
          return typeof item.quantity === 'number' && 
                 typeof item.minQuantity === 'number' && 
                 item.quantity <= item.minQuantity;
        }).length;
        
        contextData += `INVENTORY STATUS:\n`;
        contextData += `Low Stock Items: ${lowInventoryCount}\n\n`;
        
        if (orderId) {
          const order = await storage.getOrder(orderId);
          if (order) {
            const orderItems = await storage.getOrderItems(orderId);
            // Connect menu items to order items to get item names
            const itemsWithNames = orderItems.map(item => {
              const menuItem = menuItems.find(m => m.id === item.menuItemId);
              return {
                ...item,
                itemName: menuItem ? menuItem.name : `Item #${item.menuItemId}`
              };
            });
            
            // Get bill if exists
            const orderBill = bills.find(bill => bill.orderId === order.id);
            
            contextData += `ORDER DETAILS:\n`;
            contextData += `Order #${order.orderNumber}\n`;
            contextData += `Date: ${order.createdAt ? new Date(order.createdAt).toLocaleString() : 'Unknown'}\n`;
            contextData += `Status: ${order.status}\n`;
            contextData += `Source: ${order.orderSource || 'Manual'}\n`;
            contextData += `Items: ${itemsWithNames.map(item => `${item.quantity}x ${item.itemName}`).join(', ')}\n`;
            contextData += `Total: ₹${order.totalAmount}\n`;
            
            if (orderBill) {
              contextData += `Bill #${orderBill.billNumber}\n`;
              contextData += `Subtotal: ₹${orderBill.subtotal}\n`;
              contextData += `Tax: ₹${orderBill.tax}\n`;
              contextData += `Total Billed: ₹${orderBill.total}\n`;
              contextData += `Payment Status: ${orderBill.paymentStatus}\n`;
              if (orderBill.paymentMethod) {
                contextData += `Payment Method: ${orderBill.paymentMethod}\n`;
              }
            }
            
            contextData += `\n`;
          }
        }
        break;

      case "delivery":
        // Get all delivery orders
        const allOrders = await storage.getOrders();
        const deliveryOrders = allOrders.filter(order => 
          !order.tableNumber && // No table number indicates delivery/takeaway
          (order.status === "ready" || order.status === "preparing")
        );
        
        contextData += `DELIVERY OPERATIONS:\n`;
        contextData += `Pending Deliveries: ${deliveryOrders.length}\n\n`;
        
        if (deliveryOrders.length > 0) {
          contextData += `ORDERS FOR DELIVERY:\n`;
          
          for (const order of deliveryOrders) {
            const orderItems = await storage.getOrderItems(order.id);
            // Connect menu items to order items to get item names
            const itemsWithNames = orderItems.map(item => {
              const menuItem = menuItems.find(m => m.id === item.menuItemId);
              return {
                ...item,
                itemName: menuItem ? menuItem.name : `Item #${item.menuItemId}`
              };
            });
            
            // Extract delivery address and contact from notes if available
            let deliveryInfo = "Not specified";
            let contactInfo = "Not specified";
            
            if (order.notes) {
              if (order.notes.includes("Address:")) {
                deliveryInfo = order.notes.split("Address:")[1].split("\n")[0].trim();
              }
              if (order.notes.includes("Contact:")) {
                contactInfo = order.notes.split("Contact:")[1].split("\n")[0].trim();
              }
            }
            
            contextData += `Order #${order.orderNumber} (${order.status}):\n`;
            contextData += `Items: ${itemsWithNames.map(item => `${item.quantity}x ${item.itemName}`).join(', ')}\n`;
            contextData += `Total: ₹${order.totalAmount}\n`;
            contextData += `Address: ${deliveryInfo}\n`;
            contextData += `Contact: ${contactInfo}\n`;
            contextData += `Order Time: ${order.createdAt ? new Date(order.createdAt).toLocaleTimeString() : 'Unknown'}\n\n`;
          }
        }
        
        if (orderId) {
          const order = await storage.getOrder(orderId);
          if (order) {
            const orderItems = await storage.getOrderItems(orderId);
            // Connect menu items to order items to get item names
            const itemsWithNames = orderItems.map(item => {
              const menuItem = menuItems.find(m => m.id === item.menuItemId);
              return {
                ...item,
                itemName: menuItem ? menuItem.name : `Item #${item.menuItemId}`
              };
            });
            
            // Extract delivery address and contact from notes if available
            let deliveryInfo = "Not specified";
            let contactInfo = "Not specified";
            
            if (order.notes) {
              if (order.notes.includes("Address:")) {
                deliveryInfo = order.notes.split("Address:")[1].split("\n")[0].trim();
              }
              if (order.notes.includes("Contact:")) {
                contactInfo = order.notes.split("Contact:")[1].split("\n")[0].trim();
              }
            }
            
            // Get kitchen token status if available
            const deliveryKitchenTokens = await storage.getKitchenTokens();
            const kitchenToken = deliveryKitchenTokens.find(token => token.orderId === order.id);
            
            contextData += `SPECIFIC DELIVERY ORDER:\n`;
            contextData += `Order #${order.orderNumber}\n`;
            contextData += `Status: ${order.status}\n`;
            contextData += `Kitchen Status: ${kitchenToken?.status || 'No kitchen token'}\n`;
            contextData += `Items: ${itemsWithNames.map(item => 
              `${item.quantity}x ${item.itemName}${item.notes ? ` (${item.notes})` : ''}`
            ).join('\n')}\n`;
            contextData += `Total: ₹${order.totalAmount}\n`;
            contextData += `Address: ${deliveryInfo}\n`;
            contextData += `Contact: ${contactInfo}\n\n`;
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