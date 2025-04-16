import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BillDetails } from "@/components/billing/BillDetails";
import { Order, Bill } from "@shared/schema";
import { 
  Search, 
  ReceiptText, 
  Clock,
  CheckCircle,
  Printer,
  Download,
  ClipboardList,
  BarChart3,
  DollarSign,
  ArrowRight
} from "lucide-react";
import { Tabs as TabsComponent, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { SingleOrderDialog } from "@/components/orders/SingleOrderDialog";

export default function Billing() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [singleOrderOpen, setSingleOrderOpen] = useState(false);

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
    <div className="container mx-auto px-4 py-6">
      <TabsComponent defaultValue="board">
        <div className="flex items-center justify-between mb-6">
          <TabsList>
            <TabsTrigger value="board" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <ClipboardList className="h-4 w-4 mr-2" />
              Billing Dashboard
            </TabsTrigger>
            <TabsTrigger value="stats" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BarChart3 className="h-4 w-4 mr-2" />
              Billing Stats
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-3">
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => setSingleOrderOpen(true)}
              className="bg-gradient-to-r from-purple-500 to-purple-700 text-white hover:from-purple-600 hover:to-purple-800"
            >
              <ReceiptText className="h-4 w-4 mr-1" />
              <span>Create Order</span>
            </Button>
            
            {/* Single Order Dialog */}
            <SingleOrderDialog 
              open={singleOrderOpen} 
              onClose={() => setSingleOrderOpen(false)} 
            />

            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by order # or table..."
                className="pl-10 w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <TabsContent value="board" className="space-y-6 mt-2">
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px] bg-gradient-to-r from-purple-500 to-purple-700 rounded-lg text-white p-4 shadow-md">
              <h3 className="text-lg font-semibold mb-1">Pending Bills</h3>
              <p className="text-3xl font-bold">{pendingBillCount}</p>
            </div>
            <div className="flex-1 min-w-[200px] bg-gradient-to-r from-gray-600 to-gray-800 rounded-lg text-white p-4 shadow-md">
              <h3 className="text-lg font-semibold mb-1">Billed</h3>
              <p className="text-3xl font-bold">{billedCount}</p>
            </div>
            <div className="flex-1 min-w-[200px] bg-gradient-to-r from-green-500 to-green-700 rounded-lg text-white p-4 shadow-md">
              <h3 className="text-lg font-semibold mb-1">Total Revenue</h3>
              <p className="text-3xl font-bold">₹{bills.reduce((acc, bill) => acc + (bill.total || 0), 0).toLocaleString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle>Billable Orders</CardTitle>
                <p className="text-sm text-muted-foreground">Select an order to generate a bill</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">                  
                  {isLoading ? (
                    <p className="text-center py-8 text-muted-foreground">Loading orders...</p>
                  ) : completedOrders && completedOrders.length > 0 ? (
                    <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
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
                            className={`p-3 border rounded-md cursor-pointer transition-colors ${
                              selectedOrderId === order.id 
                                ? "border-primary border-2" 
                                : cardClass
                            }`}
                          >
                            <div className="flex justify-between">
                              <div>
                                <h3 className="font-medium">#{order.orderNumber}</h3>
                                <p className="text-sm text-muted-foreground">{order.tableNumber || "Takeaway"}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">₹{order.totalAmount?.toLocaleString() || 'NaN'}</p>
                                <p className="text-xs text-muted-foreground">
                                  {order.createdAt ? format(new Date(order.createdAt), "HH:mm") : ""}
                                </p>
                              </div>
                            </div>
                            {hasBill && (
                              <Badge className="mt-2 bg-gray-600">Already Billed</Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">
                      {searchTerm ? "No matching orders found" : "No billable orders available"}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle>Bill Details</CardTitle>
                <p className="text-sm text-muted-foreground">Generate and print bills</p>
              </CardHeader>
              <CardContent>
                {selectedOrderId ? (
                  <BillDetails orderId={selectedOrderId} />
                ) : (
                  <div className="text-center py-20 text-muted-foreground">
                    <ReceiptText className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium mb-2">No order selected</p>
                    <p className="text-sm">Select an order from the list to view bill details</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="stats" className="space-y-6 mt-2">
          <Card>
            <CardHeader>
              <CardTitle>Billing Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-r from-purple-500 to-purple-700 p-4 rounded-lg text-white">
                  <h3 className="text-xl font-bold">Today's Bills</h3>
                  <p className="text-3xl font-bold mt-2">{billedCount}</p>
                </div>
                <div className="bg-gradient-to-r from-green-500 to-green-700 p-4 rounded-lg text-white">
                  <h3 className="text-xl font-bold">Total Revenue</h3>
                  <p className="text-3xl font-bold mt-2">₹{bills.reduce((acc, bill) => acc + (bill.total || 0), 0).toLocaleString()}</p>
                </div>
                <div className="bg-gradient-to-r from-blue-500 to-blue-700 p-4 rounded-lg text-white">
                  <h3 className="text-xl font-bold">Pending Bills</h3>
                  <p className="text-3xl font-bold mt-2">{pendingBillCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </TabsComponent>
    </div>
  );
}
