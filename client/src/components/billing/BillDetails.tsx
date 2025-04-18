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
import { ChevronLeft, ChevronRight, File, Send, Printer } from "lucide-react";
import { format } from "date-fns";

interface BillDetailsProps {
  orderId: number;
}

export function BillDetails({ orderId }: BillDetailsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10; // Show 10 items per page

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
            ${orderItems.length > 20 ? `
              <tr>
                <td colspan="4" class="align-center">
                  <p style="text-align: center; color: #666; font-style: italic; padding: 8px 0;">
                    * This order contains ${orderItems.length} items in total *
                  </p>
                </td>
              </tr>
            ` : ''}
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
    <div className="space-y-4 p-2">
      {/* Simple Header with Minimal Order Info */}
      <div className="flex flex-col gap-2 bg-purple-900 p-4 rounded-lg shadow-sm text-white">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Order #{order.orderNumber}</h2>
          <Badge variant={existingBill ? "secondary" : "outline"} className={existingBill ? "bg-purple-600 text-white hover:bg-purple-600" : "border-white text-white"}>
            {existingBill ? "Billed" : "Unbilled"}
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-sm text-purple-200">
          <span>{order.tableNumber || "Takeaway"}</span>
          <span>
            {order.createdAt 
              ? typeof order.createdAt === 'string'
                ? format(new Date(order.createdAt), "PPp")
                : format(new Date(), "PPp")
              : ""
            }
          </span>
          {existingBill && <span>Bill #{existingBill.billNumber}</span>}
        </div>
      </div>
      
      {/* Simplified Order Items Table */}
      <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
        <h3 className="bg-purple-900 px-4 py-3 text-white font-medium">Order Items</h3>
        <table className="min-w-full">
          <thead className="bg-gray-800">
            <tr>
              <th className="px-4 py-2 text-left text-xs text-gray-300">Item</th>
              <th className="px-4 py-2 text-right text-xs text-gray-300">Price</th>
              <th className="px-4 py-2 text-right text-xs text-gray-300">Qty</th>
              <th className="px-4 py-2 text-right text-xs text-gray-300">Total</th>
            </tr>
          </thead>
          <tbody>
            {orderItems && orderItems.length > 0 ? (
              orderItems
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((item: OrderItem) => (
                  <tr key={item.id} className="border-t border-gray-700">
                    <td className="px-4 py-2 text-sm text-gray-200">
                      {getItemName(item.menuItemId)}
                      {item.notes && <p className="text-xs text-gray-400">{item.notes}</p>}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-300 text-right">₹{item.price}</td>
                    <td className="px-4 py-2 text-sm text-gray-300 text-right">{item.quantity}</td>
                    <td className="px-4 py-2 text-sm text-purple-300 text-right">₹{(item.price * item.quantity).toFixed(2)}</td>
                  </tr>
                ))
            ) : (
              <tr className="border-t border-gray-700">
                <td colSpan={4} className="px-4 py-3 text-sm text-center text-gray-400">No items in this order</td>
              </tr>
            )}
          </tbody>
          {orderItems.length > itemsPerPage && (
            <tfoot className="bg-gray-800 border-t border-gray-700">
              <tr>
                <td colSpan={4} className="px-4 py-2">
                  <div className="flex items-center justify-between text-gray-300 text-sm">
                    <div>
                      Showing {Math.min(itemsPerPage, orderItems.length - (currentPage - 1) * itemsPerPage)} of {orderItems.length} items
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 w-8 p-0 border-gray-600 bg-gray-700 hover:bg-gray-600 text-white"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <span className="sr-only">Previous page</span>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span>Page {currentPage} of {Math.ceil(orderItems.length / itemsPerPage)}</span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 w-8 p-0 border-gray-600 bg-gray-700 hover:bg-gray-600 text-white"
                        onClick={() => setCurrentPage(p => Math.min(Math.ceil(orderItems.length / itemsPerPage), p + 1))}
                        disabled={currentPage >= Math.ceil(orderItems.length / itemsPerPage)}
                      >
                        <span className="sr-only">Next page</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      
      {/* Simplified Payment and Summary Section */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Payment Info (When Creating Bill) */}
        {!existingBill && (
          <div className="md:w-1/2 bg-gray-900 p-4 rounded-lg border border-gray-700">
            <h3 className="text-purple-300 font-medium mb-3">Payment Information</h3>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-300 mb-1 block">Discount Amount</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                    <span className="text-gray-400">₹</span>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    value={discount.toString()}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="bg-gray-800 border-gray-700 text-white pl-7"
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm text-gray-300 mb-1 block">Payment Method</label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white w-full">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-white">
                    <SelectItem value="cash" className="text-white">Cash</SelectItem>
                    <SelectItem value="card" className="text-white">Credit/Debit Card</SelectItem>
                    <SelectItem value="upi" className="text-white">UPI</SelectItem>
                    <SelectItem value="wallet" className="text-white">Digital Wallet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
        
        {/* Bill Summary */}
        <div className={`${!existingBill ? 'md:w-1/2' : 'w-full'} bg-gray-900 p-4 rounded-lg border border-gray-700`}>
          <h3 className="text-purple-300 font-medium mb-3">Bill Summary</h3>
          
          <div className="space-y-2 mb-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-300">Subtotal</span>
              <span className="text-gray-200">₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-300">Tax (5%)</span>
              <span className="text-gray-200">₹{taxAmount.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Discount</span>
                <span className="text-red-400">-₹{discount.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-gray-700 pt-2 mt-2"></div>
            <div className="flex justify-between">
              <span className="font-medium text-white">Total Amount</span>
              <span className="font-bold text-lg text-white">₹{total.toFixed(2)}</span>
            </div>
          </div>
          
          {existingBill ? (
            <div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-800 p-3 rounded">
                  <p className="text-xs text-gray-400 mb-1">Payment Method</p>
                  <p className="font-medium text-sm text-purple-300">{existingBill.paymentMethod || "Not specified"}</p>
                </div>
                <div className="bg-gray-800 p-3 rounded">
                  <p className="text-xs text-gray-400 mb-1">Payment Status</p>
                  <p className={`font-medium text-sm ${
                    existingBill.paymentStatus === "paid" ? "text-green-400" : "text-amber-400"
                  }`}>
                    {existingBill.paymentStatus}
                  </p>
                </div>
              </div>
              
              <Button 
                variant="default" 
                size="lg" 
                className="w-full bg-purple-700 hover:bg-purple-600 text-white" 
                disabled={existingBill.paymentStatus === "paid" || markAsPaidMutation.isPending}
                onClick={() => handleMarkAsPaid(existingBill.id)}
              >
                {existingBill.paymentStatus === "paid" 
                  ? "Already Paid" 
                  : markAsPaidMutation.isPending 
                    ? "Processing..." 
                    : "Mark as Paid"
                }
              </Button>
              
              <div className="flex justify-center mt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-purple-500 text-purple-300 hover:bg-purple-900/50"
                  onClick={() => {
                    const message = `Thank you for dining with us!\nBill #${existingBill.billNumber}\nOrder #${order.orderNumber}\nTotal: ₹${existingBill.total.toFixed(2)}`;
                    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
                    window.open(whatsappUrl, '_blank');
                  }}
                >
                  Share via WhatsApp
                </Button>
              </div>
            </div>
          ) : (
            <Button 
              variant="default" 
              size="lg" 
              className="w-full bg-purple-700 hover:bg-purple-600 text-white" 
              onClick={handleGenerateBill}
              disabled={createBillMutation.isPending}
            >
              {createBillMutation.isPending ? "Generating..." : "Generate Bill"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
