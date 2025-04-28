import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { BarChart3 } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/queryClient";

export const StatsTabContent = () => {
  // Simply render the stats tab content with a link to the full stats page
  // This helps avoid hooks ordering issues in the parent component
  
  return (
    <ErrorBoundary>
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Today's Stats</h1>
        <p className="text-muted-foreground">
          Real-time statistics updated automatically 
          <Button 
            variant="link" 
            size="sm" 
            className="text-primary hover:text-primary/90 p-0 ml-2 inline-flex items-center" 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] })}
          >
            <span className="underline text-sm">Refresh Now</span>
          </Button>
        </p>
      </div>
      <Link href="/dashboard-stats" className="block mb-4">
        <Button className="w-full">
          <BarChart3 className="w-4 h-4 mr-2" />
          Open Full Stats Dashboard
        </Button>
      </Link>
      <p className="text-sm text-muted-foreground">
        We've moved the stats to a separate page to improve performance.
        Click the button above to view real-time statistics.
      </p>
    </ErrorBoundary>
  );
};