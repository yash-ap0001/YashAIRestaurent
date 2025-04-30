import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Info, 
  Mic, 
  BarChart2, 
  Bell, 
  FileEdit,
  BrainCircuit,
  ChevronRight
} from "lucide-react";
import { useVoiceControl } from "@/hooks/use-voice-control";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { MaterialDialog } from "@/components/ui/material-dialog";

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

// Using the reusable MaterialDialog component
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

  const footerContent = (
    <div className="flex items-center justify-between w-full">
      <Badge className="bg-purple-600 hover:bg-purple-700">
        {isListening ? "Listening..." : "Voice Ready"}
      </Badge>
      <Link href="/voice-commands">
        <Button size="sm" variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/20">
          See all commands
        </Button>
      </Link>
    </div>
  );

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

      <MaterialDialog
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Voice Assistant Commands"
        description="Here are some commands you can say to the voice assistant. Click the mic button or use the global mic in the header to start."
        icon={<BrainCircuit className="h-5 w-5 text-purple-500" />}
        footer={footerContent}
      >
        {/* Quick Action Buttons */}
        <div className="grid grid-cols-4 gap-2 pb-4 mb-4 border-b border-white/10">
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
        <div>
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
      </MaterialDialog>
    </div>
  );
}