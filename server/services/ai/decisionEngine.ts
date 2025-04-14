import { storage } from '../../storage';
import { Order, KitchenToken, OrderItem } from '@shared/schema';

/**
 * AI Decision Engine
 * 
 * This service provides intelligent decision-making capabilities for:
 * - Order routing and prioritization
 * - Preparation time estimation
 * - Kitchen resource allocation
 * - Inventory management decisions
 */
export class DecisionEngine {
  private static instance: DecisionEngine;
  
  // Private constructor to enforce singleton pattern
  private constructor() {
    console.log('AI Decision Engine initialized');
  }
  
  /**
   * Get singleton instance of the engine
   */
  public static getInstance(): DecisionEngine {
    if (!DecisionEngine.instance) {
      DecisionEngine.instance = new DecisionEngine();
    }
    return DecisionEngine.instance;
  }
  
  /**
   * Determine priority level for a kitchen token
   * Returns a priority score from 1 (lowest) to 10 (highest)
   */
  public async determinePriority(order: Order, orderItems: OrderItem[]): Promise<number> {
    // Start with a base priority of 5
    let priority = 5;
    
    try {
      // Adjust based on order source
      if (order.orderSource === 'zomato' || order.orderSource === 'swiggy') {
        priority += 1; // External delivery platforms have slightly higher priority
      }
      
      // Adjust based on VIP status (check if customer is a VIP in notes or preferences)
      if (order.notes && order.notes.toLowerCase().includes('vip')) {
        priority += 2;
      }
      
      // Adjust based on order complexity and size
      const complexityFactor = this.calculateOrderComplexity(orderItems);
      if (complexityFactor > 2.0) {
        priority += 1; // Complex orders get higher priority
      }
      
      // Adjust based on current kitchen load
      const kitchenLoad = await this.getCurrentKitchenLoad();
      if (kitchenLoad > 0.8) {
        priority -= 1; // Reduce priority slightly when kitchen is very busy
      }
      
      // Clamp priority between 1 and 10
      return Math.max(1, Math.min(10, priority));
    } catch (error) {
      console.error('Error in priority determination:', error);
      return 5; // Default to medium priority on error
    }
  }
  
  /**
   * Estimate preparation time for an order in minutes
   */
  public async estimatePreparationTime(order: Order, orderItems: OrderItem[]): Promise<number> {
    try {
      // Base preparation time in minutes
      let prepTime = 10;
      
      // Adjust based on order complexity
      const complexityFactor = this.calculateOrderComplexity(orderItems);
      prepTime *= complexityFactor;
      
      // Adjust based on current kitchen load
      const kitchenLoad = await this.getCurrentKitchenLoad();
      prepTime *= (1 + kitchenLoad); // Increase prep time when kitchen is busy
      
      // Get menu items to check for special prep time requirements
      const menuItemIds = orderItems.map(item => item.menuItemId);
      const menuItems = await this.getMenuItemsFromIds(menuItemIds);
      
      // Check if any items require extra preparation time
      for (const item of menuItems) {
        if (item.description && (
          item.description.toLowerCase().includes('slow') || 
          item.description.toLowerCase().includes('special') ||
          item.description.toLowerCase().includes('chef')
        )) {
          prepTime += 5; // Add 5 minutes for special items
          break;
        }
      }
      
      // Round to nearest minute and ensure minimum preparation time
      return Math.max(5, Math.round(prepTime));
    } catch (error) {
      console.error('Error in preparation time estimation:', error);
      return 15; // Default to 15 minutes on error
    }
  }
  
  /**
   * Calculate current kitchen load as a factor from 0.0 (empty) to 1.0 (full capacity)
   */
  private async getCurrentKitchenLoad(): Promise<number> {
    try {
      // Get all active kitchen tokens
      const allTokens = await storage.getKitchenTokens();
      const activeTokens = allTokens.filter(token => 
        token.status === 'pending' || token.status === 'in_progress'
      );
      
      // Calculate load based on active tokens (assume capacity of 15 orders)
      const kitchenCapacity = 15;
      const currentLoad = activeTokens.length / kitchenCapacity;
      
      return Math.min(1.0, currentLoad);
    } catch (error) {
      console.error('Error calculating kitchen load:', error);
      return 0.5; // Default to medium load on error
    }
  }
  
  /**
   * Calculate order complexity based on items and quantities
   * Returns a factor from 1.0 (simple) to 3.0 (complex)
   */
  private calculateOrderComplexity(orderItems: OrderItem[]): number {
    if (!orderItems || orderItems.length === 0) return 1.0;
    
    // Base complexity on number of items and total quantity
    const itemCount = orderItems.length;
    const totalQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0);
    
    let complexityFactor = 1.0;
    
    // Adjust based on number of unique items
    if (itemCount > 5) complexityFactor += 0.5;
    if (itemCount > 10) complexityFactor += 0.5;
    
    // Adjust based on total quantity
    if (totalQuantity > 10) complexityFactor += 0.5;
    if (totalQuantity > 20) complexityFactor += 0.5;
    
    return Math.min(complexityFactor, 3.0);
  }
  
  /**
   * Get menu items from their IDs
   */
  private async getMenuItemsFromIds(ids: number[]): Promise<any[]> {
    try {
      const allMenuItems = await storage.getMenuItems();
      return allMenuItems.filter(item => ids.includes(item.id));
    } catch (error) {
      console.error('Error fetching menu items:', error);
      return [];
    }
  }
  
  /**
   * Check if inventory is sufficient for an order
   * Returns true if inventory is sufficient, false otherwise
   */
  public async checkInventorySufficiency(orderItems: OrderItem[]): Promise<boolean> {
    try {
      // Get all inventory items
      const inventoryItems = await storage.getInventoryItems();
      
      // Get menu items to check ingredients
      const menuItemIds = orderItems.map(item => item.menuItemId);
      const menuItems = await this.getMenuItemsFromIds(menuItemIds);
      
      // In a real system, we would have a relationship between menu items and inventory items
      // For now, we'll do a simple check based on category matching
      
      // Get categories of ordered items
      const orderedCategories = new Set(menuItems.map(item => item.category));
      
      // Check inventory for each category
      for (const category of orderedCategories) {
        const matchingInventory = inventoryItems.filter(inv => 
          inv.category.toLowerCase() === category.toLowerCase()
        );
        
        // If no matching inventory or any item is below minimum quantity, return false
        if (matchingInventory.length === 0 || 
            matchingInventory.some(inv => inv.quantity <= inv.minQuantity)) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error checking inventory sufficiency:', error);
      return true; // Default to allowing the order on error
    }
  }
  
  /**
   * Recommend order completion sequence for kitchen staff
   * Returns array of kitchen token IDs in recommended processing order
   */
  public async recommendOrderSequence(): Promise<number[]> {
    try {
      // Get all active kitchen tokens
      const allTokens = await storage.getKitchenTokens();
      const activeTokens = allTokens.filter(token => 
        token.status === 'pending' || token.status === 'in_progress'
      );
      
      if (activeTokens.length === 0) return [];
      
      // Get associated orders
      const orderIds = activeTokens.map(token => token.orderId);
      const orders = await Promise.all(
        orderIds.map(id => storage.getOrder(id))
      );
      
      // Calculate scores for each token
      const scoredTokens = await Promise.all(
        activeTokens.map(async (token, index) => {
          const order = orders[index];
          if (!order) return { token, score: 0 };
          
          // Get order items
          const orderItems = await storage.getOrderItems(order.id);
          
          // Calculate priority score
          const priorityScore = await this.determinePriority(order, orderItems);
          
          // Calculate waiting time score (older orders get higher score)
          const waitingTime = Date.now() - new Date(token.startTime || new Date()).getTime();
          const waitingScore = Math.min(10, waitingTime / (5 * 60 * 1000)); // Max 10 points for 5+ minutes
          
          // Urgent tokens get extra priority
          const urgencyScore = token.isUrgent ? 5 : 0;
          
          // Calculate final score
          const finalScore = priorityScore + waitingScore + urgencyScore;
          
          return { token, score: finalScore };
        })
      );
      
      // Sort by score (highest first) and extract token IDs
      return scoredTokens
        .sort((a, b) => b.score - a.score)
        .map(scored => scored.token.id);
    } catch (error) {
      console.error('Error recommending order sequence:', error);
      return []; // Return empty array on error
    }
  }
  
  /**
   * Get personalized menu recommendations for a customer
   */
  public async getPersonalizedRecommendations(
    customerPhone: string | null,
    previousOrders: any[] = []
  ): Promise<any[]> {
    try {
      // Get all menu items
      const menuItems = await storage.getMenuItems();
      
      // If we have customer data, use it for personalization
      if (customerPhone) {
        // Find customer by phone
        const customer = await storage.getCustomerByPhone(customerPhone);
        
        if (customer && customer.preferences) {
          // Get items matching customer preferences
          const preferredCategories = customer.preferences;
          const recommendedItems = menuItems.filter(item => 
            preferredCategories.includes(item.category)
          );
          
          // Return top 5 recommended items
          return recommendedItems.slice(0, 5);
        }
      }
      
      // If no customer data or previous orders, return popular items
      if (previousOrders.length === 0) {
        // For now, just return a random selection of 5 items
        return menuItems
          .sort(() => 0.5 - Math.random())
          .slice(0, 5);
      }
      
      // If we have previous orders, recommend based on those
      const previousItemIds = previousOrders.flatMap(order => 
        order.items ? order.items.map((item: any) => item.menuItemId) : []
      );
      
      // Get previously ordered items' categories
      const previouslyOrderedItems = menuItems.filter(item => 
        previousItemIds.includes(item.id)
      );
      const previousCategories = [...new Set(
        previouslyOrderedItems.map(item => item.category)
      )];
      
      // Recommend items from the same categories but not previously ordered
      const recommendedItems = menuItems.filter(item => 
        previousCategories.includes(item.category) && 
        !previousItemIds.includes(item.id)
      );
      
      // Return top 5 recommended items
      return recommendedItems.slice(0, 5);
    } catch (error) {
      console.error('Error generating personalized recommendations:', error);
      return []; // Return empty array on error
    }
  }
}

// Export singleton instance
export const decisionEngine = DecisionEngine.getInstance();