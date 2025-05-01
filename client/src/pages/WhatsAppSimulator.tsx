import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  PhoneIcon, 
  MessageSquare,
  RefreshCw, 
  SendIcon, 
  ClipboardList 
} from "lucide-react";

interface WhatsAppMessage {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: string;
  direction: 'incoming' | 'outgoing';
  type: 'text' | 'template' | 'order';
}

const WhatsAppSimulator: React.FC = () => {
  const { toast } = useToast();
  const [phone, setPhone] = useState<string>('+919876543210');
  const [name, setName] = useState<string>('Test Customer');
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Demo order templates
  const orderTemplates = [
    "I'd like to order a butter chicken and 2 garlic naan",
    "Can I get a veg biryani and raita please?",
    "I want to order paneer tikka, dal makhani and 3 butter naan",
    "Please send me one chicken biryani and one chicken 65"
  ];

  // Load messages on component mount
  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      setRefreshing(true);
      const response = await apiRequest('GET', '/api/whatsapp/message-history');
      const data = await response.json();
      
      if (Array.isArray(data)) {
        const formattedMessages = data.map((msg: any) => ({
          id: msg.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          from: msg.from || 'system',
          to: msg.to || phone,
          content: msg.message || msg.text || msg.content,
          timestamp: msg.timestamp || new Date().toISOString(),
          direction: msg.direction || (msg.from === phone ? 'incoming' : 'outgoing'),
          type: msg.type || 'text'
        }));
        
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Failed to load messages",
        description: "Could not retrieve WhatsApp message history",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  const sendMessage = async () => {
    if (!message.trim()) {
      toast({
        title: "Empty message",
        description: "Please enter a message to send",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      const response = await apiRequest('POST', '/api/whatsapp/simulate-message', {
        phone,
        message,
        name
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Message sent",
          description: "WhatsApp message simulated successfully",
        });
        
        // Add message to list
        setMessages(prev => [...prev, {
          id: `msg-${Date.now()}-in`,
          from: phone,
          to: 'system',
          content: message,
          timestamp: new Date().toISOString(),
          direction: 'incoming',
          type: 'text'
        }]);
        
        // Clear message input
        setMessage('');
        
        // Fetch updated message history after a short delay
        setTimeout(fetchMessages, 1500);
      } else {
        throw new Error(data.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Failed to send message",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const useTemplate = (template: string) => {
    setMessage(template);
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return 'Invalid time';
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">WhatsApp Simulator</h1>
          <Button 
            variant="outline" 
            onClick={fetchMessages} 
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Customer Info */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PhoneIcon className="h-5 w-5" />
                Customer Info
              </CardTitle>
              <CardDescription>Simulate a WhatsApp user</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input 
                  id="phone" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  placeholder="+919876543210"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Customer Name</Label>
                <Input 
                  id="name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="Test Customer"
                />
              </div>
            </CardContent>
          </Card>
          
          {/* Chat Interface */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                WhatsApp Chat
              </CardTitle>
              <CardDescription>
                Simulates sending and receiving WhatsApp messages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                className="h-[350px] overflow-y-auto bg-black/5 rounded-md p-4 mb-4 space-y-3"
                style={{ display: 'flex', flexDirection: 'column' }}
              >
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 h-full flex items-center justify-center">
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div 
                      key={msg.id}
                      className={`flex ${msg.direction === 'incoming' ? 'justify-start' : 'justify-end'}`}
                    >
                      <div 
                        className={`max-w-[75%] rounded-lg px-4 py-2 ${
                          msg.direction === 'incoming' 
                            ? 'bg-primary/10 text-foreground' 
                            : 'bg-primary text-primary-foreground'
                        }`}
                      >
                        <div className="text-sm font-medium">
                          {msg.direction === 'incoming' ? name : 'Restaurant Bot'} 
                          <span className="text-xs opacity-70 ml-2">
                            {formatTimestamp(msg.timestamp)}
                          </span>
                        </div>
                        <div className="mt-1 text-sm">
                          {msg.content}
                        </div>
                        {msg.type === 'order' && (
                          <div className="mt-1 text-xs italic">
                            Order created
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div className="flex gap-2">
                <Textarea 
                  placeholder="Type your message here..." 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="flex-1 min-h-[60px]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />
                <Button 
                  onClick={sendMessage} 
                  disabled={loading || !message.trim()}
                  className="flex-shrink-0 self-end h-[60px] w-[60px]"
                >
                  <SendIcon className="h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Templates */}
        <Tabs defaultValue="orders">
          <TabsList>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Order Templates
            </TabsTrigger>
          </TabsList>
          <TabsContent value="orders" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Quick Order Templates</CardTitle>
                <CardDescription>
                  Click on any template to use it as your message
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {orderTemplates.map((template, index) => (
                  <Button 
                    key={index}
                    variant="outline"
                    onClick={() => useTemplate(template)}
                    className="justify-start h-auto py-4 text-left"
                  >
                    {template}
                  </Button>
                ))}
              </CardContent>
              <CardFooter className="flex justify-between text-sm text-muted-foreground">
                <p>The WhatsApp AI will process your message and create an order when appropriate</p>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default WhatsAppSimulator;