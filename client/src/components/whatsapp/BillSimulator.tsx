import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ReceiptText, UtensilsCrossed, Check } from 'lucide-react';

export default function BillSimulator() {
  const [orderId, setOrderId] = useState('');
  const [subtotal, setSubtotal] = useState('250');
  const [tax, setTax] = useState('30');
  const [discount, setDiscount] = useState('0');
  const [total, setTotal] = useState('280');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  // Get menu items for the simulator
  const { data: menuItems } = useQuery({
    queryKey: ['/api/menu-items'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/menu-items');
      return await response.json();
    }
  });

  // Create an order first
  const createOrderMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await apiRequest('POST', '/api/simulator/create-order', payload);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Order created successfully',
        description: `Order #${data.orderNumber} has been created.`,
      });
      setOrderId(data.id.toString());
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create order',
        description: error.message || 'Something went wrong',
        variant: 'destructive',
      });
    }
  });

  // Create a bill
  const createBillMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await apiRequest('POST', '/api/simulator/create-bill', payload);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Bill created successfully',
        description: `Bill #${data.billNumber} has been created.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bills'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create bill',
        description: error.message || 'Something went wrong',
        variant: 'destructive',
      });
    }
  });

  const handleCreateTestOrder = () => {
    if (!menuItems || menuItems.length === 0) {
      toast({
        title: 'No menu items available',
        description: 'Please ensure menu items are available',
        variant: 'destructive',
      });
      return;
    }

    // Get a subset of menu items for the order
    const randomItems = menuItems.slice(0, 3);
    const orderItems = randomItems.map(item => ({
      menuItemId: item.id,
      price: item.price,
      quantity: Math.floor(Math.random() * 3) + 1,
      notes: null
    }));

    const orderPayload = {
      status: 'ready',
      tableNumber: 'T12',
      totalAmount: parseFloat(subtotal),
      notes: 'Test order for WhatsApp bill simulation',
      orderSource: 'simulator',
      items: orderItems
    };

    createOrderMutation.mutate(orderPayload);
  };

  const handleCreateTestBill = () => {
    if (!orderId) {
      toast({
        title: 'Order ID required',
        description: 'Please create an order first or enter an existing Order ID',
        variant: 'destructive',
      });
      return;
    }

    const billPayload = {
      orderId: parseInt(orderId),
      subtotal: parseFloat(subtotal),
      tax: parseFloat(tax),
      discount: parseFloat(discount),
      total: parseFloat(total),
      paymentStatus: 'pending',
      paymentMethod: paymentMethod || 'cash'
    };

    createBillMutation.mutate(billPayload);
  };

  const calculateTotal = () => {
    const calculatedTotal = 
      (parseFloat(subtotal) || 0) + 
      (parseFloat(tax) || 0) - 
      (parseFloat(discount) || 0);
    
    setTotal(calculatedTotal.toFixed(2));
  };

  // Update total when any component changes
  React.useEffect(() => {
    calculateTotal();
  }, [subtotal, tax, discount]);

  return (
    <Card className="w-full mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ReceiptText className="h-5 w-5" />
          Test Bill Simulator
        </CardTitle>
        <CardDescription>
          Create test orders and bills for WhatsApp testing
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <Button 
              variant="outline"
              onClick={handleCreateTestOrder}
              disabled={createOrderMutation.isPending}
              className="flex items-center"
            >
              <UtensilsCrossed className="h-4 w-4 mr-2" />
              {createOrderMutation.isPending ? 'Creating Order...' : 'Create Test Order'}
            </Button>
            
            {orderId && (
              <div className="bg-muted p-2 rounded flex items-center justify-between">
                <span className="text-sm">Order ID: {orderId}</span>
                <Check className="h-4 w-4 text-green-500" />
              </div>
            )}

            <div className="pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Manual Order ID</label>
                  <Input
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    placeholder="Or enter existing Order ID"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Payment Method</label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Payment Method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="wallet">Digital Wallet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Subtotal (₹)</label>
                <Input
                  type="number"
                  value={subtotal}
                  onChange={(e) => setSubtotal(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tax (₹)</label>
                <Input
                  type="number"
                  value={tax}
                  onChange={(e) => setTax(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Discount (₹)</label>
                <Input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Total (₹)</label>
              <Input
                type="number"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                className="bg-muted"
              />
            </div>

            <Button 
              onClick={handleCreateTestBill}
              disabled={createBillMutation.isPending || !orderId}
              className="mt-4"
            >
              <ReceiptText className="h-4 w-4 mr-2" />
              {createBillMutation.isPending ? 'Creating Bill...' : 'Create Test Bill'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}