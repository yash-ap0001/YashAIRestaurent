import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function DashboardStatsPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    setIsRefreshing(true);
    queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="container py-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Dashboard Statistics</h1>
        </div>
        <Button 
          onClick={handleRefresh}
          variant="outline"
          className="gap-2"
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} /> 
          Refresh Data
        </Button>
      </div>

      <Card className="mb-8">
        <CardContent className="pt-6">
          <ErrorBoundary>
            <DashboardStats />
          </ErrorBoundary>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        <p>Stats are updated automatically every 5 seconds.</p>
        <p>Last refresh: {new Date().toLocaleTimeString()}</p>
      </div>
    </div>
  );
}