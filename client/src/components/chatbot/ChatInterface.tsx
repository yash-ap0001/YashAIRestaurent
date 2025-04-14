import { useState, useRef, useEffect } from "react";
import { Send, Bot, X, CornerDownLeft, User, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type ChatRole = "user" | "assistant" | "system";

interface ChatMessage {
  role: ChatRole;
  content: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  userType: "customer" | "admin" | "kitchen";
  userName?: string;
  minimized?: boolean;
  onMinimize?: () => void;
  customerId?: number;
  orderId?: number;
}

export function ChatInterface({
  userType = "customer",
  userName = "Guest",
  minimized = false,
  onMinimize,
  customerId,
  orderId,
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Add initial greeting based on user type
  useEffect(() => {
    let initialMessage = "";
    switch (userType) {
      case "customer":
        initialMessage = `Hello! Welcome to YashHotelBot. How can I assist you today? You can ask about our menu, place an order, or check the status of your existing order.`;
        break;
      case "admin":
        initialMessage = `Hello Admin! I can help you with analytics, inventory updates, customer information, or operational tasks. What would you like to know?`;
        break;
      case "kitchen":
        initialMessage = `Kitchen dashboard assistant ready. I can help prioritize orders, update item availability, or provide prep instructions. How can I help?`;
        break;
      default:
        initialMessage = `Hello! How can I assist you today?`;
    }
    
    setMessages([
      {
        role: "assistant",
        content: initialMessage,
        timestamp: new Date(),
      },
    ]);
  }, [userType]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when minimized state changes to false
  useEffect(() => {
    if (!minimized) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [minimized]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Send to backend
      const response = await apiRequest("POST", "/api/ai/chatbot", {
        message: input,
        userType,
        customerId,
        orderId,
        messageHistory: messages.map(m => ({
          role: m.role,
          content: m.content
        }))
      });
      
      if (!response.ok) {
        throw new Error("Failed to get response from server");
      }
      
      const data = await response.json();
      
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response,
          timestamp: new Date(),
        },
      ]);
    } catch (error: any) {
      console.error("Chatbot error:", error);
      toast({
        title: "Communication Error",
        description: "Unable to connect to the chatbot service.",
        variant: "destructive",
      });
      
      // Add fallback response
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I'm having trouble connecting to our servers. Please try again later or contact support if this persists.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    // Keep the initial greeting based on user type
    let initialMessage = "";
    switch (userType) {
      case "customer":
        initialMessage = `Hello! Welcome to YashHotelBot. How can I assist you today? You can ask about our menu, place an order, or check the status of your existing order.`;
        break;
      case "admin":
        initialMessage = `Hello Admin! I can help you with analytics, inventory updates, customer information, or operational tasks. What would you like to know?`;
        break;
      case "kitchen":
        initialMessage = `Kitchen dashboard assistant ready. I can help prioritize orders, update item availability, or provide prep instructions. How can I help?`;
        break;
      default:
        initialMessage = `Hello! How can I assist you today?`;
    }
    
    setMessages([
      {
        role: "assistant",
        content: initialMessage,
        timestamp: new Date(),
      },
    ]);
  };

  if (minimized) {
    return null;
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 md:w-96 shadow-lg z-50 border-primary/20">
      <CardHeader className="bg-primary/5 p-3 flex flex-row items-center justify-between border-b">
        <div className="flex items-center">
          <Avatar className="h-8 w-8 mr-2">
            <AvatarImage src="/bot-avatar.png" alt="Bot Avatar" />
            <AvatarFallback>
              <Bot className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <CardTitle className="text-sm font-medium">
            YashBot Assistant
            <div>
              <Badge variant="outline" className="text-xs font-normal">
                {userType === "customer" 
                  ? "Customer Support" 
                  : userType === "admin" 
                    ? "Admin Assistant" 
                    : "Kitchen Helper"}
              </Badge>
            </div>
          </CardTitle>
        </div>
        <div className="flex gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7" 
            onClick={clearChat}
          >
            <RefreshCw className="h-4 w-4" />
            <span className="sr-only">Clear chat</span>
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7" 
            onClick={onMinimize}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-96 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex items-start gap-2",
                message.role === "user" ? "justify-end" : ""
              )}
            >
              {message.role === "assistant" && (
                <Avatar className="h-8 w-8 mt-0.5">
                  <AvatarFallback>
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  "rounded-lg px-3 py-2 max-w-[85%]",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                <div className="whitespace-pre-wrap text-sm">
                  {message.content}
                </div>
                <div className="text-xs opacity-50 mt-1">
                  {message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
              {message.role === "user" && (
                <Avatar className="h-8 w-8 mt-0.5">
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start gap-2">
              <Avatar className="h-8 w-8 mt-0.5">
                <AvatarFallback>
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-muted rounded-lg px-3 py-2 max-w-[85%]">
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-primary/40 animate-bounce delay-0"></div>
                  <div className="h-2 w-2 rounded-full bg-primary/40 animate-bounce delay-150"></div>
                  <div className="h-2 w-2 rounded-full bg-primary/40 animate-bounce delay-300"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </CardContent>
      <CardFooter className="p-3 pt-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center w-full gap-2"
        >
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button 
            size="icon" 
            type="submit" 
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}

export function MinimizedChatButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      onClick={onClick}
      className="fixed bottom-4 right-4 z-50 rounded-full h-14 w-14 shadow-lg p-0 bg-primary/90 hover:bg-primary"
    >
      <Bot className="h-6 w-6" />
      <span className="sr-only">Open Chat</span>
    </Button>
  );
}