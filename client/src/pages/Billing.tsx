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
  BarChart3,
  X
} from "lucide-react";
import { Tabs as TabsComponent, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function Billing() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [billDialogOpen, setBillDialogOpen] = useState(false);

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
  
  // Function to handle order click
  const handleOrderClick = (orderId: number) => {
    setSelectedOrderId(orderId);
    setBillDialogOpen(true);
  };

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

        <TabsContent value="board" className="flex flex-col h-full pt-1 overflow-hidden">
          <Card className="flex flex-col border shadow overflow-hidden h-full">
            <CardHeader className="bg-muted/40 py-2 px-4 flex-shrink-0">
              <CardTitle className="text-lg font-bold text-primary">Billable Orders</CardTitle>
              <p className="text-xs text-muted-foreground">Click on an order to view and print bill</p>
            </CardHeader>
            
            <CardContent className="p-3 flex-grow overflow-hidden">
              {isLoading ? (
                <p className="text-center py-4 text-muted-foreground text-sm">Loading orders...</p>
              ) : completedOrders && completedOrders.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 h-full overflow-y-auto p-1">
                  {completedOrders.map(order => {
                    // Check if order already has a bill
                    const hasBill = bills.some(bill => bill.orderId === order.id);
                    const cardClass = hasBill 
                      ? "bg-gray-100 border-gray-300" 
                      : "bg-green-50 border-green-200 hover:border-green-300";
                    
                    return (
                      <div 
                        key={order.id}
                        onClick={() => handleOrderClick(order.id)}
                        className={`p-3 border rounded cursor-pointer transition-colors hover:shadow-md ${cardClass}`}
                      >
                        <div className="flex justify-between mb-2">
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
                        <div className="flex justify-between items-center">
                          {hasBill && (
                            <Badge className="bg-gray-600 text-xs">Already Billed</Badge>
                          )}
                          {!hasBill && (
                            <Badge className="bg-green-600 text-xs">Ready to Bill</Badge>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-xs h-6 px-2 ml-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOrderClick(order.id);
                            }}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <ReceiptText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-base font-medium mb-1">
                    {searchTerm ? "No matching orders found" : "No billable orders available"}
                  </p>
                  <p className="text-sm">
                    {searchTerm 
                      ? "Try using a different search term" 
                      : "Orders with 'completed' or 'ready' status will appear here"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Bill Details Dialog */}
        <Dialog open={billDialogOpen} onOpenChange={setBillDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="flex flex-row items-center justify-between">
              <DialogTitle className="text-xl font-bold text-primary">Bill Details</DialogTitle>
              <DialogClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </DialogHeader>
            {selectedOrderId ? (
              <BillDetails orderId={selectedOrderId} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No order selected</p>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <TabsContent value="stats" className="flex-grow h-full overflow-auto">
          <div className="space-y-4 p-1">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-r from-purple-500 to-purple-700 text-white border-0 shadow">
                <CardContent className="p-4">
                  <h3 className="text-lg font-bold">Today's Bills</h3>
                  <p className="text-3xl font-bold mt-2">{billedCount}</p>
                  <p className="text-sm mt-2 opacity-80">Total bills generated today</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-r from-green-500 to-green-700 text-white border-0 shadow">
                <CardContent className="p-4">
                  <h3 className="text-lg font-bold">Total Revenue</h3>
                  <p className="text-3xl font-bold mt-2">₹{bills.reduce((acc, bill) => acc + (bill.total || 0), 0).toLocaleString()}</p>
                  <p className="text-sm mt-2 opacity-80">Total earnings from all bills</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-r from-blue-500 to-blue-700 text-white border-0 shadow">
                <CardContent className="p-4">
                  <h3 className="text-lg font-bold">Pending Bills</h3>
                  <p className="text-3xl font-bold mt-2">{pendingBillCount}</p>
                  <p className="text-sm mt-2 opacity-80">Orders ready to be billed</p>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-bold text-primary">Average Bill Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-600">
                      ₹{bills.length > 0 
                        ? Math.round(bills.reduce((acc, bill) => acc + (bill.total || 0), 0) / bills.length).toLocaleString() 
                        : 0}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">Average amount per bill</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-bold text-primary">Billing Conversion</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-blue-600">
                      {orders && orders.length > 0 
                        ? Math.round((bills.length / orders.length) * 100)
                        : 0}%
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">Orders converted to bills</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </TabsComponent>
    </div>
  );
}
