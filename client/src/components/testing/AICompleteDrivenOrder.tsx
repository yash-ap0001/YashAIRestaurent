import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Predefined orders
const PREDEFINED_ORDERS = [
  { id: "order1", label: "2 Butter Chicken and 1 Veg Biryani", text: "I'd like 2 butter chicken and 1 vegetable biryani please" },
  { id: "order2", label: "1 Paneer Tikka and 2 Masala Chai", text: "I want one paneer tikka and two masala chai" },
  { id: "order3", label: "Family Combo - All Main Dishes", text: "Give me one of each main course item on the menu" },
  { id: "order4", label: "Butter Chicken with Extra Spice", text: "I'd like a butter chicken, make it extra spicy please" },
  { id: "order5", label: "Veg Biryani and Gulab Jamun", text: "Can I get a veg biryani and one gulab jamun for dessert" },
];

// Form schema for the AI-driven order creation
const formSchema = z.object({
  orderOption: z.string().min(1, "Please select an order option"),
  orderSource: z.string().default("ai"),
  tableNumber: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type OrderStatus = "idle" | "processing" | "success" | "error";

export function AICompleteDrivenOrder() {
  const [status, setStatus] = useState<OrderStatus>("idle");
  const [orderResponse, setOrderResponse] = useState<any>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Initialize the form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      orderOption: "",
      orderSource: "ai",
      tableNumber: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      setStatus("processing");
      
      // Get the actual order text based on the selected option
      const selectedOrder = PREDEFINED_ORDERS.find(order => order.id === data.orderOption);
      if (!selectedOrder) {
        throw new Error("Invalid order selection");
      }
      
      const orderData = {
        orderText: selectedOrder.text,
        orderSource: data.orderSource,
        tableNumber: data.tableNumber
      };
      
      console.log("Submitting AI-driven order:", orderData);

      // Call the API to create an AI-driven order
      const response = await fetch("/api/ai/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log("AI-driven order created:", result);
      setOrderResponse(result);
      setStatus("success");

      // Invalidate relevant queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/kitchen-tokens'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });

      // Show a success toast
      toast({
        title: "Order Created Successfully",
        description: `Order #${result.order.orderNumber} has been created and is being processed automatically.`,
      });

      // Reset the form
      form.reset({
        orderOption: "",
        orderSource: "ai",
        tableNumber: "",
      });
    } catch (error) {
      console.error("Error creating AI-driven order:", error);
      setStatus("error");
      toast({
        title: "Order Creation Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">AI-Driven Order Creation</CardTitle>
        <CardDescription>
          Create and process orders automatically using AI. Select a predefined order,
          and the AI will handle everything from order creation to billing.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="orderOption"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select an Order</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose one of the predefined orders" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PREDEFINED_ORDERS.map((order) => (
                        <SelectItem key={order.id} value={order.id}>
                          {order.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select one of the predefined orders to let the AI process it automatically.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tableNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Table Number (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., T12" {...field} />
                  </FormControl>
                  <FormDescription>
                    If this is a dine-in order, specify the table number.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="orderSource"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Order Source</FormLabel>
                  <FormControl>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      {...field}
                    >
                      <option value="ai">AI Assistant</option>
                      <option value="phone">Phone Call</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="zomato">Zomato</option>
                      <option value="swiggy">Swiggy</option>
                    </select>
                  </FormControl>
                  <FormDescription>
                    Select the source of this order.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={status === "processing"}
                className="w-full md:w-auto"
              >
                {status === "processing" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing Order...
                  </>
                ) : (
                  "Create & Process Order"
                )}
              </Button>
            </div>
          </form>
        </Form>

        {status === "success" && orderResponse && (
          <Alert className="mt-6 bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Order Created Successfully</AlertTitle>
            <AlertDescription className="text-green-700">
              <div className="mt-2">
                <strong>Order Number:</strong> {orderResponse.order.orderNumber}
              </div>
              <div>
                <strong>Status:</strong> {orderResponse.order.status}
              </div>
              <div>
                <strong>Total Amount:</strong> ₹{orderResponse.order.totalAmount.toFixed(2)}
              </div>
              <div className="mt-2">
                <strong>Items:</strong>
                <ul className="list-disc ml-6 mt-1">
                  {orderResponse.items.map((item: any, index: number) => (
                    <li key={index}>
                      {item.name} x{item.quantity} - ₹{(item.price * item.quantity).toFixed(2)}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-2">
                <em>The order will be automatically processed through all stages.</em>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {status === "error" && (
          <Alert variant="destructive" className="mt-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Failed to create the order. Please try again with a different order description.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>

      <CardFooter className="flex flex-col items-start text-sm text-muted-foreground">
        <p>
          <strong>How it works:</strong> The AI will analyze your order text, identify menu items and quantities,
          create the order, and automatically progress it through all stages - from preparation to
          billing - without any manual intervention.
        </p>
      </CardFooter>
    </Card>
  );
}