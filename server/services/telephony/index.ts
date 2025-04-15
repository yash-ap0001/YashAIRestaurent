import twilio from 'twilio';
import { Request, Response } from 'express';
import { storage } from '../../storage';

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Maintain call data in memory (in production, use a database)
interface CallData {
  id: string;
  phoneNumber: string;
  startTime: string;
  endTime?: string;
  status: 'active' | 'completed' | 'missed';
  transcript?: string;
  orderId?: number;
}

const activeCalls: Record<string, CallData> = {};
const callHistory: CallData[] = [];

// Call statistics
interface CallStatistics {
  totalCalls: number;
  answeredCalls: number;
  missedCalls: number;
  averageCallDuration: number; // minutes
  ordersPlaced: number;
  conversionRate: number; // percentage of calls that result in orders
}

// AI Voice settings
interface AIVoiceSettings {
  greeting: string;
  confirmationPrompt: string;
  farewell: string;
  maxRetries: number;
  autoAnswerCalls: boolean;
}

let aiVoiceSettings: AIVoiceSettings = {
  greeting: "Hello! Thank you for calling Yash Hotel. I'm your AI assistant. What would you like to order today?",
  confirmationPrompt: "Let me confirm your order. Is that correct?",
  farewell: "Thank you for your order! It will be ready in approximately 20 minutes. Have a great day!",
  maxRetries: 3,
  autoAnswerCalls: true
};

/**
 * Initialize the Twilio service and verify credentials
 */
export async function initializeTelephonyService() {
  try {
    // Verify Twilio credentials by getting account info
    const account = await twilioClient.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
    console.log(`Twilio service initialized for account: ${account.friendlyName}`);

    // Load some initial test data
    initializeTestData();
    
    return true;
  } catch (error) {
    console.error('Failed to initialize Twilio service:', error);
    return false;
  }
}

/**
 * Initialize test data for demonstration purposes
 */
function initializeTestData() {
  // Add some sample call history
  const pastCalls = [
    {
      id: '1',
      phoneNumber: '+918765432101',
      startTime: new Date(Date.now() - 15 * 60000).toISOString(),
      endTime: new Date(Date.now() - 12 * 60000).toISOString(),
      status: 'completed',
      transcript: 'AI: Hello! Thank you for calling Yash Hotel. I\'m your AI assistant. What would you like to order today?\nCustomer: I want to order 2 butter chicken, 3 naan, and a paneer tikka.\nAI: I\'ve got 2 butter chicken, 3 naan, and 1 paneer tikka. Is that correct?\nCustomer: Yes, that\'s right.\nAI: Great! Your order has been placed. It will be ready in approximately 20 minutes. Have a great day!',
      orderId: 12345
    },
    {
      id: '2',
      phoneNumber: '+918765432102',
      startTime: new Date(Date.now() - 45 * 60000).toISOString(),
      endTime: new Date(Date.now() - 40 * 60000).toISOString(),
      status: 'completed',
      transcript: 'AI: Hello! Thank you for calling Yash Hotel. I\'m your AI assistant. What would you like to order today?\nCustomer: I\'d like a vegetarian meal.\nAI: We have several vegetarian options. Would you like to hear our recommendations?\nCustomer: Yes, please.\nAI: I recommend our paneer butter masala, dal makhani, and garlic naan. Would you like to order any of these?\nCustomer: I\'ll take the paneer butter masala with 2 garlic naan.\nAI: Got it. 1 paneer butter masala and 2 garlic naan. Is that correct?\nCustomer: Yes, that\'s right.\nAI: Great! Your order has been placed. It will be ready in approximately 20 minutes. Have a great day!',
      orderId: 12340
    },
    {
      id: '4',
      phoneNumber: '+918765432104',
      startTime: new Date(Date.now() - 120 * 60000).toISOString(),
      status: 'missed'
    }
  ] as CallData[];
  
  callHistory.push(...pastCalls);
}

/**
 * Generate TwiML for incoming calls
 * @param req Express request
 * @param res Express response
 */
export function handleIncomingCall(req: Request, res: Response) {
  const callSid = req.body.CallSid;
  const callFrom = req.body.From;
  
  console.log(`Incoming call from ${callFrom}, SID: ${callSid}`);
  
  // Store call data
  const callData: CallData = {
    id: callSid,
    phoneNumber: callFrom,
    startTime: new Date().toISOString(),
    status: 'active'
  };
  
  activeCalls[callSid] = callData;
  callHistory.unshift(callData);
  
  // Create TwiML response
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();
  
  if (aiVoiceSettings.autoAnswerCalls) {
    // Have the AI answer the call
    twiml.say({ voice: 'Polly.Joanna' }, aiVoiceSettings.greeting);
    
    // Gather customer input
    const gather = twiml.gather({
      input: 'speech',
      speechTimeout: 'auto',
      speechModel: 'phone_call',
      action: '/api/telephony/process-speech',
      method: 'POST',
      language: 'en-US'
    });
    
    gather.say({ voice: 'Polly.Joanna' }, 'Please tell me what you would like to order.');
    
    // If no input is received
    twiml.say({ voice: 'Polly.Joanna' }, 'I didn\'t receive your order. Please call again later. Goodbye!');
    twiml.hangup();
  } else {
    // Auto-answer is disabled - play a message
    twiml.say({ voice: 'Polly.Joanna' }, 'Thank you for calling Yash Hotel. Our AI assistant is currently unavailable. Please call back later.');
    twiml.hangup();
  }
  
  res.type('text/xml');
  res.send(twiml.toString());
}

/**
 * Process speech from customer
 * @param req Express request
 * @param res Express response
 */
export async function processSpeech(req: Request, res: Response) {
  const callSid = req.body.CallSid;
  const speechResult = req.body.SpeechResult;
  const confidence = req.body.Confidence;
  
  console.log(`Speech received from call ${callSid}: "${speechResult}" (confidence: ${confidence})`);
  
  // Update call transcript
  if (activeCalls[callSid]) {
    activeCalls[callSid].transcript = activeCalls[callSid].transcript || '';
    activeCalls[callSid].transcript += `Customer: ${speechResult}\n`;
    
    // Also update in history
    const historyCall = callHistory.find(call => call.id === callSid);
    if (historyCall) {
      historyCall.transcript = activeCalls[callSid].transcript;
    }
  }
  
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();
  
  try {
    // Process the speech with our AI service
    // In a real implementation, this would call OpenAI or another NLP service
    const orderText = speechResult;
    
    // For demonstration, we'll use a simple approach
    if (orderText.includes('help') || orderText.includes('menu')) {
      // Customer asked for help or menu options
      twiml.say({ voice: 'Polly.Joanna' }, 'Our popular items include butter chicken, paneer tikka, and various types of naan. What would you like to order?');
      
      const gather = twiml.gather({
        input: 'speech',
        speechTimeout: 'auto',
        speechModel: 'phone_call',
        action: '/api/telephony/process-speech',
        method: 'POST'
      });
      
      // If no input is received
      twiml.say({ voice: 'Polly.Joanna' }, 'I didn\'t receive your order. Please call again later. Goodbye!');
      twiml.hangup();
    } else if (orderText.includes('cancel') || orderText.includes('stop')) {
      // Customer wants to cancel
      twiml.say({ voice: 'Polly.Joanna' }, 'Your order has been cancelled. Thank you for calling. Goodbye!');
      twiml.hangup();
      
      // Update call status
      await completeCall(callSid);
    } else {
      // Process as an order
      // In a real implementation, we would extract menu items from the speech text
      // For demo purposes, we'll just echo back what we think we heard
      
      // Get confirmation
      twiml.say({ voice: 'Polly.Joanna' }, `I heard you order: ${orderText}. ${aiVoiceSettings.confirmationPrompt}`);
      
      const gather = twiml.gather({
        input: 'speech dtmf',
        speechTimeout: 'auto',
        speechModel: 'phone_call',
        numDigits: 1,
        action: '/api/telephony/confirm-order',
        method: 'POST'
      });
      
      gather.say({ voice: 'Polly.Joanna' }, 'Please say yes or press 1 to confirm, or say no or press 2 to cancel.');
      
      // If no input is received
      twiml.say({ voice: 'Polly.Joanna' }, 'I didn\'t receive your confirmation. Please call again later. Goodbye!');
      twiml.hangup();
    }
  } catch (error) {
    console.error('Error processing speech:', error);
    
    // Error handling
    twiml.say({ voice: 'Polly.Joanna' }, 'I\'m sorry, I had trouble processing your order. Please try again later.');
    twiml.hangup();
    
    // Update call status
    completeCall(callSid);
  }
  
  // Update call transcript with AI response
  if (activeCalls[callSid]) {
    const aiResponse = twiml.toString().replace(/<[^>]*>/g, '');
    activeCalls[callSid].transcript += `AI: ${aiResponse}\n`;
    
    // Also update in history
    const historyCall = callHistory.find(call => call.id === callSid);
    if (historyCall) {
      historyCall.transcript = activeCalls[callSid].transcript;
    }
  }
  
  res.type('text/xml');
  res.send(twiml.toString());
}

/**
 * Confirm order from customer
 * @param req Express request
 * @param res Express response
 */
export async function confirmOrder(req: Request, res: Response) {
  const callSid = req.body.CallSid;
  const digits = req.body.Digits;
  const speechResult = req.body.SpeechResult || '';
  
  console.log(`Confirmation received from call ${callSid}: "${speechResult}" (digits: ${digits})`);
  
  // Update call transcript
  if (activeCalls[callSid]) {
    activeCalls[callSid].transcript = activeCalls[callSid].transcript || '';
    activeCalls[callSid].transcript += `Customer: ${speechResult || 'Pressed ' + digits}\n`;
  }
  
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();
  
  // Check confirmation (1 or yes = confirm, 2 or no = cancel)
  const isConfirmed = digits === '1' || 
                     speechResult.toLowerCase().includes('yes') || 
                     speechResult.toLowerCase().includes('confirm') ||
                     speechResult.toLowerCase().includes('correct');
  
  if (isConfirmed) {
    // Order confirmed
    // In a real implementation, we would create the order in our system
    const orderId = Math.floor(10000 + Math.random() * 90000);
    
    // Update call with order ID
    if (activeCalls[callSid]) {
      activeCalls[callSid].orderId = orderId;
      
      // Also update in history
      const historyCall = callHistory.find(call => call.id === callSid);
      if (historyCall) {
        historyCall.orderId = orderId;
      }
    }
    
    twiml.say({ voice: 'Polly.Joanna' }, 
      `Your order has been confirmed! Your order number is ${orderId}. ${aiVoiceSettings.farewell}`
    );
    twiml.hangup();
  } else {
    // Order cancelled
    twiml.say({ voice: 'Polly.Joanna' }, 'I\'ve cancelled your order. Would you like to try again?');
    
    const gather = twiml.gather({
      input: 'speech',
      speechTimeout: 'auto',
      speechModel: 'phone_call',
      action: '/api/telephony/retry-order',
      method: 'POST'
    });
    
    // If no input is received
    twiml.say({ voice: 'Polly.Joanna' }, 'I didn\'t hear from you. Thank you for calling. Goodbye!');
    twiml.hangup();
  }
  
  // Update call transcript with AI response
  if (activeCalls[callSid]) {
    const aiResponse = twiml.toString().replace(/<[^>]*>/g, '');
    activeCalls[callSid].transcript += `AI: ${aiResponse}\n`;
    
    // Also update in history
    const historyCall = callHistory.find(call => call.id === callSid);
    if (historyCall) {
      historyCall.transcript = activeCalls[callSid].transcript;
    }
  }
  
  res.type('text/xml');
  res.send(twiml.toString());
  
  // If confirmed or hanging up, complete the call
  if (isConfirmed) {
    completeCall(callSid);
  }
}

/**
 * Handle retry order request
 * @param req Express request
 * @param res Express response
 */
export function retryOrder(req: Request, res: Response) {
  const callSid = req.body.CallSid;
  const speechResult = req.body.SpeechResult || '';
  
  console.log(`Retry response from call ${callSid}: "${speechResult}"`);
  
  // Update call transcript
  if (activeCalls[callSid]) {
    activeCalls[callSid].transcript = activeCalls[callSid].transcript || '';
    activeCalls[callSid].transcript += `Customer: ${speechResult}\n`;
  }
  
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();
  
  // Check if customer wants to retry
  const wantsRetry = speechResult.toLowerCase().includes('yes') || 
                    speechResult.toLowerCase().includes('try again') ||
                    speechResult.toLowerCase().includes('retry');
  
  if (wantsRetry) {
    // Start over
    twiml.say({ voice: 'Polly.Joanna' }, 'Let\'s try again. What would you like to order?');
    
    const gather = twiml.gather({
      input: 'speech',
      speechTimeout: 'auto',
      speechModel: 'phone_call',
      action: '/api/telephony/process-speech',
      method: 'POST'
    });
    
    // If no input is received
    twiml.say({ voice: 'Polly.Joanna' }, 'I didn\'t receive your order. Please call again later. Goodbye!');
    twiml.hangup();
  } else {
    // End call
    twiml.say({ voice: 'Polly.Joanna' }, 'Thank you for calling Yash Hotel. Goodbye!');
    twiml.hangup();
    
    // Update call status
    completeCall(callSid);
  }
  
  // Update call transcript with AI response
  if (activeCalls[callSid]) {
    const aiResponse = twiml.toString().replace(/<[^>]*>/g, '');
    activeCalls[callSid].transcript += `AI: ${aiResponse}\n`;
    
    // Also update in history
    const historyCall = callHistory.find(call => call.id === callSid);
    if (historyCall) {
      historyCall.transcript = activeCalls[callSid].transcript;
    }
  }
  
  res.type('text/xml');
  res.send(twiml.toString());
  
  // If not retrying, complete the call
  if (!wantsRetry) {
    completeCall(callSid);
  }
}

/**
 * Complete a call and update its status
 * @param callSid Twilio Call SID
 */
async function completeCall(callSid: string) {
  if (activeCalls[callSid]) {
    activeCalls[callSid].status = 'completed';
    activeCalls[callSid].endTime = new Date().toISOString();
    
    // Also update in history
    const historyCall = callHistory.find(call => call.id === callSid);
    if (historyCall) {
      historyCall.status = 'completed';
      historyCall.endTime = activeCalls[callSid].endTime;
    }
    
    // Create an actual order in the system if this is a simulated call
    // and there's an orderId assigned
    if (callSid.startsWith('SIM') && activeCalls[callSid].orderId) {
      try {
        // Parse the transcript to extract order details
        const transcript = activeCalls[callSid].transcript || '';
        
        // Create the order using AI service
        await createOrderFromCall(activeCalls[callSid]);
        
        console.log(`Created order from completed call ${callSid}`);
      } catch (error) {
        console.error('Error creating order from call:', error);
      }
    }
    
    // Remove from active calls after a delay
    setTimeout(() => {
      delete activeCalls[callSid];
    }, 60000); // Keep in memory for 1 minute
  }
}

// Function to create an order from a call
async function createOrderFromCall(call: CallData) {
  if (!call.orderId) return;
  
  try {
    // Extract order details from the transcript
    const transcript = call.transcript || '';
    const customerLines = transcript
      .split('\n')
      .filter(line => line.startsWith('Customer:'))
      .map(line => line.replace('Customer:', '').trim());
    
    // Combine all customer inputs into a single natural language order
    const orderText = customerLines.join(' ');
    
    // Create a payload for the AI order processing
    const orderData = {
      orderSource: 'phone',
      phoneNumber: call.phoneNumber,
      naturalLanguageOrder: orderText,
      callId: call.id,
      simulatedCall: true
    };
    
    // Call the AI order processing endpoint
    const response = await fetch('http://localhost:5000/api/ai/create-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create order: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Update the call with the actual order ID from the created order
    if (result.id) {
      call.orderId = result.id;
      
      // Also update in history
      const historyCall = callHistory.find(c => c.id === call.id);
      if (historyCall) {
        historyCall.orderId = result.id;
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error creating order from call transcript:', error);
    throw error;
  }
}

/**
 * Make an outbound call
 * @param phoneNumber Phone number to call
 * @param message Message to say
 */
export async function makeOutboundCall(phoneNumber: string, message: string) {
  try {
    const call = await twilioClient.calls.create({
      twiml: `<Response><Say voice="Polly.Joanna">${message}</Say></Response>`,
      to: phoneNumber,
      from: twilioPhoneNumber
    });
    
    console.log(`Outbound call initiated to ${phoneNumber}, SID: ${call.sid}`);
    return { success: true, callSid: call.sid };
  } catch (error) {
    console.error('Failed to make outbound call:', error);
    return { success: false, error };
  }
}

/**
 * Get call history
 */
export function getCalls() {
  return callHistory;
}

/**
 * Get active calls
 */
export function getActiveCalls() {
  return Object.values(activeCalls);
}

/**
 * Get call statistics
 */
export function getCallStatistics(): CallStatistics {
  const totalCalls = callHistory.length;
  const answeredCalls = callHistory.filter(call => call.status === 'completed').length;
  const missedCalls = callHistory.filter(call => call.status === 'missed').length;
  const ordersPlaced = callHistory.filter(call => call.orderId !== undefined).length;
  
  // Calculate average call duration
  let totalDuration = 0;
  let completedCallsWithDuration = 0;
  
  callHistory.forEach(call => {
    if (call.status === 'completed' && call.endTime && call.startTime) {
      const start = new Date(call.startTime).getTime();
      const end = new Date(call.endTime).getTime();
      totalDuration += (end - start) / 60000; // Convert to minutes
      completedCallsWithDuration++;
    }
  });
  
  const averageCallDuration = completedCallsWithDuration > 0 
    ? +(totalDuration / completedCallsWithDuration).toFixed(1) 
    : 0;
  
  const conversionRate = answeredCalls > 0 
    ? Math.round((ordersPlaced / answeredCalls) * 100) 
    : 0;
  
  return {
    totalCalls,
    answeredCalls,
    missedCalls,
    averageCallDuration,
    ordersPlaced,
    conversionRate
  };
}

/**
 * Get AI voice settings
 */
export function getAIVoiceSettings(): AIVoiceSettings {
  return { ...aiVoiceSettings };
}

/**
 * Update AI voice settings
 */
export function updateAIVoiceSettings(settings: Partial<AIVoiceSettings>): AIVoiceSettings {
  aiVoiceSettings = { ...aiVoiceSettings, ...settings };
  return { ...aiVoiceSettings };
}

/**
 * Simulate an incoming call for testing
 */
export function simulateIncomingCall(phoneNumber: string = ''): CallData {
  // Generate a random phone number if none provided
  if (!phoneNumber) {
    phoneNumber = '+91' + Math.floor(Math.random() * 9000000000 + 1000000000);
  }
  
  const callSid = 'SIM' + Date.now().toString();
  
  const callData: CallData = {
    id: callSid,
    phoneNumber,
    startTime: new Date().toISOString(),
    status: 'active',
    transcript: `AI: ${aiVoiceSettings.greeting}\n`
  };
  
  activeCalls[callSid] = callData;
  callHistory.unshift(callData);
  
  // Simulate a conversation after a delay
  simulateCallConversation(callSid);
  
  return callData;
}

/**
 * Simulate a call conversation for testing
 */
async function simulateCallConversation(callSid: string) {
  const responseOptions = [
    "I'd like to order 2 butter chicken, 3 naan, and a paneer tikka",
    "Can I get a vegetarian thali?",
    "I want to order a family meal for 4 people",
    "What are your specials today?"
  ];
  
  const response = responseOptions[Math.floor(Math.random() * responseOptions.length)];
  
  // Wait 2 seconds
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Add customer response
  if (activeCalls[callSid]) {
    activeCalls[callSid].transcript += `Customer: ${response}\n`;
    
    // Also update in history
    const historyCall = callHistory.find(call => call.id === callSid);
    if (historyCall) {
      historyCall.transcript = activeCalls[callSid].transcript;
    }
  }
  
  // Add AI confirmation
  if (activeCalls[callSid]) {
    activeCalls[callSid].transcript += `AI: I heard you order: ${response}. ${aiVoiceSettings.confirmationPrompt}\n`;
    
    // Also update in history
    const historyCall = callHistory.find(call => call.id === callSid);
    if (historyCall) {
      historyCall.transcript = activeCalls[callSid].transcript;
    }
  }
  
  // Wait 1.5 seconds
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Add customer confirmation
  if (activeCalls[callSid]) {
    activeCalls[callSid].transcript += `Customer: Yes, that's correct\n`;
    
    // Also update in history
    const historyCall = callHistory.find(call => call.id === callSid);
    if (historyCall) {
      historyCall.transcript = activeCalls[callSid].transcript;
    }
  }
  
  // Create order and complete call
  const orderId = Math.floor(10000 + Math.random() * 90000);
  
  if (activeCalls[callSid]) {
    activeCalls[callSid].orderId = orderId;
    activeCalls[callSid].transcript += `AI: Your order has been confirmed! Your order number is ${orderId}. ${aiVoiceSettings.farewell}\n`;
    
    // Also update in history
    const historyCall = callHistory.find(call => call.id === callSid);
    if (historyCall) {
      historyCall.orderId = orderId;
      historyCall.transcript = activeCalls[callSid].transcript;
    }
  }
  
  // Complete the call after a delay
  setTimeout(async () => {
    await completeCall(callSid);
  }, 1500);
}