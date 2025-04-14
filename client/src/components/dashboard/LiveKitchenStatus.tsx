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

  const getTimeString = (startTime: Date) => {
    const hours = new Date(startTime).getHours();
    const minutes = new Date(startTime).getMinutes();
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const getTimeSinceStart = (startTime: Date) => {
    return formatDistanceToNow(new Date(startTime), { addSuffix: false });
  };

  const getStatusDetails = (token: KitchenToken) => {
    switch (token.status) {
      case 'pending':
        return {
          containerClass: 'border-warning-100 bg-warning-50',
          dotClass: 'bg-warning-500',
          iconComponent: <Clock className="text-warning-600 h-4 w-4 mr-1" />,
          text: `Waiting • ${getTimeSinceStart(token.startTime)}`
        };
      case 'preparing':
        return {
          containerClass: 'border-warning-100 bg-warning-50',
          dotClass: 'bg-warning-500',
          iconComponent: <Clock className="text-warning-600 h-4 w-4 mr-1" />,
          text: `Preparing • ${getTimeSinceStart(token.startTime)}`
        };
      case 'delayed':
        return {
          containerClass: 'border-error-100 bg-error-50',
          dotClass: 'bg-error-500',
          iconComponent: <AlertTriangle className="text-error-600 h-4 w-4 mr-1" />,
          text: `Delayed • ${getTimeSinceStart(token.startTime)}`
        };
      case 'ready':
        return {
          containerClass: 'border-neutral-200 bg-neutral-50',
          dotClass: 'bg-secondary-500',
          iconComponent: <CheckCircle className="text-secondary-600 h-4 w-4 mr-1" />,
          text: 'Ready to serve'
        };
      default:
        return {
          containerClass: 'border-neutral-200 bg-neutral-50',
          dotClass: 'bg-neutral-500',
          iconComponent: <Clock className="text-neutral-600 h-4 w-4 mr-1" />,
          text: 'Unknown'
        };
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <div className="flex items-center">
          <CardTitle className="font-medium text-base">Live Kitchen Status</CardTitle>
          <div className="ml-2 h-2 w-2 rounded-full bg-secondary-500 animate-pulse"></div>
        </div>
        <Link href="/kitchen-tokens">
          <Button variant="link" className="text-primary-500 hover:text-primary-600">
            View All
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {isLoading ? (
          // Loading skeleton
          <>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="border border-neutral-200 rounded-md p-3">
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-4 w-1/2 mt-2" />
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
                   return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
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
                           <p className="text-sm font-medium text-neutral-800">
                             Token #{token.tokenNumber}
                             {token.isUrgent && <span className="text-xs text-error-600 font-medium ml-1">(Urgent)</span>}
                           </p>
                           <p className="text-xs text-neutral-600 mt-1">Order #{token.orderId} • Various items</p>
                         </div>
                         <div className={`text-xs font-medium ${token.isUrgent ? 'text-error-700' : 'text-warning-700'}`}>
                           {getTimeString(token.startTime)}
                         </div>
                       </div>
                       <div className="mt-2 text-xs flex items-center text-neutral-600">
                         {statusDetails.iconComponent}
                         <span>{statusDetails.text}</span>
                       </div>
                     </div>
                   );
                 })}
                 
            {(!data || data.length === 0) && (
              <div className="border border-neutral-200 rounded-md p-4 text-center text-neutral-500">
                No active kitchen tokens
              </div>
            )}
            
            <Link href="/new-order">
              <Button className="w-full mt-2 text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-300">
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
