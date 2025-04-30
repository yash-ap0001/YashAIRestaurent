import { useVoiceControl } from "@/hooks/use-voice-control";
import VoiceCommandsList from "@/components/voice/VoiceCommandsList";
import { Button } from "@/components/ui/button";
import { Mic } from "lucide-react";

export default function VoiceCommandsPage() {
  const { isListening, toggleListening } = useVoiceControl({
    enabled: true,
    language: 'en-IN',
    accentMode: true,
    voiceEnabled: true
  });

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col gap-1 mb-4">
        <div className="flex items-center gap-2">
          <Mic className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Voice Assistant</h1>
        </div>
        <p className="text-muted-foreground">
          View available voice commands and learn how to use the voice assistant
        </p>
      </div>
      
      <div className="mt-6">
        <VoiceCommandsList 
          isListening={isListening}
          toggleListening={toggleListening}
        />
      </div>
    </div>
  );
}