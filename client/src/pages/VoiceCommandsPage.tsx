import { useVoiceControl } from "@/hooks/use-voice-control";
import VoiceCommandsList from "@/components/voice/VoiceCommandsList";
import { PageHeader } from "@/components/ui/page-header";
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
      <PageHeader
        title="Voice Assistant"
        description="View available voice commands and learn how to use the voice assistant"
        icon={<Mic />}
      />
      
      <div className="mt-6">
        <VoiceCommandsList 
          isListening={isListening}
          toggleListening={toggleListening}
        />
      </div>
    </div>
  );
}