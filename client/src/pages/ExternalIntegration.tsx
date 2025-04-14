import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  AlertCircle,
  ArrowRight,
  BellRing,
  CheckCircle2,
  ChefHat,
  Loader2,
  RotateCw,
  Utensils,
  ArrowDownToLine,
  MessageSquare,
  Phone
} from "lucide-react";

// Define form schema for external platform orders
const externalOrderSchema = z.object({
  customerName: z.string().min(2, {
    message: "Customer name must be at least 2 characters.",
  }),
  customerPhone: z.string().optional(),
  customerEmail: z.string().email().optional().or(z.literal('')),
  deliveryAddress: z.string().optional(),
  specialInstructions: z.string().optional(),
  paymentMethod: z.string().optional(),
  isUrgent: z.boolean().default(false),
  orderItems: z.array(
    z.object({
      name: z.string().min(1, { message: "Item name is required" }),
      price: z.number().min(0, { message: "Price must be a positive number" }),
      quantity: z.number().min(1, { message: "Quantity must be at least 1" }),
      notes: z.string().optional()
    })
  ).min(1, { message: "At least one order item is required" }),
  totalAmount: z.number().min(0, { message: "Total amount must be a positive number" })
});

type ExternalOrderFormValues = z.infer<typeof externalOrderSchema>;

export default function ExternalIntegration() {
  const [activeTab, setActiveTab] = useState<string>("zomato");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [orderResponse, setOrderResponse] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Default values for the form
  const defaultValues: ExternalOrderFormValues = {
    customerName: "Test Customer",
    customerPhone: "+919876543210",
    customerEmail: "customer@example.com",
    deliveryAddress: "123 Test Street, City",
    specialInstructions: "Please deliver quickly",
    paymentMethod: activeTab === "zomato" ? "zomato_pay" : "swiggy_pay",
    isUrgent: false,
    orderItems: [
      {
        name: "Butter Chicken",
        price: 320,
        quantity: 1,
        notes: ""
      },
      {
        name: "Naan",
        price: 40,
        quantity: 2,
        notes: ""
      }
    ],
    totalAmount: 400
  };

  // Initialize form
  const form = useForm<ExternalOrderFormValues>({
    resolver: zodResolver(externalOrderSchema),
    defaultValues
  });

  // Calculate total amount based on order items
  const calculateTotal = () => {
    const items = form.getValues("orderItems");
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    form.setValue("totalAmount", total);
    return total;
  };

  // Add a new order item
  const addOrderItem = () => {
    const currentItems = form.getValues("orderItems");
    form.setValue("orderItems", [
      ...currentItems,
      { name: "", price: 0, quantity: 1, notes: "" }
    ]);
  };

  // Remove an order item
  const removeOrderItem = (index: number) => {
    const currentItems = form.getValues("orderItems");
    if (currentItems.length > 1) {
      form.setValue("orderItems", currentItems.filter((_, i) => i !== index));
      // Recalculate total
      setTimeout(calculateTotal, 0);
    } else {
      toast({
        title: "Cannot Remove Item",
        description: "At least one order item is required",
        variant: "destructive"
      });
    }
  };

  // Handle form submission
  const onSubmit = async (data: ExternalOrderFormValues) => {
    try {
      setIsSubmitting(true);
      setOrderResponse(null);

      // Update total amount
      data.totalAmount = calculateTotal();
      
      // Update payment method based on active tab
      data.paymentMethod = activeTab === "zomato" ? "zomato_pay" : "swiggy_pay";

      // Submit order to the API
      const endpoint = activeTab === "zomato" 
        ? "/api/external/zomato/simulate"
        : "/api/external/swiggy/simulate";

      const response = await apiRequest("POST", endpoint, data);
      const result = await response.json();

      // Display response
      setOrderResponse(result);

      // Invalidate queries to refresh order lists
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/kitchen-tokens'] });
      
      toast({
        title: "Order Submitted",
        description: result.success 
          ? `Order successfully created on ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`
          : `Failed to create order: ${result.error || 'Unknown error'}`,
        variant: result.success ? "default" : "destructive",
      });
    } catch (error) {
      console.error(`Error submitting ${activeTab} order:`, error);
      toast({
        title: "Error",
        description: `Failed to submit order to ${activeTab}: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">External Platform Integration</h1>
        <p className="text-neutral-400 mt-2">
          Test the integration with external food delivery platforms like Zomato and Swiggy
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6 bg-neutral-800">
          <TabsTrigger value="zomato" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
            <div className="flex items-center gap-2">
              <span className="text-xl">🍽️</span>
              <span>Zomato</span>
            </div>
          </TabsTrigger>
          <TabsTrigger value="swiggy" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white">
            <div className="flex items-center gap-2">
              <span className="text-xl">🛵</span>
              <span>Swiggy</span>
            </div>
          </TabsTrigger>
        </TabsList>
        
        <Card className="bg-neutral-800 border-neutral-700">
          <CardHeader>
            <CardTitle className="text-white">
              {activeTab === "zomato" ? "Simulate Zomato Order" : "Simulate Swiggy Order"}
            </CardTitle>
            <CardDescription className="text-neutral-400">
              Fill in the details to simulate an order from 
              {activeTab === "zomato" ? " Zomato" : " Swiggy"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="customerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Customer Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter customer name" 
                              {...field} 
                              className="bg-neutral-900 border-neutral-700 text-white"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="customerPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Phone Number</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="+919876543210" 
                              {...field} 
                              className="bg-neutral-900 border-neutral-700 text-white"
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="customerEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Email</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="customer@example.com" 
                              {...field} 
                              className="bg-neutral-900 border-neutral-700 text-white"
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="deliveryAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Delivery Address</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter delivery address" 
                              {...field} 
                              className="bg-neutral-900 border-neutral-700 text-white resize-none"
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="specialInstructions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Special Instructions</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Any special instructions?" 
                              {...field} 
                              className="bg-neutral-900 border-neutral-700 text-white resize-none"
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="isUrgent"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border border-neutral-700 p-4 bg-neutral-900">
                          <div className="space-y-0.5">
                            <FormLabel className="text-white">Urgent Order</FormLabel>
                            <FormDescription className="text-neutral-400">
                              Mark this order as high priority
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="data-[state=checked]:bg-purple-600"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-white font-semibold text-lg">Order Items</h3>
                      <Button 
                        type="button" 
                        onClick={addOrderItem}
                        size="sm"
                        variant="outline"
                        className="border-purple-600 text-purple-400 hover:bg-purple-900 hover:text-purple-200"
                      >
                        Add Item
                      </Button>
                    </div>
                    
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                      {form.watch("orderItems").map((_, index) => (
                        <div 
                          key={index} 
                          className="relative p-4 border border-neutral-700 rounded-lg bg-neutral-900"
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-white font-medium">Item #{index + 1}</span>
                            <Button 
                              type="button"
                              onClick={() => removeOrderItem(index)}
                              size="sm" 
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                            >
                              ✕
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <FormField
                              control={form.control}
                              name={`orderItems.${index}.name`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-neutral-300">Name</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="Item name" 
                                      {...field} 
                                      className="bg-neutral-800 border-neutral-600 text-white"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name={`orderItems.${index}.price`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-neutral-300">Price</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number"
                                      placeholder="0"
                                      {...field}
                                      onChange={(e) => {
                                        field.onChange(parseFloat(e.target.value) || 0);
                                        // Recalculate total after a short delay
                                        setTimeout(calculateTotal, 100);
                                      }}
                                      className="bg-neutral-800 border-neutral-600 text-white"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name={`orderItems.${index}.quantity`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-neutral-300">Quantity</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number"
                                      placeholder="1"
                                      {...field}
                                      onChange={(e) => {
                                        field.onChange(parseInt(e.target.value) || 1);
                                        // Recalculate total after a short delay
                                        setTimeout(calculateTotal, 100);
                                      }}
                                      min={1}
                                      className="bg-neutral-800 border-neutral-600 text-white"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name={`orderItems.${index}.notes`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-neutral-300">Notes</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="Special requests" 
                                      {...field} 
                                      className="bg-neutral-800 border-neutral-600 text-white"
                                      value={field.value || ''}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-6 p-4 border border-neutral-700 rounded-lg bg-neutral-900">
                      <div className="flex justify-between items-center">
                        <span className="text-white font-semibold">Total Amount</span>
                        <span className="text-xl font-bold text-white">
                          ₹{form.watch("totalAmount").toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button 
                    type="button" 
                    onClick={calculateTotal}
                    variant="outline"
                    className="mr-2 border-neutral-600 text-neutral-300 hover:bg-neutral-700"
                  >
                    <RotateCw className="mr-2 h-4 w-4" />
                    Recalculate
                  </Button>
                  <Button 
                    type="submit"
                    disabled={isSubmitting}
                    className={`${activeTab === "zomato" ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'}`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <ArrowDownToLine className="mr-2 h-4 w-4" />
                        Submit {activeTab === "zomato" ? "Zomato" : "Swiggy"} Order
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
            
            {orderResponse && (
              <div className="mt-6">
                <h3 className="text-white font-semibold text-lg mb-2">Response</h3>
                <div className="border border-neutral-700 rounded-lg bg-neutral-900 p-4">
                  <div className="flex items-center mb-2">
                    <Badge
                      className={orderResponse.success ? "bg-green-600" : "bg-red-600"}
                    >
                      {orderResponse.success ? "Success" : "Error"}
                    </Badge>
                  </div>
                  <pre className="text-neutral-300 overflow-auto max-h-[200px] text-sm">
                    {JSON.stringify(orderResponse, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}