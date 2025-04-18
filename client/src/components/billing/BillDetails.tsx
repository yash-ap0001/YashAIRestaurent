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
    <div className="space-y-4 p-2">
      {/* Header with order info and action buttons */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-primary">Order #{order.orderNumber}</h2>
            <Badge variant={existingBill ? "secondary" : "outline"} className={existingBill ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}>
              {existingBill ? "Billed" : "Unbilled"}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-1 text-sm text-neutral-600">
            <span className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V5zm1 0v10h12V5H4z" clipRule="evenodd"/>
                <path fillRule="evenodd" d="M7 8a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd"/>
                <path fillRule="evenodd" d="M7 12a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd"/>
              </svg>
              {order.tableNumber || "Takeaway"}
            </span>
            <span className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
              </svg>
              {order.createdAt 
                ? typeof order.createdAt === 'string'
                  ? format(new Date(order.createdAt), "PPp")
                  : format(new Date(), "PPp")
                : ""
              }
            </span>
          </div>
          {existingBill && (
            <div className="mt-1 text-sm">
              <span className="text-primary font-medium">Bill #{existingBill.billNumber}</span>
            </div>
          )}
        </div>
        
        <div className="flex gap-2 self-end md:self-start">
          {existingBill && (
            <>
              <Button 
                variant="outline" 
                size="sm"
                className="bg-white border-primary text-primary hover:bg-primary/10"
                onClick={() => downloadPdf(existingBill.id)}
              >
                <File className="h-4 w-4 mr-1" />
                Download PDF
              </Button>
              <Button 
                size="sm"
                className="bg-primary hover:bg-primary/90"
                onClick={handlePrint}
              >
                <Printer className="h-4 w-4 mr-1" />
                Print
              </Button>
            </>
          )}
        </div>
      </div>
      
      {/* Order Items Table */}
      <div className="rounded-lg overflow-hidden border shadow-sm">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 border-b">
          <h3 className="font-medium text-gray-800">Order Items</h3>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Item
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Qty
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orderItems && orderItems.length > 0 ? (
              orderItems.map((item: OrderItem) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-800">
                    {getItemName(item.menuItemId)}
                    {item.notes && (
                      <p className="text-xs text-gray-500 mt-1">{item.notes}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-right">
                    ₹{item.price.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-right">
                    {item.quantity}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-800 text-right">
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-sm text-center text-gray-500">
                  <div className="flex flex-col items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    No items in this order
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Payment Information and Summary */}
      <div className="flex flex-col md:flex-row md:justify-between gap-6">
        {!existingBill && (
          <div className="space-y-4 md:w-1/2 bg-white p-4 rounded-lg border shadow-sm">
            <h3 className="font-medium text-primary border-b pb-2">Payment Information</h3>
            
            <div className="space-y-4">
              <div className="relative">
                <label className="text-sm font-medium text-gray-700 flex items-center mb-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                  </svg>
                  Discount Amount
                </label>
                <div className="relative mt-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">₹</span>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    value={discount.toString()}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="border-gray-300 focus:border-primary focus:ring-primary pl-7"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Enter discount amount (if applicable)</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center mb-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                    <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                  </svg>
                  Payment Method
                </label>
                <Select 
                  value={paymentMethod} 
                  onValueChange={setPaymentMethod}
                >
                  <SelectTrigger className="border-gray-300 focus:border-primary w-full">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-1">
                      <SelectItem value="cash" className="cursor-pointer rounded-md flex items-center gap-2 p-2 hover:bg-gray-100">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                        </svg>
                        Cash
                      </SelectItem>
                      <SelectItem value="card" className="cursor-pointer rounded-md flex items-center gap-2 p-2 hover:bg-gray-100">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                          <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                        </svg>
                        Credit/Debit Card
                      </SelectItem>
                      <SelectItem value="upi" className="cursor-pointer rounded-md flex items-center gap-2 p-2 hover:bg-gray-100">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
                        </svg>
                        UPI
                      </SelectItem>
                      <SelectItem value="wallet" className="cursor-pointer rounded-md flex items-center gap-2 p-2 hover:bg-gray-100">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-orange-600" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                        </svg>
                        Digital Wallet
                      </SelectItem>
                    </div>
                  </SelectContent>
                </Select>
              </div>
                
              <div className="bg-blue-50 rounded-md p-2.5 mt-2">
                <div className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mt-0.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-blue-700">
                    Click the "Generate Bill" button below to finalize this order and create a bill with the specified payment details.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className={`${!existingBill ? 'md:w-1/2' : 'w-full'} bg-white p-4 rounded-lg border shadow-sm`}>
          <h3 className="font-medium text-primary border-b pb-2 mb-3 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm4.707 3.707a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L8.414 9H10a3 3 0 013 3v1a1 1 0 102 0v-1a5 5 0 00-5-5H8.414l1.293-1.293z" clipRule="evenodd" />
            </svg>
            Bill Summary
          </h3>
          
          <div className="bg-gray-50 rounded-lg p-3 space-y-2 mb-3">
            <div className="flex justify-between py-1 text-sm items-center">
              <span className="text-gray-600 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                  <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                </svg>
                Subtotal
              </span>
              <span className="font-medium">₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1 text-sm items-center">
              <span className="text-gray-600 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                Tax (5%)
              </span>
              <span className="font-medium">₹{taxAmount.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between py-1 text-sm items-center">
                <span className="text-gray-600 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm2.5 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm4.5 4a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm-3-1a1 1 0 11-2 0 1 1 0 012 0zm7 1a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" clipRule="evenodd" />
                  </svg>
                  Discount
                </span>
                <span className="font-medium text-red-600">-₹{discount.toFixed(2)}</span>
              </div>
            )}
          </div>
          
          <div className="flex justify-between py-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3">
            <span className="font-semibold flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              Total Amount
            </span>
            <span className="font-bold text-lg text-primary">₹{total.toFixed(2)}</span>
          </div>
          
          {existingBill ? (
            <div className="pt-4 mt-2 border-t border-dashed border-gray-200">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs text-gray-500 mb-1">Payment Method</p>
                  <p className="font-medium capitalize text-sm">{existingBill.paymentMethod || "Not specified"}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs text-gray-500 mb-1">Payment Status</p>
                  <p className={`font-medium capitalize text-sm ${
                    existingBill.paymentStatus === "paid" ? "text-green-600" : "text-amber-600"
                  }`}>
                    {existingBill.paymentStatus}
                  </p>
                </div>
              </div>
              
              <Button 
                variant="default" 
                size="lg" 
                className={`w-full mt-2 ${existingBill.paymentStatus === "paid" 
                  ? "bg-green-600 hover:bg-green-700" 
                  : "bg-primary hover:bg-primary/90"}`}
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
              
              <div className="flex justify-center mt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-green-600 border-green-600 hover:bg-green-50"
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
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-whatsapp mr-2" viewBox="0 0 16 16">
                    <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/>
                  </svg>
                  Share via WhatsApp
                </Button>
              </div>
            </div>
          ) : (
            <Button 
              variant="default" 
              size="lg" 
              className="w-full mt-6 bg-primary hover:bg-primary/90" 
              onClick={handleGenerateBill}
              disabled={createBillMutation.isPending}
            >
              {createBillMutation.isPending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : (
                <>Generate Bill</>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
