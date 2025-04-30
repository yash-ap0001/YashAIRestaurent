import React, { useState } from "react";
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
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";

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

// Use enhanced Dialog component with iOS-style frosted glass effect
export function VoiceAssistantDialog() {
  const [open, setOpen] = useState(false);
  const { isListening, toggleListening } = useVoiceControl({
    enabled: true,
    language: 'en-IN',
    accentMode: true,
    voiceEnabled: true
  });

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
        ref={buttonRef}
        variant="outline" 
        size="icon" 
        className="rounded-full bg-transparent border-gray-800 hover:bg-gray-900 hover:text-white"
        onClick={() => setOpen(!open)}
      >
        <Info className="h-4 w-4" />
        <span className="sr-only">Voice Commands Info</span>
      </Button>

      {open && (
        <>
          {/* This is the dark overlay behind the menu to give the blur effect */}
          <div 
            className="fixed inset-0 z-40"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              backdropFilter: 'blur(5px)', 
            }}
            onClick={() => setOpen(false)}
          />

          {/* The voice assistant menu */}
          <div 
            ref={menuRef}
            className="fixed z-50 left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[600px] max-h-[80vh] rounded-xl border-0 shadow-xl overflow-hidden overflow-y-auto"
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
            }}
            aria-labelledby="voice-assistant-title"
          >
            <div className="p-5 border-b border-white/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 bg-purple-600/20 rounded-full flex items-center justify-center">
                    <BrainCircuit className="h-5 w-5 text-purple-500" />
                  </div>
                  <h2 id="voice-assistant-title" className="text-xl font-bold text-white">Voice Assistant Commands</h2>
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
            <div className="grid grid-cols-4 gap-2 p-3 border-b border-white/20">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={item.onClick}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-lg transition-colors",
                    item.isActive ? "bg-purple-600/40" : "bg-white/10 hover:bg-white/20"
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
              
              <div className="space-y-4">
                {commandCategories.map((category, catIndex) => (
                  <div key={catIndex} className="bg-white/10 rounded-lg p-3">
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
        </>
      )}
    </div>
  );
}