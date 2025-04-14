import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { MenuItem } from "@shared/schema";
import { Loader2, Minus, Plus, Trash2, Sparkles } from "lucide-react";
import { NaturalLanguageOrderInput } from "./NaturalLanguageOrderInput";

const formSchema = z.object({
  tableNumber: z.string().min(1, "Table number is required"),
  items: z.array(
    z.object({
      menuItemId: z.number().min(1, "Menu item is required"),
      quantity: z.number().min(1, "Quantity must be at least 1"),
      price: z.number().min(0, "Price must be positive"),
      notes: z.string().optional(),
    })
  ).min(1, "At least one item is required"),
  notes: z.string().optional(),
  isUrgent: z.boolean().default(false),
  orderSource: z.string().default("manual"),
  useAIAutomation: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

export function OrderForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  const [selectedItems, setSelectedItems] = useState<{
    menuItemId: number;
    name: string;
    quantity: number;
    price: number;
    notes: string;
  }[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tableNumber: "",
      items: [],
      notes: "",
      isUrgent: false,
      orderSource: "manual",
      useAIAutomation: true,
    },
  });

  const { data: menuItems, isLoading: menuLoading } = useQuery<MenuItem[]>({
    queryKey: ['/api/menu-items'],
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      try {
        console.log("DEBUG - Preparing to submit order data:", orderData);
        
        // Check if we have items
        if (!orderData.items || !orderData.items.length) {
          console.error("No items in order data");
          throw new Error("Order must contain at least one item");
        }
        
        // Check if we have a table number
        if (!orderData.tableNumber) {
          console.error("No table number in order data");
          throw new Error("Table number is required");
        }
        
        // Combine everything in one complete request
        const requestData = {
          tableNumber: orderData.tableNumber,
          status: "pending",
          totalAmount: orderData.totalAmount,
          notes: orderData.notes || "",
          isUrgent: !!orderData.isUrgent,
          orderSource: orderData.orderSource || "manual",
          useAIAutomation: orderData.useAIAutomation !== undefined ? orderData.useAIAutomation : true,
          items: orderData.items || []
        };
        
        // Log the complete request
        console.log("DEBUG - Submitting data to API:", JSON.stringify(requestData, null, 2));
        
        // Use the project's standard API request function - pass method as first parameter
        const result = await apiRequest("POST", "/api/orders", requestData);
        
        console.log("DEBUG - Order API response:", result);
        return result;
      } catch (error) {
        console.error("DEBUG - Error in order mutation:", error);
        throw error;
      }
    },
    onSuccess: async (response) => {
      // Convert response to JSON
      const data = await response.json();
      console.log("DEBUG - Order created successfully with data:", data);
      
      // Show success toast with order number
      toast({
        title: "✅ Order created successfully",
        description: `Order #${data.orderNumber} has been created and sent to the kitchen`,
        variant: "default",
        duration: 5000
      });
      
      // Refresh all relevant data across the application
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/kitchen-tokens'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      
      // Navigate to kitchen tokens view
      setLocation("/kitchen-tokens");
    },
    onError: (error: any) => {
      console.error("DEBUG - Error creating order:", error);
      
      // Show detailed error message
      toast({
        title: "❌ Error creating order",
        description: error.message || "An unknown error occurred. Please try again.",
        variant: "destructive",
        duration: 7000
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    console.log("Form submit triggered with data:", data);
    
    // Validate required field
    if (!data.tableNumber) {
      toast({
        title: "Missing table number",
        description: "Please select a table before submitting",
        variant: "destructive"
      });
      return;
    }
    
    // Make sure we have items
    if (selectedItems.length === 0) {
      toast({ 
        title: "No items selected",
        description: "Please add at least one menu item to the order", 
        variant: "destructive" 
      });
      return;
    }
    
    // Calculate total amount from selected items
    const totalAmount = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Map items to the format the API expects
    const formattedItems = selectedItems.map(item => ({
      menuItemId: item.menuItemId,
      quantity: item.quantity,
      price: item.price,
      notes: item.notes || ""
    }));
    
    // Create final order data
    const orderData = {
      tableNumber: data.tableNumber,
      status: "pending",
      totalAmount: totalAmount,
      notes: data.notes || "",
      isUrgent: !!data.isUrgent,
      orderSource: data.orderSource || "manual",
      useAIAutomation: data.useAIAutomation,
      items: formattedItems
    };
    
    console.log("Form submission - Final order data to submit:", orderData);
    
    // Submit to API
    createOrderMutation.mutate(orderData);
  };

  const addMenuItem = (menuItemId: number) => {
    if (!menuItems) return;
    
    const menuItem = menuItems.find(item => item.id === parseInt(String(menuItemId)));
    if (!menuItem) return;
    
    // Check if item already exists in the order
    const existingItemIndex = selectedItems.findIndex(item => item.menuItemId === menuItem.id);
    
    if (existingItemIndex >= 0) {
      // Increment quantity if item already exists
      const updatedItems = [...selectedItems];
      updatedItems[existingItemIndex].quantity += 1;
      setSelectedItems(updatedItems);
    } else {
      // Add new item
      setSelectedItems([
        ...selectedItems,
        {
          menuItemId: menuItem.id,
          name: menuItem.name,
          quantity: 1,
          price: menuItem.price,
          notes: ""
        }
      ]);
    }
  };

  const updateItemQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    const updatedItems = [...selectedItems];
    updatedItems[index].quantity = newQuantity;
    setSelectedItems(updatedItems);
  };

  const updateItemNotes = (index: number, notes: string) => {
    const updatedItems = [...selectedItems];
    updatedItems[index].notes = notes;
    setSelectedItems(updatedItems);
  };

  const removeItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  // Debug form state
  console.log("Form state:", {
    isValid: form.formState.isValid,
    isDirty: form.formState.isDirty,
    errors: form.formState.errors,
    submitCount: form.formState.submitCount,
    isSubmitting: form.formState.isSubmitting,
    selectedItems: selectedItems
  });
  
  // Direct form submit handler function for debugging
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Direct form submit triggered");
    
    // Check if there's a table number selected
    if (!form.getValues("tableNumber")) {
      console.error("Missing table number");
      toast({
        title: "Error",
        description: "Please select a table number",
        variant: "destructive"
      });
      return;
    }
    
    // Check if items are selected
    if (selectedItems.length === 0) {
      console.error("No items selected");
      toast({
        title: "Error",
        description: "Please add at least one menu item",
        variant: "destructive"
      });
      return;
    }
    
    console.log("Attempting manual form submit with form data:", form.getValues());
    console.log("Selected items:", selectedItems);
    
    // Calculate total amount
    const totalAmount = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Create order data manually
    const orderData = {
      tableNumber: form.getValues("tableNumber"),
      status: "pending",
      totalAmount: totalAmount,
      notes: form.getValues("notes") || "",
      isUrgent: !!form.getValues("isUrgent"),
      orderSource: form.getValues("orderSource") || "manual",
      useAIAutomation: form.getValues("useAIAutomation"),
      items: selectedItems.map(item => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        price: item.price,
        notes: item.notes || ""
      }))
    };
    
    console.log("Submitting order data manually:", orderData);
    createOrderMutation.mutate(orderData);
  };

  return (
    <Form {...form}>
      <form onSubmit={handleFormSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>Order Details</span>
            </CardTitle>
            <p className="text-sm text-neutral-500 mt-1">Fill in the order details manually or use AI to process natural language orders</p>
            
            {/* Debug Info */}
            <div className="bg-neutral-800 p-2 mt-2 rounded text-xs text-white">
              <p>Form Status: {form.formState.isValid ? '✅ Valid' : '❌ Invalid'}</p>
              {Object.keys(form.formState.errors).length > 0 && (
                <div className="mt-1">
                  <p>Errors:</p>
                  <ul className="list-disc pl-5">
                    {Object.entries(form.formState.errors).map(([field, error]) => (
                      <li key={field}>{field}: {error?.message}</li>
                    ))}
                  </ul>
                </div>
              )}
              <p>Items: {selectedItems.length}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tableNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Table Number</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a table" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Table 1">Table 1</SelectItem>
                          <SelectItem value="Table 2">Table 2</SelectItem>
                          <SelectItem value="Table 3">Table 3</SelectItem>
                          <SelectItem value="Table 4">Table 4</SelectItem>
                          <SelectItem value="Table 5">Table 5</SelectItem>
                          <SelectItem value="Table 6">Table 6</SelectItem>
                          <SelectItem value="Table 7">Table 7</SelectItem>
                          <SelectItem value="Table 8">Table 8</SelectItem>
                          <SelectItem value="Table 9">Table 9</SelectItem>
                          <SelectItem value="Table 10">Table 10</SelectItem>
                          <SelectItem value="Takeaway">Takeaway</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
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
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select order source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">Manual / In-Person</SelectItem>
                          <SelectItem value="zomato">Zomato</SelectItem>
                          <SelectItem value="swiggy">Swiggy</SelectItem>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="phone">Phone</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FormLabel className="flex items-center gap-2">
                  <span>Manual Selection</span>
                </FormLabel>
                <div className="flex mt-2">
                  <Select
                    disabled={menuLoading}
                    onValueChange={(value) => addMenuItem(parseInt(value))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select menu item" />
                    </SelectTrigger>
                    <SelectContent>
                      {menuItems?.map((item) => (
                        <SelectItem key={item.id} value={item.id.toString()}>
                          {item.name} - ₹{item.price}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="md:border-l md:pl-4 md:border-neutral-200">
                <NaturalLanguageOrderInput
                  onOrderProcessed={(processedOrder) => {
                    if (!menuItems || !processedOrder.items.length) return;
                    
                    // Map the processed items to selectedItems format
                    const newItems = processedOrder.items.map(item => {
                      const menuItem = menuItems.find(mi => mi.id === item.menuItemId);
                      if (!menuItem) return null;
                      
                      return {
                        menuItemId: menuItem.id,
                        name: menuItem.name,
                        quantity: item.quantity,
                        price: menuItem.price,
                        notes: item.notes || ""
                      };
                    }).filter(Boolean) as {
                      menuItemId: number;
                      name: string;
                      quantity: number;
                      price: number;
                      notes: string;
                    }[];
                    
                    // Add all new items
                    setSelectedItems([...selectedItems, ...newItems]);
                    
                    // Set the order notes if provided
                    if (processedOrder.notes) {
                      form.setValue("notes", processedOrder.notes);
                    }
                  }}
                />
              </div>
            </div>

            {selectedItems.length > 0 && (
              <div className="space-y-4 mt-4">
                <h3 className="font-medium">Order Items</h3>
                {selectedItems.map((item, index) => (
                  <div key={index} className="border border-neutral-200 rounded-md p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-neutral-500">₹{item.price} per item</p>
                      </div>
                      <Button 
                        type="button"
                        variant="ghost" 
                        size="icon"
                        className="h-7 w-7 text-neutral-400 hover:text-error-500"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center">
                      <Button 
                        type="button"
                        variant="outline" 
                        size="icon" 
                        className="h-7 w-7 rounded-full"
                        onClick={() => updateItemQuantity(index, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="mx-3 w-8 text-center">{item.quantity}</span>
                      <Button 
                        type="button"
                        variant="outline" 
                        size="icon" 
                        className="h-7 w-7 rounded-full"
                        onClick={() => updateItemQuantity(index, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <span className="ml-auto font-medium">
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                    
                    <Input
                      placeholder="Special instructions"
                      value={item.notes}
                      onChange={(e) => updateItemNotes(index, e.target.value)}
                      className="text-sm"
                    />
                  </div>
                ))}
                
                <div className="flex justify-between pt-2 border-t border-neutral-200">
                  <span className="font-medium">Total</span>
                  <span className="font-bold">₹{calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Order Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any special instructions for the entire order"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="isUrgent"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Mark as Urgent</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="useAIAutomation"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="flex items-center gap-1.5">
                        <span>Use AI Automation</span>
                        <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                      </FormLabel>
                      <p className="text-xs text-neutral-500">
                        AI will automatically manage this order's status updates and workflow
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between space-x-2">
          <Button 
            type="button" 
            variant="destructive"
            onClick={() => {
              // Create an emergency test order with fixed data
              const testOrderData = {
                tableNumber: "Table 1",
                status: "pending",
                totalAmount: 320,
                notes: "Debug Test Order",
                isUrgent: false,
                orderSource: form.getValues("orderSource") || "manual",
                useAIAutomation: form.getValues("useAIAutomation"),
                items: [
                  {
                    menuItemId: 1,
                    quantity: 1,
                    price: 320,
                    notes: ""
                  }
                ]
              };
              
              console.log("EMERGENCY TEST ORDER:", testOrderData);
              toast({
                title: "Attempting Emergency Test Order",
                description: "Submitting a test order to the API..."
              });
              
              // Direct API call to ensure it works
              try {
                console.log("Making direct emergency test order");
                createOrderMutation.mutate(testOrderData);
              } catch (error: any) {
                console.error("Emergency order creation failed:", error);
                toast({
                  title: "Emergency Order Failed",
                  description: `Error: ${error?.message || "Unknown error"}`,
                  variant: "destructive"
                });
              }
            }}
          >
            Emergency Debug Order
          </Button>
          
          <div className="flex space-x-2">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => setLocation("/")}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={createOrderMutation.isPending || selectedItems.length === 0}
            >
              {createOrderMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Order
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
