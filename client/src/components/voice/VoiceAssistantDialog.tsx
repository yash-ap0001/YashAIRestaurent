import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, Info, Brain } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

interface VoiceAssistantDialogProps {
  isListening: boolean;
  className?: string;
}

export const VoiceAssistantDialog = ({ isListening, className }: VoiceAssistantDialogProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className={cn("text-gray-300 hover:text-white hover:bg-gray-800 rounded-full", className)}
        >
          <Info className="h-4 w-4" />
          <span className="sr-only">Voice assistant info</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-black/80 backdrop-blur-md border-gray-800">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <Brain className="h-5 w-5 mr-2 text-purple-400" />
            Voice Assistant
          </DialogTitle>
          <DialogDescription>
            Use natural voice commands to control the application
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-2">
          <p className="text-sm">
            Your AI voice assistant is always ready to help. Click the{" "}
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-purple-900/30 text-purple-300 text-xs">
              <Mic className="h-3 w-3 mr-1" /> microphone
            </span>{" "}
            button in the top right corner to activate voice control.
          </p>
          
          <div className="rounded-md border border-gray-800 bg-black/40 p-3">
            <h4 className="font-medium text-sm mb-2">Common voice commands:</h4>
            <ul className="space-y-1 text-sm text-gray-300">
              <li>• "Create a new order for table 5"</li>
              <li>• "Show me today's sales report"</li>
              <li>• "Go to kitchen tokens page"</li>
              <li>• "What are our top selling items?"</li>
              <li>• "Show me business insights"</li>
            </ul>
          </div>
          
          <div className="rounded-md border border-gray-800 bg-gradient-to-r from-purple-900/30 to-black/40 p-3">
            <h4 className="font-medium text-sm mb-2">Business Intelligence:</h4>
            <p className="text-sm text-gray-300">
              Ask business questions like "How is our revenue trending?" or "What menu items have the highest profit margins?" for AI-powered business insights.
            </p>
          </div>
          
          <Link href="/voice-commands" className="block w-full">
            <Button variant="outline" className="w-full border-purple-800 hover:bg-purple-900/30 hover:text-purple-200">
              View all voice commands
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
};