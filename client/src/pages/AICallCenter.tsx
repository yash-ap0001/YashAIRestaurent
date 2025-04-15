import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import { Phone, Mic, Loader2, Play, StopCircle, PhoneCall, PhoneOff, Settings } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Type definitions for our data
interface OrderItem {
  menuItemId: number;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
}

interface Order {
  id: number;
  orderNumber: string;
  status: string;
  totalAmount: number;
  notes: string | null;
  orderSource: string;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
}

interface PhoneCall {
  id: string;
  phoneNumber: string;
  startTime: string;
  endTime?: string;
  status: 'active' | 'completed' | 'missed';
  transcript?: string;
  orderId?: number;
}

interface CallStatistics {
  totalCalls: number;
  answeredCalls: number;
  missedCalls: number;
  averageCallDuration: number;
  ordersPlaced: number;
  conversionRate: number;
}

interface AIVoiceSettings {
  greeting: string;
  confirmationPrompt: string;
  farewell: string;
  maxRetries: number;
  autoAnswerCalls: boolean;
}

export default function AICallCenter() {
  const queryClient = useQueryClient();
  const [systemActive, setSystemActive] = useState(true);
  const [selectedCall, setSelectedCall] = useState<PhoneCall | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    greeting: "Hello! Thank you for calling Yash Hotel. I'm your AI assistant. What would you like to order today?",
    confirmationPrompt: "Let me confirm your order. Is that correct?",
    farewell: "Thank you for your order! It will be ready in approximately 20 minutes. Have a great day!",
    maxRetries: 3,
    autoAnswerCalls: true
  });

  // Mock data for demo purposes - in a real implementation, this would come from an API
  const mockRecentCalls: PhoneCall[] = [
    {
      id: '1',
      phoneNumber: '+918765432101',
      startTime: new Date(Date.now() - 15 * 60000).toISOString(),
      endTime: new Date(Date.now() - 12 * 60000).toISOString(),
      status: 'completed',
      transcript: 'AI: Hello! Thank you for calling Yash Hotel. I\'m your AI assistant. What would you like to order today?\nCustomer: I want to order 2 butter chicken, 3 naan, and a paneer tikka.\nAI: I\'ve got 2 butter chicken, 3 naan, and 1 paneer tikka. Is that correct?\nCustomer: Yes, that\'s right.\nAI: Great! Your order has been placed. It will be ready in approximately 20 minutes. Have a great day!',
      orderId: 12345
    },
    {
      id: '2',
      phoneNumber: '+918765432102',
      startTime: new Date(Date.now() - 45 * 60000).toISOString(),
      endTime: new Date(Date.now() - 40 * 60000).toISOString(),
      status: 'completed',
      transcript: 'AI: Hello! Thank you for calling Yash Hotel. I\'m your AI assistant. What would you like to order today?\nCustomer: I\'d like a vegetarian meal.\nAI: We have several vegetarian options. Would you like to hear our recommendations?\nCustomer: Yes, please.\nAI: I recommend our paneer butter masala, dal makhani, and garlic naan. Would you like to order any of these?\nCustomer: I\'ll take the paneer butter masala with 2 garlic naan.\nAI: Got it. 1 paneer butter masala and 2 garlic naan. Is that correct?\nCustomer: Yes, that\'s right.\nAI: Great! Your order has been placed. It will be ready in approximately 20 minutes. Have a great day!',
      orderId: 12340
    },
    {
      id: '3',
      phoneNumber: '+918765432103',
      startTime: new Date(Date.now() - 5 * 60000).toISOString(),
      status: 'active',
      transcript: 'AI: Hello! Thank you for calling Yash Hotel. I\'m your AI assistant. What would you like to order today?\nCustomer: I\'d like to know your specials for today.\nAI: Today\'s specials are butter chicken biryani, tandoori pomfret, and mango lassi. Would you like to order any of these?'
    },
    {
      id: '4',
      phoneNumber: '+918765432104',
      startTime: new Date(Date.now() - 120 * 60000).toISOString(),
      status: 'missed'
    }
  ];

  const mockStatistics: CallStatistics = {
    totalCalls: 157,
    answeredCalls: 142,
    missedCalls: 15,
    averageCallDuration: 3.5, // in minutes
    ordersPlaced: 98,
    conversionRate: 69 // percentage
  };

  // Default values for when API data is loading
  const defaultCallStats: CallStatistics = {
    totalCalls: 0,
    answeredCalls: 0,
    missedCalls: 0,
    averageCallDuration: 0,
    ordersPlaced: 0,
    conversionRate: 0
  };

  // Fetch actual call data from our telephony API
  const { 
    data: recentCalls = [], 
    isLoading: isLoadingCalls 
  } = useQuery({
    queryKey: ['/api/telephony/calls'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/telephony/calls');
      return await response.json();
    }
  });

  const { 
    data: callStats = defaultCallStats, 
    isLoading: isLoadingStats 
  } = useQuery({
    queryKey: ['/api/telephony/stats'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/telephony/stats');
      return await response.json();
    }
  });
  
  const {
    data: voiceSettings,
    isLoading: isLoadingSettings
  } = useQuery({
    queryKey: ['/api/telephony/voice-settings'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/telephony/voice-settings');
      return await response.json();
    }
  });
  
  // Update settings state when voiceSettings data is loaded
  useEffect(() => {
    if (voiceSettings) {
      setSettings(voiceSettings);
    }
  }, [voiceSettings]);

  // Format timestamps
  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Calculate call duration
  const getCallDuration = (call: PhoneCall) => {
    if (!call.endTime) return 'Ongoing';
    const start = new Date(call.startTime).getTime();
    const end = new Date(call.endTime).getTime();
    const durationMinutes = Math.round((end - start) / 60000);
    return `${durationMinutes}m ${Math.round((end - start) % 60000 / 1000)}s`;
  };

  // Handle simulating a new incoming call using the real API
  const simulateCallMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/telephony/simulate-call', { 
      phoneNumber: '+91' + Math.floor(Math.random() * 9000000000 + 1000000000) 
    }),
    onSuccess: (data: any) => {
      toast({
        title: 'Incoming Call',
        description: `Receiving call from ${data.phoneNumber}`,
      });
      
      // Refresh calls data
      queryClient.invalidateQueries({ queryKey: ['/api/telephony/calls'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to simulate incoming call',
        variant: 'destructive',
      });
      console.error('Failed to simulate call:', error);
    }
  });
  
  // Handle simulating a new incoming call
  const simulateIncomingCall = () => {
    simulateCallMutation.mutate();
  };

  // Handle toggling the AI system
  const toggleSystem = () => {
    setSystemActive(prev => !prev);
    toast({
      title: systemActive ? 'AI Call Center Disabled' : 'AI Call Center Enabled',
      description: systemActive ? 'Staff will need to manually answer calls' : 'AI will automatically answer incoming calls',
    });
  };

  // Handle viewing call details
  const viewCallDetails = (call: PhoneCall) => {
    setSelectedCall(call);
  };

  // Handle saving settings to the API
  const updateSettingsMutation = useMutation({
    mutationFn: (settings: any) => apiRequest('POST', '/api/telephony/voice-settings', settings),
    onSuccess: () => {
      toast({
        title: 'Settings Saved',
        description: 'AI Call Center settings have been updated',
      });
      setShowSettings(false);
      
      // Refresh settings data
      queryClient.invalidateQueries({ queryKey: ['/api/telephony/voice-settings'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
      console.error('Failed to save settings:', error);
    }
  });
  
  // Handle saving settings
  const saveSettings = () => {
    updateSettingsMutation.mutate(settings);
  };

  // Status badge color
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return 'bg-green-500';
      case 'completed': return 'bg-blue-500';
      case 'missed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto py-8">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <PhoneCall className="h-8 w-8" />
            AI Call Center
          </h1>
          <p className="text-gray-500">Automated phone order system powered by AI</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Switch 
              id="system-active" 
              checked={systemActive}
              onCheckedChange={toggleSystem}
            />
            <Label htmlFor="system-active">
              {systemActive ? 'System Active' : 'System Disabled'}
            </Label>
          </div>
          <Button variant="outline" onClick={() => setShowSettings(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Call Statistics Card */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Call Statistics</CardTitle>
              <CardDescription>Overview of the AI call center performance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">Total Calls</p>
                  <p className="text-2xl font-bold">{callStats.totalCalls}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">Orders Placed</p>
                  <p className="text-2xl font-bold">{callStats.ordersPlaced}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">Answered</p>
                  <p className="text-2xl font-bold text-green-600">{callStats.answeredCalls}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">Missed</p>
                  <p className="text-2xl font-bold text-red-600">{callStats.missedCalls}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">Avg. Duration</p>
                  <p className="text-2xl font-bold">{callStats.averageCallDuration} min</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">Conversion Rate</p>
                  <p className="text-2xl font-bold">{callStats.conversionRate}%</p>
                </div>
              </div>
              
              <div className="pt-4">
                <Button 
                  className="w-full"
                  onClick={simulateIncomingCall}
                >
                  Simulate Incoming Call
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Quick Actions */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks for AI call management</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full flex justify-between items-center" variant="outline">
                <span>Export Call Logs</span>
                <span>↓</span>
              </Button>
              <Button className="w-full flex justify-between items-center" variant="outline">
                <span>Voice Training</span>
                <span>→</span>
              </Button>
              <Button className="w-full flex justify-between items-center" variant="outline">
                <span>Menu Updates</span>
                <span>→</span>
              </Button>
              <Button className="w-full flex justify-between items-center" variant="outline">
                <span>Notification Settings</span>
                <span>→</span>
              </Button>
            </CardContent>
          </Card>
        </div>
        
        {/* Recent Calls List */}
        <div className="md:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Recent Calls</CardTitle>
              <CardDescription>
                Calls handled by the AI system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Time</TableHead>
                      <TableHead>Phone Number</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentCalls.map((call: PhoneCall) => (
                      <TableRow key={call.id}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {formatTime(call.startTime)}
                        </TableCell>
                        <TableCell>{call.phoneNumber}</TableCell>
                        <TableCell>
                          <Badge className={`${getStatusColor(call.status)} text-white`}>
                            {call.status.charAt(0).toUpperCase() + call.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>{getCallDuration(call)}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Button 
                            variant="ghost" 
                            onClick={() => viewCallDetails(call)}
                            disabled={call.status === 'missed'}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Call Details Dialog */}
      {selectedCall && (
        <Dialog open={!!selectedCall} onOpenChange={(open) => !open && setSelectedCall(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Call Details</DialogTitle>
              <DialogDescription>
                Call from {selectedCall.phoneNumber} at {formatTime(selectedCall.startTime)}
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="transcript">
              <TabsList>
                <TabsTrigger value="transcript">Transcript</TabsTrigger>
                <TabsTrigger value="order" disabled={!selectedCall.orderId}>Order Details</TabsTrigger>
              </TabsList>
              
              <TabsContent value="transcript" className="space-y-4">
                <div className="border rounded-md p-4 bg-gray-50 max-h-96 overflow-auto">
                  {selectedCall.transcript ? (
                    <div className="space-y-2">
                      {selectedCall.transcript.split('\n').map((line, index) => {
                        // Determine if it's the AI or customer speaking
                        const isAI = line.startsWith('AI:');
                        const isCustomer = line.startsWith('Customer:');
                        
                        // Apply appropriate styling based on speaker
                        return (
                          <div 
                            key={index} 
                            className={`p-2 rounded-lg ${
                              isAI 
                                ? 'bg-primary/10 text-primary border-l-4 border-primary' 
                                : isCustomer 
                                  ? 'bg-gray-200 ml-8' 
                                  : ''
                            }`}
                          >
                            {line}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    'No transcript available'
                  )}
                </div>
                
                <div className="flex justify-between">
                  <Badge className={getStatusColor(selectedCall.status)}>
                    {selectedCall.status === 'active' ? 'Call in progress' : 'Call completed'}
                  </Badge>
                  
                  {selectedCall.orderId && (
                    <Badge variant="outline">
                      Order #{selectedCall.orderId}
                    </Badge>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="order">
                {selectedCall.orderId ? (
                  <OrderDetails orderId={selectedCall.orderId} phoneNumber={selectedCall.phoneNumber} />
                ) : (
                  <div className="py-8 text-center text-gray-500">
                    No order was placed during this call
                  </div>
                )}
              </TabsContent>
            </Tabs>
            
            <DialogFooter>
              <Button variant="secondary" onClick={() => setSelectedCall(null)}>
                Close
              </Button>
              {selectedCall.status === 'active' && (
                <Button variant="destructive">
                  <PhoneOff className="h-4 w-4 mr-2" />
                  End Call
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>AI Call Center Settings</DialogTitle>
            <DialogDescription>
              Configure how the AI handles customer calls
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="greeting">Greeting Message</Label>
              <Textarea 
                id="greeting" 
                value={settings.greeting} 
                onChange={(e) => setSettings({...settings, greeting: e.target.value})}
                rows={2}
              />
              <p className="text-xs text-gray-500 mt-1">
                This is the first message customers will hear when they call
              </p>
            </div>
            
            <div>
              <Label htmlFor="confirmation">Confirmation Prompt</Label>
              <Textarea 
                id="confirmation" 
                value={settings.confirmationPrompt} 
                onChange={(e) => setSettings({...settings, confirmationPrompt: e.target.value})}
                rows={2}
              />
              <p className="text-xs text-gray-500 mt-1">
                Message to confirm the order details with the customer
              </p>
            </div>
            
            <div>
              <Label htmlFor="farewell">Farewell Message</Label>
              <Textarea 
                id="farewell" 
                value={settings.farewell} 
                onChange={(e) => setSettings({...settings, farewell: e.target.value})}
                rows={2}
              />
              <p className="text-xs text-gray-500 mt-1">
                Final message after the order is placed
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="max-retries">Maximum Retries</Label>
                <Input 
                  id="max-retries" 
                  type="number"
                  min={1}
                  max={5}
                  value={settings.maxRetries} 
                  onChange={(e) => setSettings({...settings, maxRetries: parseInt(e.target.value)})}
                />
                <p className="text-xs text-gray-500 mt-1">
                  How many times to retry when AI can't understand
                </p>
              </div>
              
              <div className="flex items-end pb-7">
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="auto-answer" 
                    checked={settings.autoAnswerCalls}
                    onCheckedChange={(checked) => setSettings({...settings, autoAnswerCalls: checked})}
                  />
                  <Label htmlFor="auto-answer">Auto-answer calls</Label>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Cancel
            </Button>
            <Button onClick={saveSettings}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Order Details Component
interface OrderDetailsProps {
  orderId: number;
  phoneNumber: string;
}

function OrderDetails({ orderId, phoneNumber }: OrderDetailsProps) {
  // Fetch order data
  const { data: order, isLoading } = useQuery<Order>({
    queryKey: ['/api/orders', orderId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/orders/${orderId}`);
      return await response.json();
    },
    enabled: !!orderId
  });

  // Fetch order items
  const { data: items = [] } = useQuery<OrderItem[]>({
    queryKey: ['/api/orders', orderId, 'items'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/orders/${orderId}/items`);
      return await response.json();
    },
    enabled: !!orderId
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-8 text-center text-gray-500">
        Order details not found
      </div>
    );
  }

  // Calculate order total
  const orderTotal = items.reduce((total, item) => total + (item.price * item.quantity), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium mb-1">Order Number</h4>
          <p className="text-lg font-semibold">{order.orderNumber}</p>
        </div>
        <div>
          <h4 className="font-medium mb-1">Customer</h4>
          <p>{phoneNumber}</p>
        </div>
        <div>
          <h4 className="font-medium mb-1">Status</h4>
          <Badge className={
            order.status === 'pending' ? 'bg-amber-500' :
            order.status === 'preparing' ? 'bg-blue-500' :
            order.status === 'ready' ? 'bg-emerald-500' :
            order.status === 'completed' ? 'bg-indigo-500' :
            order.status === 'delivered' ? 'bg-violet-500' :
            order.status === 'billed' ? 'bg-slate-500' :
            'bg-gray-500'
          }>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </Badge>
        </div>
        <div>
          <h4 className="font-medium mb-1">Created At</h4>
          <p>{new Date(order.createdAt).toLocaleString()}</p>
        </div>
      </div>
      
      {order.notes && (
        <div>
          <h4 className="font-medium mb-1">Notes</h4>
          <p className="text-gray-700 bg-gray-50 p-2 rounded-md">{order.notes}</p>
        </div>
      )}
      
      <div>
        <h4 className="font-medium mb-2">Order Items</h4>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead className="text-right">Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length > 0 ? (
                <>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell className="text-right">₹{(item.price * item.quantity).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t">
                    <TableCell colSpan={2} className="font-bold">Total</TableCell>
                    <TableCell className="text-right font-bold">₹{orderTotal.toFixed(2)}</TableCell>
                  </TableRow>
                </>
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-4 text-gray-500">
                    No items available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}