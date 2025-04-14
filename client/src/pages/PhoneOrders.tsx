import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import { Phone, Mic, Loader2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

export default function PhoneOrders() {
  const queryClient = useQueryClient();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [orderText, setOrderText] = useState('');
  const [orderType, setOrderType] = useState('dine-in');
  const [isRecording, setIsRecording] = useState(false);
  const [processingOrder, setProcessingOrder] = useState(false);
  const [processedItems, setProcessedItems] = useState<Array<{name: string, quantity: number, price: number}>>([]);
  const [showOrderPreview, setShowOrderPreview] = useState(false);
  
  // Mutation for processing natural language order
  const processOrderMutation = useMutation({
    mutationFn: (orderText: string) => 
      apiRequest('/api/ai/process-order', 'POST', { orderText }),
    onSuccess: (data) => {
      setProcessedItems(data.items);
      setShowOrderPreview(true);
      setProcessingOrder(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to process order',
        description: error.message || 'Something went wrong',
        variant: 'destructive',
      });
      setProcessingOrder(false);
    }
  });
  
  // Mutation for creating the order
  const createOrderMutation = useMutation({
    mutationFn: (orderData: any) => 
      apiRequest('/api/orders', 'POST', orderData),
    onSuccess: () => {
      toast({
        title: 'Order created successfully',
        description: 'The phone order has been created.',
      });
      
      // Reset form
      setCustomerName('');
      setCustomerPhone('');
      setTableNumber('');
      setOrderText('');
      setProcessedItems([]);
      setShowOrderPreview(false);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/kitchen-tokens'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create order',
        description: error.message || 'Something went wrong',
        variant: 'destructive',
      });
    }
  });
  
  // Mock function to simulate speech recognition
  // In a real implementation, this would use the Web Speech API or similar
  const toggleRecording = () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      toast({
        title: 'Recording stopped',
        description: 'Voice input has been added to the order text.',
      });
      
      // In a real implementation, this would be the transcribed text
      // Here we're just appending a sample phrase
      setOrderText(prev => 
        prev + (prev ? ' ' : '') + 'I would like to order 2 butter chicken and 3 naan.'
      );
    } else {
      // Start recording
      setIsRecording(true);
      toast({
        title: 'Recording started',
        description: 'Speak clearly to capture the order.',
      });
      
      // Simulate a delay for recording
      setTimeout(() => {
        setIsRecording(false);
        setOrderText(prev => 
          prev + (prev ? ' ' : '') + 'I would like to order 2 butter chicken and 3 naan.'
        );
        toast({
          title: 'Recording completed',
          description: 'Voice input has been added to the order text.',
        });
      }, 3000);
    }
  };
  
  // Process the order text
  const handleProcessOrder = () => {
    if (!orderText.trim()) {
      toast({
        title: 'Empty order',
        description: 'Please enter or record an order first',
        variant: 'destructive',
      });
      return;
    }
    
    setProcessingOrder(true);
    processOrderMutation.mutate(orderText);
  };
  
  // Create the order
  const handleCreateOrder = () => {
    if (!customerName || !customerPhone || (!tableNumber && orderType === 'dine-in')) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }
    
    const orderData = {
      customerName,
      customerPhone,
      orderType,
      tableNumber: orderType === 'dine-in' ? tableNumber : '',
      items: processedItems.map(item => ({
        menuItemId: item.name, // In a real app, this would be the actual ID
        quantity: item.quantity,
        notes: '',
      })),
      notes: `Order received via phone call. Original request: "${orderText}"`,
      status: 'pending',
    };
    
    createOrderMutation.mutate(orderData);
  };
  
  // Calculate order total
  const orderTotal = processedItems.reduce(
    (total, item) => total + (item.price * item.quantity), 
    0
  );
  
  return (
    <div className="container mx-auto py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Phone className="h-8 w-8" />
          Phone Orders
        </h1>
        <p className="text-gray-500">Enter orders received via phone calls</p>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Customer Information */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
              <CardDescription>
                Enter details of the customer placing the order
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="customer-name">Customer Name</Label>
                <Input 
                  id="customer-name" 
                  value={customerName} 
                  onChange={(e) => setCustomerName(e.target.value)} 
                  placeholder="Customer name"
                />
              </div>
              <div>
                <Label htmlFor="customer-phone">Phone Number</Label>
                <Input 
                  id="customer-phone" 
                  value={customerPhone} 
                  onChange={(e) => setCustomerPhone(e.target.value)} 
                  placeholder="e.g., 918765432100"
                />
              </div>
              <div>
                <Label htmlFor="order-type">Order Type</Label>
                <Select value={orderType} onValueChange={setOrderType}>
                  <SelectTrigger id="order-type">
                    <SelectValue placeholder="Select order type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dine-in">Dine-in</SelectItem>
                    <SelectItem value="takeaway">Takeaway</SelectItem>
                    <SelectItem value="delivery">Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {orderType === 'dine-in' && (
                <div>
                  <Label htmlFor="table-number">Table Number</Label>
                  <Input 
                    id="table-number" 
                    value={tableNumber} 
                    onChange={(e) => setTableNumber(e.target.value)} 
                    placeholder="e.g., Table 5"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Order Entry */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
              <CardDescription>
                Enter or record the customer's order
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="order-text">Order Text</Label>
                  <Textarea 
                    id="order-text" 
                    value={orderText} 
                    onChange={(e) => setOrderText(e.target.value)} 
                    placeholder="Type or record the customer's order..."
                    rows={5}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Example: "I want 2 butter chicken, 3 naan, and a paneer tikka"
                  </p>
                </div>
                <div className="flex flex-col justify-end mb-6">
                  <Button 
                    variant={isRecording ? "destructive" : "secondary"} 
                    size="icon" 
                    onClick={toggleRecording}
                    className="h-10 w-10"
                  >
                    {isRecording ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <Button 
                onClick={handleProcessOrder} 
                disabled={processingOrder || !orderText.trim()}
                className="w-full"
              >
                {processingOrder ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing Order...
                  </>
                ) : (
                  'Process Order'
                )}
              </Button>
              
              {showOrderPreview && (
                <>
                  <Separator className="my-4" />
                  
                  <div>
                    <h3 className="font-medium mb-2">Processed Order Items</h3>
                    {processedItems.length > 0 ? (
                      <div className="rounded-md border">
                        <div className="bg-muted px-4 py-2 font-medium flex">
                          <div className="flex-1">Item</div>
                          <div className="w-20 text-center">Quantity</div>
                          <div className="w-24 text-right">Price</div>
                        </div>
                        <div className="divide-y">
                          {processedItems.map((item, index) => (
                            <div key={index} className="px-4 py-3 flex items-center">
                              <div className="flex-1 font-medium">{item.name}</div>
                              <div className="w-20 text-center">{item.quantity}</div>
                              <div className="w-24 text-right">₹{(item.price * item.quantity).toFixed(2)}</div>
                            </div>
                          ))}
                          <div className="px-4 py-3 flex items-center bg-muted/50">
                            <div className="flex-1 font-medium">Total</div>
                            <div className="w-20 text-center"></div>
                            <div className="w-24 text-right font-bold">₹{orderTotal.toFixed(2)}</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500">No items could be processed from the order text.</p>
                    )}
                  </div>
                  
                  <Button 
                    onClick={handleCreateOrder} 
                    className="w-full"
                    disabled={processedItems.length === 0 || createOrderMutation.isPending}
                  >
                    {createOrderMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Order...
                      </>
                    ) : (
                      'Create Order'
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}