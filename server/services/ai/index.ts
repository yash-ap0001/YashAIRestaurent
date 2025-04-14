import { centralAIController } from './centralController';
import { decisionEngine } from './decisionEngine';
import { notificationSystem } from './notificationSystem';
import { getChannelAdapter } from './channelAdapters';
import { Order } from '@shared/schema';
import { storage } from '../../storage';

/**
 * AI Service
 * 
 * Main entry point for AI-related functionality that coordinates between the various AI subsystems.
 */
export class AIService {
  private static instance: AIService;
  
  // Private constructor to enforce singleton pattern
  private constructor() {
    console.log('AI Service initialized');
    
    // Initialize all subsystems (singleton instances will be created if not already)
    console.log('Initializing AI subsystems...');
    const controller = centralAIController;
    const engine = decisionEngine;
    const notifier = notificationSystem;
    console.log('All AI subsystems initialized');
  }
  
  /**
   * Get singleton instance of the service
   */
  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }
  
  /**
   * Enable/disable AI automation globally
   */
  public setAutomationEnabled(enabled: boolean): void {
    centralAIController.setAutomationEnabled(enabled);
  }
  
  /**
   * Check if AI automation is enabled
   */
  public isAutomationEnabled(): boolean {
    return centralAIController.isAutomationEnabled();
  }
  
  /**
   * Process a new order from any channel
   */
  public async processOrder(
    channelType: 'phone' | 'whatsapp' | 'zomato' | 'swiggy' | 'manual' | 'ai',
    orderData: any
  ): Promise<Order> {
    console.log(`AI Service: Processing order from ${channelType} channel`);
    
    // Get the appropriate channel adapter
    const adapter = getChannelAdapter(channelType);
    
    // Process the order through the adapter
    const order = await adapter.processIncomingOrder(orderData);
    
    // Setup automatic notifications if this is a customer-facing order
    if (channelType !== 'manual') {
      notificationSystem.setupOrderNotifications(order);
    }
    
    return order;
  }
  
  /**
   * Process natural language order input
   */
  public async processNaturalLanguageOrder(text: string, source: string = 'ai'): Promise<any> {
    console.log(`AI Service: Processing natural language order: "${text}"`);
    
    try {
      // In a real implementation, this would use OpenAI/Anthropic to parse the text
      // For now, we'll do a very simple keyword-based extraction
      
      // Get all menu items
      const menuItems = await storage.getMenuItems();
      
      // Extract menu items from text (simple keyword matching)
      const matchedItems: any[] = [];
      
      for (const item of menuItems) {
        const itemNameLower = item.name.toLowerCase();
        if (text.toLowerCase().includes(itemNameLower)) {
          // Attempt to extract quantity
          const regex = new RegExp(`(\\d+)\\s+${itemNameLower}`, 'i');
          const match = text.match(regex);
          const quantity = match ? parseInt(match[1]) : 1;
          
          matchedItems.push({
            menuItemId: item.id,
            name: item.name,
            quantity,
            price: item.price,
            notes: ''
          });
        }
      }
      
      // Extract table number if present
      let tableNumber = null;
      const tableMatch = text.match(/table\s+(\d+)/i);
      if (tableMatch) {
        tableNumber = tableMatch[1];
      }
      
      // Create order data
      const orderData = {
        tableNumber,
        items: matchedItems,
        orderSource: source,
        useAIAutomation: true,
        notes: `AI-processed from: "${text}"`
      };
      
      // Process the order
      if (matchedItems.length > 0) {
        const order = await this.processOrder(source as any, orderData);
        return {
          success: true,
          order,
          items: matchedItems,
          message: `Order created with ${matchedItems.length} items`
        };
      } else {
        return {
          success: false,
          message: "Could not identify any menu items in the text"
        };
      }
    } catch (error) {
      console.error(`Error processing natural language order:`, error);
      return {
        success: false,
        message: "Error processing order",
        error: error.message
      };
    }
  }
  
  /**
   * Get personalized menu recommendations for a customer
   */
  public async getPersonalizedRecommendations(customerPhone?: string): Promise<any[]> {
    return decisionEngine.getPersonalizedRecommendations(customerPhone || null);
  }
  
  /**
   * Get health recommendations based on order history and preferences
   */
  public async getHealthRecommendations(
    customerPhone?: string,
    dietaryPreferences?: string[]
  ): Promise<any> {
    console.log(`AI Service: Generating health recommendations for ${customerPhone || 'unknown customer'}`);
    
    try {
      // Get all menu items
      const menuItems = await storage.getMenuItems();
      
      // Filter for healthy options
      const healthyOptions = menuItems.filter(item => {
        const description = (item.description || '').toLowerCase();
        return description.includes('healthy') || 
               description.includes('low fat') || 
               description.includes('protein') || 
               description.includes('nutritious');
      });
      
      // Filter for dietary preferences if provided
      let filteredOptions = healthyOptions;
      if (dietaryPreferences && dietaryPreferences.length > 0) {
        filteredOptions = healthyOptions.filter(item => {
          const description = (item.description || '').toLowerCase();
          return dietaryPreferences.some(pref => description.includes(pref.toLowerCase()));
        });
      }
      
      // If no healthy options found, return generic recommendations
      if (filteredOptions.length === 0) {
        return {
          recommendations: [
            {
              title: "Balanced Nutrition",
              description: "Choose meals with a balance of protein, carbohydrates, and vegetables."
            },
            {
              title: "Portion Control",
              description: "Consider ordering smaller portions or sharing larger dishes."
            },
            {
              title: "Hydration",
              description: "Remember to drink water with your meal instead of sugary beverages."
            }
          ],
          recommendedItems: healthyOptions.slice(0, 3)
        };
      }
      
      // Return personalized recommendations
      return {
        recommendations: [
          {
            title: "Personalized Options",
            description: "We've selected these healthy options based on your preferences."
          },
          {
            title: "Dietary Balance",
            description: "These choices provide a good balance of nutrients while respecting your dietary preferences."
          }
        ],
        recommendedItems: filteredOptions.slice(0, 5)
      };
    } catch (error) {
      console.error(`Error generating health recommendations:`, error);
      return {
        recommendations: [
          {
            title: "General Health Tips",
            description: "Balance your meal with protein, vegetables, and whole grains."
          }
        ],
        recommendedItems: []
      };
    }
  }
}

// Export singleton instance
export const aiService = AIService.getInstance();

// Re-export subsystems for direct access if needed
export {
  centralAIController,
  decisionEngine,
  notificationSystem,
  getChannelAdapter
};