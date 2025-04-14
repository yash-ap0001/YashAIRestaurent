// Export all services from their respective modules

// AI Services
export * from './ai';

// WhatsApp Services
import * as whatsappService from './whatsapp/service';
export { whatsappService };

// Telephony Services
import * as telephonyService from './telephony/index';
export { telephonyService };

// AI Services import for specific exports
import { 
  aiService, 
  centralAIController, 
  decisionEngine,
  notificationSystem
} from './ai';

// Export AI service and subsystems
export { 
  aiService, 
  centralAIController, 
  decisionEngine,
  notificationSystem
};