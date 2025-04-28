import { useState, useRef, useEffect } from "react";
import { Send, Bot, X, CornerDownLeft, User, RefreshCw, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

type ChatRole = "user" | "assistant" | "system";

interface ChatMessage {
  role: ChatRole;
  content: string;
  timestamp: Date;
}

interface MenuItem {
  id: number;
  name: string;
  price: number;
  category: string;
  description?: string;
}

interface OrderItem {
  menuItemId: number;
  name: string;
  quantity: number;
  price: number;
}

// Bot state represents the different stages of conversation
type BotState = 
  | "greeting" 
  | "collecting_order" 
  | "order_summary" 
  | "confirmation" 
  | "modification" 
  | "completion";

export default function RestaurantOrderChatbot() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [botState, setBotState] = useState<BotState>("greeting");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch menu items on component mount
  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        const response = await apiRequest("GET", "/api/menu-items");
        const data = await response.json();
        setMenuItems(data);
      } catch (error) {
        console.error("Failed to fetch menu items:", error);
      }
    };

    fetchMenuItems();
  }, []);

  // Initial greeting when chat is opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Add greeting message with slight delay to simulate bot typing
      setIsTyping(true);
      setTimeout(() => {
        setMessages([
          {
            role: "assistant",
            content: "Hi there! Welcome to YashHotel. I'm your virtual ordering assistant. What would you like to order today?",
            timestamp: new Date(),
          },
        ]);
        setIsTyping(false);
        setBotState("collecting_order");
      }, 1000);
    }
  }, [isOpen, messages.length]);

  // Auto scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const addMessage = (role: ChatRole, content: string) => {
    setMessages((prev) => [
      ...prev,
      { role, content, timestamp: new Date() },
    ]);
  };

  // Simulate bot typing for more natural conversation flow
  const botReply = (message: string, delay = 1000, nextState?: BotState) => {
    setIsTyping(true);
    setTimeout(() => {
      addMessage("assistant", message);
      setIsTyping(false);
      if (nextState) {
        setBotState(nextState);
      }
    }, delay);
  };

  // Process user's order input (extracts item name and quantity)
  const processOrderInput = (input: string) => {
    // Simple regex to extract quantity and item name
    // This can be enhanced with NLP for more complex inputs
    const quantityMatch = input.match(/(\d+)\s+(.+)/i);
    const exactItemMatch = menuItems.find(
      (item) => input.toLowerCase().includes(item.name.toLowerCase())
    );

    if (quantityMatch && exactItemMatch) {
      const quantity = parseInt(quantityMatch[1]);
      const itemName = exactItemMatch.name;
      
      // Add to order
      addItemToOrder(exactItemMatch.id, itemName, quantity, exactItemMatch.price);
      
      // Generate one of the alternative responses for variety
      const responses = [
        `Got it! ${itemName} x ${quantity} added to your order. What else would you like to add?`,
        `Added ${itemName} x ${quantity}. Anything else you'd like?`,
        `Great choice! ${itemName} x ${quantity} added. What else can I get for you?`,
        `${itemName} x ${quantity} - got it! Would you like to add anything else?`
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      botReply(randomResponse);
      
      return true;
    } else if (exactItemMatch) {
      // Item found but no quantity specified, assume quantity of 1
      addItemToOrder(exactItemMatch.id, exactItemMatch.name, 1, exactItemMatch.price);
      botReply(`Added 1 ${exactItemMatch.name} to your order. What else would you like to add?`);
      
      return true;
    }
    
    return false;
  };

  // Add item to the current order
  const addItemToOrder = (menuItemId: number, name: string, quantity: number, price: number) => {
    setOrderItems((prev) => {
      // Check if item already exists in order
      const existingItemIndex = prev.findIndex((item) => item.menuItemId === menuItemId);
      
      if (existingItemIndex >= 0) {
        // Update quantity if item exists
        const updatedItems = [...prev];
        updatedItems[existingItemIndex].quantity += quantity;
        return updatedItems;
      } else {
        // Add new item
        return [...prev, { menuItemId, name, quantity, price }];
      }
    });
  };

  // Calculate total price
  const calculateTotal = () => {
    return orderItems.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  // Generate order summary text
  const generateOrderSummary = () => {
    let summary = "Here's a summary of your order:\\n\\n";
    
    orderItems.forEach((item) => {
      const subtotal = item.price * item.quantity;
      summary += `${item.name}: ${item.quantity} x ₹${item.price.toFixed(2)} = ₹${subtotal.toFixed(2)}\\n`;
    });
    
    summary += `\\nYour order total comes to ₹${calculateTotal().toFixed(2)}.`;
    return summary;
  };

  // Handle user input
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim()) return;
    
    // Add user message
    addMessage("user", inputValue);
    const userInput = inputValue.trim();
    setInputValue("");

    // Process based on current state
    switch (botState) {
      case "collecting_order":
        if (userInput.toLowerCase().includes("that's it") || 
            userInput.toLowerCase().includes("that's all") || 
            userInput.toLowerCase().includes("no more") || 
            userInput.toLowerCase() === "no" ||
            userInput.toLowerCase() === "done") {
          
          if (orderItems.length === 0) {
            botReply("I don't see any items in your order yet. What would you like to order?");
          } else {
            botReply("No more items? Perfect! I'm just preparing your order summary...");
            
            // Add a delay to simulate processing
            setTimeout(() => {
              botReply(generateOrderSummary(), 800, "order_summary");
              setTimeout(() => {
                botReply("Does everything look correct? Would you like me to review your order again?", 1200, "confirmation");
              }, 2500);
            }, 2000);
          }
        } else {
          // Try to process as an order
          const orderProcessed = processOrderInput(userInput);
          
          if (!orderProcessed) {
            botReply("I'm not sure I understood that. Could you specify the item and quantity? For example: '2 Butter Chicken' or '1 Veg Biryani'");
          }
        }
        break;
        
      case "order_summary":
        // This state is just a transition, but we'll handle unexpected input
        botReply("I'm preparing your order summary, please wait a moment...");
        break;
        
      case "confirmation":
        if (userInput.toLowerCase().includes("yes") || 
            userInput.toLowerCase().includes("review") || 
            userInput.toLowerCase().includes("check")) {
          
          botReply(`Sure thing. Your order includes: ${orderItems.map(item => `${item.quantity} ${item.name}`).join(", ")}`, 1000, "modification");
        } else if (userInput.toLowerCase().includes("no") || 
                  userInput.toLowerCase().includes("correct") ||
                  userInput.toLowerCase().includes("looks good") ||
                  userInput.toLowerCase().includes("it's correct")) {
          
          botReply("Great! Let's continue with your order.", 1000, "modification");
          setTimeout(() => {
            botReply("Would you like to:\\n\\n• Add more items\\n• Remove or change an item\\n• Proceed with this order as is", 1500);
          }, 1200);
        } else {
          botReply("I'm not sure if you want me to review your order again. Please say 'yes' if you'd like me to review it, or 'no' if everything looks good.");
        }
        break;
        
      case "modification":
        if (userInput.toLowerCase().includes("add")) {
          botReply("Sure! What else would you like to add to your order?", 1000, "collecting_order");
        } else if (userInput.toLowerCase().includes("remove") || userInput.toLowerCase().includes("change")) {
          botReply("Which item would you like to remove or change?", 1000);
          // This would need more complex logic to handle item modifications
          // For now we'll just go back to collecting order
          setTimeout(() => {
            botReply("Let me restart your order for simplicity. What would you like to order?", 1500, "collecting_order");
            setOrderItems([]);
          }, 2000);
        } else if (userInput.toLowerCase().includes("proceed") || 
                  userInput.toLowerCase().includes("continue") ||
                  userInput.toLowerCase().includes("place order") ||
                  userInput.toLowerCase().includes("confirm")) {
          
          botReply("Excellent! Your order has been confirmed and will be ready for pickup in approximately 25 minutes. Thank you for ordering from YashHotel!", 1500, "completion");
          
          // Here you would integrate with your order API
          try {
            const orderData = {
              items: orderItems.map(item => ({
                menuItemId: item.menuItemId,
                quantity: item.quantity
              })),
              tableNumber: "Chatbot Order",
              customerName: "Chat Customer",
              orderSource: "chatbot"
            };
            
            // Submit the order
            apiRequest("POST", "/api/orders", orderData)
              .then(response => response.json())
              .then(data => {
                // Show success message with order number
                botReply(`Your order #${data.orderNumber} has been placed successfully!`);
                
                // Refresh orders in the UI if necessary
                queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
              })
              .catch(error => {
                console.error("Error submitting order:", error);
                botReply("There was an issue submitting your order. Please try again or contact restaurant staff directly.");
              });
          } catch (error) {
            console.error("Error preparing order submission:", error);
          }
        } else {
          botReply("I'm not sure what you'd like to do. Would you like to add more items, remove or change an item, or proceed with this order as is?");
        }
        break;
        
      case "completion":
        botReply("Your order has already been confirmed. Is there anything else I can help you with?");
        break;
        
      default:
        botReply("I'm not sure how to respond to that. How can I help you with your order?");
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const resetChat = () => {
    setMessages([]);
    setOrderItems([]);
    setBotState("greeting");
  };

  return (
    <>
      {/* Floating chat button */}
      <button
        onClick={toggleChat}
        className="fixed bottom-4 right-4 p-4 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-full shadow-lg z-50 text-white hover:shadow-xl transition-all duration-200"
        aria-label="Open chat"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <ShoppingCart className="h-6 w-6" />
        )}
      </button>

      {/* Chat window */}
      {isOpen && (
        <Card className="fixed bottom-20 right-4 w-80 md:w-96 shadow-lg z-50 border-indigo-800 dark:border-indigo-700">
          <CardHeader className="p-3 flex flex-row items-center justify-between border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center">
              <Avatar className="h-8 w-8 mr-2 bg-indigo-600 dark:bg-indigo-700">
                <AvatarImage src="/bot-avatar.png" alt="Bot Avatar" />
                <AvatarFallback>
                  <Bot className="h-4 w-4 text-white" />
                </AvatarFallback>
              </Avatar>
              <CardTitle className="text-sm font-medium">
                YashHotel Order Assistant
                <div>
                  <Badge variant="outline" className="text-xs font-normal bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                    Restaurant Ordering
                  </Badge>
                </div>
              </CardTitle>
            </div>
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="icon"
                className="h-7 w-7 rounded-full"
                onClick={resetChat}
                title="Reset conversation"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-7 w-7 rounded-full"
                onClick={toggleChat}
                title="Close chat"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[350px] overflow-y-auto p-3 space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex flex-col max-w-[80%] space-y-1",
                    message.role === "user"
                      ? "ml-auto items-end"
                      : "mr-auto items-start"
                  )}
                >
                  <div className="flex items-center space-x-2">
                    {message.role !== "user" && (
                      <Avatar className="h-6 w-6 bg-indigo-600 dark:bg-indigo-700">
                        <AvatarFallback>
                          <Bot className="h-3 w-3 text-white" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={cn(
                        "px-3 py-2 rounded-lg",
                        message.role === "user"
                          ? "bg-indigo-600 dark:bg-indigo-700 text-white"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      )}
                    >
                      <div className="text-sm whitespace-pre-line">
                        {message.content}
                      </div>
                    </div>
                    {message.role === "user" && (
                      <Avatar className="h-6 w-6 bg-gray-400 dark:bg-gray-700">
                        <AvatarFallback>
                          <User className="h-3 w-3 text-white" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 px-2">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
              {isTyping && (
                <div className="flex max-w-[80%] space-y-1 mr-auto items-start">
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-6 w-6 bg-indigo-600 dark:bg-indigo-700">
                      <AvatarFallback>
                        <Bot className="h-3 w-3 text-white" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                      <div className="flex space-x-1">
                        <div className="w-1.5 h-1.5 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                        <div className="w-1.5 h-1.5 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                        <div className="w-1.5 h-1.5 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </CardContent>
          <CardFooter className="p-2 border-t border-gray-200 dark:border-gray-800">
            <form onSubmit={handleSendMessage} className="flex w-full space-x-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your message..."
                className="flex-1"
                disabled={botState === "completion" || isTyping}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!inputValue.trim() || botState === "completion" || isTyping}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Send className="h-4 w-4" />
                <span className="sr-only">Send</span>
              </Button>
            </form>
          </CardFooter>
        </Card>
      )}
    </>
  );
}