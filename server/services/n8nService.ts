import { storage } from "../storage";
import axios from "axios";
import { Activity, Customer, Order, OrderItem, KitchenToken, Bill } from "@shared/schema";

interface WebhookConfig {
  url: string;
  secret: string;
  events: string[];
  active: boolean;
}

/**
 * Class to manage n8n integration with YashHotelBot
 */
export class N8nIntegrationService {
  private webhooks: Map<string, WebhookConfig> = new Map();
  private n8nBaseUrl: string | null = null;
  private apiKey: string | null = null;
  
  constructor() {
    // Initialize with environment variables if available
    if (process.env.N8N_BASE_URL) {
      this.n8nBaseUrl = process.env.N8N_BASE_URL;
    }
    
    if (process.env.N8N_API_KEY) {
      this.apiKey = process.env.N8N_API_KEY;
    }
  }
  
  /**
   * Set the n8n base URL
   */
  setN8nBaseUrl(url: string): void {
    this.n8nBaseUrl = url;
  }
  
  /**
   * Set the n8n API key
   */
  setApiKey(key: string): void {
    this.apiKey = key;
  }
  
  /**
   * Register a new webhook for n8n integration
   */
  registerWebhook(id: string, config: WebhookConfig): void {
    this.webhooks.set(id, config);
  }
  
  /**
   * Remove a webhook by ID
   */
  removeWebhook(id: string): boolean {
    return this.webhooks.delete(id);
  }
  
  /**
   * Get all registered webhooks
   */
  getWebhooks(): Map<string, WebhookConfig> {
    return this.webhooks;
  }
  
  /**
   * Trigger a webhook for a specific event
   */
  async triggerWebhook(event: string, payload: any): Promise<boolean> {
    let success = true;
    
    // Convert Map entries to array to avoid iterator issues
    for (const [id, config] of Array.from(this.webhooks.entries())) {
      if (config.active && config.events.includes(event)) {
        try {
          // Add webhook ID and secret to the payload
          const webhookPayload = {
            ...payload,
            webhookId: id,
            timestamp: new Date().toISOString(),
            event
          };
          
          // Sign the webhook request with the secret
          const signature = this.generateSignature(webhookPayload, config.secret);
          
          // Send webhook request
          await axios.post(config.url, webhookPayload, {
            headers: {
              'Content-Type': 'application/json',
              'X-YashHotelBot-Signature': signature,
              'X-YashHotelBot-Event': event
            }
          });
          
          // Log the successful webhook trigger
          console.log(`Webhook ${id} triggered for event ${event}`);
          
          // Create activity entry
          await storage.createActivity({
            type: 'webhook',
            description: `Triggered webhook ${id} for event ${event}`
          });
        } catch (error) {
          console.error(`Error triggering webhook ${id} for event ${event}:`, error);
          success = false;
          
          // Log the failed webhook trigger
          await storage.createActivity({
            type: 'error',
            description: `Failed to trigger webhook ${id} for event ${event}`
          });
        }
      }
    }
    
    return success;
  }
  
  /**
   * Generate a signature for webhook payload
   */
  private generateSignature(payload: any, secret: string): string {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return hmac.digest('hex');
  }
  
  /**
   * Connect to n8n instance and fetch available workflows
   */
  async fetchWorkflows(): Promise<any[]> {
    if (!this.n8nBaseUrl || !this.apiKey) {
      throw new Error('n8n connection not configured. Set base URL and API key first.');
    }
    
    try {
      const response = await axios.get(`${this.n8nBaseUrl}/api/v1/workflows`, {
        headers: {
          'X-N8N-API-KEY': this.apiKey
        }
      });
      
      return response.data.data;
    } catch (error) {
      console.error('Error fetching n8n workflows:', error);
      throw new Error('Failed to fetch workflows from n8n');
    }
  }
  
  /**
   * Trigger a specific workflow in n8n
   */
  async triggerWorkflow(workflowId: string, data: any): Promise<any> {
    if (!this.n8nBaseUrl || !this.apiKey) {
      throw new Error('n8n connection not configured. Set base URL and API key first.');
    }
    
    try {
      const response = await axios.post(
        `${this.n8nBaseUrl}/api/v1/workflows/${workflowId}/execute`, 
        { data },
        {
          headers: {
            'X-N8N-API-KEY': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error(`Error triggering n8n workflow ${workflowId}:`, error);
      throw new Error(`Failed to trigger workflow in n8n`);
    }
  }
  
  /**
   * Setup event listeners for various system events to trigger webhooks
   */
  setupEventListeners(): void {
    // These are placeholder functions that would be implemented 
    // to hook into the actual event system
    
    // Order events
    // this.listenForOrderCreated();
    // this.listenForOrderUpdated();
    // this.listenForOrderCompleted();
    
    // Kitchen token events
    // this.listenForKitchenTokenCreated();
    // this.listenForKitchenTokenUpdated();
    
    // Bill events
    // this.listenForBillCreated();
    // this.listenForBillPaid();
    
    // Customer events
    // this.listenForCustomerCreated();
    // this.listenForCustomerUpdated();
  }
  
  /**
   * Generate webhooks documentation
   */
  getWebhooksDocumentation(): any {
    return {
      description: "YashHotelBot Webhooks Documentation",
      version: "1.0",
      events: [
        {
          name: "order.created",
          description: "Triggered when a new order is created",
          payload: {
            order: "Order object"
          }
        },
        {
          name: "order.updated",
          description: "Triggered when an order is updated",
          payload: {
            order: "Order object",
            previousStatus: "Previous order status"
          }
        },
        {
          name: "order.completed",
          description: "Triggered when an order is marked as completed",
          payload: {
            order: "Order object"
          }
        },
        {
          name: "kitchen.token.created",
          description: "Triggered when a new kitchen token is created",
          payload: {
            token: "Kitchen token object"
          }
        },
        {
          name: "kitchen.token.updated",
          description: "Triggered when a kitchen token status is updated",
          payload: {
            token: "Kitchen token object",
            previousStatus: "Previous token status"
          }
        },
        {
          name: "bill.created",
          description: "Triggered when a new bill is created",
          payload: {
            bill: "Bill object"
          }
        },
        {
          name: "bill.paid",
          description: "Triggered when a bill is marked as paid",
          payload: {
            bill: "Bill object"
          }
        },
        {
          name: "customer.created",
          description: "Triggered when a new customer is created",
          payload: {
            customer: "Customer object"
          }
        }
      ],
      authentication: {
        type: "HMAC signature",
        headers: {
          "X-YashHotelBot-Signature": "HMAC SHA-256 signature of the payload using your webhook secret",
          "X-YashHotelBot-Event": "Name of the event that triggered the webhook"
        }
      }
    };
  }
}

// Singleton instance
export const n8nService = new N8nIntegrationService();