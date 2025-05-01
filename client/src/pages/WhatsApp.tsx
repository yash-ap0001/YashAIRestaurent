import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { MessageCircle, Send, RefreshCcw, Utensils, FileText, HeartPulse } from 'lucide-react';
import BillSimulator from '@/components/whatsapp/BillSimulator';

interface Message {
  to: string;
  text: string;
  timestamp: string;
}

interface StatusData {
  status: string;
  message: string;
}

export default function WhatsApp() {
  const [phone, setPhone] = useState('918765432100');
  const [name, setName] = useState('Test Customer');
  const [message, setMessage] = useState('');
  const [billId, setBillId] = useState('1');
  const [activeTab, setActiveTab] = useState('simulate');

  // Query to fetch message history
  const { 
    data: messages, 
    isLoading: messagesLoading, 
    refetch: refetchMessages 
  } = useQuery<Message[]>({
    queryKey: ['/api/whatsapp/message-history'],
    refetchInterval: 5000, // Refresh every 5 seconds
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/whatsapp/message-history');
      return await response.json();
    }
  });

  // Query to fetch WhatsApp service status
  const { 
    data: statusData, 
    isLoading: statusLoading,
    refetch: refetchStatus
  } = useQuery<StatusData>({
    queryKey: ['/api/whatsapp/status'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/whatsapp/status');
      return await response.json();
    }
  });

  // Mutation to simulate a message
  const simulateMessageMutation = useMutation({
    mutationFn: async (payload: { phone: string; message: string; name: string }) => {
      const response = await apiRequest('POST', '/api/whatsapp/simulate-message', payload);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Message sent successfully',
        description: 'The WhatsApp message has been simulated.',
      });
      setMessage('');
      refetchMessages();
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to send message',
        description: error.message || 'Something went wrong',
        variant: 'destructive',
      });
    }
  });
  
  // Mutation to test with real WhatsApp number
  const testRealNumberMutation = useMutation({
    mutationFn: async (payload: { phone: string; message: string }) => {
      const response = await apiRequest('POST', '/api/whatsapp/test-real-number', payload);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Real WhatsApp test processed',
        description: 'The message has been processed as if it came from your real WhatsApp number.',
      });
      setMessage('');
      refetchMessages();
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to process real number test',
        description: error.message || 'Something went wrong',
        variant: 'destructive',
      });
    }
  });

  // Mutation to send a direct message
  const sendMessageMutation = useMutation({
    mutationFn: async (payload: { phone: string; message: string }) => {
      const response = await apiRequest('POST', '/api/whatsapp/send-message', payload);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Message sent successfully',
        description: 'The WhatsApp message has been sent.',
      });
      setMessage('');
      refetchMessages();
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to send message',
        description: error.message || 'Something went wrong',
        variant: 'destructive',
      });
    }
  });
  
  // Mutation to send a bill with health tips
  const sendBillWithHealthTipsMutation = useMutation({
    mutationFn: async (payload: { phone: string; billId: string }) => {
      const response = await apiRequest('POST', '/api/whatsapp/send-bill-with-health-tips', payload);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Bill sent successfully',
        description: 'The bill with health tips has been sent via WhatsApp.',
      });
      refetchMessages();
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to send bill',
        description: error.message || 'Something went wrong',
        variant: 'destructive',
      });
    }
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phone || !message) {
      toast({
        title: 'Missing information',
        description: 'Phone number and message are required',
        variant: 'destructive',
      });
      return;
    }

    if (activeTab === 'simulate') {
      simulateMessageMutation.mutate({ phone, message, name });
    } else {
      sendMessageMutation.mutate({ phone, message });
    }
  };
  
  const handleSendBillWithHealthTips = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phone || !billId) {
      toast({
        title: 'Missing information',
        description: 'Phone number and bill ID are required',
        variant: 'destructive',
      });
      return;
    }
    
    sendBillWithHealthTipsMutation.mutate({ phone, billId });
  };

  const refreshData = () => {
    refetchMessages();
    refetchStatus();
  };

  // Convert timestamp to readable format
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="container mx-auto py-2">
      <header className="mb-2">
        <h1 className="text-xl font-bold">WhatsApp Integration</h1>
        <p className="text-gray-500 text-sm">Test and monitor WhatsApp messaging functionality</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {/* WhatsApp Status Card */}
        <div className="md:col-span-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-2">
              <div>
                <CardTitle className="text-base">WhatsApp Service Status</CardTitle>
                <CardDescription className="text-xs">Current status of the WhatsApp integration</CardDescription>
              </div>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={refreshData}>
                <RefreshCcw className="h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="py-1.5">
              {statusLoading ? (
                <p className="text-sm">Loading status...</p>
              ) : statusData ? (
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${statusData.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <p className="text-sm">{statusData.message}</p>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-yellow-500"></div>
                  <p className="text-sm">Status unknown</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Message Form */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader className="py-2">
              <CardTitle className="text-base">Send WhatsApp Message</CardTitle>
              <CardDescription className="text-xs">
                {activeTab === 'simulate' 
                  ? 'Simulate receiving a message from a customer' 
                  : 'Send a direct message to a customer'}
              </CardDescription>
            </CardHeader>
            <CardContent className="py-2">
              <Tabs defaultValue="simulate" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4 h-7">
                  <TabsTrigger value="simulate" className="text-xs">Simulate</TabsTrigger>
                  <TabsTrigger value="real" className="text-xs">Real Number</TabsTrigger>
                  <TabsTrigger value="webhook" className="text-xs">Webhook</TabsTrigger>
                  <TabsTrigger value="send" className="text-xs">Send Direct</TabsTrigger>
                </TabsList>
                <TabsContent value="simulate" className="space-y-2 mt-2">
                  <form onSubmit={handleSendMessage} className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium mb-0.5">Phone Number</label>
                      <Input 
                        value={phone} 
                        onChange={(e) => setPhone(e.target.value)} 
                        placeholder="e.g., 918765432100"
                        className="h-7 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-0.5">Customer Name</label>
                      <Input 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        placeholder="Customer name"
                        className="h-7 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-0.5">Message</label>
                      <Textarea 
                        value={message} 
                        onChange={(e) => setMessage(e.target.value)} 
                        placeholder="Type a message..."
                        rows={2}
                        className="text-xs min-h-[50px]"
                      />
                      <p className="text-xs text-gray-500 mt-0.5">
                        Try "Order: 2 butter chicken, 3 naan" or "bill"
                      </p>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full h-7 text-xs"
                      disabled={simulateMessageMutation.isPending}
                    >
                      {simulateMessageMutation.isPending ? 'Sending...' : 'Simulate Message'}
                    </Button>
                  </form>
                </TabsContent>
                <TabsContent value="real" className="space-y-2 mt-2">
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if (!phone || !message) {
                      toast({
                        title: 'Missing information',
                        description: 'Phone number and message are required',
                        variant: 'destructive',
                      });
                      return;
                    }
                    testRealNumberMutation.mutate({ phone, message });
                  }} className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium mb-0.5">Your WhatsApp Number</label>
                      <Input 
                        value={phone} 
                        onChange={(e) => setPhone(e.target.value)} 
                        placeholder="Include country code, e.g., 918765432100"
                        className="h-7 text-xs"
                      />
                      <p className="text-xs text-gray-500 mt-0.5">
                        Enter your real WhatsApp number with country code
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-0.5">Message Content</label>
                      <Textarea 
                        value={message} 
                        onChange={(e) => setMessage(e.target.value)} 
                        placeholder="Type a message you'd send from WhatsApp..."
                        rows={2}
                        className="text-xs min-h-[50px]"
                      />
                      <p className="text-xs text-gray-500 mt-0.5">
                        This will be processed as if you sent it from your real WhatsApp
                      </p>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full h-7 text-xs"
                      disabled={testRealNumberMutation.isPending}
                    >
                      {testRealNumberMutation.isPending ? 'Processing...' : 'Test with Real Number'}
                    </Button>
                  </form>
                </TabsContent>
                <TabsContent value="webhook" className="space-y-2 mt-2">
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if (!message) {
                      toast({
                        title: 'Missing information',
                        description: 'Message is required',
                        variant: 'destructive',
                      });
                      return;
                    }
                    // Call our webhook simulation endpoint
                    webhookSimulationMutation.mutate({ message });
                  }} className="space-y-2">
                    <div>
                      <Alert variant="default" className="bg-amber-100 text-amber-800 border-amber-200 p-2">
                        <AlertCircle className="h-3.5 w-3.5 mr-1" />
                        <AlertTitle className="text-xs font-semibold">Meta Webhook Simulation</AlertTitle>
                        <AlertDescription className="text-xs">
                          This simulates a webhook event from Meta's servers as if a real customer sent a message to your WhatsApp Business account.
                        </AlertDescription>
                      </Alert>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-0.5">Message Content</label>
                      <Textarea 
                        value={message} 
                        onChange={(e) => setMessage(e.target.value)} 
                        placeholder="I'd like to order a butter chicken with 2 naan..."
                        rows={3}
                        className="text-xs min-h-[80px]"
                      />
                      <p className="text-xs text-gray-500 mt-0.5">
                        This will be processed as if Meta sent a webhook with this message
                      </p>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full h-7 text-xs"
                      disabled={webhookSimulationMutation.isPending}
                    >
                      {webhookSimulationMutation.isPending ? 'Processing...' : 'Simulate Meta Webhook'}
                    </Button>
                  </form>
                </TabsContent>
                
                <TabsContent value="send" className="space-y-2 mt-2">
                  <form onSubmit={handleSendMessage} className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium mb-0.5">Phone Number</label>
                      <Input 
                        value={phone} 
                        onChange={(e) => setPhone(e.target.value)} 
                        placeholder="e.g., 918765432100"
                        className="h-7 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-0.5">Message</label>
                      <Textarea 
                        value={message} 
                        onChange={(e) => setMessage(e.target.value)} 
                        placeholder="Type a message..."
                        rows={2}
                        className="text-xs min-h-[50px]"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full h-7 text-xs"
                      disabled={sendMessageMutation.isPending}
                    >
                      {sendMessageMutation.isPending ? 'Sending...' : 'Send Message'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          
          {/* Bill with Health Tips Form */}
          <Card className="mt-2">
            <CardHeader className="py-1.5">
              <CardTitle className="flex items-center gap-1.5 text-base">
                <HeartPulse className="h-4 w-4" />
                Send Bill with Health Tips
              </CardTitle>
              <CardDescription className="text-xs">
                Send bill with nutritional info and health tips
              </CardDescription>
            </CardHeader>
            <CardContent className="py-2">
              <form onSubmit={handleSendBillWithHealthTips} className="space-y-2">
                <div>
                  <label className="block text-xs font-medium mb-0.5">Phone Number</label>
                  <Input 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    placeholder="e.g., 918765432100"
                    className="h-7 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-0.5">Bill ID</label>
                  <Input 
                    value={billId} 
                    onChange={(e) => setBillId(e.target.value)} 
                    placeholder="Enter Bill ID"
                    className="h-7 text-xs"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-7 text-xs"
                  disabled={sendBillWithHealthTipsMutation.isPending}
                >
                  <FileText className="h-3.5 w-3.5 mr-1.5" />
                  {sendBillWithHealthTipsMutation.isPending ? 'Sending...' : 'Send Bill with Health Tips'}
                </Button>
              </form>
            </CardContent>
          </Card>

        </div>

        {/* Message History */}
        <div className="md:col-span-2">
          <Card className="h-full">
            <CardHeader className="py-2">
              <CardTitle className="flex items-center gap-1.5 text-base">
                <MessageCircle className="h-4 w-4" />
                Message History
              </CardTitle>
              <CardDescription className="text-xs">
                Recent WhatsApp messages sent by the system
              </CardDescription>
            </CardHeader>
            <CardContent className="py-1">
              {messagesLoading ? (
                <p className="text-xs">Loading messages...</p>
              ) : messages && messages.length > 0 ? (
                <div className="overflow-auto max-h-[350px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs">
                        <TableHead className="w-[80px] py-1.5">Time</TableHead>
                        <TableHead className="w-[120px] py-1.5">Recipient</TableHead>
                        <TableHead className="py-1.5">Message</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-xs">
                      {messages.map((msg, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium whitespace-nowrap py-1.5">
                            {formatTimestamp(msg.timestamp)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap py-1.5">{msg.to}</TableCell>
                          <TableCell className="break-words py-1.5">
                            <div className="p-2 bg-muted rounded-lg whitespace-pre-wrap">
                              {msg.text}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500 text-sm">No messages found</p>
                  <p className="text-xs text-gray-400">Try sending a message to see it here</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="py-1.5">
              <Button variant="outline" onClick={refreshData} className="w-full h-7 text-xs">
                <RefreshCcw className="h-3.5 w-3.5 mr-1.5" />
                Refresh Messages
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}