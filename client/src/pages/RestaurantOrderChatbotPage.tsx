import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ShoppingCart, 
  MessageCircle, 
  Settings, 
  Users,
  ArrowRight,
  Check,
  X,
  Bot
} from "lucide-react";
import RestaurantOrderChatbot from "@/components/chatbot/RestaurantOrderChatbot";

interface MenuItem {
  id: number;
  name: string;
  price: number;
  category: string;
  description?: string;
}

export default function RestaurantOrderChatbotPage() {
  const [activeTab, setActiveTab] = useState("overview");

  // Query to fetch menu items
  const { 
    data: menuItems, 
    isLoading: menuItemsLoading 
  } = useQuery<MenuItem[]>({
    queryKey: ['/api/menu-items'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/menu-items');
      return await response.json();
    }
  });

  const mockConversation = [
    { role: 'assistant', text: "Hi there! Welcome to Tasty Bites. I'm your virtual ordering assistant. What would you like to order today?" },
    { role: 'user', text: "I'd like 2 cheeseburgers." },
    { role: 'assistant', text: "Got it! 2 Cheeseburgers added to your order. What else would you like to add?" },
    { role: 'user', text: "One large fries." },
    { role: 'assistant', text: "Great choice! Large Fries x 1 added. What else can I get for you?" },
    { role: 'user', text: "And 2 Cokes please." },
    { role: 'assistant', text: "Cokes x 2 - got it! Would you like to add anything else?" },
    { role: 'user', text: "No, that's it." },
    { role: 'assistant', text: "Perfect! I'm just preparing your order summary..." },
    { role: 'assistant', text: "Here's a summary of your order:\n\nCheeseburger: 2 x $5.00 = $10.00\nLarge Fries: 1 x $3.50 = $3.50\nCoke: 2 x $2.00 = $4.00\n\nYour order total comes to $17.50." },
    { role: 'assistant', text: "Does everything look correct? Would you like me to review your order again?" },
    { role: 'user', text: "No, it's correct." },
    { role: 'assistant', text: "Great! Would you like to:\n\nAdd more items\nRemove or change an item\nProceed with this order as is" },
    { role: 'user', text: "Proceed with the order." },
    { role: 'assistant', text: "Excellent! Your order has been confirmed and will be ready for pickup in approximately 25 minutes. Thank you for ordering from Tasty Bites!" }
  ];

  const featuresData = [
    {
      title: "Natural Language Ordering",
      description: "Customers can order in natural, conversational language just like talking to a human waiter",
      icon: <MessageCircle className="w-5 h-5 text-indigo-500" />
    },
    {
      title: "Order Customization",
      description: "Support for item modifications, quantity changes, and special requests",
      icon: <Settings className="w-5 h-5 text-indigo-500" />
    },
    {
      title: "Multi-Platform Integration",
      description: "Works seamlessly across WhatsApp, website, and mobile applications",
      icon: <Users className="w-5 h-5 text-indigo-500" />
    },
    {
      title: "Contextual Awareness",
      description: "Remembers preferences and can handle complex, multi-item orders with ease",
      icon: <ShoppingCart className="w-5 h-5 text-indigo-500" />
    }
  ];

  const chatbotFlowSteps = [
    {
      step: "Initial Greeting",
      description: "Bot greets the customer and asks for their order",
      examples: ["Hi there! Welcome to YashHotel. I'm your virtual ordering assistant. What would you like to order today?"]
    },
    {
      step: "Order Collection",
      description: "Bot collects menu items and quantities one by one",
      examples: [
        "Got it! Butter Chicken x 2 added to your order. What else would you like to add?",
        "Added Naan x 3. Anything else you'd like?",
        "Great choice! Veg Biryani x 1 added. What else can I get for you?"
      ]
    },
    {
      step: "Order Summary",
      description: "Bot presents a detailed summary with prices",
      examples: ["Here's a summary of your order:\n\nButter Chicken: 2 x ₹350 = ₹700\nNaan: 3 x ₹40 = ₹120\nVeg Biryani: 1 x ₹250 = ₹250\n\nYour order total comes to ₹1070."]
    },
    {
      step: "Confirmation",
      description: "Bot confirms the order details are correct",
      examples: ["Does everything look correct? Would you like me to review your order again?"]
    },
    {
      step: "Modification Options",
      description: "Bot offers options to adjust the order if needed",
      examples: ["Would you like to:\n\n• Add more items\n• Remove or change an item\n• Proceed with this order as is"]
    },
    {
      step: "Completion",
      description: "Bot confirms the order and provides next steps",
      examples: ["Excellent! Your order has been confirmed and will be ready for pickup in approximately 25 minutes. Thank you for ordering from YashHotel!"]
    }
  ];

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Restaurant Order Chatbot</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            AI-powered ordering experience for seamless customer interactions
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="demo">Live Demo</TabsTrigger>
          <TabsTrigger value="flow">Conversation Flow</TabsTrigger>
          <TabsTrigger value="menu">Available Menu</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>About the Restaurant Ordering Chatbot</CardTitle>
                <CardDescription>
                  An AI-powered conversation experience that guides customers through the ordering process
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  The Restaurant Ordering Chatbot provides a conversational interface for customers to place
                  orders with natural language, simulating the experience of talking to a restaurant staff member.
                  It guides customers through their order step by step, providing a personalized and efficient ordering experience.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {featuresData.map((feature, index) => (
                    <div key={index} className="p-4 border rounded-lg dark:border-gray-800">
                      <div className="flex items-center space-x-2 mb-2">
                        {feature.icon}
                        <h3 className="font-medium">{feature.title}</h3>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{feature.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Example Conversation</CardTitle>
                <CardDescription>
                  See how a typical ordering interaction flows
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg dark:border-gray-800 overflow-hidden">
                  <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border-b dark:border-gray-800 flex items-center space-x-2">
                    <Bot className="h-4 w-4 text-indigo-500" />
                    <span className="text-sm font-medium">Restaurant Ordering Assistant</span>
                  </div>
                  <div className="p-4 max-h-[400px] overflow-y-auto space-y-3">
                    {mockConversation.map((message, index) => (
                      <div key={index} className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                        <div 
                          className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                            message.role === 'assistant' 
                              ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100' 
                              : 'bg-indigo-600 dark:bg-indigo-700 text-white'
                          }`}
                        >
                          <p className="whitespace-pre-line">{message.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Key Benefits</CardTitle>
              <CardDescription>
                Why implement a restaurant ordering chatbot for your business
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg dark:border-gray-800">
                  <div className="flex items-center space-x-2 mb-2 text-green-600 dark:text-green-500">
                    <Check className="h-5 w-5" />
                    <h3 className="font-medium">Improved Customer Experience</h3>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Customers enjoy a personalized, conversational ordering experience that feels natural and intuitive.
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg dark:border-gray-800">
                  <div className="flex items-center space-x-2 mb-2 text-green-600 dark:text-green-500">
                    <Check className="h-5 w-5" />
                    <h3 className="font-medium">Increased Operational Efficiency</h3>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Reduce staff workload by automating order taking, allowing your team to focus on food preparation and delivery.
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg dark:border-gray-800">
                  <div className="flex items-center space-x-2 mb-2 text-green-600 dark:text-green-500">
                    <Check className="h-5 w-5" />
                    <h3 className="font-medium">24/7 Availability</h3>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Accept orders at any time, even outside regular business hours, enhancing customer convenience.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Live Demo Tab */}
        <TabsContent value="demo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Interactive Demo</CardTitle>
              <CardDescription>
                Try the restaurant ordering chatbot yourself by clicking the floating chat button
              </CardDescription>
            </CardHeader>
            <CardContent className="py-10 text-center">
              <div className="inline-flex items-center justify-center p-4 bg-indigo-100 dark:bg-indigo-900/20 rounded-full">
                <ShoppingCart className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="mt-4 text-xl font-semibold">Click the chat button in the bottom right</h2>
              <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                Interact with our AI-powered ordering assistant to place a test order.
                Try ordering various menu items and see how the bot responds.
              </p>
              <div className="mt-6 flex items-center justify-center">
                <ArrowRight className="h-5 w-5 text-indigo-500 animate-pulse" />
                <span className="ml-2 text-indigo-600 dark:text-indigo-400">See the floating button in the corner</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Conversation Flow Tab */}
        <TabsContent value="flow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Chatbot Conversation Flow</CardTitle>
              <CardDescription>
                The step-by-step process of the AI-powered ordering experience
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="relative border-l border-gray-200 dark:border-gray-800 ml-3 space-y-6">
                {chatbotFlowSteps.map((flowStep, index) => (
                  <li key={index} className="ml-6">
                    <span className="absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 text-xs">
                      {index + 1}
                    </span>
                    <div className="p-4 border rounded-lg dark:border-gray-800">
                      <h3 className="font-medium text-indigo-600 dark:text-indigo-400">{flowStep.step}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{flowStep.description}</p>
                      <div className="mt-2 space-y-2">
                        {flowStep.examples.map((example, idx) => (
                          <div key={idx} className="p-2 bg-gray-50 dark:bg-gray-800/50 rounded text-sm whitespace-pre-line">
                            {example}
                          </div>
                        ))}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Menu Tab */}
        <TabsContent value="menu" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Available Menu Items</CardTitle>
              <CardDescription>
                Menu items that can be ordered through the chatbot
              </CardDescription>
            </CardHeader>
            <CardContent>
              {menuItemsLoading ? (
                <p>Loading menu items...</p>
              ) : menuItems && menuItems.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {menuItems.map((item) => (
                    <div key={item.id} className="p-4 border rounded-lg dark:border-gray-800">
                      <h3 className="font-medium text-indigo-600 dark:text-indigo-400">{item.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{item.category}</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="font-semibold">₹{item.price.toFixed(2)}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">ID: {item.id}</span>
                      </div>
                      {item.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 italic">
                          {item.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <X className="mx-auto h-10 w-10 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No menu items found</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    No menu items are available in the system.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* The actual chatbot component */}
      <RestaurantOrderChatbot />
    </div>
  );
}