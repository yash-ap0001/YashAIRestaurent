import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  BarChart3, PieChart, LineChart, Download, Calendar, RotateCw, Filter, 
  ArrowDownRight, ArrowUpRight, Utensils, Tag, Clock, Users, BanknoteIcon,
  AreaChart
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay, addDays, isSameDay, eachDayOfInterval } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Area,
  AreaChart as RechartsAreaChart,
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Helper function to generate date ranges for filters
function getDateRange(range: string): { startDate: Date; endDate: Date } {
  const endDate = endOfDay(new Date());
  let startDate;

  switch (range) {
    case "today":
      startDate = startOfDay(new Date());
      break;
    case "yesterday":
      startDate = startOfDay(subDays(new Date(), 1));
      break;
    case "7days":
      startDate = startOfDay(subDays(new Date(), 6));
      break;
    case "30days":
      startDate = startOfDay(subDays(new Date(), 29));
      break;
    case "90days":
      startDate = startOfDay(subDays(new Date(), 89));
      break;
    default:
      startDate = startOfDay(subDays(new Date(), 6)); // Default to 7 days
  }

  return { startDate, endDate };
}

// Helper function to generate dummy data for charts
// Main Reports component
export default function Reports() {
  const [dateRange, setDateRange] = useState<string>("7days");
  const [reportType, setReportType] = useState<string>("sales");
  
  // Fetch dashboard stats to sync with reports
  const { data: dashboardStats, isLoading: dashboardLoading } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    refetchInterval: 5000, // Sync with dashboard every 5 seconds
  });
  
  // Fetch reports data
  const { data: reportData, isLoading: reportsLoading, refetch } = useQuery({
    queryKey: ['/api/reports', reportType, dateRange],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/reports?type=${reportType}&range=${dateRange}`);
        if (!response.ok) {
          throw new Error("Failed to fetch report data");
        }
        return await response.json();
      } catch (error) {
        console.error("Error fetching report data:", error);
        // If API fails, generate data based on dashboard stats
        if (dashboardStats) {
          return generateDataFromDashboardStats(getDateRange(dateRange), reportType, dashboardStats);
        }
        return [];
      }
    },
    enabled: !dashboardLoading,
  });
  
  // Generate data from dashboard stats if API isn't available yet
  function generateDataFromDashboardStats(
    dateRange: { startDate: Date; endDate: Date }, 
    dataType: string, 
    stats: any
  ) {
    const { startDate, endDate } = dateRange;
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    if (dataType === 'sales') {
      // Use today's sales from dashboard stats as a baseline
      const todaysSales = stats.todaysSales || 0;
      const averageOrderValue = todaysSales / (stats.ordersCount || 1);
      
      return days.map((day, index) => {
        // Create a realistic pattern with gradual increase/decrease
        const modifier = isSameDay(day, new Date()) ? 1 : 0.7 + (Math.sin(index * 0.5) * 0.3);
        const value = Math.floor(todaysSales * modifier);
        const orders = Math.floor(value / averageOrderValue);
        
        return {
          date: format(day, 'MMM dd'),
          value: value,
          orders: orders,
        };
      });
    }
    
    if (dataType === 'categories') {
      const categories = [
        'Main Course',
        'Starters',
        'Desserts',
        'Beverages',
        'Sides'
      ];
      
      // Distribute today's sales across categories
      const totalSales = stats.todaysSales || 5000;
      const distribution = [0.4, 0.2, 0.15, 0.15, 0.1]; // 40%, 20%, 15%, 15%, 10%
      
      return categories.map((name, index) => ({
        name,
        value: Math.floor(totalSales * distribution[index]),
      }));
    }
    
    if (dataType === 'timeDistribution') {
      return [
        { name: 'Breakfast (7-11 AM)', value: 20 },
        { name: 'Lunch (11 AM-3 PM)', value: 35 },
        { name: 'Snacks (3-6 PM)', value: 15 },
        { name: 'Dinner (6-11 PM)', value: 30 },
      ];
    }
    
    if (dataType === 'popular') {
      return [
        { name: 'Butter Chicken', value: 42 },
        { name: 'Garlic Naan', value: 38 },
        { name: 'Paneer Tikka', value: 34 },
        { name: 'Dal Makhani', value: 30 },
        { name: 'Chicken Biryani', value: 26 },
      ];
    }

    return [];
  }

  // Calculate actual date range based on selection
  const selectedDateRange = getDateRange(dateRange);

  // For backwards compatibility until we have real API data
  const sampleSalesData = !reportData ? [] : reportData.type === 'sales' ? reportData : 
    generateDataFromDashboardStats(selectedDateRange, 'sales', dashboardStats || {});
  
  const sampleCategoryData = !reportData ? [] : reportData.type === 'categories' ? reportData :
    generateDataFromDashboardStats(selectedDateRange, 'categories', dashboardStats || {});
  
  const sampleTimeData = !reportData ? [] : reportData.type === 'timeDistribution' ? reportData :
    generateDataFromDashboardStats(selectedDateRange, 'timeDistribution', dashboardStats || {});
  
  const samplePopularData = !reportData ? [] : reportData.type === 'popular' ? reportData :
    generateDataFromDashboardStats(selectedDateRange, 'popular', dashboardStats || {});

  // Calculate summary metrics from sample data
  const totalSales = sampleSalesData.reduce((sum, day) => sum + day.value, 0);
  const totalOrders = sampleSalesData.reduce((sum, day) => sum + day.orders, 0);
  const averageOrderValue = totalSales / totalOrders;
  
  // Calculate growth (comparing to previous period)
  const comparisonPeriodSales = totalSales * 0.9; // Simplified for demo
  const salesGrowth = (totalSales - comparisonPeriodSales) / comparisonPeriodSales * 100;

  // Pie chart colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Business Analytics</h1>
          <p className="text-neutral-400">
            Track your restaurant's performance metrics and insights
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export Reports
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => refetch()}>
            <RotateCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex gap-2 items-center">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex gap-2 items-center">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Select report type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sales">Revenue & Orders</SelectItem>
              <SelectItem value="items">Menu Performance</SelectItem>
              <SelectItem value="customers">Customer Analytics</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-0.5">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Revenue
              </CardTitle>
              <CardDescription className="text-2xl font-bold">
                ₹{(totalSales).toLocaleString()}
              </CardDescription>
            </div>
            <div className={`p-2 rounded-full ${
              salesGrowth >= 0 
                ? "text-emerald-500 bg-emerald-50/50" 
                : "text-red-500 bg-red-50/50"
            }`}>
              <BanknoteIcon className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center text-sm">
              {salesGrowth >= 0 ? (
                <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500 mr-1" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5 text-red-500 mr-1" />
              )}
              <span className={`${
                salesGrowth >= 0 ? "text-emerald-500" : "text-red-500"
              }`}>
                {Math.abs(salesGrowth).toFixed(1)}%
              </span>
              <span className="text-muted-foreground ml-1">vs previous period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-0.5">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Orders
              </CardTitle>
              <CardDescription className="text-2xl font-bold">
                {totalOrders}
              </CardDescription>
            </div>
            <div className="p-2 rounded-full text-blue-500 bg-blue-50/50">
              <Utensils className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center text-sm">
              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500 mr-1" />
              <span className="text-emerald-500">3.2%</span>
              <span className="text-muted-foreground ml-1">vs previous period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-0.5">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Average Order Value
              </CardTitle>
              <CardDescription className="text-2xl font-bold">
                ₹{averageOrderValue.toFixed(0)}
              </CardDescription>
            </div>
            <div className="p-2 rounded-full text-violet-500 bg-violet-50/50">
              <Tag className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center text-sm">
              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500 mr-1" />
              <span className="text-emerald-500">1.8%</span>
              <span className="text-muted-foreground ml-1">vs previous period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-0.5">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Peak Hour
              </CardTitle>
              <CardDescription className="text-2xl font-bold">
                7:00 PM
              </CardDescription>
            </div>
            <div className="p-2 rounded-full text-amber-500 bg-amber-50/50">
              <Clock className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center text-sm">
              <span className="text-muted-foreground">
                48 orders during peak hour
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="revenue" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="revenue">
            <LineChart className="h-4 w-4 mr-2" />
            Revenue Analytics
          </TabsTrigger>
          <TabsTrigger value="orders">
            <BarChart3 className="h-4 w-4 mr-2" />
            Order Trends
          </TabsTrigger>
          <TabsTrigger value="menu">
            <PieChart className="h-4 w-4 mr-2" />
            Menu Analysis
          </TabsTrigger>
          <TabsTrigger value="customers">
            <Users className="h-4 w-4 mr-2" />
            Customer Insights
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trends</CardTitle>
              <CardDescription>
                Track your revenue performance over time
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsAreaChart data={sampleSalesData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date"
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `₹${value.toLocaleString()}`}
                    />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <Tooltip 
                      formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Revenue']}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorRevenue)" 
                    />
                  </RechartsAreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <div className="flex items-center justify-between w-full">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Total Revenue</span>
                  <span className="text-xl font-bold">₹{totalSales.toLocaleString()}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Average Daily</span>
                  <span className="text-xl font-bold">₹{(totalSales / sampleSalesData.length).toLocaleString()}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Growth Rate</span>
                  <span className={`text-xl font-bold ${salesGrowth >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {salesGrowth >= 0 ? '+' : ''}{salesGrowth.toFixed(1)}%
                  </span>
                </div>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Order Trends</CardTitle>
              <CardDescription>
                Analyze order volume and patterns
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={sampleSalesData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey="date"
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      formatter={(value: any) => [value, 'Orders']}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Bar 
                      dataKey="orders" 
                      fill="#0088FE" 
                      radius={[4, 4, 0, 0]}
                    />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <div className="flex items-center justify-between w-full">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Total Orders</span>
                  <span className="text-xl font-bold">{totalOrders}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Average Daily</span>
                  <span className="text-xl font-bold">{(totalOrders / sampleSalesData.length).toFixed(0)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Time Distribution</span>
                  <div className="flex gap-1 mt-1">
                    {sampleTimeData.map((item, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {item.name.split(' ')[0]}: {item.value}%
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="menu">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Sales by Category</CardTitle>
                <CardDescription>
                  Distribution of revenue across menu categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={sampleCategoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {sampleCategoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Revenue']} />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Top Selling Menu Items</CardTitle>
                <CardDescription>
                  Most popular items ordered by customers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {samplePopularData.map((item, index) => (
                    <div key={index} className="flex items-center">
                      <div className="h-9 w-9 flex items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                        {index + 1}
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="font-medium">{item.name}</span>
                          <span className="font-semibold">{item.value} orders</span>
                        </div>
                        <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-primary h-full rounded-full" 
                            style={{ 
                              width: `${(item.value / samplePopularData[0].value) * 100}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="border-t px-6 py-4">
                <Button variant="outline" className="w-full">
                  View All Menu Items
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="customers">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer Growth</CardTitle>
                <CardDescription>
                  New and returning customer trends
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart data={sampleSalesData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis 
                        dataKey="date"
                        stroke="#888888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#888888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="orders"
                        name="New Customers" 
                        stroke="#00C49F" 
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        name="Returning Customers" 
                        stroke="#8884d8" 
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        // For demo, we use the same data but at 70% value
                        dataKey={(data) => Math.floor(data.orders * 0.7)}
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Customer Insights</CardTitle>
                <CardDescription>
                  Key customer metrics and engagement data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">
                        Total Customers
                      </div>
                      <div className="text-2xl font-bold">
                        847
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">
                        Repeat Customers
                      </div>
                      <div className="text-2xl font-bold">
                        62%
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">
                        Average Visits
                      </div>
                      <div className="text-2xl font-bold">
                        3.4
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">
                        Churn Rate
                      </div>
                      <div className="text-2xl font-bold">
                        7.2%
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Customer Feedback</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Food Quality</span>
                          <span>4.7/5</span>
                        </div>
                        <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full rounded-full" 
                            style={{ width: '94%' }}
                          />
                        </div>
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Service</span>
                          <span>4.5/5</span>
                        </div>
                        <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-blue-500 h-full rounded-full" 
                            style={{ width: '90%' }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Ambiance</span>
                          <span>4.4/5</span>
                        </div>
                        <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-violet-500 h-full rounded-full" 
                            style={{ width: '88%' }}
                          />
                        </div>
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Value</span>
                          <span>4.2/5</span>
                        </div>
                        <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-amber-500 h-full rounded-full" 
                            style={{ width: '84%' }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t px-6 py-4">
                <Button variant="outline" className="w-full">
                  Download Customer Report
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}