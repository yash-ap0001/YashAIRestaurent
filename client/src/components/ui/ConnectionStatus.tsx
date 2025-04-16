import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Wifi, WifiOff } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// This component displays the real-time connection status
export function ConnectionStatus() {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [reconnecting, setReconnecting] = useState<boolean>(false);

  useEffect(() => {
    // Function to check WebSocket connection
    const checkConnection = () => {
      // Determine if there's a WebSocket instance in the global socket variable
      // We're accessing a global variable defined in queryClient.ts
      const socketInstance = (window as any).appSocket;
      
      if (socketInstance && socketInstance.readyState === WebSocket.OPEN) {
        setIsConnected(true);
        setReconnecting(false);
      } else if (socketInstance && socketInstance.readyState === WebSocket.CONNECTING) {
        setIsConnected(false);
        setReconnecting(true);
      } else {
        setIsConnected(false);
        setReconnecting(false);
      }
    };

    // Initial check
    checkConnection();

    // Set up interval to check connection status
    const interval = setInterval(checkConnection, 2000);

    // Listen for window-level custom events that signal WebSocket status changes
    const handleOpen = () => {
      setIsConnected(true);
      setReconnecting(false);
    };

    const handleClose = () => {
      setIsConnected(false);
      setReconnecting(false);
    };

    const handleConnecting = () => {
      setIsConnected(false);
      setReconnecting(true);
    };

    window.addEventListener('ws:open', handleOpen);
    window.addEventListener('ws:close', handleClose);
    window.addEventListener('ws:connecting', handleConnecting);

    return () => {
      clearInterval(interval);
      window.removeEventListener('ws:open', handleOpen);
      window.removeEventListener('ws:close', handleClose);
      window.removeEventListener('ws:connecting', handleConnecting);
    };
  }, []);

  const getStatusText = () => {
    if (isConnected) {
      return "Connected to real-time notifications";
    } else if (reconnecting) {
      return "Reconnecting...";
    } else {
      return "Not connected to real-time notifications";
    }
  };

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger className="flex items-center gap-1.5">
          {isConnected ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : reconnecting ? (
            <Wifi className={cn(
              "w-4 h-4 text-yellow-500",
              "animate-pulse"
            )} />
          ) : (
            <WifiOff className="w-4 h-4 text-red-500" />
          )}
        </TooltipTrigger>
        <TooltipContent>
          <p>{getStatusText()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}