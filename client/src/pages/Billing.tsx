import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BillDetails } from "@/components/billing/BillDetails";
import { Order, Bill } from "@shared/schema";
import { 
  Search, 
  ReceiptText, 
  ClipboardList,
  BarChart3
} from "lucide-react";
import { Tabs as TabsComponent, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function Billing() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });

  const { data: bills = [] } = useQuery<Bill[]>({
    queryKey: ['/api/bills'],
  });

  const filteredOrders = orders?.filter(order => 
    order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.tableNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const completedOrders = filteredOrders?.filter(order => 
    order.status === "completed" || order.status === "ready"
  );

  // Count bills by status
  const billedCount = bills.length;
  const pendingBillCount = completedOrders?.length || 0;
  
  return (
    <div className="container mx-auto p-2 sm:p-4 h-screen flex flex-col">
      <TabsComponent defaultValue="board" className="flex flex-col h-full">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
          <TabsList className="mb-2 md:mb-0">
            <TabsTrigger value="board" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <ClipboardList className="h-4 w-4 mr-2" />
              Billing Dashboard
            </TabsTrigger>
            <TabsTrigger value="stats" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BarChart3 className="h-4 w-4 mr-2" />
              Billing Stats
            </TabsTrigger>
          </TabsList>

          <div className="relative w-full md:w-auto">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by order # or table..."
              className="pl-10 w-full md:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <TabsContent value="board" className="flex flex-col h-full space-y-3 pt-1 overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-shrink-0">
            <Card className="bg-gradient-to-r from-purple-500 to-purple-700 text-white border-0 shadow">
              <CardContent className="p-3">
                <h3 className="text-base font-semibold">Pending Bills</h3>
                <p className="text-2xl font-bold">{pendingBillCount}</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-gray-600 to-gray-800 text-white border-0 shadow">
              <CardContent className="p-3">
                <h3 className="text-base font-semibold">Billed</h3>
                <p className="text-2xl font-bold">{billedCount}</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-green-500 to-green-700 text-white border-0 shadow">
              <CardContent className="p-3">
                <h3 className="text-base font-semibold">Total Revenue</h3>
                <p className="text-2xl font-bold">₹{bills.reduce((acc, bill) => acc + (bill.total || 0), 0).toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-grow overflow-hidden">
            <Card className="lg:col-span-1 flex flex-col border shadow overflow-hidden">
              <CardHeader className="bg-muted/40 py-2 px-4 flex-shrink-0">
                <CardTitle className="text-lg font-bold text-primary">Billable Orders</CardTitle>
                <p className="text-xs text-muted-foreground">Select an order to generate a bill</p>
              </CardHeader>
              
              <CardContent className="p-3 flex-grow overflow-hidden">
                {isLoading ? (
                  <p className="text-center py-4 text-muted-foreground text-sm">Loading orders...</p>
                ) : completedOrders && completedOrders.length > 0 ? (
                  <div className="space-y-2 h-full overflow-y-auto pr-1">
                    {completedOrders.map(order => {
                      // Check if order already has a bill
                      const hasBill = bills.some(bill => bill.orderId === order.id);
                      const cardClass = hasBill 
                        ? "bg-gray-100 border-gray-300" 
                        : "bg-green-50 border-green-200 hover:border-green-300";
                      
                      return (
                        <div 
                          key={order.id}
                          onClick={() => setSelectedOrderId(order.id)}
                          className={`p-3 border rounded cursor-pointer transition-colors ${
                            selectedOrderId === order.id 
                              ? "border-primary border-2" 
                              : cardClass
                          }`}
                        >
                          <div className="flex justify-between">
                            <div>
                              <h3 className="font-medium text-base">#{order.orderNumber}</h3>
                              <p className="text-xs text-muted-foreground mt-0.5">{order.tableNumber || "Takeaway"}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-sm">₹{order.totalAmount?.toLocaleString() || '0'}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {order.createdAt ? format(new Date(order.createdAt), "HH:mm") : ""}
                              </p>
                            </div>
                          </div>
                          {hasBill && (
                            <Badge className="mt-1 bg-gray-600 text-xs">Already Billed</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center py-4 text-muted-foreground text-sm">
                    {searchTerm ? "No matching orders found" : "No billable orders available"}
                  </p>
                )}
              </CardContent>
            </Card>
            
            <Card className="lg:col-span-2 flex flex-col border shadow overflow-hidden">
              <CardHeader className="bg-muted/40 py-2 px-4 flex-shrink-0">
                <CardTitle className="text-lg font-bold text-primary">Bill Details</CardTitle>
                <p className="text-xs text-muted-foreground">Generate and print bills</p>
              </CardHeader>
              
              <CardContent className="p-3 flex-grow overflow-auto">
                {selectedOrderId ? (
                  <BillDetails orderId={selectedOrderId} />
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <ReceiptText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-base font-medium mb-1">No order selected</p>
                    <p className="text-sm">Select an order from the list to view bill details</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="stats" className="flex-grow h-full overflow-auto">
          <Card className="border shadow h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-bold text-primary">Billing Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-r from-purple-500 to-purple-700 p-4 rounded-md text-white">
                  <h3 className="text-lg font-bold">Today's Bills</h3>
                  <p className="text-2xl font-bold mt-2">{billedCount}</p>
                </div>
                <div className="bg-gradient-to-r from-green-500 to-green-700 p-4 rounded-md text-white">
                  <h3 className="text-lg font-bold">Total Revenue</h3>
                  <p className="text-2xl font-bold mt-2">₹{bills.reduce((acc, bill) => acc + (bill.total || 0), 0).toLocaleString()}</p>
                </div>
                <div className="bg-gradient-to-r from-blue-500 to-blue-700 p-4 rounded-md text-white">
                  <h3 className="text-lg font-bold">Pending Bills</h3>
                  <p className="text-2xl font-bold mt-2">{pendingBillCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </TabsComponent>
    </div>
  );
}
