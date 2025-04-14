import { useState, useEffect, useRef } from 'react';
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  RefreshCw, 
  Search,
  List,
  CheckCircle,
  AlertCircle,
  Info,
  Settings,
  Save,
  Loader2
} from "lucide-react";

// Voice command examples
const commandExamples = [
  "Show me the current orders",
  "Get me the status of table 5",
  "Mark order #ORD-1234 as ready",
  "Create a new takeaway order for butter chicken and naan",
  "What's the status of the kitchen right now?",
  "Show me today's reservations",
  "Check inventory of tomatoes",
  "How many customers do we have today?"
];

export default function VoiceAssistant() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State variables
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info' | 'warning', message: string } | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [volume, setVolume] = useState(80);
  const [voiceType, setVoiceType] = useState("default");
  const [commandHistory, setCommandHistory] = useState<{command: string, response: string, timestamp: Date}[]>([]);
  
  // References
  const recognitionRef = useRef<any>(null);
  const synth = useRef<SpeechSynthesis | null>(typeof window !== 'undefined' ? window.speechSynthesis : null);
  
  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      // @ts-ignore - TypeScript doesn't have these types by default
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setFeedback({ type: 'info', message: 'Listening...' });
      };
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        
        setTranscript(transcript);
        
        // If the result is final, process it
        if (event.results[0].isFinal) {
          processVoiceCommand(transcript);
        }
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event);
        setIsListening(false);
        setFeedback({ type: 'error', message: `Error: ${event.error}` });
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      toast({
        title: "Speech Recognition Not Available",
        description: "Your browser doesn't support speech recognition. Try using Chrome.",
        variant: "destructive"
      });
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [toast]);
  
  // Function to toggle listening
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setFeedback(null);
    } else {
      try {
        setTranscript("");
        recognitionRef.current?.start();
        setFeedback({ type: 'info', message: 'Listening...' });
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        toast({
          title: "Speech Recognition Error",
          description: "Failed to start speech recognition. Please try again.",
          variant: "destructive"
        });
      }
    }
  };
  
  // Function to process voice commands
  const processVoiceCommand = async (command: string) => {
    try {
      setIsProcessing(true);
      setFeedback({ type: 'info', message: 'Processing command...' });
      
      const response = await apiRequest("POST", "/api/voice-assistant/process", { command });
      const result = await response.json();
      
      if (result.success) {
        setResponse(result.response);
        setFeedback({ type: 'success', message: 'Command processed successfully' });
        
        // Add to history
        setCommandHistory(prev => [
          { command, response: result.response, timestamp: new Date() },
          ...prev.slice(0, 9) // Keep only the last 10 commands
        ]);
        
        // Invalidate relevant queries based on command type
        if (result.invalidateQueries && Array.isArray(result.invalidateQueries)) {
          result.invalidateQueries.forEach((query: string) => {
            queryClient.invalidateQueries({ queryKey: [query] });
          });
        }
        
        // Speak the response if voice feedback is enabled
        if (voiceEnabled) {
          speakText(result.response);
        }
      } else {
        setResponse(`Sorry, I couldn't process that command: ${result.error}`);
        setFeedback({ type: 'error', message: result.error || 'Unknown error' });
        
        // Speak the error if voice feedback is enabled
        if (voiceEnabled) {
          speakText(`Sorry, I couldn't process that command. ${result.error}`);
        }
      }
    } catch (error) {
      console.error('Error processing voice command:', error);
      setResponse("Sorry, there was an error processing your command. Please try again.");
      setFeedback({ type: 'error', message: 'Failed to communicate with the server' });
      
      // Speak the error if voice feedback is enabled
      if (voiceEnabled) {
        speakText("Sorry, there was an error processing your command. Please try again.");
      }
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Function to speak text using speech synthesis
  const speakText = (text: string) => {
    if (!synth.current) return;
    
    // Cancel any ongoing speech
    synth.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = volume / 100;
    
    // Set voice type if available
    if (voiceType !== "default") {
      const voices = synth.current.getVoices();
      const selectedVoice = voices.find(voice => 
        voice.name.toLowerCase().includes(voiceType.toLowerCase())
      );
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    }
    
    synth.current.speak(utterance);
  };
  
  // Function to manually submit a command
  const submitCommand = () => {
    if (!transcript.trim()) {
      toast({
        title: "No Command",
        description: "Please enter a command before submitting.",
        variant: "destructive"
      });
      return;
    }
    
    processVoiceCommand(transcript);
  };
  
  // Function to clear the transcript
  const clearTranscript = () => {
    setTranscript("");
    setResponse(null);
    setFeedback(null);
  };
  
  // Function to try an example command
  const tryExampleCommand = (example: string) => {
    setTranscript(example);
  };
  
  return (
    <div className="container py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">Voice Assistant</h1>
        <p className="text-neutral-400 mt-2">
          Use voice commands to control the restaurant management system
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="bg-neutral-800 border-neutral-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Mic className="w-5 h-5 mr-2" />
                Voice Command Interface
              </CardTitle>
              <CardDescription className="text-neutral-400">
                Speak naturally or type your commands below
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-neutral-900 p-4 rounded-lg border border-neutral-700 min-h-32">
                <div className="flex items-center mb-4">
                  <Badge 
                    variant={isListening ? "default" : "secondary"}
                    className={isListening ? "bg-green-600" : "bg-neutral-700"}
                  >
                    {isListening ? "Listening..." : "Not Listening"}
                  </Badge>
                  {feedback && (
                    <Badge 
                      variant={
                        feedback.type === 'success' ? "default" : 
                        feedback.type === 'error' ? "destructive" : 
                        feedback.type === 'warning' ? "outline" : 
                        "secondary"
                      }
                      className={
                        feedback.type === 'success' ? "bg-green-600 ml-2" : 
                        feedback.type === 'error' ? "bg-red-600 ml-2" : 
                        feedback.type === 'warning' ? "bg-yellow-600 text-black ml-2" : 
                        "bg-blue-600 ml-2"
                      }
                    >
                      {feedback.message}
                    </Badge>
                  )}
                </div>
                
                <Textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Your voice command will appear here..."
                  className="bg-neutral-900 border-neutral-700 text-white resize-none h-24"
                />
                
                <div className="flex justify-between mt-4">
                  <div>
                    <Button 
                      onClick={toggleListening}
                      variant={isListening ? "destructive" : "default"}
                      className={isListening ? "bg-red-600 hover:bg-red-700" : "bg-purple-600 hover:bg-purple-700"}
                      disabled={isProcessing}
                    >
                      {isListening ? (
                        <>
                          <MicOff className="mr-2 h-4 w-4" />
                          Stop Listening
                        </>
                      ) : (
                        <>
                          <Mic className="mr-2 h-4 w-4" />
                          Start Listening
                        </>
                      )}
                    </Button>
                  </div>
                  <div>
                    <Button
                      onClick={clearTranscript}
                      variant="outline"
                      className="mr-2 border-neutral-600 text-neutral-300 hover:bg-neutral-700"
                      disabled={isProcessing || !transcript}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Clear
                    </Button>
                    <Button
                      onClick={submitCommand}
                      disabled={isProcessing || !transcript}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Submit Command
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              
              {response && (
                <div className="bg-neutral-900 p-4 rounded-lg border border-neutral-700">
                  <div className="flex items-center mb-2">
                    <Badge className="bg-blue-600">Response</Badge>
                    {voiceEnabled && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="ml-2 h-8 text-neutral-400 hover:text-white"
                        onClick={() => speakText(response)}
                      >
                        <Volume2 className="h-4 w-4 mr-1" />
                        Speak
                      </Button>
                    )}
                  </div>
                  <p className="text-white">{response}</p>
                </div>
              )}
              
              <div>
                <h3 className="text-white font-medium mb-2">Example Commands:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {commandExamples.map((example, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="justify-start border-neutral-700 text-neutral-300 hover:bg-purple-900/20 hover:text-purple-300"
                      onClick={() => tryExampleCommand(example)}
                    >
                      <Search className="mr-2 h-4 w-4" />
                      {example}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {commandHistory.length > 0 && (
            <Card className="bg-neutral-800 border-neutral-700 mt-6">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <List className="w-5 h-5 mr-2" />
                  Command History
                </CardTitle>
                <CardDescription className="text-neutral-400">
                  Your recent voice commands and responses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                  {commandHistory.map((item, index) => (
                    <div 
                      key={index} 
                      className="bg-neutral-900 p-3 rounded-lg border border-neutral-700"
                    >
                      <div className="flex justify-between mb-1">
                        <Badge variant="outline" className="bg-purple-900/30 text-purple-300 border-purple-700">
                          Command
                        </Badge>
                        <span className="text-xs text-neutral-500">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-white text-sm mb-2">{item.command}</p>
                      
                      <div className="mt-2">
                        <Badge variant="outline" className="bg-blue-900/30 text-blue-300 border-blue-700 mb-1">
                          Response
                        </Badge>
                        <p className="text-neutral-300 text-sm">{item.response}</p>
                      </div>
                      
                      <div className="mt-2 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-xs text-neutral-400 hover:text-white"
                          onClick={() => tryExampleCommand(item.command)}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Try Again
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        <div>
          <Card className="bg-neutral-800 border-neutral-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Assistant Settings
              </CardTitle>
              <CardDescription className="text-neutral-400">
                Configure your voice assistant
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="voice-feedback" className="text-white">Voice Feedback</Label>
                  <Switch
                    id="voice-feedback"
                    checked={voiceEnabled}
                    onCheckedChange={setVoiceEnabled}
                    className="data-[state=checked]:bg-purple-600"
                  />
                </div>
                <p className="text-neutral-400 text-sm">
                  Enable or disable voice responses from the assistant
                </p>
              </div>
              
              {voiceEnabled && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="volume" className="text-white">Voice Volume ({volume}%)</Label>
                    <div className="flex items-center">
                      <VolumeX className="h-4 w-4 text-neutral-400 mr-2" />
                      <input
                        id="volume"
                        type="range"
                        min="0"
                        max="100"
                        value={volume}
                        onChange={(e) => setVolume(parseInt(e.target.value))}
                        className="w-full"
                      />
                      <Volume2 className="h-4 w-4 text-neutral-400 ml-2" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="voice-type" className="text-white">Voice Type</Label>
                    <Select 
                      value={voiceType} 
                      onValueChange={setVoiceType}
                    >
                      <SelectTrigger id="voice-type" className="bg-neutral-900 border-neutral-700 text-white">
                        <SelectValue placeholder="Select voice type" />
                      </SelectTrigger>
                      <SelectContent className="bg-neutral-900 border-neutral-700 text-white">
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              
              <div className="space-y-3 pt-4 border-t border-neutral-700">
                <h3 className="font-medium text-white">Assistant Capabilities</h3>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-neutral-300 text-sm">Process natural language commands</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-neutral-300 text-sm">Manage orders, inventory and kitchen operations</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-neutral-300 text-sm">Provide status updates and reports</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-neutral-300 text-sm">Create and modify orders with voice commands</span>
                  </li>
                </ul>
              </div>
              
              <div className="space-y-3 pt-4 border-t border-neutral-700">
                <div className="bg-blue-900/20 p-3 rounded-lg border border-blue-800">
                  <div className="flex items-start">
                    <Info className="h-5 w-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-blue-300 text-sm">Staff can use voice commands from anywhere in the restaurant to update order status, check information, and manage operations.</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full bg-purple-600 hover:bg-purple-700">
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}