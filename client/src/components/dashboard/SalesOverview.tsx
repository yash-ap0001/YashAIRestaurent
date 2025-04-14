import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Order } from "@shared/schema";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface SalesOverviewProps {
  className?: string;
}

type TimeFrame = "day" | "week" | "month";

export function SalesOverview({ className }: SalesOverviewProps) {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("day");
  
  const { data: orders } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });

  // Function to generate chart data based on timeframe
  const getChartData = () => {
    if (!orders || orders.length === 0) return [];
    
    const currentDate = new Date();
    const data = [];
    
    switch (timeFrame) {
      case "day":
        // Generate hourly data for today
        for (let hour = 0; hour < 24; hour++) {
          const hourLabel = `${hour.toString().padStart(2, '0')}:00`;
          const hourEnd = new Date(currentDate);
          hourEnd.setHours(hour, 59, 59, 999);
          hourEnd.setDate(currentDate.getDate());
          
          const hourStart = new Date(currentDate);
          hourStart.setHours(hour, 0, 0, 0);
          hourStart.setDate(currentDate.getDate());
          
          const hourOrders = orders.filter(order => {
            const orderDate = new Date(order.createdAt);
            return orderDate >= hourStart && orderDate <= hourEnd;
          });
          
          const hourSales = hourOrders.reduce((sum, order) => sum + order.totalAmount, 0);
          
          data.push({
            name: hourLabel,
            sales: hourSales
          });
        }
        break;
        
      case "week":
        // Generate data for each day of the week
        for (let day = 6; day >= 0; day--) {
          const date = new Date(currentDate);
          date.setDate(currentDate.getDate() - day);
          
          const dayStart = new Date(date);
          dayStart.setHours(0, 0, 0, 0);
          
          const dayEnd = new Date(date);
          dayEnd.setHours(23, 59, 59, 999);
          
          const dayOrders = orders.filter(order => {
            const orderDate = new Date(order.createdAt);
            return orderDate >= dayStart && orderDate <= dayEnd;
          });
          
          const daySales = dayOrders.reduce((sum, order) => sum + order.totalAmount, 0);
          
          data.push({
            name: date.toLocaleDateString('en-US', { weekday: 'short' }),
            sales: daySales
          });
        }
        break;
        
      case "month":
        // Generate data for last 30 days by week
        for (let week = 4; week >= 0; week--) {
          const weekEnd = new Date(currentDate);
          weekEnd.setDate(currentDate.getDate() - (week * 7));
          
          const weekStart = new Date(weekEnd);
          weekStart.setDate(weekEnd.getDate() - 6);
          
          const weekOrders = orders.filter(order => {
            const orderDate = new Date(order.createdAt);
            return orderDate >= weekStart && orderDate <= weekEnd;
          });
          
          const weekSales = weekOrders.reduce((sum, order) => sum + order.totalAmount, 0);
          
          const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { day: 'numeric' })}`;
          
          data.push({
            name: weekLabel,
            sales: weekSales
          });
        }
        break;
    }
    
    return data;
  };

  const chartData = getChartData();

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="font-medium text-base">Sales Overview</CardTitle>
        <div className="flex space-x-2">
          <Button 
            variant="ghost" 
            size="sm"
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-md",
              timeFrame === "day" 
                ? "bg-primary-50 text-primary-700" 
                : "text-neutral-600 hover:bg-neutral-100"
            )}
            onClick={() => setTimeFrame("day")}
          >
            Day
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-md",
              timeFrame === "week" 
                ? "bg-primary-50 text-primary-700" 
                : "text-neutral-600 hover:bg-neutral-100"
            )}
            onClick={() => setTimeFrame("week")}
          >
            Week
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-md",
              timeFrame === "month" 
                ? "bg-primary-50 text-primary-700" 
                : "text-neutral-600 hover:bg-neutral-100"
            )}
            onClick={() => setTimeFrame("month")}
          >
            Month
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="h-64 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 30,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  fontSize={12} 
                  tick={{ fill: '#64748b' }} 
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={{ stroke: '#cbd5e1' }}
                  tickMargin={10}
                />
                <YAxis 
                  fontSize={12} 
                  tick={{ fill: '#64748b' }} 
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={{ stroke: '#cbd5e1' }}
                  tickFormatter={(value) => `₹${value}`}
                />
                <Tooltip 
                  formatter={(value) => [`₹${value}`, 'Sales']}
                  labelFormatter={(label) => `Time: ${label}`}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                  }}
                />
                <Bar 
                  dataKey="sales" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                  barSize={timeFrame === "day" ? 10 : 20}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full bg-neutral-50 rounded flex items-center justify-center">
              <div className="text-center">
                <p className="text-sm text-neutral-500">No sales data available</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
