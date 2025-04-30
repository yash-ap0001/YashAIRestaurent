import React from 'react';
import { 
  TrendingUp, BarChart3, Clock, LineChart, 
  PieChart, ArrowUpRight, Lightbulb, Utensils, 
  DollarSign, ChefHat, AlertCircle, Cpu
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import GenericAIAssistant from '../ai/GenericAIAssistant.fixed';

/**
 * RestaurantAdminAI - Restaurant management AI assistant for administrators
 * 
 * This component provides powerful business intelligence and analytics capabilities,
 * specialized for restaurant administrators and owners.
 */
export function RestaurantAdminAI() {
  // Commands for business insights
  const adminCommandPatterns = [
    {
      pattern: /show (me )?(business |)(health|status)/i,
      action: (matches: RegExpMatchArray, speak: (text: string) => void) => {
        window.location.href = '/admin/business-health';
        speak("Navigating to business health analytics");
      }
    },
    {
      pattern: /show (me )?(sales|revenue|profit)( report| data| analytics)?/i,
      action: (matches: RegExpMatchArray, speak: (text: string) => void) => {
        window.location.href = '/admin/revenue';
        speak("Opening sales and revenue analytics");
      }
    },
    {
      pattern: /show (me )?(customer|guest) (analysis|data|insights|feedback|satisfaction)/i,
      action: (matches: RegExpMatchArray, speak: (text: string) => void) => {
        window.location.href = '/admin/customer-analytics';
        speak("Navigating to customer analysis dashboard");
      }
    },
    {
      pattern: /show (me )?(performance|operational|operations|operation) (insights|data|metrics|analytics)/i,
      action: (matches: RegExpMatchArray, speak: (text: string) => void) => {
        window.location.href = '/admin/operational';
        speak("Opening operational performance metrics");
      }
    },
    {
      pattern: /show (me )?opportunities( for growth| for improvement)?/i,
      action: (matches: RegExpMatchArray, speak: (text: string) => void) => {
        window.location.href = '/admin/opportunities';
        speak("Identifying growth opportunities");
      }
    },
    {
      pattern: /generate (a |an |)(business |)report/i,
      action: (matches: RegExpMatchArray, speak: (text: string) => void) => {
        window.location.href = '/admin/reports/generate';
        speak("Opening report generation tool");
      }
    },
    {
      pattern: /analyze (the |)(competition|competitors|market)/i,
      action: (matches: RegExpMatchArray, speak: (text: string) => void) => {
        window.location.href = '/admin/market-analysis';
        speak("Navigating to competitive analysis");
      }
    }
  ];
  
  // Define custom quick-action commands for business intelligence
  const adminCommands = [
    {
      name: "business-health",
      endpoint: "/api/admin/ai/business-health",
      buttonText: "Business Health",
      icon: <BarChart3 className="h-4 w-4" />,
      processFn: (data: any) => {
        return data.insights || "I'm analyzing your business health. The key metrics show that your restaurant is performing well, with some areas for potential improvement.";
      }
    },
    {
      name: "growth-opportunities",
      endpoint: "/api/admin/ai/growth-opportunities",
      buttonText: "Growth Opportunities",
      icon: <TrendingUp className="h-4 w-4" />,
      processFn: (data: any) => {
        return data.opportunities || "Based on recent trends, I recommend focusing on expanding your online presence and delivery options. These areas show significant growth potential with relatively low implementation costs.";
      }
    },
    {
      name: "competitive-analysis",
      endpoint: "/api/admin/ai/competitive-analysis",
      buttonText: "Competitive Analysis",
      icon: <Lightbulb className="h-4 w-4" />,
      processFn: (data: any) => {
        return data.analysis || "Compared to similar restaurants in your area, your pricing is competitive and your unique menu offerings provide a distinct advantage. Consider enhancing your loyalty program to further differentiate from competitors.";
      }
    },
    {
      name: "ai-insights",
      endpoint: "/api/admin/ai/insights",
      buttonText: "AI Insights",
      icon: <Cpu className="h-4 w-4" />,
      processFn: (data: any) => {
        return data.insights || "My analysis suggests that your most profitable items are not prominently featured on your menu. Consider menu redesign to highlight these items. Additionally, wait times during peak hours could be reduced by adjusting staff scheduling.";
      }
    }
  ];
  
  // Define additional data queries to provide context to the AI
  const adminDataQueries = [
    { name: 'dashboard', endpoint: '/api/admin/dashboard-data', enabled: true },
    { name: 'orders', endpoint: '/api/orders', enabled: true },
    { name: 'sales', endpoint: '/api/bills', enabled: true },
    { name: 'menuItems', endpoint: '/api/menu-items', enabled: true }
  ];
  
  // This function defines how to process chat responses specifically for admin needs
  const processChatResponse = (data: any): string => {
    if (data.insights) {
      return `AI Business Insight: ${data.insights}`;
    }
    return data.response || "I'm analyzing the restaurant business performance. How can I help you with specific insights?";
  };
  
  return (
    <GenericAIAssistant
      title="Restaurant Admin AI"
      description="Your business intelligence assistant for restaurant management. Ask about business health, sales trends, growth opportunities, competitive analysis, and more."
      icon={<ChefHat className="h-5 w-5" />}
      buttonText="Admin AI"
      buttonVariant="outline"
      maxWidth="xl"
      
      // API endpoints
      dataQueryEndpoint="/api/admin/dashboard-data"
      chatEndpoint="/api/admin/ai/insights"
      
      // Storage configuration
      storageKey="restaurant-admin-ai-history"
      maxStoredMessages={30}
      
      // Voice settings
      voiceEnabled={true}
      autoListen={false}
      continueConversation={true}
      welcomeMessage="Welcome to Restaurant Admin AI. I can provide business insights, analyze trends, identify growth opportunities, and help with strategic decisions. How can I assist you today?"
      
      // Additional data and command patterns
      extraDataQueries={adminDataQueries}
      commandPatterns={adminCommandPatterns}
      customCommands={adminCommands}
      
      // Data processors
      processChatResponse={processChatResponse}
    />
  );
}

export default RestaurantAdminAI;