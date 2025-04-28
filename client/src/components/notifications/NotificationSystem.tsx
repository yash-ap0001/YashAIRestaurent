import { useState, useEffect } from 'react';
import { 
  Bell, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  AlertTriangle, 
  X,
  MessageSquare
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// No need for Socket import as we're using native WebSocket
import { useAuth } from '@/hooks/useAuth';

// Define notification type for client side
interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
  read?: boolean;
  targetRoles?: string[];
}

export default function NotificationSystem() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  // Socket Connection Logic
  useEffect(() => {
    // Create WebSocket connection for toast notifications
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log('Initializing WebSocket connection to:', wsUrl);
    
    // Create WebSocket
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('Toast notification WebSocket connection established');
      setSocket(ws);
    };
    
    ws.onmessage = (event) => {
      console.log('WebSocket message for toast notification:', event.data);
      
      try {
        const data = JSON.parse(event.data);
        
        // Handle different message types
        if (data.type === 'notification') {
          handleNotification(data);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('Toast notification WebSocket error:', error);
    };
    
    ws.onclose = (event) => {
      console.log('Toast notification WebSocket closed:', event.code, event.reason);
      
      // Cleanup socket reference
      setSocket(null);
      
      // Attempt reconnection with exponential backoff
      const maxReconnectAttempts = 5;
      const reconnect = (attempt = 1) => {
        if (attempt <= maxReconnectAttempts) {
          console.log(`Attempting to reconnect (${attempt}/${maxReconnectAttempts})...`);
          
          // Exponential backoff: 1s, 2s, 4s, 8s, 16s
          const timeout = Math.pow(2, attempt - 1) * 1000;
          
          setTimeout(() => {
            // Create a new WebSocket connection
            const newWs = new WebSocket(wsUrl);
            
            newWs.onopen = () => {
              console.log('Toast notification WebSocket connection established');
              setSocket(newWs);
            };
            
            newWs.onmessage = ws.onmessage;
            newWs.onerror = ws.onerror;
            
            newWs.onclose = (closeEvent) => {
              console.log('Toast notification WebSocket closed:', closeEvent.code, closeEvent.reason);
              reconnect(attempt + 1);
            };
          }, timeout);
        }
      };
      
      reconnect();
    };
    
    // Cleanup on component unmount
    return () => {
      if (ws) {
        console.log('Closing WebSocket connection');
        ws.close();
      }
    };
  }, []);

  // Handle incoming notifications
  const handleNotification = (data: any) => {
    // Create notification object from WebSocket message
    const newNotification: Notification = {
      id: data.notification?.id || `notif-${Date.now()}`,
      title: data.title || data.notification?.title || 'Notification',
      message: data.message || data.notification?.message || '',
      type: data.notificationType || data.notification?.type || 'info',
      timestamp: data.timestamp || Date.now(),
      read: false,
      targetRoles: data.targetRoles || data.notification?.targetRoles
    };
    
    // Check if notification is targeted to specific roles
    if (newNotification.targetRoles && newNotification.targetRoles.length > 0) {
      // If user's role is not in targetRoles, don't show the notification
      if (user && !newNotification.targetRoles.includes(user.role)) {
        return;
      }
    }
    
    // Add notification to the list
    setNotifications(prev => [newNotification, ...prev].slice(0, 20)); // Keep last 20 notifications
    
    // Update unread count
    setUnreadCount(prev => prev + 1);
    
    // Show toast for the notification
    toast({
      title: newNotification.title,
      description: newNotification.message,
      variant: newNotification.type === 'error' ? 'destructive' : 'default'
      // Custom icons not supported in basic toast implementation
    });
  };
  
  // Helper function to get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'info':
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };
  
  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({
        ...notification,
        read: true
      }))
    );
    setUnreadCount(0);
  };
  
  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 px-1.5 py-0.5 min-w-[1.2rem] h-5"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-2">
          <DropdownMenuLabel className="font-bold text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Notifications
          </DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2 text-xs" 
              onClick={markAllAsRead}
            >
              Mark all as read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuGroup className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem key={notification.id} className="flex flex-col items-start p-0">
                <div 
                  className={`w-full p-3 hover:bg-accent cursor-default ${!notification.read ? 'bg-muted/50' : ''}`}
                  onClick={() => {
                    if (!notification.read) {
                      setNotifications(prev => 
                        prev.map(n => 
                          n.id === notification.id ? { ...n, read: true } : n
                        )
                      );
                      setUnreadCount(prev => Math.max(0, prev - 1));
                    }
                  }}
                >
                  <div className="flex justify-between items-start w-full">
                    <div className="flex gap-2 items-start">
                      {getNotificationIcon(notification.type)}
                      <div>
                        <p className="font-medium text-sm">{notification.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap pl-2">
                      {formatTimestamp(notification.timestamp)}
                    </span>
                  </div>
                </div>
                <DropdownMenuSeparator className="m-0" />
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}