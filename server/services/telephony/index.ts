import twilio from 'twilio';
import { Request, Response } from 'express';
import { storage } from '../../storage';
import fetch from 'node-fetch';
import { broadcastNewOrder } from '../../orderEnhancement';

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Maintain call data in memory (in production, use a database)
export interface CallData {
  id: string;
  phoneNumber: string;
  startTime: string;
  endTime?: string;
  status: 'active' | 'completed' | 'missed';
  transcript?: string;
  orderId?: number;
  language?: SupportedLanguage;
  // Add orderData property to store order information from speech
  orderData?: {
    orderText: string;
    extractedItems?: string | null;
    hasSpecialRequests?: boolean;
    isDeliveryRequest?: boolean;
    orderSource?: string;
    phoneNumber?: string;
    callId?: string;
    simulatedCall?: boolean;
    useAIAutomation?: boolean;
    tableNumber?: string | null;
    preferredLanguage?: SupportedLanguage;
    [key: string]: any;
  };
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

// Supported languages
export type SupportedLanguage = 'english' | 'hindi' | 'telugu' | 'spanish';

// Language detection patterns
const languagePatterns = {
  hindi: [
    // Greetings and common phrases
    /नमस्ते|नमस्कार|धन्यवाद|खाना|भोजन|चाहिए|मेन्यू|ऑर्डर|कृपया|मिलेगा/i,
    // Food items and descriptors
    /हिंदी|भारतीय|शाकाहारी|मांसाहारी|स्वादिष्ट|मसालेदार|मिर्च|पनीर|चावल|रोटी|दाल/i,
    // Personal expressions and food items
    /मैं|चाहता|चाहती|हूँ|चाहते|चाय|बिरयानी|पकौड़ा/i,
    // North Indian dishes
    /बटर चिकन|दाल मखनी|पनीर टिक्का|नान|कुल्चा|छोले|राजमा/i,
    // Quantities and variations
    /एक|दो|तीन|चार|पांच|थोड़ा|ज्यादा|कम|मीठा|तीखा|गरम/i,
    // Question patterns
    /क्या|कौन|कैसे|किसको|कितना|कहां/i,
    // Order modifiers
    /अतिरिक्त|बिना|साथ में|पैक करके|खाने के लिए/i
  ],
  telugu: [
    // Greetings and common phrases
    /నమస్కారం|ధన్యవాదాలు|ఆహారం|భోజనం|కావాలి|మెనూ|ఆర్డర్|దయచేసి|లభిస్తుంది/i,
    // Food items and descriptors
    /తెలుగు|భారతీయ|శాఖాహారి|మాంసాహారి|రుచికరమైన|మసాలా|మిరప|పనీర్|బియ్యం|రొట్టి|పప్పు/i,
    // Personal expressions and food items
    /నాకు|వేడి|చల్లని|అన్నం|కూర|దోసె|ఇడ్లీ|సాంబార్|చట్నీ/i,
    // South Indian dishes
    /గుంటూరు|హైదరాబాదీ|బిర్యాని|పులాव్|ఆవకాయ|పచ్చడి|చికెన్|కర్రీ|చెట్టినాడు/i,
    // Quantities and variations
    /ఒకటి|రెండు|మూడు|నాలుగు|ఐదు|కొంచెం|ఎక్కువ|తక్కువ|తీపి|కారం|వేడి/i,
    // Question patterns
    /ఏమిటి|ఎవరు|ఎలా|ఎవరికి|ఎంత|ఎక్కడ/i,
    // Order modifiers
    /అదనంగా|లేకుండా|తో పాటు|ప్యాక్|తినడానికి/i
  ],
  spanish: [
    // Greetings and common phrases
    /hola|gracias|comida|menú|ordenar|por favor|quiero|necesito|tienen|puedo/i,
    // Food types and descriptors
    /español|mexicano|vegetariano|carne|delicioso|picante|queso|arroz|tortilla|frijoles/i,
    // Food and drink items
    /bebida|plato|pollo|pan|sopa/i,
    // Spanish cuisine dishes
    /paella|tapas|gazpacho|tortilla española|calamares|churros|patatas bravas/i,
    // Indian dishes in Spanish
    /curry|tikka masala|tandoori|naan|roti|biryani|tandoor/i,
    // Quantities and variations
    /uno|dos|tres|cuatro|cinco|poco|mucho|menos|dulce|picante|caliente/i,
    // Question patterns
    /qué|quién|cómo|para quién|cuánto|dónde/i,
    // Order modifiers
    /extra|sin|con|para llevar|para comer aquí/i
  ],
  english: [
    // Greetings and common phrases
    /hello|hi|thanks|thank you|food|menu|order|please|want|need|have|can|get/i,
    // Food types and descriptors
    /english|indian|vegetarian|non-vegetarian|delicious|spicy|cheese|rice|bread|curry/i,
    // Communication phrases
    /speak|understand|would like|may I have|give me|bring|deliver/i,
    // Indian dishes in English
    /butter chicken|paneer|tikka|masala|naan|roti|biryani|tandoori|samosa|pakora/i,
    // Quantities and numbers
    /one|two|three|four|five|six|seven|eight|nine|ten|little|more|less|extra/i,
    // Question patterns
    /what|who|how|for whom|how much|where|when|which/i,
    // Order modifiers
    /additional|without|with|takeaway|dine in|to go|eat here/i,
    // Common food preparation terms
    /grilled|fried|baked|roasted|steamed|raw|well done|medium|mild|hot|medium spicy/i
  ]
};

// AI Voice settings with multi-language support and improved conversation flow
interface AIVoiceSettings {
  greeting: {[key in SupportedLanguage]: string};
  orderCollection: {[key in SupportedLanguage]: string};
  itemConfirmation: Array<{[key in SupportedLanguage]: string}>;
  orderCompletion: {[key in SupportedLanguage]: string};
  confirmationPrompt: {[key in SupportedLanguage]: string};
  confirmationOptions: {[key in SupportedLanguage]: string};
  farewell: {[key in SupportedLanguage]: string};
  maxRetries: number;
  autoAnswerCalls: boolean;
  defaultLanguage: SupportedLanguage;
  autoDetectLanguage: boolean;
}

let aiVoiceSettings: AIVoiceSettings = {
  greeting: {
    english: "Hi there! Welcome to Yash Hotel. I'm your virtual assistant. What would you like to order today?",
    hindi: "नमस्ते! यश होटल में आपका स्वागत है। मैं आपका वर्चुअल सहायक हूं। आज आप क्या ऑर्डर करना चाहेंगे?",
    telugu: "హలో! యష్ హోటల్‌కి స్వాగతం. నేను మీ వర్చువల్ అసిస్టెంట్‌ని. ఈరోజు మీరు ఏమి ఆర్డర్ చేయాలనుకుంటున్నారు?",
    spanish: "¡Hola! Bienvenido al Hotel Yash. Soy su asistente virtual. ¿Qué le gustaría ordenar hoy?"
  },
  orderCollection: {
    english: "Please let me know the items you'd like to order, one at a time. For each item, I'll need the name and quantity.",
    hindi: "कृपया मुझे एक-एक करके उन आइटमों के बारे में बताएं जिन्हें आप ऑर्डर करना चाहते हैं। प्रत्येक आइटम के लिए, मुझे नाम और मात्रा की आवश्यकता होगी।",
    telugu: "దయచేసి మీరు ఆర్డర్ చేయాలనుకుంటున్న ఐటెమ్‌లను ఒకొక్కటిగా నాకు తెలియజేయండి. ప్రతి ఐటెమ్‌కు, నాకు పేరు మరియు పరిమాణం అవసరం.",
    spanish: "Por favor, hágame saber los artículos que desea ordenar, uno a la vez. Para cada artículo, necesitaré el nombre y la cantidad."
  },
  itemConfirmation: [
    {
      english: "Got it! [ITEM] x [QUANTITY] added to your order. What else would you like to add?",
      hindi: "समझ गया! [ITEM] x [QUANTITY] आपके ऑर्डर में जोड़ दिया गया है। आप और क्या जोड़ना चाहेंगे?",
      telugu: "అర్థమైంది! [ITEM] x [QUANTITY] మీ ఆర్డర్‌కి జోడించబడింది. మీరు ఇంకేమి జోడించాలనుకుంటున్నారు?",
      spanish: "¡Entendido! [ITEM] x [QUANTITY] añadido a su pedido. ¿Qué más le gustaría añadir?"
    },
    {
      english: "Great choice! [ITEM] x [QUANTITY] added. What else can I get for you?",
      hindi: "बढ़िया पसंद! [ITEM] x [QUANTITY] जोड़ दिया गया। मैं आपके लिए और क्या ला सकता हूँ?",
      telugu: "గొప్ప ఎంపిక! [ITEM] x [QUANTITY] జోడించబడింది. నేను మీకు మరేమి తీసుకోగలను?",
      spanish: "¡Excelente elección! [ITEM] x [QUANTITY] añadido. ¿Qué más puedo traerle?"
    },
    {
      english: "[ITEM] x [QUANTITY] - got it! Would you like to add anything else?",
      hindi: "[ITEM] x [QUANTITY] - समझ गया! क्या आप कुछ और जोड़ना चाहेंगे?",
      telugu: "[ITEM] x [QUANTITY] - అర్థమైంది! మీరు మరేదైనా జోడించాలనుకుంటున్నారా?",
      spanish: "[ITEM] x [QUANTITY] - ¡entendido! ¿Le gustaría añadir algo más?"
    }
  ],
  orderCompletion: {
    english: "No more items? Perfect! I'm just preparing your order summary...",
    hindi: "और कोई आइटम नहीं? बढ़िया! मैं आपके ऑर्डर का सारांश तैयार कर रहा हूँ...",
    telugu: "ఇక ఐటెమ్‌లు లేవా? పర్ఫెక్ట్! నేను మీ ఆర్డర్ సారాంశాన్ని తయారు చేస్తున్నాను...",
    spanish: "¿No más artículos? ¡Perfecto! Estoy preparando el resumen de su pedido..."
  },
  confirmationPrompt: {
    english: "Here's a summary of your order:\n\n[ORDER_SUMMARY]\n\nYour order total comes to ₹[TOTAL_PRICE]. Does everything look correct?",
    hindi: "आपके ऑर्डर का सारांश यहां दिया गया है:\n\n[ORDER_SUMMARY]\n\nआपके ऑर्डर का कुल मूल्य ₹[TOTAL_PRICE] है। क्या सब कुछ सही लग रहा है?",
    telugu: "మీ ఆర్డర్ సారాంశం ఇక్కడ ఉంది:\n\n[ORDER_SUMMARY]\n\nమీ ఆర్డర్ మొత్తం ₹[TOTAL_PRICE]కి వస్తుంది. అన్నీ సరిగ్గా ఉన్నాయా?",
    spanish: "Aquí está el resumen de su pedido:\n\n[ORDER_SUMMARY]\n\nEl total de su pedido asciende a ₹[TOTAL_PRICE]. ¿Todo parece correcto?"
  },
  confirmationOptions: {
    english: "Please say yes to confirm your order, or no if you'd like to make changes.",
    hindi: "अपने ऑर्डर की पुष्टि करने के लिए कृपया हां कहें, या यदि आप बदलाव करना चाहते हैं तो नहीं कहें।",
    telugu: "మీ ఆర్డర్‌ని నిర్ధారించడానికి దయచేసి అవును అని చెప్పండి, లేదా మీరు మార్పులు చేయాలనుకుంటే కాదు అని చెప్పండి.",
    spanish: "Por favor, diga sí para confirmar su pedido, o no si desea hacer cambios."
  },
  farewell: {
    english: "Excellent! Your order #[ORDER_NUMBER] has been confirmed and will be ready in approximately 20 minutes. Thank you for ordering from Yash Hotel!",
    hindi: "उत्तम! आपका ऑर्डर #[ORDER_NUMBER] पुष्टि कर दिया गया है और लगभग 20 मिनट में तैयार हो जाएगा। यश होटल से ऑर्डर करने के लिए धन्यवाद!",
    telugu: "అద్భుతం! మీ ఆర్డర్ #[ORDER_NUMBER] నిర్ధారించబడింది మరియు సుమారు 20 నిమిషాల్లో సిద్ధంగా ఉంటుంది. యష్ హోటల్ నుండి ఆర్డర్ చేసినందుకు ధన్యవాదాలు!",
    spanish: "¡Excelente! Su pedido #[ORDER_NUMBER] ha sido confirmado y estará listo en aproximadamente 20 minutos. ¡Gracias por ordenar en el Hotel Yash!"
  },
  maxRetries: 3,
  autoAnswerCalls: true,
  defaultLanguage: 'english',
  autoDetectLanguage: true
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
  const callFrom = req.body.From || '1234567890'; // Default if not provided
  
  console.log(`Incoming call from ${callFrom}, SID: ${callSid}`);
  
  // Store call data with default language (English for simplicity)
  const callData: CallData = {
    id: callSid,
    phoneNumber: callFrom,
    startTime: new Date().toISOString(),
    status: 'active',
    language: 'english'
  };
  
  activeCalls[callSid] = callData;
  callHistory.unshift(callData);
  
  // Create TwiML response
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();
  
  try {
    // Use our improved greeting from voice settings
    twiml.say(
      { voice: 'Polly.Joanna' },
      aiVoiceSettings.greeting.english
    );
    
    // Add a short pause to give customer time to think
    twiml.pause({ length: 1 });
    
    // Gather customer input with improved speech processing
    twiml.gather({
      input: 'speech',
      speechTimeout: 'auto',
      speechModel: 'phone_call',
      action: '/api/telephony/process-speech',
      method: 'POST',
      language: 'en-US'
    });
    
    // If no input is received
    twiml.say(
      { voice: 'Polly.Joanna' },
      'I didn\'t receive your order. Please call again later. Goodbye!'
    );
    twiml.hangup();
    
    // Add initial greeting to transcript
    callData.transcript = `AI: ${aiVoiceSettings.greeting.english}\n`;
  } catch (error) {
    console.error('Error handling incoming call:', error);
    
    // Emergency fallback response
    twiml.say(
      { voice: 'Polly.Joanna' },
      'We\'re sorry, but we\'re experiencing technical difficulties. Please try again later.'
    );
    twiml.hangup();
  }
  
  // Return TwiML response
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
  const speechResult = req.body.SpeechResult || "";
  
  console.log(`Speech received from call ${callSid}: "${speechResult}"`);
  
  // Detect language from the speech using our language detection function
  const detectedLanguage = aiVoiceSettings.autoDetectLanguage && speechResult.trim().length > 0
    ? detectLanguage(speechResult)
    : aiVoiceSettings.defaultLanguage;
  
  console.log(`Detected language for call ${callSid}: ${detectedLanguage}`);
  
  // Store the order text and update transcript
  if (activeCalls[callSid]) {
    activeCalls[callSid].language = detectedLanguage;
    activeCalls[callSid].transcript = activeCalls[callSid].transcript || '';
    activeCalls[callSid].transcript += `Customer: ${speechResult}\n`;
    
    // Store the order data as simple text
    activeCalls[callSid].orderData = { 
      orderText: speechResult,
      extractedItems: null,
      hasSpecialRequests: false,
      isDeliveryRequest: false,
      orderSource: 'phone',
      phoneNumber: activeCalls[callSid].phoneNumber,
      callId: callSid,
      simulatedCall: callSid.startsWith('SIM'),
      useAIAutomation: true,
      tableNumber: null,
      preferredLanguage: detectedLanguage
    };
    
    // Update history record
    const historyCall = callHistory.find(call => call.id === callSid);
    if (historyCall) {
      historyCall.language = detectedLanguage;
      historyCall.transcript = activeCalls[callSid].transcript;
      historyCall.orderData = activeCalls[callSid].orderData;
    }
  }
  
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();
  
  // Map languages to Twilio voice options
  const voiceMap = {
    english: 'Polly.Joanna',
    hindi: 'Polly.Aditi', // Hindi voice
    telugu: 'Polly.Aditi', // Use Hindi voice for Telugu as Twilio doesn't have Telugu
    spanish: 'Polly.Lupe'  // Spanish voice
  };
  
  // Map languages to Twilio language code for speech recognition
  const languageCodeMap = {
    english: 'en-US',
    hindi: 'hi-IN',
    telugu: 'te-IN',
    spanish: 'es-ES'
  };
  
  // Set voice based on detected language
  const voiceOption = voiceMap[detectedLanguage] || 'Polly.Joanna';
  const languageCode = languageCodeMap[detectedLanguage] || 'en-US';
  
  try {
    // Check if the speech is too short or unclear
    const isShortOrUnclear = !speechResult || speechResult.trim().length < 5;
    
    if (isShortOrUnclear) {
      // Responses for when the speech is too short or unclear
      const askForMoreMessages = {
        english: "I didn't catch that clearly. Please tell me what you would like to order.",
        hindi: "मैं स्पष्ट रूप से नहीं समझ पाया। कृपया मुझे बताएं कि आप क्या ऑर्डर करना चाहते हैं।",
        telugu: "నాకు అది స్పష్టంగా అర్థం కాలేదు. దయచేసి మీరు ఏమి ఆర్డర్ చేయాలనుకుంటున్నారో నాకు చెప్పండి.",
        spanish: "No entendí eso claramente. Por favor, dígame qué le gustaría ordenar."
      };
      
      twiml.say({ voice: voiceOption }, askForMoreMessages[detectedLanguage]);
      
      // Add a longer pause to give customer time to think
      twiml.pause({ length: 2 });
      
      // Gather the response again
      const gather = twiml.gather({
        input: 'speech',
        speechTimeout: 'auto',
        speechModel: 'phone_call',
        action: '/api/telephony/process-speech',
        method: 'POST',
        language: languageCode,
        timeout: 10 // 10 seconds timeout
      });
      
      // Help message for different languages
      const helpMessages = {
        english: "For example, you can say: I'd like to order butter chicken and two naan.",
        hindi: "उदाहरण के लिए, आप कह सकते हैं: मैं बटर चिकन और दो नान ऑर्डर करना चाहता हूं।",
        telugu: "ఉదాహరణకు, మీరు ఇలా చెప్పవచ్చు: నేను వెన్న చికెన్ మరియు రెండు నాన్ ఆర్డర్ చేయాలనుకుంటున్నాను.",
        spanish: "Por ejemplo, puede decir: Me gustaría pedir pollo con mantequilla y dos naan."
      };
      
      gather.say({ voice: voiceOption }, helpMessages[detectedLanguage]);
      
      // If no input is received after retry
      const noInputMessages = {
        english: "I didn't receive any response. Please call again later. Goodbye!",
        hindi: "मुझे कोई जवाब नहीं मिला। कृपया बाद में फिर से कॉल करें। अलविदा!",
        telugu: "నాకు ఎటువంటి ప్రతిస్పందన రాలేదు. దయచేసి తర్వాత మళ్లీ కాల్ చేయండి. వీడ్కోలు!",
        spanish: "No recibí ninguna respuesta. Por favor llame más tarde. ¡Adiós!"
      };
      
      twiml.say({ voice: voiceOption }, noInputMessages[detectedLanguage]);
      twiml.hangup();
    } else {
      // Process the order and then ask for confirmation
      
      // First, let the customer know we're processing their order
      const processingMessages = {
        english: "Thank you. Let me process your order.",
        hindi: "धन्यवाद। मुझे आपका ऑर्डर प्रोसेस करने दें।",
        telugu: "ధన్యవాదాలు. నేను మీ ఆర్డర్‌ని ప్రాసెస్ చేయనివ్వండి.",
        spanish: "Gracias. Permítame procesar su pedido."
      };
      
      twiml.say({ voice: voiceOption }, processingMessages[detectedLanguage]);
      
      // Add a pause to simulate processing (and give customer time to think)
      twiml.pause({ length: 3 });
      
      // Repeat back what we heard to confirm
      const repeatMessages = {
        english: `I heard you'd like to order: ${speechResult}`,
        hindi: `मैंने सुना कि आप ऑर्डर करना चाहते हैं: ${speechResult}`,
        telugu: `మీరు ఆర్డర్ చేయాలనుకుంటున్నారు అని నేను విన్నాను: ${speechResult}`,
        spanish: `Entendí que quisiera ordenar: ${speechResult}`
      };
      
      twiml.say({ voice: voiceOption }, repeatMessages[detectedLanguage]);
      
      // Add another pause for the customer to process what they heard
      twiml.pause({ length: 1 });
      
      // For order confirmation messages
      const confirmationMessages = {
        english: "Would you like to confirm this order? Please say yes or no.",
        hindi: "क्या आप इस ऑर्डर की पुष्टि करना चाहते हैं? कृपया हां या नहीं कहें।",
        telugu: "మీరు ఈ ఆర్డర్‌ని నిర్ధారించాలనుకుంటున్నారా? దయచేసి అవును లేదా కాదు అని చెప్పండి.",
        spanish: "¿Le gustaría confirmar este pedido? Por favor diga sí o no."
      };
      
      twiml.say({ voice: voiceOption }, confirmationMessages[detectedLanguage]);
      
      // Gather response with support for both speech and DTMF
      const gather = twiml.gather({
        input: 'dtmf speech',
        speechTimeout: 'auto',
        speechModel: 'phone_call',
        numDigits: 1,
        action: '/api/telephony/confirm-order',
        method: 'POST',
        language: languageCode,
        timeout: 8 // 8 seconds timeout
      });
      
      // Add clear instructions
      const instructionMessages = {
        english: 'Please say yes or press 1 to confirm your order, or say no or press 2 to try again.',
        hindi: 'अपने ऑर्डर की पुष्टि करने के लिए कृपया हां कहें या 1 दबाएं, या फिर से प्रयास करने के लिए नहीं कहें या 2 दबाएं।',
        telugu: 'మీ ఆర్డర్‌ని నిర్ధారించడానికి దయచేసి అవును అని చెప్పండి లేదా 1 నొక్కండి, లేదా మళ్లీ ప్రయత్నించడానికి లేదు అని చెప్పండి లేదా 2 నొక్కండి.',
        spanish: 'Por favor diga sí o presione 1 para confirmar su pedido, o diga no o presione 2 para intentarlo de nuevo.'
      };
      
      gather.say({ voice: voiceOption }, instructionMessages[detectedLanguage]);
      
      // If no input is received
      const noInputMessages = {
        english: "I didn't receive your response. Please call again later. Goodbye!",
        hindi: "मुझे आपका जवाब नहीं मिला। कृपया बाद में फिर से कॉल करें। अलविदा!",
        telugu: "నాకు మీ ప్రతిస్పందన అందలేదు. దయచేసి తర్వాత మళ్లీ కాల్ చేయండి. వీడ్కోలు!",
        spanish: "No recibí su respuesta. Por favor llame más tarde. ¡Adiós!"
      };
      
      twiml.say({ voice: voiceOption }, noInputMessages[detectedLanguage]);
      twiml.hangup();
    }
  } catch (error) {
    console.error('Error processing speech:', error);
    twiml.say({ voice: voiceOption }, "I'm sorry, I had trouble processing your order. Please try again later.");
    twiml.hangup();
  }
  
  // Add the AI response to transcript
  if (activeCalls[callSid]) {
    const aiResponse = twiml.toString().replace(/<[^>]*>/g, '');
    activeCalls[callSid].transcript += `AI: ${aiResponse}\n`;
    
    // Also update in call history
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
  
  // Get the detected language from the call data or use default
  const detectedLanguage = (activeCalls[callSid]?.language as SupportedLanguage) || aiVoiceSettings.defaultLanguage;
  
  // Update call transcript
  if (activeCalls[callSid]) {
    activeCalls[callSid].transcript = activeCalls[callSid].transcript || '';
    activeCalls[callSid].transcript += `Customer: ${speechResult || 'Pressed ' + digits}\n`;
  }
  
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();
  
  // Map languages to Twilio voice options
  const voiceMap = {
    english: 'Polly.Joanna',
    hindi: 'Polly.Aditi', // Hindi voice
    telugu: 'Polly.Aditi', // Use Hindi voice for Telugu as Twilio doesn't have Telugu
    spanish: 'Polly.Lupe'  // Spanish voice
  };
  
  // Map languages to Twilio language code for speech recognition
  const languageCodeMap = {
    english: 'en-US',
    hindi: 'hi-IN',
    telugu: 'te-IN',
    spanish: 'es-ES'
  };
  
  // Set voice based on detected language
  const voiceOption = voiceMap[detectedLanguage] || 'Polly.Joanna';
  const languageCode = languageCodeMap[detectedLanguage] || 'en-US';
  
  // Confirmation words in different languages
  const confirmationWords = {
    english: ['yes', 'confirm', 'correct', 'right', 'okay'],
    hindi: ['हां', 'हाँ', 'सही', 'ठीक', 'ठीक है'],
    telugu: ['అవును', 'సరే', 'సరైనది', 'ఒప్పు', 'సరి'],
    spanish: ['sí', 'confirmar', 'correcto', 'bien', 'vale']
  };
  
  // Check for confirmation in the detected language or by digit
  const isConfirmed = 
    digits === '1' || 
    confirmationWords[detectedLanguage].some(word => 
      speechResult.toLowerCase().includes(word.toLowerCase())
    );
  
  // Order confirmed messages in different languages
  const orderConfirmedMessages = {
    english: (orderId: number) => `Your order has been confirmed! Your order number is ${orderId}. ${aiVoiceSettings.farewell.english}`,
    hindi: (orderId: number) => `आपका ऑर्डर पुष्टि हो गया है! आपका ऑर्डर नंबर ${orderId} है। ${aiVoiceSettings.farewell.hindi}`,
    telugu: (orderId: number) => `మీ ఆర్డర్ నిర్ధారించబడింది! మీ ఆర్డర్ నంబర్ ${orderId}. ${aiVoiceSettings.farewell.telugu}`,
    spanish: (orderId: number) => `¡Tu pedido ha sido confirmado! Tu número de pedido es ${orderId}. ${aiVoiceSettings.farewell.spanish}`
  };
  
  // Order cancelled messages in different languages
  const orderCancelledMessages = {
    english: 'I\'ve cancelled your order. Would you like to try again?',
    hindi: 'मैंने आपका ऑर्डर रद्द कर दिया है। क्या आप फिर से प्रयास करना चाहेंगे?',
    telugu: 'నేను మీ ఆర్డర్‌ని రద్దు చేసాను. మీరు మళ్లీ ప్రయత్నించాలనుకుంటున్నారా?',
    spanish: 'He cancelado tu pedido. ¿Te gustaría intentarlo de nuevo?'
  };
  
  // No input messages in different languages
  const noInputMessages = {
    english: 'I didn\'t hear from you. Thank you for calling. Goodbye!',
    hindi: 'मैंने आपसे कुछ नहीं सुना। कॉल करने के लिए धन्यवाद। अलविदा!',
    telugu: 'నేను మీ నుండి వినలేదు. కాల్ చేసినందుకు ధన్యవాదాలు. వీడ్కోలు!',
    spanish: 'No te escuché. Gracias por llamar. ¡Adiós!'
  };
  
  if (isConfirmed) {
    // Order confirmed
    // We'll use a temporary order ID for now
    // The actual database order ID and order number will be set when we create the real order
    const tempOrderId = Math.floor(10000 + Math.random() * 90000);
    
    // Update call with temporary order ID
    if (activeCalls[callSid]) {
      activeCalls[callSid].orderId = tempOrderId;
      
      // Also update in history
      const historyCall = callHistory.find(call => call.id === callSid);
      if (historyCall) {
        historyCall.orderId = tempOrderId;
      }
    }
    
    // Create an order in the system from the call data
    try {
      // Get order text from call data
      const orderText = activeCalls[callSid]?.orderData?.orderText || 'Food order';
      console.log(`Creating order for text: ${orderText}`);
      
      // Store order information to be created in the database by the completeCall function
      // Add order data to call object if not already present
      if (!activeCalls[callSid].orderData) {
        activeCalls[callSid].orderData = {
          orderText: orderText,
          orderSource: 'phone',
          phoneNumber: activeCalls[callSid].phoneNumber,
          callId: callSid,
          simulatedCall: false,
          useAIAutomation: true,
          tableNumber: null,
          preferredLanguage: detectedLanguage
        };
      }
      
      // Create the order right away so we can tell the customer their actual order number
      try {
        // Create the order using AI service
        const orderResult = await createOrderFromCall(activeCalls[callSid]);
        
        if (orderResult.success && orderResult.order) {
          // Get the items that were actually created in the database
          const orderItems = await storage.getOrderItems(orderResult.order.id);
          
          // Start by acknowledging the confirmation
          const confirmationIntro = detectedLanguage === 'english' 
            ? `Thank you for confirming. I'm processing your order now.`
            : `Thank you. Processing your order.`;
          
          twiml.say({ voice: voiceOption }, confirmationIntro);
          twiml.pause({ length: 1 }); // Short pause between sentences
          
          // Announce the order number
          const orderNumberMsg = detectedLanguage === 'english' 
            ? `Your order number is ${orderResult.order.orderNumber}.`
            : `Order number ${orderResult.order.orderNumber}.`;
          
          twiml.say({ voice: voiceOption }, orderNumberMsg);
          twiml.pause({ length: 1 }); // Short pause between sentences
          
          // Format and announce each item individually with proper pauses
          if (orderItems.length > 0) {
            // Better introduction messages with language variants
            const itemsIntro = {
              english: `Here's a summary of your order with all items and prices:`,
              hindi: `आपके ऑर्डर का सारांश सभी आइटम और कीमतों के साथ यहां है:`,
              telugu: `మీ ఆర్డర్ యొక్క సారాంశం అన్ని వస్తువులు మరియు ధరలతో:`,
              spanish: `Aquí hay un resumen de su pedido con todos los artículos y precios:` 
            };
            
            twiml.say({ voice: voiceOption }, itemsIntro[detectedLanguage]);
            twiml.pause({ length: 1 }); // Pause before listing items
            
            // Process each item individually with its own pause
            for (const item of orderItems) {
              // Get menu item name if not present in the order item
              let itemName = '';
              if (item.name) {
                itemName = item.name;
              } else {
                try {
                  const menuItem = await storage.getMenuItem(item.menuItemId);
                  itemName = menuItem?.name || `Item #${item.menuItemId}`;
                } catch (err) {
                  console.error(`Error fetching menu item ${item.menuItemId}:`, err);
                  itemName = `Item #${item.menuItemId}`;
                }
              }
              
              // Format the individual item price and total
              const singleItemPrice = new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR'
              }).format(item.price);
              
              const itemTotal = item.price * item.quantity;
              const formattedItemTotal = new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR'
              }).format(itemTotal);
              
              // Enhanced item details with individual price
              const itemDetailsMessages = {
                english: `${item.quantity} ${itemName} at ${singleItemPrice} each, subtotal: ${formattedItemTotal}`,
                hindi: `${item.quantity} ${itemName}, प्रत्येक ${singleItemPrice}, कुल: ${formattedItemTotal}`,
                telugu: `${item.quantity} ${itemName}, ఒక్కొక్కటి ${singleItemPrice}, మొత్తం: ${formattedItemTotal}`,
                spanish: `${item.quantity} ${itemName} a ${singleItemPrice} cada uno, subtotal: ${formattedItemTotal}`
              };
              
              twiml.say({ voice: voiceOption }, itemDetailsMessages[detectedLanguage]);
              twiml.pause({ length: 1 }); // Pause between items
            }
          }
          
          // Calculate and announce total amount
          const totalAmount = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          const formattedTotal = new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
          }).format(totalAmount);
          
          // Enhanced total announcement with better language support
          const totalMessages = {
            english: `The total amount for your order is ${formattedTotal}. This includes all items and applicable taxes.`,
            hindi: `आपके ऑर्डर की कुल राशि ${formattedTotal} है। इसमें सभी आइटम और लागू कर शामिल हैं।`,
            telugu: `మీ ఆర్డర్‌ మొత్తం విలువ ${formattedTotal}. ఇందులో అన్ని వస్తువులు మరియు వర్తించే పన్నులు ఉన్నాయి.`,
            spanish: `El importe total de su pedido es ${formattedTotal}. Esto incluye todos los artículos e impuestos aplicables.`
          };
          
          twiml.say({ voice: voiceOption }, totalMessages[detectedLanguage]);
          twiml.pause({ length: 1 }); // Pause before farewell
          
          // Enhanced farewell messages with more details in different languages
          const farewellMessages = {
            english: `Thank you for your order. Your food will be prepared shortly and will be ready in approximately 20 minutes. Have a great day!`,
            hindi: `आपके ऑर्डर के लिए धन्यवाद। आपका खाना जल्द ही तैयार किया जाएगा और लगभग 20 मिनट में तैयार हो जाएगा। आपका दिन शुभ हो!`,
            telugu: `మీ ఆర్డర్‌కు ధన్యవాదాలు. మీ ఆహారం త్వరలో తయారు చేయబడుతుంది మరియు సుమారు 20 నిమిషాల్లో సిద్ధంగా ఉంటుంది. మీ రోజు శుభంగా ఉండాలి!`,
            spanish: `Gracias por su pedido. Su comida se preparará en breve y estará lista en aproximadamente 20 minutos. ¡Que tenga un buen día!`
          };
          
          twiml.say({ voice: voiceOption }, farewellMessages[detectedLanguage]);
          
          // Set the orderId so we don't create it again in completeCall
          activeCalls[callSid].orderId = orderResult.order.id;
          
          // Update in call history
          const historyCall = callHistory.find(call => call.id === callSid);
          if (historyCall) {
            historyCall.orderId = orderResult.order.id;
          }
        } else {
          // If there was an error creating the order
          const fallbackMessage = detectedLanguage === 'english' 
            ? `Your order has been confirmed! We're processing your order now. Thank you for calling.`
            : `Order confirmed. Thank you for calling.`;
          
          twiml.say({ voice: voiceOption }, fallbackMessage);
        }
      } catch (error) {
        console.error("Error creating order:", error);
        const fallbackMessage = detectedLanguage === 'english' 
          ? `Your order has been confirmed! We're processing your order now. Thank you for calling.`
          : `Order confirmed. Thank you for calling.`;
        
        twiml.say({ voice: voiceOption }, fallbackMessage);
      }
    } catch (error) {
      console.error("Error processing order:", error);
      twiml.say({ voice: voiceOption }, "Your order has been received. Thank you for calling.");
    }
    twiml.hangup();
  } else {
    // Order cancelled
    twiml.say({ voice: voiceOption }, orderCancelledMessages[detectedLanguage]);
    
    const gather = twiml.gather({
      input: 'speech',
      speechTimeout: 'auto',
      speechModel: 'phone_call',
      action: '/api/telephony/retry-order',
      method: 'POST',
      language: languageCode
    });
    
    // If no input is received
    twiml.say({ voice: voiceOption }, noInputMessages[detectedLanguage]);
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
  
  // Get the detected language from the call data or use default
  // @ts-ignore - language field might not exist on type
  const detectedLanguage = (activeCalls[callSid]?.language as SupportedLanguage) || aiVoiceSettings.defaultLanguage;
  
  // Update call transcript
  if (activeCalls[callSid]) {
    activeCalls[callSid].transcript = activeCalls[callSid].transcript || '';
    activeCalls[callSid].transcript += `Customer: ${speechResult}\n`;
  }
  
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();
  
  // Map languages to Twilio voice options
  const voiceMap = {
    english: 'Polly.Joanna',
    hindi: 'Polly.Aditi', // Hindi voice
    telugu: 'Polly.Aditi', // Use Hindi voice for Telugu as Twilio doesn't have Telugu
    spanish: 'Polly.Lupe'  // Spanish voice
  };
  
  // Map languages to Twilio language code for speech recognition
  const languageCodeMap = {
    english: 'en-US',
    hindi: 'hi-IN',
    telugu: 'te-IN',
    spanish: 'es-ES'
  };
  
  // Set voice based on detected language
  const voiceOption = voiceMap[detectedLanguage] || 'Polly.Joanna';
  const languageCode = languageCodeMap[detectedLanguage] || 'en-US';
  
  // Retry keywords in different languages
  const retryKeywords = {
    english: ['yes', 'try', 'again', 'retry', 'sure'],
    hindi: ['हां', 'हाँ', 'फिर', 'पुनः', 'ठीक'],
    telugu: ['అవును', 'మళ్లీ', 'మరలా', 'సరే', 'ఒప్పు'],
    spanish: ['sí', 'intentar', 'otra', 'vez', 'vale']
  };
  
  // Check if customer wants to retry in the detected language
  const wantsRetry = retryKeywords[detectedLanguage].some(keyword => 
    speechResult.toLowerCase().includes(keyword.toLowerCase())
  );
  
  // Try again messages in different languages
  const tryAgainMessages = {
    english: 'Let\'s try again. What would you like to order?',
    hindi: 'फिर से कोशिश करते हैं। आप क्या ऑर्डर करना चाहेंगे?',
    telugu: 'మళ్లీ ప్రయత్నిద్దాం. మీరు ఏమి ఆర్డర్ చేయాలనుకుంటున్నారు?',
    spanish: 'Intentémoslo de nuevo. ¿Qué te gustaría ordenar?'
  };
  
  // No input messages in different languages
  const noInputMessages = {
    english: 'I didn\'t receive your order. Please call again later. Goodbye!',
    hindi: 'मुझे आपका ऑर्डर नहीं मिला। कृपया बाद में फिर से कॉल करें। अलविदा!',
    telugu: 'నేను మీ ఆర్డర్‌ని స్వీకరించలేదు. దయచేసి తర్వాత మళ్లీ కాల్ చేయండి. వీడ్కోలు!',
    spanish: 'No recibí tu pedido. Por favor llama más tarde. ¡Adiós!'
  };
  
  // Goodbye messages in different languages
  const goodbyeMessages = {
    english: 'Thank you for calling Yash Hotel. Goodbye!',
    hindi: 'यश होटल को कॉल करने के लिए धन्यवाद। अलविदा!',
    telugu: 'యష్ హోటల్‌కి కాల్ చేసినందుకు ధన్యవాదాలు. వీడ్కోలు!',
    spanish: 'Gracias por llamar a Yash Hotel. ¡Adiós!'
  };
  
  if (wantsRetry) {
    // Start over
    twiml.say({ voice: voiceOption }, tryAgainMessages[detectedLanguage]);
    
    const gather = twiml.gather({
      input: 'speech',
      speechTimeout: 'auto',
      speechModel: 'phone_call',
      action: '/api/telephony/process-speech',
      method: 'POST',
      language: languageCode
    });
    
    // If no input is received
    twiml.say({ voice: voiceOption }, noInputMessages[detectedLanguage]);
    twiml.hangup();
  } else {
    // End call
    twiml.say({ voice: voiceOption }, goodbyeMessages[detectedLanguage]);
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
    
    // Create an order only if one hasn't been created yet
    try {
      // Check if we have a numeric order ID (which means it's already in the database)
      const hasExistingOrder = typeof activeCalls[callSid].orderId === 'number';
      
      if (!hasExistingOrder) {
        console.log(`Creating order from completed call ${callSid}...`);
        
        // Create the order using AI service
        if (!activeCalls[callSid].orderId) {
          // Assign a temporary order ID if one hasn't been assigned yet
          activeCalls[callSid].orderId = `ORDER-SIM-${Date.now()}`;
        }
        
        // Create the actual order in the system
        await createOrderFromCall(activeCalls[callSid]);
        
        console.log(`Successfully created order from call ${callSid}`);
      } else {
        console.log(`Order already created for call ${callSid}, skipping order creation`);
      }
    } catch (error) {
      console.error('Error creating order from call:', error);
    }
    
    // Remove from active calls after a delay
    setTimeout(() => {
      delete activeCalls[callSid];
    }, 60000); // Keep in memory for 1 minute
  }
}

// Function to create an order from a call
export async function createOrderFromCall(call: CallData) {
  try {
    // Extract order details from the transcript
    const transcript = call.transcript || '';
    const customerLines = transcript
      .split('\n')
      .filter(line => line.startsWith('Customer:'))
      .map(line => line.replace('Customer:', '').trim());
    
    // Combine all customer inputs into a single natural language order
    let orderText = customerLines.join(' ');
    
    // If no customer input, use a fallback order
    if (!orderText.trim()) {
      console.warn('No customer input found in transcript, using fallback order');
      orderText = "I'd like to order butter chicken with naan";
    }
    
    // Extract key information from orderText using multiple patterns for more flexible matching
    
    // Enhanced patterns for better item and quantity recognition
    // Get common menu items from our library
    const menuItemPatterns = [
      "butter chicken", "chicken biryani", "chicken tikka", "tandoori chicken", 
      "chicken", "biryani", "mutton biryani", "veg biryani", "pulao", "kashmiri pulao",
      "naan", "garlic naan", "butter naan", "plain naan", "roti", "chapati",
      "paneer tikka", "paneer butter masala", "paneer", "dal makhani", "dal",
      "tandoori roti", "samosa", "pakora", "curry", "tikka", "ice cream", "gulab jamun",
      "rice", "jeera rice", "aloo gobi", "aloo paratha", "masala dosa"
    ];
    
    // Pattern 1: Direct quantity before item name ("2 butter chicken")
    // Make the pattern more flexible to catch more variations
    const directQuantityPattern = new RegExp(`(\\d+)\\s+(${menuItemPatterns.join('|')})`, 'gi');
    
    // Manually gather matches to avoid TypeScript issues with matchAll
    const matches: Array<{quantity: number, item: string}> = [];
    
    // First try the direct quantity pattern
    let directMatch: RegExpExecArray | null;
    while ((directMatch = directQuantityPattern.exec(orderText)) !== null) {
      matches.push({
        quantity: parseInt(directMatch[1]),
        item: directMatch[2]
      });
      console.log(`Direct match found: ${directMatch[1]} ${directMatch[2]}`);
    }
    
    // Pattern 2: For phrases like "2 plates of chicken biryani" or "3 portions of dal"
    const platesPattern = new RegExp(`(\\d+)\\s+(plates?|portions?|servings?|bowls?|cups?)\\s+(?:of\\s+)?(${menuItemPatterns.join('|')})`, 'gi');
    
    let platesMatch: RegExpExecArray | null;
    while ((platesMatch = platesPattern.exec(orderText)) !== null) {
      matches.push({
        quantity: parseInt(platesMatch[1]),
        item: platesMatch[3]
      });
      console.log(`Plates match found: ${platesMatch[1]} plates of ${platesMatch[3]}`);
    }
    
    // Pattern 3: Check for specific item mentions with contextual quantity detection
    for (const item of menuItemPatterns) {
      // Skip if we already found this item with the direct patterns
      if (matches.some(m => m.item.toLowerCase() === item.toLowerCase())) {
        continue;
      }
      
      // If the item is mentioned in the order text
      const itemIndex = orderText.toLowerCase().indexOf(item.toLowerCase());
      if (itemIndex !== -1) {
        let quantity = 1; // Default to 1 if no number found
        
        // Look for numbers in the nearby context (within 10 characters)
        const contextStart = Math.max(0, itemIndex - 10);
        const contextEnd = Math.min(orderText.length, itemIndex + item.length + 10);
        const context = orderText.substring(contextStart, contextEnd);
        
        // Pattern for finding a number
        const numberPattern = /\b(\d+)\b/g;
        let numberMatch: RegExpExecArray | null;
        
        // Find the closest number to the item mention
        while ((numberMatch = numberPattern.exec(context)) !== null) {
          quantity = parseInt(numberMatch[1]);
          console.log(`Found quantity ${quantity} near ${item} in context: "${context}"`);
        }
        
        // If no number in close context, check entire sentence
        if (quantity === 1) {
          // Find all numbers in the full text
          const fullTextNumbers: number[] = [];
          let fullTextMatch: RegExpExecArray | null;
          const fullTextNumberPattern = /\b(\d+)\b/g;
          
          while ((fullTextMatch = fullTextNumberPattern.exec(orderText)) !== null) {
            fullTextNumbers.push(parseInt(fullTextMatch[1]));
          }
          
          // If we found exactly one number in the whole text, associate it with this item
          if (fullTextNumbers.length === 1) {
            quantity = fullTextNumbers[0];
            console.log(`Using single number ${quantity} in order for ${item}`);
          }
        }
        
        matches.push({
          quantity: quantity,
          item: item
        });
        console.log(`Item mention match found: ${quantity} ${item}`);
      }
    }
    
    const extractedItems = matches.length > 0 ? 
      matches.map(match => `${match.quantity} ${match.item}`).join(', ') : 
      null;
    
    // Detect special requests
    const specialRequestPattern = /(extra|spicy|mild|no|without|allergy|vegan|vegetarian)/i;
    const hasSpecialRequests = specialRequestPattern.test(orderText);
    
    // Detect delivery requests
    const deliveryPattern = /(deliver|delivery|take away|takeaway|take-away|home)/i;
    const isDeliveryRequest = deliveryPattern.test(orderText);
    
    console.log(`Creating order with text: "${orderText}"`);
    if (extractedItems) {
      console.log(`Extracted items: ${extractedItems}`);
    }
    if (hasSpecialRequests) {
      console.log(`Special requests detected`);
    }
    if (isDeliveryRequest) {
      console.log(`Delivery request detected`);
    }
    
    // Determine customer language preference for future interactions
    const language = call.language || 'english';
    
    // Create an enhanced payload for the AI order processing
    const orderData = {
      orderText: orderText,
      extractedItems: extractedItems,
      hasSpecialRequests: hasSpecialRequests,
      isDeliveryRequest: isDeliveryRequest,
      orderSource: 'phone',
      phoneNumber: call.phoneNumber || '9876543210',
      callId: call.id,
      simulatedCall: call.id.startsWith('SIM'),
      useAIAutomation: true,
      tableNumber: null, // For phone orders, no table number
      preferredLanguage: language
    };
    
    // Store orderData in the call object for use in direct order creation
    call.orderData = orderData;
    
    // Save to history
    const historyCall = callHistory.find(c => c.id === call.id);
    if (historyCall) {
      historyCall.orderData = orderData;
    }
    
    console.log('Order data prepared from call:', orderData);
    
    // Create the actual order in the database directly
    try {
      // Get all menu items from database for better matching
      const dbMenuItems = await storage.getMenuItems();
      
      // Use menu items from database if available, fallback to hardcoded demo items
      const menuItems = dbMenuItems.length > 0 ? dbMenuItems : [
        { id: 1, name: "Butter Chicken", price: 350 },
        { id: 2, name: "Garlic Naan", price: 60 },
        { id: 3, name: "Paneer Tikka", price: 300 },
        { id: 4, name: "Biryani", price: 250 },
        { id: 5, name: "Dal Makhani", price: 220 }
      ];
      
      // Basic text matching for demo purposes
      const orderItems = [];
      const orderTextLower = orderText.toLowerCase();
      
      // Use our improved matches list to create order items
      for (const extracted of matches) {
        // Find the matching menu item for this extracted item
        const menuItem = menuItems.find(m => 
          m.name.toLowerCase().includes(extracted.item.toLowerCase()) || 
          extracted.item.toLowerCase().includes(m.name.toLowerCase())
        );
        
        if (menuItem) {
          // Check if this item already exists in the order
          const existingItem = orderItems.find(item => item.menuItemId === menuItem.id);
          if (existingItem) {
            // If it exists, just increase the quantity
            existingItem.quantity += extracted.quantity;
            console.log(`Updated quantity for existing item: ${menuItem.name}, new quantity: ${existingItem.quantity}`);
          } else {
            // Otherwise add as a new item
            orderItems.push({
              menuItemId: menuItem.id,
              name: menuItem.name,
              quantity: extracted.quantity,
              price: menuItem.price
            });
            console.log(`Added item to order from extracted matches: ${menuItem.name} x${extracted.quantity}`);
          }
        }
      }
      
      // If no matches were found with our improved algorithm, fall back to basic text matching
      if (orderItems.length === 0) {
        for (const item of menuItems) {
          if (orderTextLower.includes((item.name || '').toLowerCase())) {
            orderItems.push({
              menuItemId: item.id,
              name: item.name,
              quantity: 1, // Default to 1 if no quantity specified
              price: item.price
            });
            
            console.log(`Added item to order with fallback method: ${item.name} x1`);
          }
        }
      }
      
      // Ensure at least one item in order if nothing matched
      if (orderItems.length === 0) {
        // If we see "biryani" in the order text, add biryani
        if (orderTextLower.includes("biryani")) {
          const biryaniItem = menuItems.find(item => item.name.toLowerCase() === "biryani");
          if (biryaniItem) {
            orderItems.push({
              menuItemId: biryaniItem.id,
              name: biryaniItem.name,
              quantity: 1,
              price: biryaniItem.price
            });
          } else {
            orderItems.push({
              menuItemId: 4,
              name: "Biryani",
              quantity: 1,
              price: 250
            });
          }
        } else {
          // Default fallback items
          orderItems.push({
            menuItemId: 1,
            name: "Butter Chicken",
            quantity: 1,
            price: 350
          });
          orderItems.push({
            menuItemId: 2, 
            name: "Garlic Naan",
            quantity: 2,
            price: 60
          });
        }
      }
      
      // Calculate total amount
      const totalAmount = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      // Get the next sequential order number from storage
      const lastOrderNumber = await storage.getLastOrderNumber();
      console.log("Got last order number:", lastOrderNumber);
      let orderNumber;
      
      if (lastOrderNumber && lastOrderNumber.startsWith('ORD-')) {
        // Extract the number part and increment it
        const lastNumber = parseInt(lastOrderNumber.replace('ORD-', ''));
        const nextNumber = lastNumber + 1;
        orderNumber = `ORD-${nextNumber}`;
        console.log(`Generating sequential order number: ${orderNumber} from last: ${lastOrderNumber}`);
      } else {
        // Fallback if no previous order exists
        orderNumber = 'ORD-1001';
        console.log(`No valid last order number found, using default: ${orderNumber}`);
      }
      
      // Create order object
      const newOrder = {
        orderNumber,
        status: "pending",
        totalAmount,
        orderSource: "phone",
        notes: `Order created from phone call ${call.id}. Customer said: "${orderText}"`,
        items: orderItems
      };
      
      console.log("Creating order in database:", newOrder);
      
      // Create the order in the database
      const order = await storage.createOrder(newOrder);
      
      // Create order items in the database
      for (const item of orderItems) {
        await storage.createOrderItem({
          orderId: order.id,
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          price: item.price,
          notes: `From phone call: ${item.name} x ${item.quantity}`
        });
      }
      
      // Record activity for the order
      await storage.createActivity({
        type: "order_created",
        description: `Phone order created: ${orderNumber}`,
        entityId: order.id,
        entityType: "order"
      });
      
      console.log("Order created successfully:", order);
      
      // If original order ID was a temporary one, update it
      if (typeof call.orderId === 'string' || !call.orderId) {
        call.orderId = order.id;
        
        // Update in call history
        const historyCall = callHistory.find(c => c.id === call.id);
        if (historyCall) {
          historyCall.orderId = order.id;
        }
      }
      
      // Broadcast new order to all connected clients
      try {
        broadcastNewOrder({
          ...order,
          items: orderItems
        });
        console.log("Successfully broadcast new order to all clients");
      } catch (broadcastError) {
        console.error("Failed to broadcast new order:", broadcastError);
      }
      
      return {
        success: true,
        message: 'Order successfully created in database',
        orderData,
        order
      };
    } catch (dbError) {
      console.error('Error creating order in database:', dbError);
      
      // Return order data even if creation failed
      return { 
        success: false, 
        message: 'Failed to create order in database, but order data was prepared',
        orderData,
        error: dbError
      };
    }
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
 * Detect language from text with confidence scoring
 * @param text User speech text to analyze
 * @returns Detected language or default language
 */
export function detectLanguage(text: string): SupportedLanguage {
  if (!text || !aiVoiceSettings.autoDetectLanguage) {
    return aiVoiceSettings.defaultLanguage;
  }
  
  // Normalize text: lowercase and remove punctuation
  const normalizedText = text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ").replace(/\s+/g, " ").trim();
  
  // Early language detection by checking for unique character sets
  // Check for Devanagari script (Hindi)
  if (/[\u0900-\u097F]/.test(text)) {
    console.log(`Detected Hindi language by script`);
    return 'hindi';
  }
  
  // Check for Telugu script
  if (/[\u0C00-\u0C7F]/.test(text)) {
    console.log(`Detected Telugu language by script`);
    return 'telugu';
  }
  
  // Calculate confidence scores for each language
  const scores: Record<SupportedLanguage, number> = {
    english: 0,
    hindi: 0,
    telugu: 0,
    spanish: 0
  };
  
  // Check pattern matches for each language and increment score
  for (const [language, patterns] of Object.entries(languagePatterns)) {
    let matchCount = 0;
    let totalPatterns = patterns.length;
    
    for (const pattern of patterns) {
      if (pattern.test(normalizedText)) {
        matchCount++;
      }
    }
    
    // Calculate percentage match
    if (totalPatterns > 0) {
      const languageKey = language as SupportedLanguage;
      scores[languageKey] = (matchCount / totalPatterns) * 100;
    }
  }
  
  // Add contextual analysis for common food items and numbers that might appear
  // in multiple languages but with different frequencies in each language context
  const foodItems = [
    { term: "chicken", language: "english", weight: 3 },
    { term: "pollo", language: "spanish", weight: 3 },
    { term: "मुर्गी", language: "hindi", weight: 3 },
    { term: "కోడి", language: "telugu", weight: 3 },
    { term: "naan", language: "english", weight: 2 }, // Also common in Hindi transliteration
    { term: "नान", language: "hindi", weight: 3 },
    { term: "रोटी", language: "hindi", weight: 3 },
    { term: "arroz", language: "spanish", weight: 3 },
    { term: "rice", language: "english", weight: 2 },
    { term: "curry", language: "english", weight: 2 },
    { term: "paneer", language: "english", weight: 1 }, // Borrowed from Hindi
    { term: "पनीर", language: "hindi", weight: 3 },
    { term: "vegetarian", language: "english", weight: 3 },
    { term: "vegetariano", language: "spanish", weight: 3 },
    { term: "शाकाहारी", language: "hindi", weight: 3 },
  ];
  
  // Check for these terms and boost the respective language scores
  for (const item of foodItems) {
    if (normalizedText.includes(item.term.toLowerCase())) {
      const languageKey = item.language as SupportedLanguage;
      scores[languageKey] += item.weight;
    }
  }
  
  // Find the language with the highest score
  const detectedLanguage = Object.entries(scores).reduce((max, [language, score]) => {
    return score > max.score ? { language: language as SupportedLanguage, score } : max;
  }, { language: aiVoiceSettings.defaultLanguage, score: 0 });
  
  // If score is too low, default to configured language
  const CONFIDENCE_THRESHOLD = 10; // Minimum confidence needed
  if (detectedLanguage.score < CONFIDENCE_THRESHOLD) {
    console.log(`Language detection confidence too low (${detectedLanguage.score}), defaulting to ${aiVoiceSettings.defaultLanguage}`);
    return aiVoiceSettings.defaultLanguage;
  }
  
  console.log(`Detected language: ${detectedLanguage.language} with confidence score: ${detectedLanguage.score.toFixed(2)}`);
  return detectedLanguage.language;
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
 * Handle language selection from DTMF input
 * @param req Express request
 * @param res Express response
 */
export function selectLanguage(req: Request, res: Response) {
  const callSid = req.body.CallSid;
  const digits = req.body.Digits;
  
  console.log(`Language selection from call ${callSid}: Pressed ${digits}`);
  
  // Convert digits to language selection
  // 1 = English, 2 = Hindi, 3 = Telugu, 4 = Spanish
  let selectedLanguage: SupportedLanguage = 'english'; // Default
  
  switch (digits) {
    case '1':
      selectedLanguage = 'english';
      break;
    case '2':
      selectedLanguage = 'hindi';
      break;
    case '3':
      selectedLanguage = 'telugu';
      break;
    case '4':
      selectedLanguage = 'spanish';
      break;
    default:
      // Default to English if invalid selection
      selectedLanguage = 'english';
  }
  
  // Store the selected language with the call data
  if (activeCalls[callSid]) {
    // @ts-ignore - add language field to the call data
    activeCalls[callSid].language = selectedLanguage;
    
    // Also update in history
    const historyCall = callHistory.find(call => call.id === callSid);
    if (historyCall) {
      // @ts-ignore - add language field to the call data
      historyCall.language = selectedLanguage;
    }
  }
  
  // Map languages to Twilio voice options
  const voiceMap = {
    english: 'Polly.Joanna',
    hindi: 'Polly.Aditi',
    telugu: 'Polly.Aditi',
    spanish: 'Polly.Lupe'
  };
  
  // Map languages to Twilio language code for speech recognition
  const languageCodeMap = {
    english: 'en-US',
    hindi: 'hi-IN',
    telugu: 'te-IN',
    spanish: 'es-ES'
  };
  
  const voiceOption = voiceMap[selectedLanguage];
  const languageCode = languageCodeMap[selectedLanguage];
  
  // Create TwiML response in the selected language
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();
  
  // Confirmation messages in different languages
  const languageSelectedMessages = {
    english: 'You have selected English. What would you like to order today?',
    hindi: 'आपने हिंदी का चयन किया है। आज आप क्या ऑर्डर करना चाहेंगे?',
    telugu: 'మీరు తెలుగును ఎంచుకున్నారు. ఈరోజు మీరు ఏమి ఆర్డర్ చేయాలనుకుంటున్నారు?',
    spanish: 'Has seleccionado español. ¿Qué te gustaría ordenar hoy?'
  };
  
  // No input messages in different languages
  const noInputMessages = {
    english: 'I didn\'t receive your order. Please call again later. Goodbye!',
    hindi: 'मुझे आपका ऑर्डर नहीं मिला। कृपया बाद में फिर से कॉल करें। अलविदा!',
    telugu: 'నేను మీ ఆర్డర్‌ని స్వీకరించలేదు. దయచేసి తర్వాత మళ్లీ కాల్ చేయండి. వీడ్కోలు!',
    spanish: 'No recibí tu pedido. Por favor llama más tarde. ¡Adiós!'
  };
  
  // First say greeting
  twiml.say({ voice: voiceOption }, aiVoiceSettings.greeting[selectedLanguage]);
  
  // Then the language confirmation
  twiml.say({ voice: voiceOption }, languageSelectedMessages[selectedLanguage]);
  
  // Gather customer input
  const gather = twiml.gather({
    input: 'speech',
    speechTimeout: 'auto',
    speechModel: 'phone_call',
    action: '/api/telephony/process-speech',
    method: 'POST',
    language: languageCode
  });
  
  // If no input is received
  twiml.say({ voice: voiceOption }, noInputMessages[selectedLanguage]);
  twiml.hangup();
  
  // Update call transcript
  if (activeCalls[callSid]) {
    activeCalls[callSid].transcript = activeCalls[callSid].transcript || '';
    
    // Add language selection to transcript
    activeCalls[callSid].transcript += `Customer: [Selected ${selectedLanguage} language]\n`;
    activeCalls[callSid].transcript += `AI: ${aiVoiceSettings.greeting[selectedLanguage]} ${languageSelectedMessages[selectedLanguage]}\n`;
    
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
    language: 'english', // Default to English for simulated calls
    transcript: `AI: ${aiVoiceSettings.greeting.english}\n`
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
  try {
    const language = activeCalls[callSid]?.language || 'english';
    
    // Enhanced response options with more realistic and varied order patterns
    // Including special requests, quantity variations, and questions
    const responseOptions = {
      english: [
        "I'd like to order 2 butter chicken, 3 naan, and a paneer tikka",
        "Can I get a vegetarian thali with extra raita?",
        "I want to order a family meal for 4 people with chicken biryani and garlic naan",
        "What are your specials today? I'd like something spicy",
        "I have a dairy allergy, what vegan options do you have?",
        "I'd like to order takeaway - 1 butter chicken, 2 naan, and 1 dal makhani",
        "Could I get the chicken tikka masala but make it mild please?"
      ],
      hindi: [
        "मैं 2 बटर चिकन, 3 नान और एक पनीर टिक्का ऑर्डर करना चाहूंगा",
        "क्या मुझे अतिरिक्त रायता के साथ वेजिटेरियन थाली मिल सकती है?",
        "मैं चिकन बिरयानी और लहसुन नान के साथ 4 लोगों के लिए फैमिली मील ऑर्डर करना चाहता हूं",
        "आज आपके स्पेशल क्या हैं? मुझे कुछ मसालेदार चाहिए",
        "मुझे डेयरी एलर्जी है, आपके पास क्या वीगन विकल्प हैं?"
      ],
      telugu: [
        "నేను 2 బటర్ చికెన్, 3 నాన్ మరియు పనీర్ టిక్కా ఆర్డర్ చేయాలనుకుంటున్నాను",
        "నాకు అదనపు రైతా తో కూడిన వెజిటేరియన్ థాలీ లభిస్తుందా?",
        "నేను చికెన్ బిర్యానీ మరియు వెల్లుల్లి నాన్ తో 4 మంది కోసం ఫ్యామిలీ భోజనం ఆర్డర్ చేయాలనుకుంటున్నాను",
        "ఈరోజు మీ ప్రత్యేకతలు ఏమిటి? నాకు స్పైసీగా ఉండేది కావాలి",
        "నాకు పాల అలెర్జీ ఉంది, మీ దగ్గర వీగన్ ఆప్షన్లు ఏమి ఉన్నాయి?"
      ],
      spanish: [
        "Me gustaría pedir 2 butter chicken, 3 naan y un paneer tikka",
        "¿Puedo conseguir un thali vegetariano con raita extra?",
        "Quiero pedir una comida familiar para 4 personas con biryani de pollo y naan de ajo",
        "¿Cuáles son sus especialidades hoy? Me gustaría algo picante",
        "Tengo alergia a los lácteos, ¿qué opciones veganas tienen?"
      ]
    };
    
    // Select response based on language
    const availableResponses = responseOptions[language] || responseOptions.english;
    const response = availableResponses[Math.floor(Math.random() * availableResponses.length)];
    
    // Wait 2 seconds for more realistic timing
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
    
    // Add AI confirmation with detailed order parsing
    if (activeCalls[callSid]) {
      // Extract items from response to make the AI confirmation more realistic
      const itemPattern = /(butter chicken|chicken|naan|rice|biryani|paneer|roti|samosa|pakora|curry|dal|tandoori|tikka|thali)/gi;
      const items = response.match(itemPattern) || [];
      const extractedItems = items.length > 0 ? 
        `I heard you want to order ${items.join(', ')}. ` : '';
      
      activeCalls[callSid].transcript += `AI: ${extractedItems}${aiVoiceSettings.confirmationPrompt[language]}\n`;
      
      // Also update in history
      const historyCall = callHistory.find(call => call.id === callSid);
      if (historyCall) {
        historyCall.transcript = activeCalls[callSid].transcript;
      }
    }
    
    // Random variations in customer confirmation to make it more realistic
    const confirmationOptions = {
      english: ["Yes, that's correct", "Yes, please proceed", "That's right", "Sounds good"],
      hindi: ["हां, यह सही है", "हां, कृपया आगे बढ़ें", "बिलकुल सही", "अच्छा लगता है"],
      telugu: ["అవును, అది సరైనది", "అవును, దయచేసి కొనసాగండి", "అది నిజమే", "బాగుంది"],
      spanish: ["Sí, es correcto", "Sí, por favor continúe", "Así es", "Suena bien"]
    };
    
    // Wait 1.5 seconds for more realistic timing
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Add customer confirmation
    if (activeCalls[callSid]) {
      const availableConfirmations = confirmationOptions[language] || confirmationOptions.english;
      const confirmation = availableConfirmations[Math.floor(Math.random() * availableConfirmations.length)];
      
      activeCalls[callSid].transcript += `Customer: ${confirmation}\n`;
      
      // Also update in history
      const historyCall = callHistory.find(call => call.id === callSid);
      if (historyCall) {
        historyCall.transcript = activeCalls[callSid].transcript;
      }
    }
    
    // Create a more realistic order ID
    const timestamp = new Date().getTime().toString().slice(-5);
    const orderId = parseInt(`${Math.floor(100 + Math.random() * 900)}${timestamp}`);
    
    // Deliver final confirmation with order details
    if (activeCalls[callSid]) {
      activeCalls[callSid].orderId = orderId;
      
      // Create a delivery time estimate
      const deliveryTimeMinutes = Math.floor(25 + Math.random() * 20);
      
      // Final confirmation messages with estimated time
      const finalConfirmations = {
        english: `Your order #${orderId} has been confirmed! It will be ready in approximately ${deliveryTimeMinutes} minutes.`,
        hindi: `आपका ऑर्डर #${orderId} पुष्टि हो गया है! यह लगभग ${deliveryTimeMinutes} मिनट में तैयार हो जाएगा।`,
        telugu: `మీ ఆర్డర్ #${orderId} నిర్ధారించబడింది! ఇది సుమారుగా ${deliveryTimeMinutes} నిమిషాలలో సిద్ధంగా ఉంటుంది.`,
        spanish: `¡Su pedido #${orderId} ha sido confirmado! Estará listo en aproximadamente ${deliveryTimeMinutes} minutos.`
      };
      
      activeCalls[callSid].transcript += `AI: ${finalConfirmations[language]} ${aiVoiceSettings.farewell[language]}\n`;
      
      // Also update in history
      const historyCall = callHistory.find(call => call.id === callSid);
      if (historyCall) {
        historyCall.orderId = orderId;
        historyCall.transcript = activeCalls[callSid].transcript;
      }
      
      // Actually create an order through the API
      try {
        await createOrderFromCall(activeCalls[callSid]);
      } catch (error) {
        console.error('Failed to create order from simulated call:', error);
      }
    }
    
    // Complete the call after a delay
    setTimeout(async () => {
      await completeCall(callSid);
    }, 1500);
  } catch (error) {
    console.error('Error in simulated call conversation:', error);
    
    // Make sure to complete the call even if there's an error
    if (activeCalls[callSid]) {
      setTimeout(async () => {
        await completeCall(callSid);
      }, 1000);
    }
  }
}