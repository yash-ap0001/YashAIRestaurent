import React, { useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Info, 
  Mic, 
  MicOff, 
  BarChart2, 
  Bell, 
  FileEdit,
  Upload
} from "lucide-react";
import { useVoiceControl } from "@/hooks/use-voice-control";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="rounded-full bg-transparent border-gray-800 hover:bg-gray-900 hover:text-white"
        >
          <Info className="h-4 w-4" />
          <span className="sr-only">Voice Commands Info</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[260px] p-0 rounded-xl bg-white/30 backdrop-blur-xl border-0 shadow-xl overflow-hidden">
        <div className="flex flex-col">
          {menuItems.map((item, index) => (
            <button
              key={item.id}
              onClick={item.onClick}
              className={cn(
                "flex items-center justify-between px-5 py-3 text-left border-b border-white/20 transition-colors",
                item.isActive ? "bg-opacity-40" : "hover:bg-white/10",
                index === menuItems.length - 1 ? "border-b-0" : "",
                `bg-gradient-to-r ${item.gradient} bg-opacity-20`
              )}
            >
              <span className="font-medium text-gray-800">{item.label}</span>
              <span className="text-gray-700">
                {item.icon}
              </span>
            </button>
          ))}
        </div>
        
        <div className="absolute -bottom-12 -right-12 w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg opacity-90">
          <Link href="/voice-commands">
            <div className="w-12 h-12 flex items-center justify-center">
              <Mic className="h-7 w-7 text-gray-700" />
            </div>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}