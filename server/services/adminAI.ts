import { adminAIPrompt, salesAnalysisPrompt, businessHealthPrompt, competitiveAnalysisPrompt, growthOpportunitiesPrompt } from './adminOperationsTraining';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

// Instantiate AI clients
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Use whichever AI service is available
const useAnthropic = !!process.env.ANTHROPIC_API_KEY;
const useOpenAI = !!process.env.OPENAI_API_KEY;

// Determine which default AI service to use
const defaultAIService = useAnthropic ? 'anthropic' : (useOpenAI ? 'openai' : null);

/**
 * Gets the appropriate prompt based on the query type
 */
function getPromptForQuery(queryType: string): string {
  switch (queryType.toLowerCase()) {
    case 'sales':
    case 'revenue':
    case 'sales analysis':
      return salesAnalysisPrompt;
    case 'business health':
    case 'performance':
      return businessHealthPrompt;
    case 'competition':
    case 'competitive analysis':
    case 'market analysis':
      return competitiveAnalysisPrompt;
    case 'growth':
    case 'opportunities':
    case 'expansion':
      return growthOpportunitiesPrompt;
    default:
      return adminAIPrompt;
  }
}

/**
 * Analyzes a business query and generates insights using AI
 */
export async function analyzeBusiness(
  query: string, 
  businessData: any, 
  queryType: string = 'general',
  service: 'anthropic' | 'openai' | null = defaultAIService
): Promise<string> {
  // Prepare the prompt
  const prompt = getPromptForQuery(queryType);
  
  // Create context from business data
  let contextString = '';
  if (businessData) {
    contextString = 'Here is the current business data:\n';
    
    if (businessData.revenue) {
      contextString += `\nRevenue Data:\n${JSON.stringify(businessData.revenue, null, 2)}\n`;
    }
    
    if (businessData.orders) {
      contextString += `\nOrders Data:\n${JSON.stringify(businessData.orders, null, 2)}\n`;
    }
    
    if (businessData.customers) {
      contextString += `\nCustomer Data:\n${JSON.stringify(businessData.customers, null, 2)}\n`;
    }
    
    if (businessData.performance) {
      contextString += `\nPerformance Metrics:\n${JSON.stringify(businessData.performance, null, 2)}\n`;
    }
  }
  
  // If no AI service is available, return a placeholder
  if (!service) {
    console.warn('No AI service configured. Please set ANTHROPIC_API_KEY or OPENAI_API_KEY.');
    return "AI analysis not available. Please configure an AI service API key.";
  }
  
  try {
    // Use Anthropic Claude if available
    if (service === 'anthropic') {
      const message = await anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: `${prompt}\n\n${contextString}\n\nUser Query: ${query}`
          }
        ],
        system: "You are YashHotelBot's Restaurant Business Intelligence Assistant. Provide concise, data-driven insights for restaurant management."
      });
      
      // Handle different API response formats
      if (Array.isArray(message.content)) {
        // For newer versions of the Anthropic API
        const textContent = message.content.find(c => c.type === 'text');
        if (textContent && 'text' in textContent) {
          return textContent.text;
        }
      }
      
      // Fallback for older versions or unexpected formats
      return typeof message.content === 'string' 
        ? message.content 
        : JSON.stringify(message.content);
    } 
    // Otherwise use OpenAI
    else if (service === 'openai') {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: "You are YashHotelBot's Restaurant Business Intelligence Assistant. Provide concise, data-driven insights for restaurant management."
          },
          {
            role: 'user',
            content: `${prompt}\n\n${contextString}\n\nUser Query: ${query}`
          }
        ],
        max_tokens: 2048,
      });
      
      return completion.choices[0].message.content || 'No response generated.';
    }
    
    // Fallback
    return "AI analysis not available. Please configure a valid AI service.";
  } catch (error) {
    console.error('Error in AI analysis:', error);
    return "An error occurred while generating AI insights. Please try again later.";
  }
}

/**
 * Determines the type of business query based on keywords
 */
export function determineQueryType(query: string): string {
  const lowerQuery = query.toLowerCase();
  
  // Check for sales/revenue related queries
  if (/sales|revenue|earning|income|profit margin|financial results|money made/i.test(lowerQuery)) {
    return 'sales';
  }
  
  // Check for business health queries
  if (/health|performance|kpi|key metrics|overall|status|how (is|are) (we|the business) doing/i.test(lowerQuery)) {
    return 'business health';
  }
  
  // Check for competitive analysis queries
  if (/competitors|competition|market|industry|compare|benchmarks|compared to others/i.test(lowerQuery)) {
    return 'competitive analysis';
  }
  
  // Check for growth opportunity queries
  if (/growth|opportunities|expand|scaling|improvement|optimization|potential|strategy/i.test(lowerQuery)) {
    return 'growth';
  }
  
  // Default to general business analysis
  return 'general';
}

/**
 * Process a business inquiry and return AI-generated insights
 */
export async function processBusinessInquiry(query: string, businessData: any = null): Promise<any> {
  try {
    // Determine the type of query
    const queryType = determineQueryType(query);
    
    // Get AI analysis
    const aiInsights = await analyzeBusiness(query, businessData, queryType);
    
    return {
      query,
      queryType,
      insights: aiInsights,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error processing business inquiry:', error);
    return {
      query,
      error: 'Failed to process business inquiry',
      errorDetail: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
  }
}