import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  CreditCard, Receipt, HandPlatter, ChefHat, 
  ArrowUpRight, Clock, AlertTriangle 
} from "lucide-react";
import { useEffect } from "react";
import { queryClient } from "@/lib/queryClient";

interface DashboardStatsProps {
  className?: string;
}

interface DashboardStats {
  todaysSales: number;
  ordersCount: number;
  activeTables: number;
  totalTables: number;
  kitchenQueueCount: number;
  urgentTokensCount: number;
}

export function DashboardStats({ className }: DashboardStatsProps) {
  const { data, isLoading, refetch } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
    refetchInterval: 5000, // Refetch data every 5 seconds
    staleTime: 1000, // Data becomes stale after 1 second for stats
  });
  
  // Set up WebSocket listener for real-time stats updates
  useEffect(() => {
    // Connect to WebSocket for real-time updates
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      console.log('WebSocket connected for dashboard stats');
    };
    
    // Listen for real-time updates that should trigger a stats refresh
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log("WebSocket message received:", message);
        
        // Directly update stats if we receive a stats_updated event
        if (message.type === 'stats_updated' && message.data) {
          // Directly update the cache with the new stats
          queryClient.setQueryData(['/api/dashboard/stats'], message.data);
          console.log("Dashboard stats updated via WebSocket:", message.data);
        } 
        // Otherwise, trigger a refetch for these events
        else if (
          message.type === 'order_created' || 
          message.type === 'order_updated' || 
          message.type === 'bill_created' || 
          message.type === 'kitchen_token_updated' ||
          message.type === 'new_order' ||
          message.type === 'new_bill' ||
          message.type === 'new_kitchen_token'
        ) {
          refetch();
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    // Also set up an interval as a fallback for when WebSocket might be disconnected
    const intervalId = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
    }, 10000); // Every 10 seconds as a fallback
    
    // Clean up on component unmount
    return () => {
      socket.close();
      clearInterval(intervalId);
    };
  }, [refetch]);

  if (isLoading) {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-neutral-800 border-neutral-700">
            <CardContent className="p-6">
              <Skeleton className="h-4 w-1/2 mb-2 bg-neutral-700" />
              <Skeleton className="h-8 w-1/3 mb-4 bg-neutral-700" />
              <Skeleton className="h-4 w-2/3 bg-neutral-700" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {/* Today's Sales Card */}
      <Card className="bg-neutral-800 border-neutral-700">
        <CardContent className="pt-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-neutral-400">Today's Sales</p>
              <h3 className="text-2xl font-semibold text-white mt-1">₹{data.todaysSales ? data.todaysSales.toLocaleString() : '0'}</h3>
            </div>
            <div className="rounded-full bg-purple-900 bg-opacity-60 p-2">
              <CreditCard className="h-5 w-5 text-purple-400" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-sm">
            <span className="text-green-400 flex items-center">
              <ArrowUpRight className="h-4 w-4 mr-1" /> 17.8%
            </span>
            <span className="ml-2 text-neutral-400">vs yesterday</span>
          </div>
        </CardContent>
      </Card>
      
      {/* Orders Today Card */}
      <Card className="bg-neutral-800 border-neutral-700">
        <CardContent className="pt-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-neutral-400">Orders Today</p>
              <h3 className="text-2xl font-semibold text-white mt-1">{data.ordersCount}</h3>
            </div>
            <div className="rounded-full bg-purple-900 bg-opacity-60 p-2">
              <Receipt className="h-5 w-5 text-purple-400" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-sm">
            <span className="text-green-400 flex items-center">
              <ArrowUpRight className="h-4 w-4 mr-1" /> 5.4%
            </span>
            <span className="ml-2 text-neutral-400">vs yesterday</span>
          </div>
        </CardContent>
      </Card>
      
      {/* Active Tables Card */}
      <Card className="bg-neutral-800 border-neutral-700">
        <CardContent className="pt-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-neutral-400">Active Tables</p>
              <h3 className="text-2xl font-semibold text-white mt-1">{data.activeTables}/{data.totalTables}</h3>
            </div>
            <div className="rounded-full bg-purple-900 bg-opacity-60 p-2">
              <HandPlatter className="h-5 w-5 text-purple-400" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-sm">
            <span className="text-white font-medium">
              {Math.round((data.activeTables / data.totalTables) * 100)}% occupancy
            </span>
            <span className="ml-2 text-neutral-400">at present</span>
          </div>
        </CardContent>
      </Card>
      
      {/* Kitchen Queue Card */}
      <Card className="bg-neutral-800 border-neutral-700">
        <CardContent className="pt-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-neutral-400">Kitchen Queue</p>
              <h3 className="text-2xl font-semibold text-white mt-1">{data.kitchenQueueCount}</h3>
            </div>
            <div className="rounded-full bg-purple-900 bg-opacity-60 p-2">
              <ChefHat className="h-5 w-5 text-purple-400" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-sm">
            {data.urgentTokensCount > 0 ? (
              <span className="text-amber-400 flex items-center font-medium">
                <AlertTriangle className="h-4 w-4 mr-1" /> {data.urgentTokensCount} urgent
              </span>
            ) : (
              <span className="text-green-400 flex items-center font-medium">
                <Clock className="h-4 w-4 mr-1" /> On track
              </span>
            )}
            <span className="ml-2 text-neutral-400">tokens</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
