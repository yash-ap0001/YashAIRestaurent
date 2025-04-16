import { useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Wifi, WifiOff } from "lucide-react";

// WebSocket connection status component
export function ConnectionStatus() {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  
  useEffect(() => {
    // Check initial connection status
    if (window.appSocket && window.appSocket.readyState === WebSocket.OPEN) {
      setConnected(true);
      setConnecting(false);
    } else {
      setConnected(false);
    }
    
    // Event listeners for connection status changes
    const handleConnecting = () => {
      setConnecting(true);
      setConnected(false);
    };
    
    const handleConnected = () => {
      setConnected(true);
      setConnecting(false);
    };
    
    const handleDisconnected = () => {
      setConnected(false);
      setConnecting(false);
    };
    
    // Register event listeners
    window.addEventListener('ws:connecting', handleConnecting);
    window.addEventListener('ws:open', handleConnected);
    window.addEventListener('ws:close', handleDisconnected);
    
    // Cleanup
    return () => {
      window.removeEventListener('ws:connecting', handleConnecting);
      window.removeEventListener('ws:open', handleConnected);
      window.removeEventListener('ws:close', handleDisconnected);
    };
  }, []);
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative cursor-help">
            {connected ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : connecting ? (
              <Wifi className="h-5 w-5 text-yellow-500 animate-pulse" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-500" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>
            {connected
              ? "Connected to real-time updates"
              : connecting
              ? "Connecting to real-time updates..."
              : "Disconnected from real-time updates"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}