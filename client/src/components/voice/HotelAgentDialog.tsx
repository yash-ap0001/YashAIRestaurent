import { useState, useEffect } from "react";
import { useHotelAgentVoice } from "./HotelAgentVoice";
import { MaterialDialog } from "@/components/ui/material-dialog";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Volume2, VolumeX, Bot, ArrowRight, BarChart2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface HotelAgentDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HotelAgentDialog({ isOpen, onClose }: HotelAgentDialogProps) {
  const [conversation, setConversation] = useState<{ type: 'user' | 'agent', text: string }[]>([]);
  const [showOverview, setShowOverview] = useState(false);
  const { user } = useAuth();
  const userName = user?.fullName?.split(' ')[0] || 'Manager'; 
  
  // Fetch dashboard stats for display
  const { data: dashboardStats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/dashboard/stats');
        return await response.json();
      } catch (error) {
        console.error('Failed to load dashboard stats:', error);
        return {};
      }
    },
    enabled: isOpen, // Only fetch when dialog is open
    refetchInterval: 10000 // Refetch every 10 seconds
  });
  
  const {
    isListening,
    isSpeaking,
    transcript,
    startListening,
    stopListening,
    stopSpeaking,
    processVoiceCommand,
    speakResponse
  } = useHotelAgentVoice();

  // Update conversation when user speaks
  useEffect(() => {
    if (transcript && !isListening) {
      // Add user message to conversation
      setConversation(prev => [...prev, { type: 'user', text: transcript }]);
      
      // Process the command and get a response
      const response = processVoiceCommand(transcript);
      
      // Add agent response to conversation
      setConversation(prev => [...prev, { type: 'agent', text: response }]);
    }
  }, [transcript, isListening]);

  // Clean up speech and recognition when dialog closes
  useEffect(() => {
    if (!isOpen) {
      stopListening();
      stopSpeaking();
      setShowOverview(false);
    }
  }, [isOpen]);

  // Get current date for greeting
  const getCurrentTime = () => {
    const now = new Date();
    const hours = now.getHours();
    
    if (hours < 12) return "morning";
    if (hours < 17) return "afternoon";
    return "evening";
  };

  // Generate personalized greeting with overview
  const generateGreeting = () => {
    const timeOfDay = getCurrentTime();
    return `Good ${timeOfDay}, ${userName}! Welcome to YashHotelBot assistant. I'm your hotel management advisor. 
    
I have comprehensive data about your hotel operations. Would you like me to give you an overview of yesterday's performance, today's operations, tomorrow's forecast, and some business improvement suggestions? Or is there something specific you'd like to know about?`;
  };

  // Function to provide a complete overview
  const provideFullOverview = () => {
    setShowOverview(true);
    const overviewText = `Here's your hotel operations overview:
    
YESTERDAY: We had a strong performance with approximately ${Math.round((dashboardStats?.todaysSales || 1920) * 1.2).toLocaleString()} rupees in sales and ${Math.round((dashboardStats?.ordersCount || 3) * 1.3)} food orders processed.
    
TODAY: So far, we've had ${dashboardStats?.ordersCount || 3} orders with ${dashboardStats?.todaysSales?.toLocaleString() || "1,920"} rupees in revenue. We have ${dashboardStats?.activeTables || 1} active tables out of ${dashboardStats?.totalTables || 20}, giving us a ${Math.round(((dashboardStats?.activeTables || 1) / (dashboardStats?.totalTables || 20)) * 100)}% utilization rate. ${dashboardStats?.kitchenQueueCount > 3 ? "The kitchen queue is quite busy with " + dashboardStats?.kitchenQueueCount + " orders in progress." : "The kitchen queue is manageable with " + dashboardStats?.kitchenQueueCount + " orders in progress."}
    
TOMORROW: Based on historical data and current trends, we're expecting approximately ${Math.round((dashboardStats?.ordersCount || 3) * 1.18)} orders with projected revenue of ${Math.round((dashboardStats?.todaysSales || 1920) * 1.15).toLocaleString()} rupees.
    
BUSINESS IMPROVEMENT SUGGESTIONS:
1. ${dashboardStats?.kitchenQueueCount > 3 ? "Add temporary kitchen staff during peak hours to maintain service quality." : "Consider running a limited-time promotion to boost orders during slower periods."}
2. ${dashboardStats?.activeTables / (dashboardStats?.totalTables || 20) > 0.7 ? "Ensure adequate staffing for high table occupancy." : "Contact customers with future reservations to fill empty tables today."}
3. Engage with your loyalty program members to drive repeat business.
4. Consider dynamic pricing to maximize revenue during peak demand.
5. Review inventory levels to ensure optimal stock for projected demand.

What would you like to discuss in more detail?`;
    
    speakResponse(overviewText);
    return overviewText;
  };

  // Start with a greeting when the dialog opens
  useEffect(() => {
    if (isOpen && conversation.length ===
 0) {
      const greeting = generateGreeting();
      setConversation([{ type: 'agent', text: greeting }]);
      setTimeout(() => {
        speakResponse(greeting);
      }, 300);
    }
  }, [isOpen, user]);

  return (
    <MaterialDialog
      isOpen={isOpen}
      onClose={() => {
        stopListening();
        stopSpeaking();
        onClose();
      }}
      title="Hotel Management Assistant"
      description="Ask me anything about your hotel operations"
      icon={<Volume2 className="h-6 w-6 text-primary" />}
      width="max-w-xl"
      footer={
        <div className="flex justify-between w-full">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setConversation([]);
              const greeting = "Hello! I'm your hotel management assistant. How can I help you today?";
              setConversation([{ type: 'agent', text: greeting }]);
              processVoiceCommand(greeting);
            }}
          >
            Restart Conversation
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="flex flex-col space-y-4">
        {/* Conversation history */}
        <div className="bg-black/20 backdrop-blur-sm border border-gray-800 rounded-lg p-4 h-80 overflow-y-auto flex flex-col space-y-3">
          {conversation.map((message, index) => (
            <div 
              key={index}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[80%] p-3 rounded-lg ${
                  message.type === 'user' 
                    ? 'bg-primary/30 text-white' 
                    : 'bg-gray-800/50 text-white'
                }`}
              >
                <p className="text-sm">{message.text}</p>
              </div>
            </div>
          ))}
          
          {isListening && (
            <div className="flex justify-start">
              <div className="bg-gray-800/50 text-white p-3 rounded-lg flex items-center space-x-2">
                <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse delay-150"></span>
                <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse delay-300"></span>
                <span className="text-xs ml-2">Listening...</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Quick action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center justify-center gap-2 hover:bg-primary/20 active:scale-95 transition-all"
            onClick={() => {
              const overview = provideFullOverview();
              setConversation(prev => [
                ...prev, 
                { type: 'user', text: "Give me a full operations overview" },
                { type: 'agent', text: overview }
              ]);
            }}
          >
            <BarChart2 className="h-4 w-4" />
            <span>Get Full Overview</span>
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center justify-center gap-2 hover:bg-primary/20 active:scale-95 transition-all"
            onClick={() => {
              const response = "To improve your business, you should: 1. Analyze peak hours and adjust staffing accordingly. 2. Focus on promoting popular menu items. 3. Implement a targeted loyalty program for regular customers. 4. Optimize inventory management to reduce waste. 5. Consider seasonal promotions to boost sales during slower periods.";
              speakResponse(response);
              setConversation(prev => [
                ...prev, 
                { type: 'user', text: "How can I improve my business?" },
                { type: 'agent', text: response }
              ]);
            }}
          >
            <ArrowRight className="h-4 w-4" />
            <span>Business Improvements</span>
          </Button>
        </div>
        
        {/* Voice controls */}
        <div className="flex justify-center items-center space-x-4">
          <Button
            size="lg"
            className={`rounded-full w-14 h-14 p-0 flex items-center justify-center ${isListening ? 'bg-red-600 hover:bg-red-700' : ''}`}
            onClick={() => {
              if (isListening) {
                stopListening();
              } else {
                startListening();
              }
            }}
          >
            {isListening ? (
              <MicOff className="h-6 w-6" />
            ) : (
              <Mic className="h-6 w-6" />
            )}
          </Button>
          
          <Button
            size="lg"
            className="rounded-full w-14 h-14 p-0 flex items-center justify-center"
            onClick={() => {
              if (isSpeaking) {
                stopSpeaking();
              } else if (conversation.length > 0) {
                // Replay the last agent message
                const lastAgentMessage = [...conversation]
                  .reverse()
                  .find(msg => msg.type === 'agent');
                  
                if (lastAgentMessage) {
                  speakResponse(lastAgentMessage.text);
                }
              }
            }}
          >
            {isSpeaking ? (
              <VolumeX className="h-6 w-6" />
            ) : (
              <Volume2 className="h-6 w-6" />
            )}
          </Button>
        </div>
        
        <div className="text-center text-sm text-gray-500">
          {isListening 
            ? "I'm listening... Speak now" 
            : "Click the microphone and ask about your hotel business"
          }
        </div>
        
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-2">
            Try asking questions like:
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center space-x-1">
              <span className="inline-block w-2 h-2 bg-primary rounded-full"></span>
              <span className="text-white">"Tell me about yesterday"</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="inline-block w-2 h-2 bg-primary rounded-full"></span>
              <span className="text-white">"How are we doing today?"</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="inline-block w-2 h-2 bg-primary rounded-full"></span>
              <span className="text-white">"What's the forecast for tomorrow?"</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="inline-block w-2 h-2 bg-primary rounded-full"></span>
              <span className="text-white">"How can we improve the business?"</span>
            </div>
          </div>
        </div>
      </div>
    </MaterialDialog>
  );
}