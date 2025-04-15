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
export interface CallData {
  id: string;
  phoneNumber: string;
  startTime: string;
  endTime?: string;
  status: 'active' | 'completed' | 'missed';
  transcript?: string;
  orderId?: number;
  language?: SupportedLanguage;
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

// AI Voice settings with multi-language support
interface AIVoiceSettings {
  greeting: {[key in SupportedLanguage]: string};
  confirmationPrompt: {[key in SupportedLanguage]: string};
  farewell: {[key in SupportedLanguage]: string};
  maxRetries: number;
  autoAnswerCalls: boolean;
  defaultLanguage: SupportedLanguage;
  autoDetectLanguage: boolean;
}

let aiVoiceSettings: AIVoiceSettings = {
  greeting: {
    english: "Hello! Thank you for calling Yash Hotel. I'm your AI assistant. What would you like to order today?",
    hindi: "नमस्ते! यश होटल को कॉल करने के लिए धन्यवाद। मैं आपका AI सहायक हूँ। आज आप क्या ऑर्डर करना चाहेंगे?",
    telugu: "నమస్కారం! యష్ హోటల్‌కి కాల్ చేసినందుకు ధన్యవాదాలు. నేను మీ AI అసిస్టెంట్‌ని. ఈరోజు మీరు ఏమి ఆర్డర్ చేయాలనుకుంటున్నారు?",
    spanish: "¡Hola! Gracias por llamar a Yash Hotel. Soy tu asistente de IA. ¿Qué te gustaría ordenar hoy?"
  },
  confirmationPrompt: {
    english: "Let me confirm your order. Is that correct?",
    hindi: "मुझे आपके ऑर्डर की पुष्टि करने दें। क्या यह सही है?",
    telugu: "మీ ఆర్డర్‌ని నిర్ధారించనివ్వండి. అది సరైనదేనా?",
    spanish: "Permíteme confirmar tu orden. ¿Es correcto?"
  },
  farewell: {
    english: "Thank you for your order! It will be ready in approximately 20 minutes. Have a great day!",
    hindi: "आपके ऑर्डर के लिए धन्यवाद! यह लगभग 20 मिनट में तैयार हो जाएगा। आपका दिन शुभ हो!",
    telugu: "మీ ఆర్డర్‌కు ధన్యవాదాలు! ఇది సుమారు 20 నిమిషాల్లో సిద్ధంగా ఉంటుంది. మీ రోజు శుభంగా ఉండాలి!",
    spanish: "¡Gracias por tu pedido! Estará listo en aproximadamente 20 minutos. ¡Que tengas un buen día!"
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
  const callFrom = req.body.From;
  
  console.log(`Incoming call from ${callFrom}, SID: ${callSid}`);
  
  // Store call data with default language
  const callData: CallData = {
    id: callSid,
    phoneNumber: callFrom,
    startTime: new Date().toISOString(),
    status: 'active',
    language: aiVoiceSettings.defaultLanguage
  };
  
  activeCalls[callSid] = callData;
  callHistory.unshift(callData);
  
  // Create TwiML response
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();
  
  if (aiVoiceSettings.autoAnswerCalls) {
    if (aiVoiceSettings.autoDetectLanguage) {
      // Use direct greeting in default language and wait for speech to detect language
      const defaultLanguage = aiVoiceSettings.defaultLanguage;
      const voiceOption = defaultLanguage === 'english' ? 'Polly.Joanna' : 
                          defaultLanguage === 'spanish' ? 'Polly.Lupe' : 'Polly.Aditi';
      
      // Begin with a language-specific greeting
      twiml.say({ voice: voiceOption }, aiVoiceSettings.greeting[defaultLanguage]);
      
      // Language code for speech recognition
      const languageCode = defaultLanguage === 'english' ? 'en-US' : 
                          defaultLanguage === 'hindi' ? 'hi-IN' :
                          defaultLanguage === 'telugu' ? 'te-IN' : 'es-ES';
      
      // Please tell me messages in different languages
      const pleaseOrderMessages = {
        english: 'Please tell me what you would like to order.',
        hindi: 'कृपया मुझे बताएं कि आप क्या ऑर्डर करना चाहेंगे।',
        telugu: 'దయచేసి మీరు ఏమి ఆర్డర్ చేయాలనుకుంటున్నారో నాకు చెప్పండి.',
        spanish: 'Por favor dime qué te gustaría ordenar.'
      };
      
      // Gather customer input - the system will automatically detect language from speech
      const gather = twiml.gather({
        input: 'speech',
        speechTimeout: 'auto',
        speechModel: 'phone_call',
        action: '/api/telephony/process-speech',
        method: 'POST',
        language: languageCode
      });
      
      gather.say({ voice: voiceOption }, pleaseOrderMessages[defaultLanguage]);
      
      // No input received messages
      const noInputMessages = {
        english: 'I didn\'t receive your order. Please call again later. Goodbye!',
        hindi: 'मुझे आपका ऑर्डर नहीं मिला। कृपया बाद में फिर से कॉल करें। अलविदा!',
        telugu: 'నేను మీ ఆర్డర్‌ని స్వీకరించలేదు. దయచేసి తర్వాత మళ్లీ కాల్ చేయండి. వీడ్కోలు!',
        spanish: 'No recibí tu pedido. Por favor llama más tarde. ¡Adiós!'
      };
      
      // If no input is received
      twiml.say({ voice: voiceOption }, noInputMessages[defaultLanguage]);
      twiml.hangup();
    } else {
      // Provide a language selection menu
      twiml.say({ voice: 'Polly.Joanna' }, 'Welcome to Yash Hotel. Please select your language.');
      
      // Prompt in multiple languages for selection
      twiml.say({ voice: 'Polly.Joanna' }, 'For English, press 1.');
      twiml.say({ voice: 'Polly.Aditi' }, 'हिंदी के लिए, 2 दबाएं।'); // Hindi
      twiml.say({ voice: 'Polly.Aditi' }, 'తెలుగు కోసం, 3 నొక్కండి.'); // Telugu 
      twiml.say({ voice: 'Polly.Lupe' }, 'Para español, presione 4.'); // Spanish
      
      // Gather language selection via keypad
      const gather = twiml.gather({
        input: 'dtmf',
        numDigits: 1,
        action: '/api/telephony/select-language',
        method: 'POST',
        timeout: 10
      });
      
      // If no selection is made
      twiml.say({ voice: 'Polly.Joanna' }, 'No language selection received. Defaulting to English.');
      
      // Use default language and proceed
      const defaultGather = twiml.gather({
        input: 'speech',
        speechTimeout: 'auto',
        speechModel: 'phone_call',
        action: '/api/telephony/process-speech',
        method: 'POST',
        language: 'en-US'
      });
      
      defaultGather.say({ voice: 'Polly.Joanna' }, aiVoiceSettings.greeting.english);
      defaultGather.say({ voice: 'Polly.Joanna' }, 'Please tell me what you would like to order.');
      
      // If no input is received
      twiml.say({ voice: 'Polly.Joanna' }, 'I didn\'t receive your order. Please call again later. Goodbye!');
      twiml.hangup();
    }
  } else {
    // Auto-answer is disabled - play a message in multiple languages
    twiml.say({ voice: 'Polly.Joanna' }, 'Thank you for calling Yash Hotel. Our AI assistant is currently unavailable. Please call back later.');
    twiml.say({ voice: 'Polly.Aditi' }, 'यश होटल को कॉल करने के लिए धन्यवाद। हमारा AI सहायक वर्तमान में अनुपलब्ध है। कृपया बाद में कॉल करें।');
    twiml.say({ voice: 'Polly.Aditi' }, 'యష్ హోటల్‌కి కాల్ చేసినందుకు ధన్యవాదాలు. మా AI అసిస్టెంట్ ప్రస్తుతం అందుబాటులో లేదు. దయచేసి తర్వాత కాల్ చేయండి.');
    twiml.say({ voice: 'Polly.Lupe' }, 'Gracias por llamar a Yash Hotel. Nuestro asistente de IA no está disponible actualmente. Por favor llame más tarde.');
    twiml.hangup();
  }
  
  // Add initial AI greeting to transcript
  const language = callData.language || aiVoiceSettings.defaultLanguage;
  callData.transcript = `AI: ${aiVoiceSettings.greeting[language]}\n`;
  
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
  
  // Detect language from the speech using our enhanced detection algorithm
  const detectedLanguage = detectLanguage(speechResult);
  console.log(`Using language: ${detectedLanguage} for call ${callSid}`);
  
  // Store the detected language with the call data
  if (activeCalls[callSid]) {
    activeCalls[callSid].language = detectedLanguage;
    
    // Update call transcript
    activeCalls[callSid].transcript = activeCalls[callSid].transcript || '';
    activeCalls[callSid].transcript += `Customer: ${speechResult}\n`;
    
    // Also update in history
    const historyCall = callHistory.find(call => call.id === callSid);
    if (historyCall) {
      historyCall.language = detectedLanguage;
      historyCall.transcript = activeCalls[callSid].transcript;
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
    // Process the speech result - normalize and prepare for analysis
    const orderText = speechResult?.trim() || '';
    
    // ENHANCED ORDER ANALYSIS
    // Extract key information from the order using advanced pattern matching
    
    // 1. INTENT CLASSIFICATION - Identify the primary intent of the user
    const intentPatterns = {
      help: {
        english: /what.*(?:menu|options|available|recommend|suggestions|dishes|specials)/i,
        hindi: /क्या.*(?:मेन्यू|विकल्प|उपलब्ध|सिफारिश|सुझाव|व्यंजन|विशेष)/i,
        telugu: /ఏమి.*(?:మెనూ|ఎంపికలు|అందుబాటులో|సిఫార్సు|సూచనలు|వంటకాలు|ప్రత్యేకతలు)/i,
        spanish: /qué.*(?:menú|opciones|disponible|recomienda|sugerencias|platos|especiales)/i
      },
      cancel: {
        english: /(?:cancel|stop|abort|end|quit|nevermind|goodbye)/i,
        hindi: /(?:रद्द|बंद|समाप्त|अलविदा|छोड़ो)/i,
        telugu: /(?:రద్దు|ఆపు|ముగింపు|వీడ్కోలు|వదిలివేయండి)/i,
        spanish: /(?:cancelar|parar|abortar|terminar|salir|adiós)/i
      },
      delivery: {
        english: /(?:deliver|delivery|take away|takeaway|take-away|bring|send)/i,
        hindi: /(?:डिलिवरी|भेजें|पहुंचाएं|होम)/i,
        telugu: /(?:డెలివరీ|పంపండి|ఇంటికి)/i,
        spanish: /(?:entregar|entrega|llevar|enviar|domicilio)/i
      },
      dineIn: {
        english: /(?:dine in|dining|table|reservation|reserve)/i,
        hindi: /(?:डाइन इन|टेबल|आरक्षण|रिजर्व)/i,
        telugu: /(?:డైన్ ఇన్|టేబుల్|రిజర్వేషన్)/i,
        spanish: /(?:comer aquí|reserva|mesa|comedor)/i
      },
      dietary: {
        english: /(?:vegetarian|vegan|gluten[ -]free|allergy|allergic)/i,
        hindi: /(?:शाकाहारी|वेजिटेरियन|वीगन|एलर्जी)/i,
        telugu: /(?:శాఖాహారి|వెజిటేరియన్|వేగన్|అలెర్జీ)/i,
        spanish: /(?:vegetariano|vegano|sin gluten|alergia|alérgico)/i
      }
    };
    
    // Check the various intents
    const isAskingForHelp = helpKeywords[detectedLanguage].some(keyword => 
      orderText.toLowerCase().includes(keyword.toLowerCase())
    ) || intentPatterns.help[detectedLanguage].test(orderText);
    
    const isAskingToCancel = cancelKeywords[detectedLanguage].some(keyword => 
      orderText.toLowerCase().includes(keyword.toLowerCase())
    ) || intentPatterns.cancel[detectedLanguage].test(orderText);
    
    const isRequestingDelivery = intentPatterns.delivery[detectedLanguage].test(orderText);
    const isRequestingDineIn = intentPatterns.dineIn[detectedLanguage].test(orderText);
    const hasDietaryRestrictions = intentPatterns.dietary[detectedLanguage].test(orderText);
    
    // 2. ENTITY EXTRACTION - Extract quantities and menu items
    // Enhanced pattern to extract quantity-item pairs matching all our menu categories
    const quantityItemPattern = /(\d+)\s*(x|\*|×)?\s*(veg biryani|jeera rice|kashmiri pulao|chicken biryani|mutton biryani|prawn biryani|paneer butter masala|dal makhani|palak paneer|malai kofta|butter chicken|chicken tikka masala|mutton rogan josh|fish curry|paneer tikka|veg pakora|chicken tikka|seekh kebab|veg kofta|chole bhature|tandoori chicken|lamb chops|veg fried rice|chicken fried rice|veg hakka noodles|chicken noodles|gulab jamun|rasmalai|kheer|ice cream|veg grilled sandwich|paneer tikka sandwich|chicken tikka sandwich|club sandwich|masala chai|cold coffee|fresh lime soda|mango lassi|naan|roti|biryani|curry|rice|thali|masala|pakora|raita|lassi|vegetable|tandoori|garlic naan|plain naan|paratha|chapati)/gi;
    
    // Extract all quantity-item matches
    const matches = orderText.matchAll(quantityItemPattern);
    const quantityItemMatches = Array.from(matches).map(match => ({
      quantity: parseInt(match[1], 10),
      item: match[3].trim()
    }));
    
    // 3. MODIFIER EXTRACTION - Extract any modifiers for the dishes
    const modifierPattern = /(spicy|mild|medium|hot|extra spicy|less spicy|no garlic|no onion|no salt|less salt|extra|without|gluten[ -]free|dairy[ -]free|vegan|vegetarian)/gi;
    
    const modifierMatches = orderText.matchAll(modifierPattern);
    const modifiers = Array.from(modifierMatches).map(match => match[1].trim());
    
    // 4. SPECIAL INSTRUCTIONS IDENTIFICATION
    const specialInstructionsPatterns = [
      /allerg(?:y|ic)\s+to\s+([a-zA-Z\s]+)/i,
      /no\s+([a-zA-Z\s]+)/i,
      /extra\s+([a-zA-Z\s]+)/i,
      /without\s+([a-zA-Z\s]+)/i,
      /please\s+([a-zA-Z\s]+)/i
    ];
    
    let specialInstructions = [];
    for (const pattern of specialInstructionsPatterns) {
      const match = orderText.match(pattern);
      if (match && match[1]) {
        specialInstructions.push(`${match[0]}`);
      }
    }
    
    // 5. CREATE A STRUCTURED ORDER SUMMARY
    const orderSummary = {
      items: quantityItemMatches,
      modifiers: modifiers,
      specialInstructions: specialInstructions,
      isDelivery: isRequestingDelivery,
      isDineIn: isRequestingDineIn,
      hasDietaryRestrictions: hasDietaryRestrictions
    };
    
    console.log('Order summary:', JSON.stringify(orderSummary, null, 2));
    
    // Store the structured order data with the call
    if (activeCalls[callSid]) {
      // @ts-ignore - adding dynamic property
      activeCalls[callSid].orderData = orderSummary;
    }
        
    // Keywords in different languages for help/menu
    const helpKeywords = {
      english: ['help', 'menu', 'options', 'what', 'recommend'],
      hindi: ['मदद', 'मेनू', 'विकल्प', 'क्या', 'सिफारिश'],
      telugu: ['సహాయం', 'మెనూ', 'ఎంపికలు', 'ఏమి', 'సిఫార్సు'],
      spanish: ['ayuda', 'menú', 'opciones', 'qué', 'recomendar']
    };
    
    // Keywords in different languages for cancel
    const cancelKeywords = {
      english: ['cancel', 'stop', 'no', 'don\'t'],
      hindi: ['रद्द', 'बंद', 'नहीं', 'मत'],
      telugu: ['రద్దు', 'ఆపు', 'లేదు', 'వద్దు'],
      spanish: ['cancelar', 'detener', 'no', 'parar']
    };
    
    // Enhanced menu categories in different languages
    const menuItems = {
      english: 'We have several menu categories: For Rice and Biryani, we offer vegetarian options like Veg Biryani and Jeera Rice, and non-vegetarian options like Chicken and Mutton Biryani. Our curry selection includes vegetarian dishes like Paneer Butter Masala and Dal Makhani, and non-vegetarian options like Butter Chicken and Mutton Rogan Josh. We also have starters, main courses, fried rice and noodles, desserts, and grilled sandwiches. What would you like to order?',
      
      hindi: 'हमारे पास कई मेनू श्रेणियां हैं: चावल और बिरयानी के लिए, हम वेज बिरयानी और जीरा राइस जैसे शाकाहारी विकल्प, और चिकन और मटन बिरयानी जैसे मांसाहारी विकल्प प्रदान करते हैं। हमारे करी में शाकाहारी व्यंजन जैसे पनीर बटर मसाला और दाल मखनी, और मांसाहारी विकल्प जैसे बटर चिकन और मटन रोगन जोश शामिल हैं। हमारे पास स्टार्टर्स, मेन कोर्स, फ्राइड राइस और नूडल्स, डेसर्ट और ग्रिल्ड सैंडविच भी हैं। आप क्या ऑर्डर करना चाहेंगे?',
      
      telugu: 'మాకు అనేక మెనూ వర్గాలు ఉన్నాయి: అన్నం మరియు బిర్యానీ కోసం, మేము వెజ్ బిర్యానీ మరియు జీరా రైస్ వంటి శాఖాహార ఎంపికలు, మరియు చికెన్ మరియు మటన్ బిర్యానీ వంటి మాంసాహార ఎంపికలను అందిస్తున్నాము. మా కూర సెలక్షన్లో పనీర్ బటర్ మసాలా మరియు దాల్ మఖని వంటి శాఖాహార వంటకాలు, మరియు బటర్ చికెన్ మరియు మటన్ రోగన్ జోష్ వంటి మాంసాహార ఎంపికలు ఉన్నాయి. మాకు స్టార్టర్స్, మెయిన్ కోర్సెస్, ఫ్రైడ్ రైస్ మరియు నూడుల్స్, డెజర్ట్స్ మరియు గ్రిల్డ్ శాండ్విచ్లు కూడా ఉన్నాయి. మీరు ఏమి ఆర్డర్ చేయాలనుకుంటున్నారు?',
      
      spanish: 'Tenemos varias categorías de menú: Para arroz y biryani, ofrecemos opciones vegetarianas como Biryani Vegetariano y Arroz Jeera, y opciones no vegetarianas como Biryani de Pollo y Cordero. Nuestra selección de curry incluye platos vegetarianos como Paneer Butter Masala y Dal Makhani, y opciones no vegetarianas como Pollo a la Mantequilla y Cordero Rogan Josh. También tenemos entrantes, platos principales, arroz frito y fideos, postres y sándwiches a la parrilla. ¿Qué te gustaría ordenar?'
    };
    
    // Cancel messages in different languages
    const cancelMessages = {
      english: 'Your order has been cancelled. Thank you for calling Yash Hotel. Goodbye!',
      hindi: 'आपका ऑर्डर रद्द कर दिया गया है। यश होटल को कॉल करने के लिए धन्यवाद। अलविदा!',
      telugu: 'మీ ఆర్డర్ రద్దు చేయబడింది. యష్ హోటల్‌కి కాల్ చేసినందుకు ధన్యవాదాలు. వీడ్కోలు!',
      spanish: 'Tu pedido ha sido cancelado. Gracias por llamar a Yash Hotel. ¡Adiós!'
    };
    
    // Confirmation instructions in different languages
    const confirmInstructions = {
      english: 'Please say yes or press 1 to confirm your order, or say no or press 2 to try again.',
      hindi: 'अपने ऑर्डर की पुष्टि के लिए कृपया हां कहें या 1 दबाएं, या फिर से प्रयास करने के लिए ना कहें या 2 दबाएं।',
      telugu: 'దయచేసి మీ ఆర్డర్‌ని నిర్ధారించడానికి అవును అని చెప్పండి లేదా 1 నొక్కండి, లేదా మళ్లీ ప్రయత్నించడానికి లేదు అని చెప్పండి లేదా 2 నొక్కండి.',
      spanish: 'Por favor, di sí o presiona 1 para confirmar tu pedido, o di no o presiona 2 para intentarlo de nuevo.'
    };
    
    // No input messages in different languages
    const noInputMessages = {
      english: 'I didn\'t receive your response. Please call again later. Goodbye!',
      hindi: 'मुझे आपका जवाब नहीं मिला। कृपया बाद में फिर से कॉल करें। अलविदा!',
      telugu: 'నేను మీ ప్రతిస్పందనను స్వీకరించలేదు. దయచేసి తర్వాత మళ్లీ కాల్ చేయండి. వీడ్కోలు!',
      spanish: 'No recibí tu respuesta. Por favor llama más tarde. ¡Adiós!'
    };
    
    // Error messages in different languages
    const errorMessages = {
      english: 'I\'m sorry, I had trouble processing your order. Please try again later.',
      hindi: 'क्षमा करें, मुझे आपके ऑर्डर को प्रोसेस करने में परेशानी हुई। कृपया बाद में पुन: प्रयास करें।',
      telugu: 'క్షమించండి, మీ ఆర్డర్‌ని ప్రాసెస్ చేయడంలో నాకు సమస్య ఉంది. దయచేసి తర్వాత మళ్లీ ప్రయత్నించండి.',
      spanish: 'Lo siento, tuve problemas para procesar tu pedido. Por favor intenta de nuevo más tarde.'
    };
    
    // Process based on the detected intent
    if (isAskingForHelp) {
      // Customer asked for help or menu options
      twiml.say({ voice: voiceOption }, menuItems[detectedLanguage]);
      
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
    } else if (isAskingToCancel) {
      // Customer wants to cancel
      twiml.say({ voice: voiceOption }, cancelMessages[detectedLanguage]);
      twiml.hangup();
      
      // Update call status
      await completeCall(callSid);
    } else {
      // Process as an order - Generate a natural-sounding summary of what we heard
      let orderSummaryText = '';
      
      // Format the items for readability
      if (orderSummary.items.length > 0) {
        const itemsFormatted = orderSummary.items.map(item => 
          `${item.quantity} ${item.item}`
        ).join(', ');
        
        orderSummaryText += itemsFormatted;
      } else {
        // If we didn't extract specific items, use the original text
        orderSummaryText = orderText;
      }
      
      // Add modifiers summary if any
      if (orderSummary.modifiers.length > 0) {
        orderSummaryText += ` with ${orderSummary.modifiers.join(', ')}`;
      }
      
      // Add special instructions if any
      if (orderSummary.specialInstructions.length > 0) {
        orderSummaryText += `. Special instructions: ${orderSummary.specialInstructions.join(', ')}`;
      }
      
      // Add delivery/dine-in info
      if (orderSummary.isDelivery) {
        orderSummaryText += `. This will be a delivery order.`;
      } else if (orderSummary.isDineIn) {
        orderSummaryText += `. This will be for dine-in.`;
      }
      
      // Get confirmation by reading back what we heard
      const confirmationText = {
        english: `I heard you'd like to order: ${orderSummaryText}`,
        hindi: `मैंने सुना कि आप ऑर्डर करना चाहते हैं: ${orderSummaryText}`,
        telugu: `మీరు ఆర్డర్ చేయాలనుకుంటున్నారని నేను విన్నాను: ${orderSummaryText}`,
        spanish: `He escuchado que te gustaría pedir: ${orderSummaryText}`
      };
      
      twiml.say({ voice: voiceOption }, confirmationText[detectedLanguage]);
      twiml.say({ voice: voiceOption }, aiVoiceSettings.confirmationPrompt[detectedLanguage]);
      
      const gather = twiml.gather({
        input: 'speech dtmf',
        speechTimeout: 'auto',
        speechModel: 'phone_call',
        numDigits: 1,
        action: '/api/telephony/confirm-order',
        method: 'POST',
        language: languageCode
      });
      
      gather.say({ voice: voiceOption }, confirmInstructions[detectedLanguage]);
      
      // If no input is received
      twiml.say({ voice: voiceOption }, noInputMessages[detectedLanguage]);
      twiml.hangup();
    }
  } catch (error) {
    console.error('Error processing speech:', error);
    
    // Error handling - default message in case the detectedLanguage isn't available
    const defaultErrorMessage = "I'm sorry, I had trouble processing your order. Please try again later.";
    
    const errorMessages = {
      english: 'I\'m sorry, I had trouble processing your order. Please try again later.',
      hindi: 'क्षमा करें, मुझे आपके ऑर्डर को प्रोसेस करने में परेशानी हुई। कृपया बाद में पुन: प्रयास करें।',
      telugu: 'క్షమించండి, మీ ఆర్డర్‌ని ప్రాసెస్ చేయడంలో నాకు సమస్య ఉంది. దయచేసి తర్వాత మళ్లీ ప్రయత్నించండి.',
      spanish: 'Lo siento, tuve problemas para procesar tu pedido. Por favor intenta de nuevo más tarde.'
    };
    
    twiml.say(
      { voice: voiceOption }, 
      errorMessages[detectedLanguage] || defaultErrorMessage
    );
    twiml.hangup();
    
    // Update call status
    completeCall(callSid).catch(err => 
      console.error(`Error completing call after processing error: ${err.message}`)
    );
  }
  
  // Update call transcript with AI response
  if (activeCalls[callSid]) {
    try {
      const aiResponse = twiml.toString().replace(/<[^>]*>/g, '');
      activeCalls[callSid].transcript += `AI: ${aiResponse}\n`;
      
      // Also update in history
      const historyCall = callHistory.find(call => call.id === callSid);
      if (historyCall) {
        historyCall.transcript = activeCalls[callSid].transcript;
      }
    } catch (error) {
      console.error('Error updating transcript:', error);
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
    
    twiml.say({ voice: voiceOption }, orderConfirmedMessages[detectedLanguage](orderId));
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
    
    // Always create an actual order when a call is completed,
    // regardless of whether it's a simulated call or real call
    try {
      console.log(`Creating order from completed call ${callSid}...`);
      
      // Create the order using AI service
      if (!activeCalls[callSid].orderId) {
        // Assign a temporary order ID if one hasn't been assigned yet
        activeCalls[callSid].orderId = `ORDER-SIM-${Date.now()}`;
      }
      
      // Create the actual order in the system
      await createOrderFromCall(activeCalls[callSid]);
      
      console.log(`Successfully created order from call ${callSid}`);
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
    
    // Extract key information from orderText using patterns
    const quantityPattern = /(\d+)\s+(butter chicken|chicken|naan|rice|biryani|paneer|roti|samosa|pakora|curry|dal|tandoori|tikka)/gi;
    const matches = [...orderText.matchAll(quantityPattern)];
    const extractedItems = matches.length > 0 ? 
      matches.map(match => `${match[1]} ${match[2]}`).join(', ') : 
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
    
    // Call the AI order processing endpoint
    const fullUrl = 'http://localhost:5000/api/ai/create-order';
    console.log(`Sending order request to ${fullUrl}`);
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create order (${response.status}): ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Order creation successful:', result);
    
    // Update the call with the actual order info from the created order
    if (result.order && result.order.id) {
      call.orderId = result.order.id;
      
      // Also update in history
      const historyCall = callHistory.find(c => c.id === call.id);
      if (historyCall) {
        historyCall.orderId = result.order.id;
      }
      
      // Log order created
      console.log(`Order #${result.order.orderNumber} created successfully from call ${call.id}`);
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