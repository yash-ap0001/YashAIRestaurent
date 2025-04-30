import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Info, 
  Mic, 
  MicOff, 
  BarChart2, 
  Bell, 
  FileEdit,
  Upload,
  X,
  BrainCircuit,
  ChevronRight
} from "lucide-react";
import { useVoiceControl } from "@/hooks/use-voice-control";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Badge } from "@/components/ui/badge";

// Example voice commands by category
const commandCategories = [
  {
    name: "Order Management",
    commands: [
      "Create a new order for table 5",
      "Add 2 veg biryani to order 1004",
      "Show all pending orders"
    ]
  },
  {
    name: "Kitchen Management",
    commands: [
      "Mark token T03 as ready",
      "How many orders are in the kitchen?",
      "Show kitchen workload"
    ]
  },
  {
    name: "Business Intelligence",
    commands: [
      "Show me sales trends for this month",
      "What are our top selling items?",
      "Compare revenue with last month"
    ]
  },
  {
    name: "System Navigation",
    commands: [
      "Go to dashboard",
      "Open kitchen tokens page",
      "Show me the billing screen"
    ]
  }
];

// Custom Material Design style dialog with blurred background
export function VoiceAssistantDialog() {
  const [open, setOpen] = useState(false);
  const { isListening, toggleListening } = useVoiceControl({
    enabled: true,
    language: 'en-IN',
    accentMode: true,
    voiceEnabled: true
  });

  // Disable scroll when dialog is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  const menuItems = [
    { 
      id: 'voice',
      label: "Voice Commands", 
      icon: <Mic className="h-5 w-5" />,
      onClick: () => {
        toggleListening();
        setOpen(false);
      },
      gradient: "from-blue-400 to-blue-300",
      isActive: isListening
    },
    { 
      id: 'stats',
      label: "Business Stats", 
      icon: <BarChart2 className="h-5 w-5" />,
      onClick: () => window.location.href = '/dashboard-stats',
      gradient: "from-green-400 to-green-300"
    },
    { 
      id: 'activity',
      label: "Restaurant Activity", 
      icon: <Bell className="h-5 w-5" />,
      onClick: () => window.location.href = '/live-tracking',
      gradient: "from-amber-400 to-amber-300"
    },
    { 
      id: 'new-order',
      label: "New Order", 
      icon: <FileEdit className="h-5 w-5" />,
      onClick: () => window.location.href = '/new-order',
      gradient: "from-rose-400 to-rose-300"
    }
  ];

  return (
    <div className="relative">
      <Button 
        variant="outline" 
        size="icon" 
        className="rounded-full bg-transparent border-gray-800 hover:bg-gray-900 hover:text-white"
        onClick={() => setOpen(true)}
      >
        <Info className="h-4 w-4" />
        <span className="sr-only">Voice Commands Info</span>
      </Button>

      {/* Custom Material Design Dialog Implementation */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop with blur effect */}
          <div 
            className="absolute inset-0 bg-black/70"
            style={{
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)'
            }}
            onClick={() => setOpen(false)}
          />
          
          {/* Dialog Content */}
          <div 
            className="relative w-full max-w-4xl bg-gray-900 rounded-lg shadow-2xl overflow-hidden z-10"
            style={{
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 24px 38px rgba(0, 0, 0, 0.3), 0 9px 12px rgba(0, 0, 0, 0.22)'
            }}
          >
            {/* Dialog Header */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 bg-purple-600/20 rounded-full flex items-center justify-center">
                    <BrainCircuit className="h-5 w-5 text-purple-500" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Voice Assistant Commands</h2>
                </div>
                <button 
                  onClick={() => setOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-2 text-gray-300 text-sm">
                Here are some commands you can say to the voice assistant. Click the mic button or use the global mic in the header to start.
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-4 gap-2 p-4 border-b border-white/10">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={item.onClick}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-lg transition-colors",
                    item.isActive ? "bg-purple-600/40" : "bg-black/20 hover:bg-black/30"
                  )}
                >
                  <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center mb-2">
                    {item.icon}
                  </div>
                  <span className="text-xs font-medium text-white">{item.label}</span>
                </button>
              ))}
            </div>

            {/* Command Categories */}
            <div className="p-4">
              <h3 className="text-lg font-medium text-white mb-3">Available Commands</h3>
              
              <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                {commandCategories.map((category, catIndex) => (
                  <div key={catIndex} className="bg-black/20 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-white mb-2">{category.name}</h4>
                    <div className="space-y-2">
                      {category.commands.map((command, cmdIndex) => (
                        <div key={cmdIndex} className="flex items-start">
                          <ChevronRight className="h-4 w-4 text-purple-400 mt-0.5 mr-2 flex-shrink-0" />
                          <p className="text-sm text-gray-300">{command}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dialog Footer */}
            <div className="p-4 bg-black/20 border-t border-white/10">
              <div className="flex items-center justify-between">
                <Badge className="bg-purple-600 hover:bg-purple-700">
                  {isListening ? "Listening..." : "Voice Ready"}
                </Badge>
                <Link href="/voice-commands">
                  <Button size="sm" variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/20">
                    See all commands
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}