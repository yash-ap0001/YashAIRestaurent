import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Order as BaseOrder, OrderItem, MenuItem, Bill } from "@shared/schema";

// Extended Order type with items
interface Order extends BaseOrder {
  items?: OrderItem[];
}
import { File, Send, Printer } from "lucide-react";
import { format } from "date-fns";

interface BillDetailsProps {
  orderId: number;
}

export function BillDetails({ orderId }: BillDetailsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");

  // Fetch order details
  const { data: order, isLoading: orderLoading } = useQuery<Order>({
    queryKey: ['/api/orders', orderId],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${orderId}`);
      if (!res.ok) throw new Error('Failed to fetch order');
      return res.json();
    }
  });
  
  // Get order items from the order object
  const orderItems = order?.items || [];

  // Check if a bill already exists for this order
  const { data: bills } = useQuery<Bill[]>({
    queryKey: ['/api/bills'],
  });
  
  const existingBill = bills?.find(bill => bill.orderId === orderId);

  // Fetch menu items for names
  const { data: menuItems } = useQuery<MenuItem[]>({
    queryKey: ['/api/menu-items'],
  });

  // Create bill mutation
  const createBillMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/bills", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Bill created",
        description: `Bill #${data.billNumber} has been created successfully`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bills'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    },
    onError: (error) => {
      toast({
        title: "Error creating bill",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Mark as paid mutation
  const markAsPaidMutation = useMutation({
    mutationFn: async (billId: number) => {
      const response = await apiRequest("PATCH", `/api/bills/${billId}`, {
        paymentStatus: "paid"
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment recorded",
        description: "Bill has been marked as paid"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bills'] });
    },
    onError: (error) => {
      toast({
        title: "Error updating payment status",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const handleMarkAsPaid = (billId: number) => {
    markAsPaidMutation.mutate(billId);
  };

  const handleGenerateBill = () => {
    if (!order) return;
    
    const subtotal = order.totalAmount;
    const taxRate = 0.05; // 5% tax rate
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount - discount;
    
    const billData = {
      orderId: order.id,
      subtotal,
      tax: taxAmount,
      discount,
      total,
      paymentStatus: "pending",
      paymentMethod
    };
    
    createBillMutation.mutate(billData);
  };

  const downloadPdf = (billId: number) => {
    window.open(`/api/bills/${billId}/pdf`, '_blank');
  };
  
  const handlePrint = () => {
    // Check if order exists
    if (!order) {
      toast({
        title: "Error",
        description: "Order details not available for printing",
        variant: "destructive"
      });
      return;
    }
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      toast({
        title: "Error",
        description: "Could not open print window. Please check your popup blocker settings.",
        variant: "destructive"
      });
      return;
    }
    
    // Calculate values for the print view
    const printSubtotal = orderItems && orderItems.length > 0 
      ? orderItems.reduce((sum: number, item: OrderItem) => sum + (item.price * item.quantity), 0)
      : order.totalAmount || 0;
    const printTaxAmount = printSubtotal * taxRate;
    const printTotal = printSubtotal + printTaxAmount - discount;
    
    // Generate HTML content for the print window
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bill #${existingBill?.billNumber || ''} - Order #${order.orderNumber}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.5;
            margin: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
          }
          .header p {
            margin: 5px 0;
            color: #666;
          }
          .info {
            margin-bottom: 20px;
          }
          .info p {
            margin: 5px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            padding: 8px;
            text-align: left;
            border-bottom: 1px solid #ddd;
          }
          th {
            font-weight: bold;
            background-color: #f8f8f8;
          }
          .amount-row {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
          }
          .amount-row.total {
            font-weight: bold;
            font-size: 18px;
            border-top: 1px solid #ddd;
            padding-top: 8px;
            margin-top: 8px;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            font-size: 12px;
            color: #666;
          }
          .align-right {
            text-align: right;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>YashHotelBot</h1>
          <p>123 Main Street, City, State - 12345</p>
          <p>Phone: +91 98765 43210 | Email: contact@yashhotelbot.com</p>
        </div>
        
        <div class="info">
          <p><strong>Bill #:</strong> ${existingBill?.billNumber || 'DRAFT'}</p>
          <p><strong>Order #:</strong> ${order.orderNumber}</p>
          <p><strong>Table:</strong> ${order.tableNumber || 'Takeaway'}</p>
          <p><strong>Date:</strong> ${format(new Date(), 'PPp')}</p>
          ${existingBill ? `<p><strong>Payment Method:</strong> ${existingBill.paymentMethod || 'Not specified'}</p>` : ''}
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Price</th>
              <th>Qty</th>
              <th class="align-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${orderItems.map((item: OrderItem) => `
              <tr>
                <td>${getItemName(item.menuItemId)}</td>
                <td>₹${item.price.toFixed(2)}</td>
                <td>${item.quantity}</td>
                <td class="align-right">₹${(item.price * item.quantity).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="amount-row">
          <span>Subtotal:</span>
          <span>₹${printSubtotal.toFixed(2)}</span>
        </div>
        <div class="amount-row">
          <span>Tax (5%):</span>
          <span>₹${printTaxAmount.toFixed(2)}</span>
        </div>
        ${discount > 0 ? `
          <div class="amount-row">
            <span>Discount:</span>
            <span>-₹${discount.toFixed(2)}</span>
          </div>
        ` : ''}
        <div class="amount-row total">
          <span>Total:</span>
          <span>₹${printTotal.toFixed(2)}</span>
        </div>
        
        <div class="footer">
          <p>Thank you for your visit!</p>
          <p>GST No: 123456789ABC | PAN: ABCDE1234F</p>
        </div>
      </body>
      </html>
    `;
    
    // Write content to the print window and print
    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load before printing
    printWindow.onload = function() {
      printWindow.print();
      // Close the window after printing (optional)
      // printWindow.close();
    };
  };

  if (orderLoading) {
    return <p className="text-center py-4">Loading order details...</p>;
  }
  
  if (!order) {
    return <p className="text-center py-4">Order not found</p>;
  }

  // Calculate subtotal from orderItems or use order.totalAmount as fallback
  const subtotal = orderItems && orderItems.length > 0 
    ? orderItems.reduce((sum: number, item: OrderItem) => sum + (item.price * item.quantity), 0)
    : order.totalAmount || 0;
  
  // Calculate tax (5%)
  const taxRate = 0.05;
  const taxAmount = subtotal * taxRate;
  
  // Calculate total
  const total = subtotal + taxAmount - discount;

  // Get menu item name
  const getItemName = (menuItemId: number) => {
    return menuItems?.find(item => item.id === menuItemId)?.name || 'Unknown Item';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">Order #{order.orderNumber}</h2>
            <Badge variant={existingBill ? "secondary" : "outline"}>
              {existingBill ? "Billed" : "Unbilled"}
            </Badge>
          </div>
          <p className="text-neutral-500">
            {order.tableNumber || "Takeaway"} • {
              order.createdAt 
                ? typeof order.createdAt === 'string'
                  ? format(new Date(order.createdAt), "PPp")
                  : format(new Date(), "PPp")
                : ""
            }
          </p>
        </div>
        
        <div className="flex gap-2">
          {existingBill && (
            <>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => downloadPdf(existingBill.id)}
              >
                <File className="h-4 w-4 mr-1" />
                PDF
              </Button>
              <Button 
                size="sm"
                onClick={handlePrint}
              >
                <Printer className="h-4 w-4 mr-1" />
                Print
              </Button>
            </>
          )}
        </div>
      </div>
      
      <div className="border rounded-md">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Item
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Price
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Qty
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-neutral-200">
            {orderItems && orderItems.length > 0 ? (
              orderItems.map((item: OrderItem) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-800">
                    {getItemName(item.menuItemId)}
                    {item.notes && (
                      <p className="text-xs text-neutral-500">{item.notes}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-600 text-right">
                    ₹{item.price.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-600 text-right">
                    {item.quantity}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-neutral-800 text-right">
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-4 py-3 text-sm text-center text-neutral-500">
                  No items in this order
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div className="flex flex-col md:flex-row md:justify-between gap-6">
        {!existingBill && (
          <div className="space-y-4 md:w-1/2">
            <h3 className="font-medium">Payment Information</h3>
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700">Discount</label>
              <Input
                type="number"
                min="0"
                value={discount.toString()}
                onChange={(e) => setDiscount(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700">Payment Method</label>
              <Select 
                value={paymentMethod} 
                onValueChange={setPaymentMethod}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Credit/Debit Card</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="wallet">Digital Wallet</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        
        <div className={`space-y-2 ${!existingBill ? 'md:w-1/2' : 'w-full'}`}>
          <div className="flex justify-between py-2 text-sm">
            <span className="text-neutral-600">Subtotal</span>
            <span className="font-medium">₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-2 text-sm">
            <span className="text-neutral-600">Tax (5%)</span>
            <span className="font-medium">₹{taxAmount.toFixed(2)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between py-2 text-sm">
              <span className="text-neutral-600">Discount</span>
              <span className="font-medium text-error-600">-₹{discount.toFixed(2)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between py-2">
            <span className="font-semibold">Total</span>
            <span className="font-bold text-lg">₹{total.toFixed(2)}</span>
          </div>
          
          {existingBill ? (
            <div className="pt-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-neutral-600">Bill Number</span>
                <span className="font-medium">#{existingBill.billNumber}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-neutral-600">Payment Method</span>
                <span className="font-medium capitalize">{existingBill.paymentMethod || "Not specified"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">Payment Status</span>
                <span className={`font-medium capitalize ${
                  existingBill.paymentStatus === "paid" ? "text-secondary-600" : "text-warning-600"
                }`}>
                  {existingBill.paymentStatus}
                </span>
              </div>
              
              <Button 
                variant="default" 
                size="lg" 
                className="w-full mt-6"
                disabled={existingBill.paymentStatus === "paid" || markAsPaidMutation.isPending}
                onClick={() => handleMarkAsPaid(existingBill.id)}
              >
                <Send className="h-4 w-4 mr-2" />
                {existingBill.paymentStatus === "paid" 
                  ? "Already Paid" 
                  : markAsPaidMutation.isPending 
                    ? "Processing..." 
                    : "Mark as Paid"
                }
              </Button>
            </div>
          ) : (
            <Button 
              variant="default" 
              size="lg" 
              className="w-full mt-6" 
              onClick={handleGenerateBill}
              disabled={createBillMutation.isPending}
            >
              {createBillMutation.isPending ? "Generating..." : "Generate Bill"}
            </Button>
          )}
          
          {existingBill && (
            <div className="flex justify-center mt-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  // Format a WhatsApp message with bill details
                  const message = `Thank you for dining with us!\n\n` +
                    `Bill #${existingBill.billNumber}\n` +
                    `Order #${order.orderNumber}\n` +
                    `Date: ${format(new Date(existingBill.createdAt || new Date()), 'PPp')}\n\n` +
                    `Total Amount: ₹${existingBill.total.toFixed(2)}\n\n` +
                    `We hope to serve you again soon!`;
                  
                  // Create WhatsApp URL with encoded message
                  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
                  
                  // Open WhatsApp in a new window
                  window.open(whatsappUrl, '_blank');
                }}
              >
                Share via WhatsApp
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
