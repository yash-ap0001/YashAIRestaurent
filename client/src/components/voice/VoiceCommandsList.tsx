import React from "react";
import { Mic, MicOff, Brain, BarChart3, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Define the voice command categories and commands
const voiceCommandCategories = [
  {
    id: "orders",
    name: "Order Management",
    description: "Commands for creating and managing orders",
    commands: [
      { command: "Create a new order for table 5 with 2 veg biryani and 3 butter naan", description: "Creates a new order with specific items" },
      { command: "Add 2 chicken curry to order number 1004", description: "Adds items to an existing order" },
      { command: "Change status of order 1003 to preparing", description: "Updates the status of an order" },
      { command: "What's the status of order 1002?", description: "Checks status of a specific order" },
      { command: "Show all pending orders", description: "Displays all orders with pending status" },
    ]
  },
  {
    id: "kitchen",
    name: "Kitchen Management",
    description: "Commands for kitchen operations and token management",
    commands: [
      { command: "Create kitchen token for order 1005", description: "Creates a new kitchen token for an order" },
      { command: "Mark token T03 as ready", description: "Updates the status of a kitchen token" },
      { command: "How many orders are in the kitchen?", description: "Gets a count of active kitchen orders" },
      { command: "What's the oldest pending order?", description: "Identifies orders that may be delayed" },
      { command: "Show kitchen workload", description: "Displays current kitchen capacity and workload" },
    ]
  },
  {
    id: "billing",
    name: "Billing Operations",
    description: "Commands for creating and managing bills",
    commands: [
      { command: "Generate bill for order 1006", description: "Creates a new bill for an order" },
      { command: "Apply 10% discount to bill 1002", description: "Adds a discount to an existing bill" },
      { command: "Mark bill 1003 as paid", description: "Updates the payment status of a bill" },
      { command: "What's today's total revenue?", description: "Calculates the total revenue for the day" },
      { command: "Show average bill amount this week", description: "Provides analytics on billing" },
    ]
  },
  {
    id: "business",
    name: "Business Intelligence",
    description: "Commands for analytics and business insights",
    commands: [
      { command: "Show me sales trends for this month", description: "Displays sales analytics over time" },
      { command: "What are our top selling items?", description: "Identifies most popular menu items" },
      { command: "Compare revenue with last month", description: "Provides month-over-month comparison" },
      { command: "What's our busiest time of day?", description: "Analyzes peak business hours" },
      { command: "Predict tomorrow's sales", description: "Uses AI to forecast expected revenue" },
    ]
  },
  {
    id: "inventory",
    name: "Inventory & Menu",
    description: "Commands for managing inventory and menu items",
    commands: [
      { command: "Check stock level for rice", description: "Verifies inventory quantity for an item" },
      { command: "Add new menu item butter chicken for 350 rupees", description: "Creates a new menu item" },
      { command: "Which items are running low?", description: "Identifies inventory items that need replenishing" },
      { command: "Update price of Veg Biryani to 280 rupees", description: "Changes the price of a menu item" },
      { command: "What are our highest margin items?", description: "Identifies most profitable menu items" },
    ]
  },
  {
    id: "navigation",
    name: "System Navigation",
    description: "Commands for navigating the application",
    commands: [
      { command: "Go to dashboard", description: "Navigates to the dashboard page" },
      { command: "Open kitchen tokens page", description: "Navigates to the kitchen tokens page" },
      { command: "Show me the billing screen", description: "Navigates to the billing page" },
      { command: "Open live order tracking", description: "Navigates to the live tracking page" },
      { command: "Take me to reports", description: "Navigates to the reports page" },
    ]
  },
  {
    id: "assistant",
    name: "AI Assistant",
    description: "Commands for interacting with the AI assistant",
    commands: [
      { command: "Summarize today's performance", description: "Gets an AI-generated business summary" },
      { command: "Tell me about customer feedback today", description: "Analyzes customer sentiment" },
      { command: "What health recommendations do we have for diabetic customers?", description: "Provides health-based menu suggestions" },
      { command: "Suggest marketing ideas for slow days", description: "Gets AI-generated marketing suggestions" },
      { command: "How can we improve efficiency in the kitchen?", description: "Gets operational improvement suggestions" },
    ]
  },
];

interface VoiceCommandsListProps {
  isListening: boolean;
  toggleListening: () => void;
}

export const VoiceCommandsList: React.FC<VoiceCommandsListProps> = ({ 
  isListening,
  toggleListening
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="h-6 w-6 text-purple-500" />
            <h2 className="text-2xl font-bold">Voice Assistant Commands</h2>
          </div>
          <Button
            variant={isListening ? "default" : "outline"}
            className={cn(
              "rounded-full transition-all duration-300",
              isListening ? "bg-purple-600 hover:bg-purple-700 text-white" : ""
            )}
            onClick={toggleListening}
          >
            {isListening ? (
              <>
                <MicOff className="h-4 w-4 mr-2" />
                Stop Listening
              </>
            ) : (
              <>
                <Mic className="h-4 w-4 mr-2" />
                Start Listening
              </>
            )}
          </Button>
        </div>
        
        <p className="text-muted-foreground">
          Your AI assistant can understand natural language commands and help you manage your restaurant business.
          Here are some examples of what you can say. Click on a category to see more commands.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="col-span-1 md:col-span-2 bg-gradient-to-br from-purple-900/90 to-black border-purple-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-purple-300" />
              Business Intelligence Mode
            </CardTitle>
            <CardDescription className="text-purple-200">
              Your assistant can analyze business data and provide valuable insights
            </CardDescription>
          </CardHeader>
          <CardContent className="text-white">
            <p className="mb-4">Try these powerful business intelligence commands:</p>
            <ul className="space-y-2">
              <li className="flex items-start">
                <Badge variant="outline" className="mr-2 bg-purple-800/50 text-purple-100 border-purple-700 mt-0.5">Ask</Badge>
                <span>"What are our sales trends for the last 7 days?"</span>
              </li>
              <li className="flex items-start">
                <Badge variant="outline" className="mr-2 bg-purple-800/50 text-purple-100 border-purple-700 mt-0.5">Ask</Badge>
                <span>"What menu items have the highest profit margins?"</span>
              </li>
              <li className="flex items-start">
                <Badge variant="outline" className="mr-2 bg-purple-800/50 text-purple-100 border-purple-700 mt-0.5">Ask</Badge>
                <span>"Compare our performance with last month"</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {voiceCommandCategories.map((category) => (
          <Card key={category.id} className="border-gray-800 bg-black/60">
            <CardHeader>
              <CardTitle>{category.name}</CardTitle>
              <CardDescription>{category.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="commands" className="border-gray-800">
                  <AccordionTrigger className="text-sm font-medium py-2">
                    Show available commands
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-2">
                      {category.commands.map((cmd, idx) => (
                        <li key={idx} className="text-sm border-l-2 border-purple-600 pl-3 py-1">
                          <p className="font-medium text-white">{cmd.command}</p>
                          <p className="text-xs text-gray-400">{cmd.description}</p>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Card className="border-gray-800 bg-black/60">
        <CardHeader>
          <CardTitle>Voice Command Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            <li className="flex items-start">
              <span className="font-medium text-purple-400 mr-2">•</span>
              <span>Speak clearly and at a normal pace for best recognition</span>
            </li>
            <li className="flex items-start">
              <span className="font-medium text-purple-400 mr-2">•</span>
              <span>Commands work from anywhere in the application when the microphone is active</span>
            </li>
            <li className="flex items-start">
              <span className="font-medium text-purple-400 mr-2">•</span>
              <span>You can use natural language - the assistant understands context</span>
            </li>
            <li className="flex items-start">
              <span className="font-medium text-purple-400 mr-2">•</span>
              <span>For order quantities, clearly say numbers like "two" or "three"</span>
            </li>
            <li className="flex items-start">
              <span className="font-medium text-purple-400 mr-2">•</span>
              <span>The assistant will confirm your command visually and with voice feedback</span>
            </li>
          </ul>
        </CardContent>
        <CardFooter className="border-t border-gray-800 pt-4">
          <p className="text-xs text-gray-400">
            Voice command recognition uses AI technology to understand your speech in various accents and languages.
            The accuracy improves the more you use it.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default VoiceCommandsList;