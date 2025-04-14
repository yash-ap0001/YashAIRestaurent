import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2, Wand2 } from "lucide-react";

interface NaturalLanguageOrderInputProps {
  onOrderProcessed: (processedOrder: {
    items: Array<{
      menuItemId: number;
      name: string;
      quantity: number;
      notes: string;
    }>;
    notes: string;
  }) => void;
}

export function NaturalLanguageOrderInput({ onOrderProcessed }: NaturalLanguageOrderInputProps) {
  const { toast } = useToast();
  const [orderText, setOrderText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const processOrderMutation = useMutation({
    mutationFn: async (text: string) => {
      const response = await apiRequest("POST", "/api/ai/process-order", { orderText: text });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Order processed",
        description: "Natural language order successfully processed"
      });
      onOrderProcessed(data);
      setOrderText("");
      setError(null);
    },
    onError: (error: Error) => {
      setError(error.message || "Failed to process natural language order");
      toast({
        title: "Error processing order",
        description: "Could not process the natural language order",
        variant: "destructive"
      });
    }
  });

  const handleProcessOrder = () => {
    if (!orderText.trim()) {
      setError("Please enter an order description");
      return;
    }
    
    processOrderMutation.mutate(orderText);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium">
          <Wand2 className="h-4 w-4 text-primary-500" />
          <span>AI-Powered Order Input</span>
        </label>
        
        <div className="p-3 bg-primary-50 rounded-md border border-primary-100">
          <p className="text-xs text-primary-700 mb-2">
            <strong>Try saying:</strong> "Two chicken biryanis, one paneer butter masala with extra butter, and three plain naans."
          </p>
          <Textarea
            placeholder="Enter order in natural language as you would hear it from a customer..."
            className="min-h-[100px] resize-none bg-white"
            value={orderText}
            onChange={(e) => setOrderText(e.target.value)}
          />
        </div>
        
        <p className="text-xs text-neutral-500 italic">
          Our AI will automatically detect menu items, quantities and special instructions from natural language input.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button
        type="button"
        onClick={handleProcessOrder}
        disabled={processOrderMutation.isPending || !orderText.trim()}
        className="w-full"
        variant="default"
      >
        {processOrderMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Wand2 className="mr-2 h-4 w-4" />
            Process with AI
          </>
        )}
      </Button>
    </div>
  );
}