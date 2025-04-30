import React from 'react';
import { Bot, Cpu, BarChart2 } from 'lucide-react';
import GenericAIAssistant from './GenericAIAssistant';

/**
 * RestaurantAI - Restaurant management AI assistant
 * 
 * This component is a specialized AI assistant for restaurant management
 * that provides insights, recommendations, and can handle operations tasks.
 * It uses the GenericAIAssistant component with specific configuration for restaurant operations.
 */
export function RestaurantAI() {
  // Define command patterns with regex patterns and their actions
  const commandPatterns = [
    {
      pattern: /show (me )?sales( report)?/i,
      action: (matches: RegExpMatchArray, speak: (text: string) => void) => {
        window.location.href = '/reports/sales';
        speak("Navigating to sales reports now");
      }
    },
    {
      pattern: /show (me )?kitchen( status)?/i,
      action: (matches: RegExpMatchArray, speak: (text: string) => void) => {
        window.location.href = '/kitchen';
        speak("Opening kitchen management view");
      }
    },
    {
      pattern: /show (me )?orders/i,
      action: (matches: RegExpMatchArray, speak: (text: string) => void) => {
        window.location.href = '/orders';
        speak("Navigating to orders management");
      }
    },
    {
      pattern: /create (a )?new order/i,
      action: (matches: RegExpMatchArray, speak: (text: string) => void) => {
        window.location.href = '/orders/new';
        speak("Opening the order creation form");
      }
    },
    {
      pattern: /open dashboard/i,
      action: (matches: RegExpMatchArray, speak: (text: string) => void) => {
        window.location.href = '/';
        speak("Opening the main dashboard");
      }
    }
  ];
  
  // Define custom quick-action commands
  const customCommands = [
    {
      name: "summarize-stats",
      endpoint: "/api/ai/insights",
      buttonText: "Summarize Stats",
      icon: <BarChart2 className="h-4 w-4" />,
      processFn: (data: any) => {
        return data.summary || "Sorry, I couldn't generate a summary at this time.";
      }
    },
    {
      name: "ai-suggestions",
      endpoint: "/api/ai/menu-recommendations",
      buttonText: "Menu Suggestions",
      icon: <Cpu className="h-4 w-4" />,
      processFn: (data: any) => {
        return data.recommendations || "No recommendations available right now.";
      }
    }
  ];
  
  // Define additional data queries to provide context to the AI
  const extraDataQueries = [
    { name: 'orders', endpoint: '/api/orders', enabled: true },
    { name: 'kitchenTokens', endpoint: '/api/kitchen-tokens', enabled: true }
  ];
  
  // This function defines how to process chat responses
  const processChatResponse = (data: any): string => {
    // Process and format the chat response
    return data.response || "I'm sorry, I couldn't process that request.";
  };
  
  // Process the query response data
  const processQueryResponse = (data: any): any => {
    // Return the data as is or apply some transformation if needed
    return data;
  };
  
  return (
    <GenericAIAssistant
      title="Restaurant AI Assistant"
      description="Your intelligent restaurant management assistant. Ask me about operations, statistics, or for help with tasks."
      icon={<Bot className="h-5 w-5" />}
      buttonText="Hotel Agent"
      buttonVariant="outline"
      maxWidth="xl"
      
      // API endpoints
      dataQueryEndpoint="/api/dashboard/stats"
      chatEndpoint="/api/ai/chatbot"
      
      // Storage configuration
      storageKey="restaurant-ai-history"
      maxStoredMessages={30}
      
      // Voice settings
      voiceEnabled={true}
      autoListen={true}
      continueConversation={true}
      welcomeMessage="Hello, I'm your Restaurant AI Assistant. How can I help you today? You can ask me about operations, sales, or kitchen status."
      
      // Additional data and command patterns
      extraDataQueries={extraDataQueries}
      commandPatterns={commandPatterns}
      customCommands={customCommands}
      
      // Data processors
      processChatResponse={processChatResponse}
      processQueryResponse={processQueryResponse}
    />
  );
}

export default RestaurantAI;