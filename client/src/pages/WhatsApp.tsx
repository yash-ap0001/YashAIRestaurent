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
    <div className="container mx-auto py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">WhatsApp Integration</h1>
        <p className="text-gray-500">Test and monitor WhatsApp messaging functionality</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* WhatsApp Status Card */}
        <div className="md:col-span-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>WhatsApp Service Status</CardTitle>
                <CardDescription>Current status of the WhatsApp integration</CardDescription>
              </div>
              <Button variant="outline" size="icon" onClick={refreshData}>
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {statusLoading ? (
                <p>Loading status...</p>
              ) : statusData ? (
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${statusData.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <p>{statusData.message}</p>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                  <p>Status unknown</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Message Form */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Send WhatsApp Message</CardTitle>
              <CardDescription>
                {activeTab === 'simulate' 
                  ? 'Simulate receiving a message from a customer' 
                  : 'Send a direct message to a customer'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="simulate" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="simulate">Simulate Incoming</TabsTrigger>
                  <TabsTrigger value="send">Send Direct</TabsTrigger>
                </TabsList>
                <TabsContent value="simulate" className="space-y-4 mt-4">
                  <form onSubmit={handleSendMessage} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Phone Number</label>
                      <Input 
                        value={phone} 
                        onChange={(e) => setPhone(e.target.value)} 
                        placeholder="e.g., 918765432100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Customer Name</label>
                      <Input 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        placeholder="Customer name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Message</label>
                      <Textarea 
                        value={message} 
                        onChange={(e) => setMessage(e.target.value)} 
                        placeholder="Type a message..."
                        rows={4}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Try "Order: 2 butter chicken, 3 naan" or "bill"
                      </p>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={simulateMessageMutation.isPending}
                    >
                      {simulateMessageMutation.isPending ? 'Sending...' : 'Simulate Message'}
                    </Button>
                  </form>
                </TabsContent>
                <TabsContent value="send" className="space-y-4 mt-4">
                  <form onSubmit={handleSendMessage} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Phone Number</label>
                      <Input 
                        value={phone} 
                        onChange={(e) => setPhone(e.target.value)} 
                        placeholder="e.g., 918765432100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Message</label>
                      <Textarea 
                        value={message} 
                        onChange={(e) => setMessage(e.target.value)} 
                        placeholder="Type a message..."
                        rows={4}
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={sendMessageMutation.isPending}
                    >
                      {sendMessageMutation.isPending ? 'Sending...' : 'Send Message'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Message History */}
        <div className="md:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Message History
              </CardTitle>
              <CardDescription>
                Recent WhatsApp messages sent by the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              {messagesLoading ? (
                <p>Loading messages...</p>
              ) : messages && messages.length > 0 ? (
                <div className="overflow-auto max-h-[500px]">
                  <Table>
                    <TableCaption>Recent WhatsApp messages</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Time</TableHead>
                        <TableHead className="w-[150px]">Recipient</TableHead>
                        <TableHead>Message</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {messages.map((msg, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium whitespace-nowrap">
                            {formatTimestamp(msg.timestamp)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{msg.to}</TableCell>
                          <TableCell className="break-words">
                            <div className="p-3 bg-muted rounded-lg whitespace-pre-wrap">
                              {msg.text}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-gray-500">No messages found</p>
                  <p className="text-sm text-gray-400">Try sending a message to see it here</p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button variant="outline" onClick={refreshData} className="w-full">
                <RefreshCcw className="h-4 w-4 mr-2" />
                Refresh Messages
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}