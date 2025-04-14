import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import NewOrder from "@/pages/NewOrder";
import KitchenTokens from "@/pages/KitchenTokens";
import Billing from "@/pages/Billing";
import HealthAdvisor from "@/pages/HealthAdvisor";
import WhatsApp from "@/pages/WhatsApp";
import PhoneOrders from "@/pages/PhoneOrders";
import AICallCenter from "@/pages/AICallCenter";
import { AppShell } from "@/components/layouts/AppShell";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/new-order" component={NewOrder} />
      <Route path="/kitchen-tokens" component={KitchenTokens} />
      <Route path="/billing" component={Billing} />
      <Route path="/health-advisor" component={HealthAdvisor} />
      <Route path="/whatsapp" component={WhatsApp} />
      <Route path="/phone-orders" component={PhoneOrders} />
      <Route path="/ai-call-center" component={AICallCenter} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell>
        <Router />
      </AppShell>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
