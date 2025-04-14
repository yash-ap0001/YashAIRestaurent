import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  Card, CardContent, CardHeader, CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, AlertTriangle, CheckCircle, Plus } from "lucide-react";
import { KitchenToken } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface LiveKitchenStatusProps {
  className?: string;
}

export function LiveKitchenStatus({ className }: LiveKitchenStatusProps) {
  const { data, isLoading } = useQuery<KitchenToken[]>({
    queryKey: ['/api/kitchen-tokens'],
  });

  const getTimeString = (startTime: Date | null) => {
    if (!startTime) return "00:00";
    try {
      const hours = new Date(startTime).getHours();
      const minutes = new Date(startTime).getMinutes();
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } catch (e) {
      return "00:00";
    }
  };

  const getTimeSinceStart = (startTime: Date | null) => {
    if (!startTime) return "unknown time";
    try {
      return formatDistanceToNow(new Date(startTime), { addSuffix: false });
    } catch (e) {
      return "unknown time";
    }
  };

  const getStatusDetails = (token: KitchenToken) => {
    switch (token.status) {
      case 'pending':
        return {
          containerClass: 'border-amber-900 bg-amber-900 bg-opacity-20',
          dotClass: 'bg-amber-500',
          iconComponent: <Clock className="text-amber-400 h-4 w-4 mr-1" />,
          text: `Waiting • ${getTimeSinceStart(token.startTime)}`
        };
      case 'preparing':
        return {
          containerClass: 'border-amber-900 bg-amber-900 bg-opacity-20',
          dotClass: 'bg-amber-500',
          iconComponent: <Clock className="text-amber-400 h-4 w-4 mr-1" />,
          text: `Preparing • ${getTimeSinceStart(token.startTime)}`
        };
      case 'delayed':
        return {
          containerClass: 'border-red-900 bg-red-900 bg-opacity-20',
          dotClass: 'bg-red-500',
          iconComponent: <AlertTriangle className="text-red-400 h-4 w-4 mr-1" />,
          text: `Delayed • ${getTimeSinceStart(token.startTime)}`
        };
      case 'ready':
        return {
          containerClass: 'border-green-900 bg-green-900 bg-opacity-20',
          dotClass: 'bg-green-500',
          iconComponent: <CheckCircle className="text-green-400 h-4 w-4 mr-1" />,
          text: 'Ready to serve'
        };
      default:
        return {
          containerClass: 'border-neutral-700 bg-neutral-800',
          dotClass: 'bg-neutral-500',
          iconComponent: <Clock className="text-neutral-400 h-4 w-4 mr-1" />,
          text: 'Unknown'
        };
    }
  };

  return (
    <Card className={`bg-neutral-800 border-neutral-700 ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <div className="flex items-center">
          <CardTitle className="font-medium text-base text-white">Live Kitchen Status</CardTitle>
          <div className="ml-2 h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
        </div>
        <Link href="/kitchen-tokens">
          <Button variant="link" className="text-purple-400 hover:text-purple-300">
            View All
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {isLoading ? (
          // Loading skeleton
          <>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="border border-neutral-700 rounded-md p-3 bg-neutral-800">
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-1/3 bg-neutral-700" />
                  <Skeleton className="h-5 w-16 bg-neutral-700" />
                </div>
                <Skeleton className="h-4 w-1/2 mt-2 bg-neutral-700" />
              </div>
            ))}
          </>
        ) : (
          // Actual content
          <>
            {data?.filter(token => token.status !== 'served')
                 .sort((a, b) => {
                   if (a.isUrgent && !b.isUrgent) return -1;
                   if (!a.isUrgent && b.isUrgent) return 1;
                   
                   try {
                     const timeA = a.startTime ? new Date(a.startTime).getTime() : 0;
                     const timeB = b.startTime ? new Date(b.startTime).getTime() : 0;
                     return timeA - timeB;
                   } catch (e) {
                     return 0;
                   }
                 })
                 .slice(0, 4)
                 .map(token => {
                   const statusDetails = getStatusDetails(token);
                   return (
                     <div 
                       key={token.id} 
                       className={`border ${statusDetails.containerClass} rounded-md p-3 relative`}
                     >
                       <div className={`absolute -left-1 top-3 w-2 h-2 rounded-full ${statusDetails.dotClass} animate-pulse`}></div>
                       <div className="flex justify-between">
                         <div>
                           <p className="text-sm font-medium text-white">
                             Token #{token.tokenNumber}
                             {token.isUrgent && <span className="text-xs text-red-400 font-medium ml-1">(Urgent)</span>}
                           </p>
                           <p className="text-xs text-neutral-300 mt-1">Order #{token.orderId} • Various items</p>
                         </div>
                         <div className={`text-xs font-medium ${token.isUrgent ? 'text-red-400' : 'text-amber-400'}`}>
                           {getTimeString(token.startTime)}
                         </div>
                       </div>
                       <div className="mt-2 text-xs flex items-center text-neutral-300">
                         {statusDetails.iconComponent}
                         <span>{statusDetails.text}</span>
                       </div>
                     </div>
                   );
                 })}
                 
            {(!data || data.length === 0) && (
              <div className="border border-neutral-700 rounded-md p-4 text-center text-neutral-400 bg-neutral-800">
                No active kitchen tokens
              </div>
            )}
            
            <Link href="/new-order">
              <Button className="w-full mt-2 text-white bg-purple-900 hover:bg-purple-800 border border-purple-700">
                <Plus className="h-4 w-4 mr-1" />
                Add Order
              </Button>
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}
