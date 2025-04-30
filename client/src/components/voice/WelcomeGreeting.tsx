import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { MaterialDialog } from "@/components/ui/material-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PauseCircle, Play, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WelcomeGreetingProps {
  userName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function WelcomeGreeting({ userName, isOpen, onClose }: WelcomeGreetingProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSection, setCurrentSection] = useState<'greeting'|'yesterday'|'today'|'tomorrow'|'tips'|'closing'>('greeting');
  const [utterance, setUtterance] = useState<SpeechSynthesisUtterance | null>(null);
  const { toast } = useToast();

  // Get business statistics for intelligent greeting
  const { data: stats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/dashboard/stats');
        return await response.json();
      } catch (error) {
        console.log('Failed to load dashboard stats:', error);
        // Return default values if API fails
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

  // Predefined business tips - would come from AI in production
  const businessTips = [
    "Consider running lunch specials to increase traffic during slower hours.",
    "Featuring a dish of the day can help reduce inventory and create excitement.",
    "Customers who receive personalized service are 40% more likely to become regulars.",
    "Analyzing your most popular dishes can help optimize your inventory purchases.",
    "Implementing a small loyalty program can increase return business by up to 30%."
  ];

  // Select a random tip
  const randomTip = businessTips[Math.floor(Math.random() * businessTips.length)];
  
  const generateWelcomeScript = () => {
    // Default values if stats aren't loaded yet
    const ordersYesterday = stats?.ordersYesterday || 42;
    const ordersToday = stats?.ordersToday || 18;
    const revenue = stats?.revenueToday ? `₹${stats.revenueToday.toLocaleString()}` : "₹12,500";
    const reservations = stats?.upcomingReservations || 8;
    const popularDish = stats?.topSellingItem || "Butter Chicken";
    
    return {
      greeting: `Welcome back, ${userName}! It's great to see you today.`,
      yesterday: `Yesterday was quite a day! We served ${ordersYesterday} orders, which is ${ordersYesterday > 35 ? "above" : "below"} our daily average. ${popularDish} was our most ordered dish.`,
      today: `Today so far, we've had ${ordersToday} orders with a total revenue of ${revenue}. The kitchen is operating at ${Math.round((ordersToday/60) * 100)}% capacity.`,
      tomorrow: `Looking ahead, we have ${reservations} reservations for tomorrow, with 3 being large parties of 6 or more.`,
      tips: `Here's a business tip for your consideration: ${randomTip}`,
      closing: `Is there anything specific you'd like to know about the business today?`
    };
  };
  
  const script = generateWelcomeScript();

  const playSpeech = (text: string, onEnd?: () => void) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Get available voices and choose a pleasant one
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
        if (onEnd) onEnd();
      };
      
      // Handle speech error
      utterance.onerror = () => {
        setIsSpeaking(false);
        toast({
          title: "Speech Error",
          description: "There was an issue with the voice assistant.",
          variant: "destructive"
        });
      };
      
      // Store the utterance to be able to cancel it later
      setUtterance(utterance);
      
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

  const stopSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };
  
  const playCurrentSection = () => {
    switch(currentSection) {
      case 'greeting':
        playSpeech(script.greeting, () => setCurrentSection('yesterday'));
        break;
      case 'yesterday':
        playSpeech(script.yesterday, () => setCurrentSection('today'));
        break;
      case 'today':
        playSpeech(script.today, () => setCurrentSection('tomorrow'));
        break;
      case 'tomorrow':
        playSpeech(script.tomorrow, () => setCurrentSection('tips'));
        break;
      case 'tips':
        playSpeech(script.tips, () => setCurrentSection('closing'));
        break;
      case 'closing':
        playSpeech(script.closing);
        break;
    }
  };
  
  const toggleSpeech = () => {
    if (isSpeaking) {
      stopSpeech();
    } else {
      playCurrentSection();
    }
  };
  
  // Automatically start speaking when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to allow dialog transition
      const timer = setTimeout(() => {
        setCurrentSection('greeting');
        playCurrentSection();
      }, 500);
      
      return () => clearTimeout(timer);
    } else {
      stopSpeech();
    }
  }, [isOpen]);
  
  // Cleanup speech on component unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);
  
  // Render current text being spoken
  const getCurrentText = () => {
    switch(currentSection) {
      case 'greeting': return script.greeting;
      case 'yesterday': return script.yesterday;
      case 'today': return script.today;
      case 'tomorrow': return script.tomorrow;
      case 'tips': return script.tips;
      case 'closing': return script.closing;
      default: return "";
    }
  };
  
  return (
    <MaterialDialog
      isOpen={isOpen}
      onClose={() => {
        stopSpeech();
        onClose();
      }}
      title="Welcome, Hotel Owner!"
      description="Your AI Assistant is here to help"
      icon={<Volume2 className="h-6 w-6 text-primary" />}
      width="max-w-lg"
      footer={
        <div className="flex justify-between w-full items-center">
          <div className="flex gap-2">
            <Badge variant={currentSection === 'greeting' ? "default" : "outline"}>
              Greeting
            </Badge>
            <Badge variant={currentSection === 'yesterday' ? "default" : "outline"}>
              Yesterday
            </Badge>
            <Badge variant={currentSection === 'today' ? "default" : "outline"}>
              Today
            </Badge>
            <Badge variant={currentSection === 'tomorrow' ? "default" : "outline"}>
              Tomorrow
            </Badge>
            <Badge variant={currentSection === 'tips' ? "default" : "outline"}>
              Tips
            </Badge>
          </div>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="bg-black/30 backdrop-blur-sm p-4 rounded-lg border border-gray-800 min-h-[100px] flex items-center">
          <p className="text-lg text-white">
            {getCurrentText()}
          </p>
        </div>
        
        <div className="flex justify-center">
          <Button 
            size="lg" 
            className="rounded-full w-14 h-14 p-0 flex items-center justify-center" 
            onClick={toggleSpeech}
          >
            {isSpeaking ? 
              <PauseCircle className="h-8 w-8" /> : 
              <Play className="h-8 w-8 ml-1" />
            }
          </Button>
        </div>
        
        <div className="text-center text-sm text-gray-500">
          {isSpeaking ? "Click to pause" : "Click to play"}
        </div>
      </div>
    </MaterialDialog>
  );
}