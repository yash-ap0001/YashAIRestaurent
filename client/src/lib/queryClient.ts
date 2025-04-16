import { QueryClient, QueryFunction } from "@tanstack/react-query";

// WebSocket connection for real-time updates
let socket: WebSocket | null = null;
let isConnecting = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true, // Enable refetching when window gains focus
      staleTime: 60000, // Data becomes stale after 1 minute
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// Initialize WebSocket connection for real-time data updates
export function initializeWebSocket() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }
  
  if (isConnecting) {
    return;
  }
  
  isConnecting = true;
  
  try {
    // Determine the WebSocket URL based on the current protocol (http/https)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log('Initializing WebSocket connection to:', wsUrl);
    
    socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      console.log('WebSocket connection established');
      isConnecting = false;
      reconnectAttempts = 0;
      
      // Send ping to keep the connection alive
      setInterval(() => {
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000);
    };
    
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('WebSocket message received:', message);
        
        // Handle different types of messages
        switch (message.type) {
          case 'stats_updated':
            // Update dashboard stats directly
            if (message.data) {
              queryClient.setQueryData(['/api/dashboard/stats'], message.data);
            }
            break;
            
          case 'order_updated':
          case 'new_order':
            // Invalidate orders cache
            queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
            // Also update dashboard stats as they are affected by orders
            queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
            break;
            
          case 'kitchen_token_updated':
          case 'new_kitchen_token':
            // Invalidate kitchen tokens cache
            queryClient.invalidateQueries({ queryKey: ['/api/kitchen-tokens'] });
            // Also update dashboard stats as they are affected by kitchen tokens
            queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
            break;
            
          case 'bill_updated':
          case 'new_bill':
            // Invalidate bills cache
            queryClient.invalidateQueries({ queryKey: ['/api/bills'] });
            // Also update dashboard stats as they are affected by bills
            queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
            break;
            
          case 'menu_item_updated':
          case 'new_menu_item':
            // Invalidate menu items cache
            queryClient.invalidateQueries({ queryKey: ['/api/menu-items'] });
            break;
            
          case 'customer_updated':
          case 'new_customer':
            // Invalidate customers cache
            queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
            break;
            
          case 'activity_created':
            // Invalidate activities cache
            queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
            break;
            
          case 'connect':
            console.log('Connected to real-time updates service:', message.message);
            break;
            
          case 'pong':
            // Received pong response from server
            break;
            
          default:
            console.log('Unknown message type:', message.type);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };
    
    socket.onclose = (event) => {
      console.log('WebSocket connection closed:', event.code, event.reason);
      socket = null;
      isConnecting = false;
      
      // Attempt to reconnect unless max attempts reached
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        setTimeout(() => {
          console.log(`Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
          initializeWebSocket();
        }, RECONNECT_DELAY);
      } else {
        console.error('Max reconnection attempts reached. Please refresh the page.');
      }
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      isConnecting = false;
    };
  } catch (error) {
    console.error('Error initializing WebSocket:', error);
    isConnecting = false;
  }
}
