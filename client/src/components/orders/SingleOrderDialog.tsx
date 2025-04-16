import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2, Plus, Minus, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { MenuItem } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SingleOrderDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SingleOrderDialog({ open, onClose }: SingleOrderDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [tableNumber, setTableNumber] = useState("T1");
  const [orderItems, setOrderItems] = useState<any[]>([
    { menuItemId: "", quantity: 1, price: 0, specialInstructions: "" }
  ]);

  // Fetch menu items
  const { data: menuItems = [] } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"],
  });

  const handleMenuItemChange = (index: number, menuItemId: string) => {
    const updatedItems = [...orderItems];
    const selectedItem = menuItems.find(item => item.id.toString() === menuItemId);
    
    if (selectedItem) {
      updatedItems[index] = {
        ...updatedItems[index],
        menuItemId: parseInt(menuItemId),
        price: selectedItem.price
      };
      setOrderItems(updatedItems);
    }
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    const updatedItems = [...orderItems];
    updatedItems[index] = { ...updatedItems[index], quantity };
    setOrderItems(updatedItems);
  };

  const handleSpecialInstructionsChange = (index: number, instructions: string) => {
    const updatedItems = [...orderItems];
    updatedItems[index] = { ...updatedItems[index], specialInstructions: instructions };
    setOrderItems(updatedItems);
  };

  const addOrderItem = () => {
    setOrderItems([...orderItems, { menuItemId: "", quantity: 1, price: 0, specialInstructions: "" }]);
  };

  const removeOrderItem = (index: number) => {
    if (orderItems.length > 1) {
      const updatedItems = [...orderItems];
      updatedItems.splice(index, 1);
      setOrderItems(updatedItems);
    }
  };

  const calculateTotal = () => {
    return orderItems.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  };

  const handleSubmit = async () => {
    // Validate order
    const invalidItems = orderItems.filter(item => !item.menuItemId);
    if (invalidItems.length > 0) {
      toast({
        title: "Incomplete Order",
        description: "Please select menu items for all order items",
        variant: "destructive"
      });
      return;
    }

    if (!tableNumber) {
      toast({
        title: "Table Number Required",
        description: "Please enter a table number",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest("POST", "/api/orders", {
        tableNumber,
        orderItems,
        orderSource: "manual",
        status: "pending"
      });
      
      const data = await response.json();
      
      toast({
        title: "Order Created",
        description: `Order #${data.orderNumber} created successfully`,
        variant: "default"
      });
      
      // Close dialog and reset form
      onClose();
      setTableNumber("T1");
      setOrderItems([{ menuItemId: "", quantity: 1, price: 0, specialInstructions: "" }]);
    } catch (error) {
      console.error("Error creating order:", error);
      toast({
        title: "Error",
        description: "Failed to create order. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate table numbers options T1-T20
  const tableNumbers = Array.from({ length: 20 }, (_, i) => `T${i + 1}`);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-purple-500">Create Single Order</DialogTitle>
          <DialogDescription>
            Quickly create a new order with minimal clicks
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="tableNumber">Table Number</Label>
            <Select
              value={tableNumber}
              onValueChange={setTableNumber}
            >
              <SelectTrigger id="tableNumber" className="w-full">
                <SelectValue placeholder="Select table" />
              </SelectTrigger>
              <SelectContent>
                {tableNumbers.map(table => (
                  <SelectItem key={table} value={table}>{table}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-4 mt-2">
            <div className="flex items-center justify-between">
              <Label>Order Items</Label>
              <Button 
                type="button" 
                size="sm" 
                variant="outline" 
                onClick={addOrderItem}
                className="flex items-center gap-1"
              >
                <Plus className="h-4 w-4" /> Add Item
              </Button>
            </div>
            
            {orderItems.map((item, index) => (
              <Card key={index} className="p-4 relative">
                <div className="absolute top-2 right-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeOrderItem(index)}
                    disabled={orderItems.length === 1}
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Remove</span>
                  </Button>
                </div>
                
                <div className="grid gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor={`menuItem-${index}`}>Menu Item</Label>
                    <Select
                      value={item.menuItemId ? item.menuItemId.toString() : ""}
                      onValueChange={(value) => handleMenuItemChange(index, value)}
                    >
                      <SelectTrigger id={`menuItem-${index}`}>
                        <SelectValue placeholder="Select menu item" />
                      </SelectTrigger>
                      <SelectContent>
                        {menuItems.map(menuItem => (
                          <SelectItem key={menuItem.id} value={menuItem.id.toString()}>
                            {menuItem.name} (₹{menuItem.price})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor={`quantity-${index}`}>Quantity</Label>
                    <div className="flex items-center">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleQuantityChange(index, Math.max(1, item.quantity - 1))}
                        className="rounded-r-none"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        id={`quantity-${index}`}
                        value={item.quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          handleQuantityChange(index, Math.max(1, val));
                        }}
                        className="w-16 text-center rounded-none"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleQuantityChange(index, item.quantity + 1)}
                        className="rounded-l-none"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor={`instructions-${index}`}>Special Instructions</Label>
                    <Input
                      id={`instructions-${index}`}
                      placeholder="E.g., Extra spicy, No onions"
                      value={item.specialInstructions}
                      onChange={(e) => handleSpecialInstructionsChange(index, e.target.value)}
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
          
          <div className="flex justify-between items-center mt-4 text-lg font-medium">
            <span>Total Amount:</span>
            <span className="text-purple-500">₹{calculateTotal()}</span>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}