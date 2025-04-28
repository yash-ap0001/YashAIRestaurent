import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  createdAt: Date;
  read: boolean;
}

export function NotificationSystem() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    // Connect to the WebSocket for notifications
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.addEventListener('open', () => {
      console.log('Notification WebSocket connection established');
    });

    socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle different notification types from WebSocket
        if (data.type === 'notification') {
          const newNotification: Notification = {
            id: `notif-${Date.now()}`,
            title: data.title || 'New Notification',
            message: data.message,
            type: data.notificationType || 'info',
            createdAt: new Date(),
            read: false,
          };
          
          // Add to notifications list
          setNotifications(prev => [newNotification, ...prev]);
          
          // Update unread count
          setUnreadCount(prev => prev + 1);
          
          // Also show a toast for immediate visibility
          toast({
            title: newNotification.title,
            description: newNotification.message,
            variant: newNotification.type === 'error' 
              ? 'destructive' 
              : 'default',
          });
        }
      } catch (error) {
        console.error('Error parsing notification:', error);
      }
    });

    socket.addEventListener('error', (error) => {
      console.error('Notification WebSocket error:', error);
    });

    socket.addEventListener('close', (event) => {
      console.log('Notification WebSocket closed:', event.code, event.reason);
      
      // Attempt to reconnect after 3 seconds on close
      setTimeout(() => {
        console.log('Attempting to reconnect notification WebSocket...');
        // The next useEffect run will handle reconnection
      }, 3000);
    });

    setWebsocket(socket);

    // Cleanup
    return () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [toast]);

  // Mark all as read
  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
    setUnreadCount(0);
  };

  // Mark single notification as read
  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative bg-transparent hover:bg-purple-800">
          <Bell className="h-5 w-5 text-white" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-purple-500"></span>
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-2 border-b">
          <h3 className="font-medium">Notifications</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={markAllAsRead}
              className="text-xs text-purple-600 hover:text-purple-800"
            >
              Mark all as read
            </Button>
          )}
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No notifications
            </div>
          ) : (
            notifications.map(notification => (
              <DropdownMenuItem
                key={notification.id}
                className={cn(
                  "p-3 cursor-default flex flex-col items-start",
                  !notification.read && "bg-purple-50 dark:bg-purple-900/10"
                )}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="flex items-center w-full">
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full mr-2",
                      notification.type === 'info' && "bg-blue-500",
                      notification.type === 'success' && "bg-green-500",
                      notification.type === 'warning' && "bg-yellow-500",
                      notification.type === 'error' && "bg-red-500",
                      notification.read && "opacity-50"
                    )}
                  />
                  <span className="font-medium flex-grow">{notification.title}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(notification.createdAt).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {notification.message}
                </p>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}