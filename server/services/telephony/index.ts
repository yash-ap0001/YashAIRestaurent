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
  
  // Detect language from the speech
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
    // Process the speech with our AI service
    // In a real implementation, this would call OpenAI or another NLP service
    const orderText = speechResult;
    
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
    
    // Check for help/menu keywords in the detected language
    const isAskingForHelp = helpKeywords[detectedLanguage].some(keyword => 
      orderText.toLowerCase().includes(keyword.toLowerCase())
    );
    
    // Check for cancel keywords in the detected language
    const isAskingToCancel = cancelKeywords[detectedLanguage].some(keyword => 
      orderText.toLowerCase().includes(keyword.toLowerCase())
    );
    
    // Menu items in different languages
    const menuItems = {
      english: 'Our popular items include butter chicken, paneer tikka, and various types of naan. What would you like to order?',
      hindi: 'हमारे लोकप्रिय व्यंजनों में बटर चिकन, पनीर टिक्का और विभिन्न प्रकार के नान शामिल हैं। आप क्या ऑर्डर करना चाहेंगे?',
      telugu: 'మా ప్రజాదరణ పొందిన వంటకాలలో బటర్ చికెన్, పనీర్ టిక్కా మరియు వివిధ రకాల నాన్ ఉన్నాయి. మీరు ఏమి ఆర్డర్ చేయాలనుకుంటున్నారు?',
      spanish: 'Nuestros platos populares incluyen pollo con mantequilla, paneer tikka y varios tipos de naan. ¿Qué te gustaría ordenar?'
    };
    
    // Cancel messages in different languages
    const cancelMessages = {
      english: 'Your order has been cancelled. Thank you for calling. Goodbye!',
      hindi: 'आपका ऑर्डर रद्द कर दिया गया है। कॉल करने के लिए धन्यवाद। अलविदा!',
      telugu: 'మీ ఆర్డర్ రద్దు చేయబడింది. కాల్ చేసినందుకు ధన్యవాదాలు. వీడ్కోలు!',
      spanish: 'Tu pedido ha sido cancelado. Gracias por llamar. ¡Adiós!'
    };
    
    // Confirmation instructions in different languages
    const confirmInstructions = {
      english: 'Please say yes or press 1 to confirm, or say no or press 2 to cancel.',
      hindi: 'पुष्टि करने के लिए कृपया हां कहें या 1 दबाएं, या रद्द करने के लिए नहीं कहें या 2 दबाएं।',
      telugu: 'దయచేసి అవును అని చెప్పండి లేదా నిర్ధారించడానికి 1 నొక్కండి, లేదా రద్దు చేయడానికి లేదు అని చెప్పండి లేదా 2 నొక్కండి.',
      spanish: 'Por favor diga sí o presione 1 para confirmar, o diga no o presione 2 para cancelar.'
    };
    
    // No input messages in different languages
    const noInputMessages = {
      english: 'I didn\'t receive your order. Please call again later. Goodbye!',
      hindi: 'मुझे आपका ऑर्डर नहीं मिला। कृपया बाद में फिर से कॉल करें। अलविदा!',
      telugu: 'నేను మీ ఆర్డర్‌ని స్వీకరించలేదు. దయచేసి తర్వాత మళ్లీ కాల్ చేయండి. వీడ్కోలు!',
      spanish: 'No recibí tu pedido. Por favor llama más tarde. ¡Adiós!'
    };
    
    // Error messages in different languages
    const errorMessages = {
      english: 'I\'m sorry, I had trouble processing your order. Please try again later.',
      hindi: 'क्षमा करें, मुझे आपके ऑर्डर को प्रोसेस करने में परेशानी हुई। कृपया बाद में पुन: प्रयास करें।',
      telugu: 'క్షమించండి, మీ ఆర్డర్‌ని ప్రాసెస్ చేయడంలో నాకు సమస్య ఉంది. దయచేసి తర్వాత మళ్లీ ప్రయత్నించండి.',
      spanish: 'Lo siento, tuve problemas para procesar tu pedido. Por favor intenta de nuevo más tarde.'
    };
    
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
      // Process as an order
      // In a real implementation, we would extract menu items from the speech text
      // For demo purposes, we'll just echo back what we think we heard
      
      // Get confirmation
      twiml.say({ voice: voiceOption }, 
        `${aiVoiceSettings.confirmationPrompt[detectedLanguage]} ${orderText}.`
      );
      
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
    
    // Error handling
    twiml.say({ voice: voiceOption }, errorMessages[detectedLanguage]);
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
    
    console.log(`Creating order with text: "${orderText}"`);
    
    // Create a payload for the AI order processing
    const orderData = {
      orderText: orderText,
      orderSource: 'phone',
      phoneNumber: call.phoneNumber || '9876543210',
      callId: call.id,
      simulatedCall: true,
      useAIAutomation: true,
      tableNumber: null // For phone orders, no table number
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
 * Detect language from text
 * @param text User speech text to analyze
 * @returns Detected language or default language
 */
export function detectLanguage(text: string): SupportedLanguage {
  if (!text || !aiVoiceSettings.autoDetectLanguage) {
    return aiVoiceSettings.defaultLanguage;
  }
  
  // Check each language's patterns
  for (const [language, patterns] of Object.entries(languagePatterns)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        console.log(`Detected language: ${language} from text: "${text}"`);
        return language as SupportedLanguage;
      }
    }
  }
  
  // Default to the configured default language
  return aiVoiceSettings.defaultLanguage;
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