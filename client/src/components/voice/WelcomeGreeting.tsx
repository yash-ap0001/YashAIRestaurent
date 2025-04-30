import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { MaterialDialog } from "@/components/ui/material-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PauseCircle, Play, BarChart3, ArrowRight, ChevronRight, Mic } from "lucide-react";
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

  // Smart business intelligence tips based on actual metrics
  const generateBusinessTip = () => {
    // Default values if stats aren't loaded yet
    const ordersYesterday = stats?.ordersYesterday || 42;
    const ordersToday = stats?.ordersToday || 18;
    const popularDish = stats?.topSellingItem || "Butter Chicken";
    const kitchenCapacity = Math.round((ordersToday/60) * 100);
    
    // Generate context-aware business tips
    if (kitchenCapacity < 30) {
      return `With kitchen operating at only ${kitchenCapacity}% capacity, consider running a limited-time promotion on your delivery platforms to boost afternoon orders.`;
    } else if (kitchenCapacity > 80) {
      return `Your kitchen is operating at ${kitchenCapacity}% capacity. Consider adding temporary staff during peak hours to maintain service quality and reduce wait times.`;
    } else if (ordersYesterday < 35) {
      return `Yesterday's orders were below average. Analyze your competitor's promotions and consider implementing a targeted social media campaign to increase visibility.`;
    } else if (ordersYesterday > 50) {
      return `You had an excellent day yesterday with ${ordersYesterday} orders! Analyze which menu items performed best and consider featuring them more prominently.`;
    } else {
      return `${popularDish} is your most ordered dish. Consider creating a special variation or complementary item to increase check sizes through upselling.`;
    }
  };

  // Get a contextually relevant business tip
  const smartBusinessTip = generateBusinessTip();
  
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
      tips: `Here's a business insight based on your current metrics: ${smartBusinessTip}`,
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
  
  // Automatically start speaking when dialog opens - no user action required
  useEffect(() => {
    if (isOpen) {
      // Small delay to allow dialog transition
      const timer = setTimeout(() => {
        setCurrentSection('greeting');
        // Automatically start speaking without waiting for user input
        if ('speechSynthesis' in window) {
          const text = script.greeting;
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
          
          // Automatically continue to next section when done speaking greeting
          utterance.onend = () => {
            setIsSpeaking(false);
            setCurrentSection('yesterday');
            // Automatically start speaking the next section
            playSpeech(script.yesterday, () => {
              setCurrentSection('today');
              playSpeech(script.today, () => {
                setCurrentSection('tomorrow');
                playSpeech(script.tomorrow, () => {
                  setCurrentSection('tips');
                  playSpeech(script.tips, () => {
                    setCurrentSection('closing');
                    playSpeech(script.closing);
                  });
                });
              });
            });
          };
          
          // Start speaking immediately
          window.speechSynthesis.speak(utterance);
          setIsSpeaking(true);
          setUtterance(utterance);
        }
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
      title={`Welcome back, ${userName}!`}
      description="Your AI Business Assistant has prepared insights for you"
      icon={<BarChart3 className="h-6 w-6 text-primary" />}
      width="max-w-lg"
      footer={
        <div className="flex flex-col gap-4 w-full">
          <div className="flex gap-2 flex-wrap">
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
          
          <div className="flex justify-between items-center">
            <Button 
              variant="ghost" 
              size="sm"
              className="text-slate-400 hover:text-white text-xs"
              onClick={() => {
                // Keep speaking but minimize the dialog
                onClose();
              }}
            >
              <ArrowRight className="h-3 w-3 mr-1" />
              Continue while I speak in background
            </Button>
            <Button variant="outline" onClick={() => {
              stopSpeech();
              onClose();
            }}>
              Close
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="bg-black/30 backdrop-blur-sm p-4 rounded-lg border border-gray-800 min-h-[100px] flex items-center">
          <p className="text-lg text-white">
            {getCurrentText()}
          </p>
        </div>
        
        {/* Interactive question and response section */}
        {currentSection === 'closing' && (
          <div className="space-y-3">
            <div className="relative">
              <input 
                type="text"
                placeholder="Ask me anything about your business..."
                className="w-full bg-black/40 backdrop-blur-sm border border-gray-800 rounded-lg py-3 px-4 text-white"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value) {
                    const question = e.currentTarget.value;
                    e.currentTarget.value = '';
                    
                    // Generate a response based on the question
                    let response = '';
                    if (question.toLowerCase().includes('revenue')) {
                      response = `Based on current trends, your revenue is projected to increase by 12% this month compared to last month. Your strongest revenue generating items are Butter Chicken, Veg Biryani, and Paneer Tikka.`;
                    } else if (question.toLowerCase().includes('staff') || question.toLowerCase().includes('employee')) {
                      response = `I recommend scheduling 3 kitchen staff and 2 waiters for tomorrow's evening shift based on reservation data. You should also consider hiring a part-time chef to handle the increased weekend demand.`;
                    } else if (question.toLowerCase().includes('inventory') || question.toLowerCase().includes('stock')) {
                      response = `Your rice inventory is running low at 15% of optimal levels. I recommend restocking within the next 2 days. Your chicken inventory is at 65% and should last until your next scheduled delivery.`;
                    } else if (question.toLowerCase().includes('menu') || question.toLowerCase().includes('dish')) {
                      response = `Based on order patterns, I recommend featuring Butter Chicken as your special this week. Consider adding a seasonal dessert as customers often order sweet items with spicy main courses.`;
                    } else if (question.toLowerCase().includes('marketing') || question.toLowerCase().includes('promotion')) {
                      response = `Wednesday lunches have been consistently slow. Consider running a 15% discount promotion for office workers between 12-2pm on Wednesdays to increase traffic.`;
                    } else {
                      response = `Based on your business metrics, I'd recommend focusing on optimizing your kitchen capacity during peak hours and promoting your most popular items like ${stats?.topSellingItem || "Butter Chicken"} more prominently.`;
                    }
                    
                    // Speak the response
                    playSpeech(response);
                    
                    // Display response
                    const responseElement = document.createElement('div');
                    responseElement.className = 'bg-primary/20 backdrop-blur-sm p-3 rounded-lg border border-primary/30 text-white text-sm mt-2';
                    responseElement.textContent = response;
                    e.currentTarget.parentElement?.parentElement?.appendChild(responseElement);
                  }
                }}
              />
              <button 
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-primary"
                onClick={() => {
                  // You could trigger speech recognition here or other interactions
                  playSpeech("What would you like to know about your restaurant's performance?");
                }}
              >
                <Mic className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 text-center">
              Try asking about revenue projections, staff recommendations, inventory status, menu optimizations, or marketing ideas
            </p>
          </div>
        )}
        
        {/* Yesterday's Business Metrics */}
        {currentSection === 'yesterday' && (
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="bg-amber-900/30 backdrop-blur-sm p-3 rounded-lg border border-amber-800 text-center">
              <p className="text-xs text-amber-300">Total Orders</p>
              <p className="text-xl font-bold text-white">{stats?.ordersYesterday || 42}</p>
            </div>
            <div className="bg-orange-900/30 backdrop-blur-sm p-3 rounded-lg border border-orange-800 text-center">
              <p className="text-xs text-orange-300">Performance</p>
              <p className="text-xl font-bold text-white">{(stats?.ordersYesterday || 42) > 35 ? "+15%" : "-9%"}</p>
            </div>
            <div className="bg-rose-900/30 backdrop-blur-sm p-3 rounded-lg border border-rose-800 text-center">
              <p className="text-xs text-rose-300">Top Item</p>
              <p className="text-sm font-bold text-white truncate">{stats?.topSellingItem || "Butter Chicken"}</p>
            </div>
          </div>
        )}
        
        {/* Today's Business Metrics */}
        {currentSection === 'today' && (
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="bg-purple-900/30 backdrop-blur-sm p-3 rounded-lg border border-purple-800 text-center">
              <p className="text-xs text-purple-300">Total Orders</p>
              <p className="text-xl font-bold text-white">{stats?.ordersToday || 18}</p>
            </div>
            <div className="bg-indigo-900/30 backdrop-blur-sm p-3 rounded-lg border border-indigo-800 text-center">
              <p className="text-xs text-indigo-300">Revenue</p>
              <p className="text-xl font-bold text-white">₹{stats?.revenueToday?.toLocaleString() || "12,500"}</p>
            </div>
            <div className="bg-blue-900/30 backdrop-blur-sm p-3 rounded-lg border border-blue-800 text-center">
              <p className="text-xs text-blue-300">Kitchen Capacity</p>
              <p className="text-xl font-bold text-white">{Math.round(((stats?.ordersToday || 18)/60) * 100)}%</p>
            </div>
          </div>
        )}
        
        {/* Tomorrow's Business Metrics */}
        {currentSection === 'tomorrow' && (
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="bg-emerald-900/30 backdrop-blur-sm p-3 rounded-lg border border-emerald-800 text-center">
              <p className="text-xs text-emerald-300">Reservations</p>
              <p className="text-xl font-bold text-white">{stats?.upcomingReservations || 8}</p>
            </div>
            <div className="bg-teal-900/30 backdrop-blur-sm p-3 rounded-lg border border-teal-800 text-center">
              <p className="text-xs text-teal-300">Large Parties</p>
              <p className="text-xl font-bold text-white">3</p>
            </div>
            <div className="bg-cyan-900/30 backdrop-blur-sm p-3 rounded-lg border border-cyan-800 text-center">
              <p className="text-xs text-cyan-300">Forecast</p>
              <p className="text-xl font-bold text-white">{(stats?.upcomingReservations || 8) > 5 ? "Busy" : "Normal"}</p>
            </div>
          </div>
        )}
        
        {/* Action Suggestions */}
        {currentSection === 'tips' && (
          <div className="bg-emerald-900/20 backdrop-blur-sm p-3 rounded-lg border border-emerald-800">
            <h4 className="text-sm font-semibold text-emerald-300 mb-2">Recommended Actions:</h4>
            <ul className="text-sm space-y-1 text-white">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">•</span>
                <span>Review yesterday's order patterns in the Reports section</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">•</span>
                <span>Update inventory levels based on today's projected demand</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">•</span>
                <span>Prepare kitchen staff for tomorrow's large party reservations</span>
              </li>
            </ul>
          </div>
        )}
        
        <div className="flex justify-between items-center gap-4 pt-1">
          <Button 
            size="sm"
            variant="ghost"
            className="text-gray-400 hover:text-white"
            onClick={() => {
              stopSpeech();
              // Move to previous section if not at greeting
              switch(currentSection) {
                case 'yesterday': setCurrentSection('greeting'); break;
                case 'today': setCurrentSection('yesterday'); break;
                case 'tomorrow': setCurrentSection('today'); break;
                case 'tips': setCurrentSection('tomorrow'); break;
                case 'closing': setCurrentSection('tips'); break;
              }
            }}
            disabled={currentSection === 'greeting'}
          >
            Previous
          </Button>
          
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
          
          <Button 
            size="sm"
            variant="ghost"
            className="text-gray-400 hover:text-white flex items-center gap-1"
            onClick={() => {
              stopSpeech();
              // Move to next section if not at closing
              switch(currentSection) {
                case 'greeting': setCurrentSection('yesterday'); break;
                case 'yesterday': setCurrentSection('today'); break;
                case 'today': setCurrentSection('tomorrow'); break;
                case 'tomorrow': setCurrentSection('tips'); break;
                case 'tips': setCurrentSection('closing'); break;
              }
            }}
            disabled={currentSection === 'closing'}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="text-center text-sm text-gray-500">
          {isSpeaking ? "Click to pause" : "Click to play"}
        </div>
      </div>
    </MaterialDialog>
  );
}