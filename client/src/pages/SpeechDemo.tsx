import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import SimpleVoiceRecognition from '@/components/ai/SimpleVoiceRecognition';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

const SpeechDemo = () => {
  const [transcript, setTranscript] = useState<string>('');
  const [aiResponse, setAIResponse] = useState<string>('');
  const [recognitionHistory, setRecognitionHistory] = useState<string[]>([]);
  const { toast } = useToast();

  // AI Chat mutation
  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      // Include required userType parameter for chatbot API
      const payload = { 
        message, 
        context: {},
        userType: 'admin' // Use admin for testing
      };
      const res = await apiRequest('POST', '/api/ai/chatbot', payload);
      const data = await res.json();
      return data.response || data.message || data;
    },
    onSuccess: (response) => {
      setAIResponse(response);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Handle speech recognition result
  const handleSpeechResult = (result: string) => {
    setTranscript(result);
    setRecognitionHistory(prev => [...prev, result]);
    
    // Process with AI
    chatMutation.mutate(result);
  };

  // Handle speech recognition error
  const handleSpeechError = (error: string) => {
    toast({
      title: 'Speech Recognition Error',
      description: error,
      variant: 'destructive'
    });
    
    setRecognitionHistory(prev => [...prev, `[ERROR] ${error}`]);
  };

  // Clear the transcript and history
  const clearTranscript = () => {
    setTranscript('');
    setAIResponse('');
    setRecognitionHistory([]);
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-4">Speech Recognition Test</h1>
      <p className="text-gray-400 mb-8">
        This is a simplified test for voice recognition functionality.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-black/20 backdrop-blur-sm border-gray-800">
          <CardHeader>
            <CardTitle>Speech Recognition Test</CardTitle>
            <CardDescription>Click the button below to start/stop speech recognition</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center space-x-4">
              <SimpleVoiceRecognition 
                onResult={handleSpeechResult} 
                onError={handleSpeechError}
              />
              <button 
                className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
                onClick={clearTranscript}
              >
                Clear Results
              </button>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-medium mb-2">Current Transcript:</h3>
              <div className="p-4 bg-black/30 rounded-md h-20 overflow-auto">
                {transcript || <span className="text-gray-500">No transcript yet...</span>}
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-medium mb-2">AI Response:</h3>
              <div className="p-4 bg-black/30 rounded-md min-h-20 overflow-auto">
                {chatMutation.isPending ? (
                  <div className="animate-pulse">Processing...</div>
                ) : (
                  aiResponse || <span className="text-gray-500">No response yet...</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/20 backdrop-blur-sm border-gray-800">
          <CardHeader>
            <CardTitle>Recognition History</CardTitle>
            <CardDescription>All speech recognition attempts (including errors)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-black/30 rounded-md h-96 overflow-auto">
              {recognitionHistory.length === 0 ? (
                <div className="text-gray-500">No history yet...</div>
              ) : (
                <ul className="space-y-2">
                  {recognitionHistory.map((entry, index) => (
                    <li key={index} className={`p-2 rounded ${entry.startsWith('[ERROR]') ? 'bg-red-900/30 text-red-200' : 'bg-gray-800/30'}`}>
                      {index + 1}. {entry}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-10 p-6 bg-black/30 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Troubleshooting Speech Recognition</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-300">
          <li>Make sure your microphone is properly connected and has necessary permissions</li>
          <li>Try using Chrome or Edge browsers which have the best speech recognition support</li>
          <li>Check that you're in a quiet environment for better recognition accuracy</li>
          <li>Speak clearly and at a moderate pace</li>
          <li>If you get an error, wait a few seconds before trying again</li>
        </ul>
      </div>
    </div>
  );
};

export default SpeechDemo;