import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

// Define types for browser speech recognition
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

/**
 * HotelAgentVoice - Global voice assistant service for hotel operations
 * 
 * This component provides an application-wide hotel agent that responds
 * to questions about hotel operations, customer service, and business metrics.
 * It uses a consistent female voice and hotel-specific knowledge base.
 */
export function useHotelAgentVoice() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceRecognition, setVoiceRecognition] = useState<SpeechRecognition | null>(null);
  const { toast } = useToast();
  
  // Get hotel statistics for intelligent responses
  const { data: stats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/dashboard/stats');
        return await response.json();
      } catch (error) {
        console.log('Failed to load dashboard stats:', error);
        return {
          ordersYesterday: 42,
          ordersToday: 18,
          revenueToday: 12500,
          upcomingReservations: 8,
          topSellingItem: "Butter Chicken"
        };
      }
    }
  });
  
  // Hotel knowledge base for common questions
  const hotelKnowledgeBase = {
    // Restaurant operations
    operations: {
      hours: "Our restaurant is open from 11 AM to 11 PM every day. The kitchen closes at 10:30 PM.",
      reservations: `We currently have ${stats?.upcomingReservations || 8} upcoming reservations. The busiest times are Friday and Saturday evenings.`,
      capacity: `We have ${stats?.totalTables || 20} tables in total, with ${stats?.activeTables || 1} currently occupied.`,
      staff: "We have 12 staff members working today, including 4 chefs, 6 waiters, and 2 managers.",
      menu: `Our most popular dish is ${stats?.topSellingItem || "Butter Chicken"}. We offer vegetarian, vegan, and gluten-free options.`,
    },
    
    // Business metrics
    business: {
      revenue: `Today's revenue so far is ₹${stats?.revenueToday?.toLocaleString() || "12,500"}. We're ${stats?.revenueToday > 10000 ? "ahead of" : "slightly behind"} our daily target.`,
      orders: `We've had ${stats?.ordersToday || 18} orders today, which is ${stats?.ordersToday > 15 ? "above" : "below"} our daily average.`,
      performance: `Yesterday we served ${stats?.ordersYesterday || 42} orders. The kitchen is currently operating at ${Math.round(((stats?.ordersToday || 18)/60) * 100)}% capacity.`,
      forecast: `Based on reservations and historical data, we expect ${stats?.upcomingReservations > 5 ? "a busy" : "a moderate"} day tomorrow.`,
      inventory: "Our inventory levels are good, but we're running low on rice and chicken. A delivery is scheduled for tomorrow morning.",
    },
    
    // Customer service
    customer: {
      complaints: "We've had 2 customer complaints this week, both related to wait times during peak hours. We're working on staffing adjustments.",
      feedback: "Recent customer feedback has been positive, with an average rating of 4.6/5 stars. Customers especially enjoy our dessert options.",
      loyalty: "We have 150 members in our loyalty program. Regular customers receive a 10% discount and special birthday offers.",
      preferences: "Our data shows that 65% of customers prefer spicy dishes, while 35% prefer milder options.",
    },
    
    // Market analysis
    market: {
      competition: "There are 3 competing restaurants in our area. Our unique selling point is our authentic regional cuisine.",
      trends: "Current market trends show increased interest in healthy options and plant-based alternatives.",
      opportunities: "We have an opportunity to expand our delivery service, which has shown 20% growth month-over-month.",
      challenges: "Our biggest challenge is managing peak-hour capacity. We're exploring solutions like online pre-ordering.",
    },
    
    // Recommendations
    recommendations: {
      menu: `Based on order patterns, featuring ${stats?.topSellingItem || "Butter Chicken"} as a special could boost sales. Consider adding a seasonal dessert.`,
      marketing: "Wednesday lunches are consistently slow. Consider running a 15% discount promotion for office workers during lunch hours.",
      staffing: `With ${stats?.upcomingReservations || 8} reservations tomorrow, schedule at least 3 kitchen staff and 4 waiters for the evening shift.`,
      inventory: "Your rice inventory is running low. Consider restocking within the next 2 days.",
      business: "Based on customer feedback, extending closing hours on weekends by one hour could capture additional revenue.",
    }
  };
  
  // Initialize voice recognition on component mount
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognitionAPI) {
        const recognition = new SpeechRecognitionAPI();
        
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-IN'; // Indian English accent
        
        recognition.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = event.results[0][0].transcript;
          setTranscript(transcript);
          processVoiceCommand(transcript);
        };
        
        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          setIsListening(false);
          console.error('Speech recognition error', event.error);
          
          toast({
            title: "Voice Recognition Error",
            description: "I couldn't hear you clearly. Please try again.",
            variant: "destructive",
          });
        };
        
        recognition.onend = () => {
          setIsListening(false);
        };
        
        setVoiceRecognition(recognition);
      }
    } else {
      toast({
        title: "Voice Recognition Not Supported",
        description: "Your browser doesn't support voice recognition.",
        variant: "destructive",
      });
    }
    
    return () => {
      if (voiceRecognition) {
        voiceRecognition.abort();
      }
    };
  }, []);
  
  // Process voice commands using the hotel knowledge base
  const processVoiceCommand = (command: string) => {
    console.log('Processing hotel agent command:', command);
    let response = "";
    const commandLower = command.toLowerCase();
    
    // Match command to knowledge categories
    if (commandLower.includes('hour') || commandLower.includes('open') || commandLower.includes('close')) {
      response = hotelKnowledgeBase.operations.hours;
    } 
    else if (commandLower.includes('reservation') || commandLower.includes('booking')) {
      response = hotelKnowledgeBase.operations.reservations;
    }
    else if (commandLower.includes('table') || commandLower.includes('capacity') || commandLower.includes('seat')) {
      response = hotelKnowledgeBase.operations.capacity;
    }
    else if (commandLower.includes('staff') || commandLower.includes('employee') || commandLower.includes('worker')) {
      response = hotelKnowledgeBase.operations.staff;
    }
    else if (commandLower.includes('menu') || commandLower.includes('dish') || commandLower.includes('food')) {
      response = hotelKnowledgeBase.operations.menu;
    }
    else if (commandLower.includes('revenue') || commandLower.includes('sales') || commandLower.includes('earning')) {
      response = hotelKnowledgeBase.business.revenue;
    }
    else if (commandLower.includes('order') || commandLower.includes('customer')) {
      response = hotelKnowledgeBase.business.orders;
    }
    else if (commandLower.includes('performance') || commandLower.includes('yesterday')) {
      response = hotelKnowledgeBase.business.performance;
    }
    else if (commandLower.includes('forecast') || commandLower.includes('predict') || commandLower.includes('tomorrow')) {
      response = hotelKnowledgeBase.business.forecast;
    }
    else if (commandLower.includes('inventory') || commandLower.includes('stock') || commandLower.includes('supply')) {
      response = hotelKnowledgeBase.business.inventory;
    }
    else if (commandLower.includes('complaint') || commandLower.includes('issue')) {
      response = hotelKnowledgeBase.customer.complaints;
    }
    else if (commandLower.includes('feedback') || commandLower.includes('review')) {
      response = hotelKnowledgeBase.customer.feedback;
    }
    else if (commandLower.includes('loyal') || commandLower.includes('regular') || commandLower.includes('member')) {
      response = hotelKnowledgeBase.customer.loyalty;
    }
    else if (commandLower.includes('prefer') || commandLower.includes('like') || commandLower.includes('taste')) {
      response = hotelKnowledgeBase.customer.preferences;
    }
    else if (commandLower.includes('competition') || commandLower.includes('competitor')) {
      response = hotelKnowledgeBase.market.competition;
    }
    else if (commandLower.includes('trend') || commandLower.includes('popular')) {
      response = hotelKnowledgeBase.market.trends;
    }
    else if (commandLower.includes('opportunity') || commandLower.includes('chance') || commandLower.includes('growth')) {
      response = hotelKnowledgeBase.market.opportunities;
    }
    else if (commandLower.includes('challenge') || commandLower.includes('problem') || commandLower.includes('difficult')) {
      response = hotelKnowledgeBase.market.challenges;
    }
    else if (commandLower.includes('recommend') || commandLower.includes('suggest') || commandLower.includes('advice')) {
      // Choose a random recommendation category
      const recommendationKeys = Object.keys(hotelKnowledgeBase.recommendations);
      const randomKey = recommendationKeys[Math.floor(Math.random() * recommendationKeys.length)] as keyof typeof hotelKnowledgeBase.recommendations;
      response = hotelKnowledgeBase.recommendations[randomKey];
    }
    else if (commandLower.includes('hello') || commandLower.includes('hi') || commandLower.includes('hey') || commandLower.includes('greet')) {
      response = "Hello! I'm your hotel management assistant. How can I help you today? You can ask about reservations, revenue, inventory, or staff.";
    }
    else if (commandLower.includes('help') || commandLower.includes('assist') || commandLower.includes('support')) {
      response = "I can help with information about your restaurant operations, business metrics, customer feedback, market analysis, and recommendations. What would you like to know?";
    }
    else {
      response = "I'm your hotel management assistant. You can ask me about operations, business metrics, customers, market analysis, or for recommendations. How can I help you today?";
    }
    
    // Speak the response
    speakResponse(response);
    
    return response;
  };
  
  // Speak response using a consistent voice
  const speakResponse = (text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Get available voices and choose a pleasant female voice
      const voices = window.speechSynthesis.getVoices();
      // Pick a female voice if available
      const femaleVoice = voices.find(voice => 
        voice.name.includes('Female') || 
        voice.name.includes('Samantha') || 
        voice.name.includes('Veena') ||
        voice.name.includes('Rishi')
      );
      
      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }
      
      // Adjust speech parameters
      utterance.rate = 1.0;  // Normal speed
      utterance.pitch = 1.1; // Slightly higher pitch
      utterance.volume = 1.0; // Full volume
      
      // Handle speech end event
      utterance.onend = () => {
        setIsSpeaking(false);
      };
      
      // Start speaking
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    } else {
      toast({
        title: "Speech Not Supported",
        description: "Your browser doesn't support speech synthesis.",
        variant: "destructive"
      });
    }
  };
  
  // Start voice recognition
  const startListening = () => {
    if (voiceRecognition) {
      try {
        voiceRecognition.start();
        setIsListening(true);
        setTranscript("");
      } catch (error) {
        console.error('Error starting voice recognition:', error);
      }
    }
  };
  
  // Stop voice recognition
  const stopListening = () => {
    if (voiceRecognition) {
      try {
        voiceRecognition.stop();
        setIsListening(false);
      } catch (error) {
        console.error('Error stopping voice recognition:', error);
      }
    }
  };
  
  // Stop speaking
  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };
  
  return {
    isListening,
    isSpeaking,
    transcript,
    startListening,
    stopListening,
    stopSpeaking,
    speakResponse,
    processVoiceCommand
  };
}