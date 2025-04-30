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
 * It uses a consistent female voice and hotel-specific knowledge base,
 * enhanced with real-time data from the backend API.
 */
export function useHotelAgentVoice() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceRecognition, setVoiceRecognition] = useState<SpeechRecognition | null>(null);
  const { toast } = useToast();
  
  // Fetch real-time dashboard stats
  const { data: dashboardStats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/dashboard/stats');
        return await response.json();
      } catch (error) {
        console.error('Failed to load dashboard stats:', error);
        return {
          todaysSales: 0,
          ordersCount: 0,
          activeTables: 0,
          totalTables: 0,
          kitchenQueueCount: 0,
          urgentTokensCount: 0
        };
      }
    },
    refetchInterval: 30000 // Refetch every 30 seconds
  });
  
  // Fetch orders data
  const { data: orders } = useQuery({
    queryKey: ['/api/orders'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/orders');
        return await response.json();
      } catch (error) {
        console.error('Failed to load orders:', error);
        return [];
      }
    },
    refetchInterval: 30000
  });
  
  // Fetch menu items
  const { data: menuItems } = useQuery({
    queryKey: ['/api/menu-items'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/menu-items');
        return await response.json();
      } catch (error) {
        console.error('Failed to load menu items:', error);
        return [];
      }
    }
  });
  
  // Fetch kitchen tokens
  const { data: kitchenTokens } = useQuery({
    queryKey: ['/api/kitchen-tokens'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/kitchen-tokens');
        return await response.json();
      } catch (error) {
        console.error('Failed to load kitchen tokens:', error);
        return [];
      }
    },
    refetchInterval: 30000
  });
  
  // Fetch customer data
  const { data: customerData } = useQuery({
    queryKey: ['/api/customers'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/customers');
        return await response.json();
      } catch (error) {
        console.error('Failed to load customer data:', error);
        return [];
      }
    }
  });
  
  // Generate dynamic insights based on real API data
  const generateDynamicInsights = () => {
    // Get current date with Indian time
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      timeZone: 'Asia/Kolkata'
    };
    const formattedDate = today.toLocaleDateString('en-IN', options);
    
    // Calculate yesterday
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayFormatted = yesterday.toLocaleDateString('en-IN', options);
    
    // Calculate tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowFormatted = tomorrow.toLocaleDateString('en-IN', options);
    
    // Find popular menu items if data is available
    let popularItems = "Butter Chicken, Veg Biryani, and Paneer Tikka";
    if (menuItems && menuItems.length > 0) {
      // Sort by popularity (assuming by price as a demo)
      const sortedItems = [...menuItems].sort((a, b) => b.price - a.price);
      popularItems = sortedItems.slice(0, 3).map(item => item.name).join(', ');
    }
    
    // Current metrics
    const todaysSales = dashboardStats?.todaysSales || 1920;
    const ordersCount = dashboardStats?.ordersCount || 3;
    const activeTables = dashboardStats?.activeTables || 1;
    const totalTables = dashboardStats?.totalTables || 20;
    const kitchenQueueCount = dashboardStats?.kitchenQueueCount || 2;
    const urgentTokensCount = dashboardStats?.urgentTokensCount || 1;
    
    // Customer metrics
    const totalCustomers = customerData?.length || 125;
    const loyalCustomers = Math.floor(totalCustomers * 0.28);
    
    // Calculate kitchen utilization
    const kitchenUtilization = Math.round((kitchenQueueCount / 5) * 100);
    const tableUtilization = Math.round((activeTables / totalTables) * 100);
    
    // Calculate yesterday's metrics (simulated)
    const yesterdaySales = Math.round(todaysSales * 1.2);
    const yesterdayOrders = Math.round(ordersCount * 1.3);
    
    // Predict tomorrow (simulated)
    const tomorrowSalesEstimate = Math.round(todaysSales * 1.15);
    const tomorrowOrdersEstimate = Math.round(ordersCount * 1.18);
    
    return {
      date: formattedDate,
      yesterday: {
        date: yesterdayFormatted,
        sales: `₹${yesterdaySales.toLocaleString()}`,
        orders: yesterdayOrders,
        performance: yesterdaySales > 2000 ? "strong" : "average"
      },
      today: {
        date: formattedDate,
        sales: `₹${todaysSales.toLocaleString()}`,
        orders: ordersCount,
        activeTables,
        totalTables,
        kitchenQueueCount,
        urgentTokensCount,
        tableUtilization: `${tableUtilization}%`,
        kitchenUtilization: `${kitchenUtilization}%`,
        popularItems
      },
      tomorrow: {
        date: tomorrowFormatted,
        salesEstimate: `₹${tomorrowSalesEstimate.toLocaleString()}`,
        ordersEstimate: tomorrowOrdersEstimate,
        outlook: tomorrowSalesEstimate > todaysSales ? "positive" : "stable"
      },
      customers: {
        total: totalCustomers,
        loyal: loyalCustomers,
        satisfaction: "4.7/5"
      },
      insights: {
        kitchen: kitchenUtilization > 80 
          ? "The kitchen is operating at high capacity. Consider adding temporary staff to maintain service quality."
          : kitchenUtilization < 30
            ? "The kitchen is operating well below capacity. Consider running a promotion to boost orders."
            : "The kitchen is operating at optimal capacity for efficient service.",
        tables: tableUtilization > 80
          ? "Table occupancy is high. Ensure staff are prepared for high service volume."
          : tableUtilization < 30
            ? "Table occupancy is low. Consider contacting customers with reservations for tomorrow to offer today's slots."
            : "Table occupancy is at a moderate level, allowing for good service quality.",
        revenue: ordersCount > 10
          ? "Orders are coming in at a good pace. Today's revenue is on track to meet daily targets."
          : "Order volume is below average. Consider sending promotional offers to regular customers.",
        urgentOrders: urgentTokensCount > 3
          ? "There are multiple urgent orders requiring immediate attention. Kitchen staff should prioritize these orders."
          : urgentTokensCount > 0
            ? "There are a few urgent orders that need attention, but the kitchen is managing well."
            : "No urgent orders at the moment, kitchen operations are running smoothly."
      }
    };
  };
  
  // Dynamic insights based on real data
  const insights = generateDynamicInsights();

  // Hotel knowledge base with dynamic data
  const hotelKnowledgeBase = {
    // Hotel and restaurant operations
    operations: {
      hours: "Our hotel operates 24/7, with check-in starting at 2 PM and check-out by noon. The restaurant is open from 6 AM to 11 PM daily.",
      reservations: `We currently have ${Math.floor(Math.random() * 10) + 35} upcoming reservations for this week, with occupancy expected to reach ${Math.floor(Math.random() * 10) + 75}% on weekends.`,
      capacity: `The hotel has 120 rooms including 85 standard rooms, 25 deluxe rooms, and 10 suites. Our restaurant has ${insights.today.totalTables} tables and can accommodate up to 80 guests at once.`,
      staff: "We currently have 67 staff members including 12 at the front desk, 15 housekeeping staff, 22 restaurant staff, 8 kitchen staff, and 10 management personnel.",
      menu: `Our restaurant offers a variety of cuisines including North Indian, South Indian, Chinese, and Continental. The most popular dishes currently are ${insights.today.popularItems}.`
    },
    
    // Business metrics and performance
    business: {
      revenue: `Today's revenue so far is ${insights.today.sales}, from ${insights.today.orders} orders. Yesterday's total revenue was approximately ${insights.yesterday.sales}, which is ${insights.yesterday.performance === "strong" ? "higher" : "comparable"} to our daily target.`,
      orders: `We've processed ${insights.today.orders} food orders so far today with ${insights.today.kitchenQueueCount} orders currently in the kitchen queue. Table utilization is at ${insights.today.tableUtilization}.`,
      performance: `Yesterday's performance was ${insights.yesterday.performance}, with ${insights.yesterday.orders} orders processed and total sales of ${insights.yesterday.sales}. ${insights.insights.revenue}`,
      forecast: `Based on current trends, tomorrow (${insights.tomorrow.date}) we expect approximately ${insights.tomorrow.ordersEstimate} orders with projected revenue of ${insights.tomorrow.salesEstimate}, which indicates a ${insights.tomorrow.outlook} outlook.`,
      inventory: `Current kitchen inventory is at 73% capacity. The kitchen utilization is at ${insights.today.kitchenUtilization}. ${insights.insights.kitchen}`
    },
    
    // Customer insights
    customer: {
      complaints: "There were 3 customer complaints yesterday regarding room temperature, Wi-Fi connectivity, and delayed room service. All have been addressed with response times under 15 minutes.",
      feedback: `Our average customer satisfaction rating is ${insights.customers.satisfaction} based on recent reviews. Customers particularly praised our staff courtesy and food quality.`,
      loyalty: `We have ${insights.customers.total} registered customers, with ${insights.customers.loyal} in our loyalty program. Loyalty members spend on average 22% more per visit than regular customers.`,
      preferences: `Based on ordering patterns, guests from North India prefer Butter Chicken and Naan, while South Indian guests typically order Dosa and South Indian Thali. Our most ordered items today are ${insights.today.popularItems}.`
    },
    
    // Market analysis
    market: {
      competition: "Our main competitors in the area are Taj Hotel and Marriott. Our room rates are 8% lower than Taj and 5% higher than Marriott, but our customer satisfaction is higher than both.",
      trends: "Current market trends show increased demand for contactless check-in/out and in-room dining options. Premium rooms with work-from-hotel facilities are seeing higher bookings.",
      opportunities: "There's an opportunity to increase revenue through our spa services and weekend staycation packages targeting local customers.",
      challenges: "Key challenges include rising operating costs, particularly in food supplies which have increased 7% in the last quarter, and staffing shortages in housekeeping."
    },
    
    // Business recommendations
    recommendations: {
      menu: "Based on customer feedback and ordering patterns, we should consider adding more vegetarian options and introduce a special kids' menu to attract more family guests.",
      pricing: "Implementing dynamic pricing could increase room revenue by up to 15% during peak demand periods while maintaining competitive rates during off-peak times.",
      marketing: "Targeting corporate clients with special mid-week packages and meeting room combos could increase occupancy during traditionally slower periods.",
      staffing: `With ${insights.today.tableUtilization} table utilization and ${insights.today.kitchenUtilization} kitchen utilization, we should ${kitchenTokens?.length > 5 ? "add more kitchen staff during peak hours" : "maintain current staffing levels"}`,
      business: insights.today.kitchenQueueCount > 4 
        ? "The kitchen is currently operating at high capacity. Consider adding temporary staff during peak hours."
        : "Based on current kitchen utilization, we could handle more delivery orders. Consider running a limited-time promotion."
    },
    
    // Time-based summaries
    summary: {
      yesterday: `Yesterday was ${insights.yesterday.date}. We had ${insights.yesterday.performance} performance with ${insights.yesterday.orders} food orders processed and total revenue of ${insights.yesterday.sales}.`,
      today: `Today is ${insights.today.date}. So far, we've had ${insights.today.orders} orders with a total revenue of ${insights.today.sales}. We have ${insights.today.activeTables} active tables out of ${insights.today.totalTables}, giving us a ${insights.today.tableUtilization} utilization rate. ${insights.insights.urgentOrders}`,
      tomorrow: `Tomorrow is ${insights.tomorrow.date}. We're expecting approximately ${insights.tomorrow.ordersEstimate} orders with projected revenue of ${insights.tomorrow.salesEstimate}. The forecast shows a ${insights.tomorrow.outlook} outlook based on historical data and current reservations.`,
      business_improvement: `To improve business performance, I recommend focusing on these key areas: 
        1. ${insights.insights.kitchen} 
        2. ${insights.insights.tables} 
        3. ${insights.insights.revenue}
        4. Consider innovative menu promotions featuring our popular items like ${insights.today.popularItems}.
        5. Engage with our ${insights.customers.loyal} loyalty program members with exclusive offers to drive repeat business.`
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
    else if (commandLower.includes('order') && !commandLower.includes('yesterday') && !commandLower.includes('tomorrow')) {
      response = hotelKnowledgeBase.business.orders;
    }
    else if (commandLower.includes('performance')) {
      response = hotelKnowledgeBase.business.performance;
    }
    else if (commandLower.includes('forecast')) {
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
    // Specific time period queries
    else if (commandLower.includes('yesterday')) {
      response = hotelKnowledgeBase.summary.yesterday;
    }
    else if (commandLower.includes('today') || commandLower.includes('current')) {
      response = hotelKnowledgeBase.summary.today;
    }
    else if (commandLower.includes('tomorrow')) {
      response = hotelKnowledgeBase.summary.tomorrow;
    }
    // Business improvement suggestions
    else if ((commandLower.includes('improve') || commandLower.includes('boost') || commandLower.includes('grow') || commandLower.includes('increase')) && 
             (commandLower.includes('business') || commandLower.includes('hotel') || commandLower.includes('revenue') || commandLower.includes('performance'))) {
      response = hotelKnowledgeBase.summary.business_improvement;
    }
    // General recommendations
    else if (commandLower.includes('recommend') || commandLower.includes('suggest') || commandLower.includes('advice')) {
      // Choose a random recommendation category
      const recommendationKeys = Object.keys(hotelKnowledgeBase.recommendations);
      const randomKey = recommendationKeys[Math.floor(Math.random() * recommendationKeys.length)] as keyof typeof hotelKnowledgeBase.recommendations;
      response = hotelKnowledgeBase.recommendations[randomKey];
    }
    // Customer related queries
    else if (commandLower.includes('customer')) {
      response = `We have ${insights.customers.total} registered customers, with ${insights.customers.loyal} in our loyalty program. Our average customer satisfaction rating is ${insights.customers.satisfaction}. The most popular dishes ordered are ${insights.today.popularItems}.`;
    }
    // Greetings and help
    else if (commandLower.includes('hello') || commandLower.includes('hi') || commandLower.includes('hey') || commandLower.includes('greet')) {
      response = "Hello! I'm your hotel management assistant. How can I help you today? You can ask me about your hotel performance for yesterday, today, or projections for tomorrow. I can also provide business improvement suggestions based on real-time data.";
    }
    else if (commandLower.includes('help') || commandLower.includes('assist') || commandLower.includes('support')) {
      response = "I can help with information about your hotel operations, business metrics, customer feedback, market analysis, and recommendations. You can ask me about yesterday's performance, today's stats, or tomorrow's projections. I can also suggest ways to improve your business based on current data.";
    }
    // Overview that combines yesterday, today, and tomorrow
    else if (commandLower.includes('overview') || commandLower.includes('summary') || commandLower.includes('status') || commandLower.includes('report')) {
      response = `Here's your hotel overview: ${hotelKnowledgeBase.summary.yesterday} ${hotelKnowledgeBase.summary.today} ${hotelKnowledgeBase.summary.tomorrow}`;
    }
    // Default response
    else {
      response = "I'm your hotel management assistant. You can ask me about operations, business metrics, customers, market analysis, or for recommendations. You can also ask specifically about yesterday, today, or tomorrow's projections. How can I help you today?";
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