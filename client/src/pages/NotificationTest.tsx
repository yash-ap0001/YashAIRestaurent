import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { apiRequest } from '@/lib/queryClient';

export default function NotificationTest() {
  const { toast } = useToast();
  const [notificationType, setNotificationType] = useState<'info' | 'success' | 'warning' | 'error'>('info');
  const [title, setTitle] = useState('Test Notification');
  const [message, setMessage] = useState('This is a test notification message');
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSendTestNotification = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/notifications/test', {
        type: notificationType,
        title,
        message
      });
      
      const data = await response.json();
      
      toast({
        title: 'Notification Sent',
        description: `Successfully sent a ${notificationType} notification`,
        variant: 'default'
      });
      
      console.log('Notification sent:', data);
    } catch (error) {
      console.error('Error sending notification:', error);
      
      toast({
        title: 'Error',
        description: 'Failed to send notification',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSendPredefinedNotification = async (type: string) => {
    setIsLoading(true);
    let payload;
    
    // Create different payloads based on the notification type
    switch (type) {
      case 'newOrder':
        payload = { 
          notificationType: 'newOrder',
          data: { orderNumber: 'ORD-9999', tableNumber: 'T7' } 
        };
        break;
      case 'orderStatusChange':
        payload = { 
          notificationType: 'orderStatusChange',
          data: { orderNumber: 'ORD-9999', status: 'preparing' } 
        };
        break;
      case 'kitchenAlert':
        payload = { 
          notificationType: 'kitchenAlert',
          data: { tokenNumber: 'KT-99', message: 'Running low on ingredients' } 
        };
        break;
      case 'paymentReceived':
        payload = { 
          notificationType: 'paymentReceived',
          data: { billNumber: 'BILL-9999', amount: 1299 } 
        };
        break;
      case 'systemAlert':
        payload = { 
          notificationType: 'systemAlert',
          data: { message: 'System maintenance scheduled in 30 minutes' } 
        };
        break;
      case 'error':
        payload = { 
          notificationType: 'error',
          data: { message: 'Database connection error in kitchen module' } 
        };
        break;
      default:
        return;
    }
    
    try {
      const response = await apiRequest('POST', '/api/notifications/send', payload);
      const data = await response.json();
      
      toast({
        title: 'Notification Sent',
        description: `Successfully sent a ${type} notification`,
        variant: 'success'
      });
      
      console.log('Predefined notification sent:', data);
    } catch (error) {
      console.error('Error sending predefined notification:', error);
      
      toast({
        title: 'Error',
        description: 'Failed to send notification',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Notification Testing Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Custom Notification Card */}
        <Card>
          <CardHeader>
            <CardTitle>Custom Notification</CardTitle>
            <CardDescription>
              Create and send a custom notification
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notificationType">Notification Type</Label>
                <Select 
                  value={notificationType} 
                  onValueChange={(value: any) => setNotificationType(value)}
                >
                  <SelectTrigger id="notificationType">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Notification title"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Input
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Notification message"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleSendTestNotification} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Sending...' : 'Send Custom Notification'}
            </Button>
          </CardFooter>
        </Card>
        
        {/* Predefined Notifications Card */}
        <Card>
          <CardHeader>
            <CardTitle>Predefined Notifications</CardTitle>
            <CardDescription>
              Send system-defined notification types
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button 
                onClick={() => handleSendPredefinedNotification('newOrder')}
                disabled={isLoading}
                variant="outline"
                className="w-full justify-start"
              >
                New Order Notification
              </Button>
              
              <Button 
                onClick={() => handleSendPredefinedNotification('orderStatusChange')}
                disabled={isLoading}
                variant="outline"
                className="w-full justify-start"
              >
                Order Status Change Notification
              </Button>
              
              <Button 
                onClick={() => handleSendPredefinedNotification('kitchenAlert')}
                disabled={isLoading}
                variant="outline"
                className="w-full justify-start"
              >
                Kitchen Alert Notification
              </Button>
              
              <Button 
                onClick={() => handleSendPredefinedNotification('paymentReceived')}
                disabled={isLoading}
                variant="outline"
                className="w-full justify-start"
              >
                Payment Received Notification
              </Button>
              
              <Button 
                onClick={() => handleSendPredefinedNotification('systemAlert')}
                disabled={isLoading}
                variant="outline"
                className="w-full justify-start"
              >
                System Alert Notification
              </Button>
              
              <Button 
                onClick={() => handleSendPredefinedNotification('error')}
                disabled={isLoading}
                variant="outline"
                className="w-full justify-start text-red-500 hover:text-red-700"
              >
                Error Notification
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}