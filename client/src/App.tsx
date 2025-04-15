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
import TestAIOrder from "@/pages/TestAIOrder";
import LiveTracking from "@/pages/LiveTracking";
import TrackOrder from "@/pages/TrackOrder";
import Inventory from "@/pages/Inventory";
import Customers from "@/pages/Customers";
import MenuItems from "@/pages/MenuItems";
import Reports from "@/pages/Reports";
import ExternalIntegration from "@/pages/ExternalIntegration";
import VoiceAssistant from "@/pages/VoiceAssistant";
import N8nIntegration from "@/pages/N8nIntegration";
import DietPlan from "@/pages/DietPlan";
import LoginPage from "@/pages/LoginPage";
import { AppShell } from "@/components/layouts/AppShell";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

function Router() {
  return (
    <Switch>
      {/* Authentication Route */}
      <Route path="/login" component={LoginPage} />
      
      {/* Protected Routes */}
      <ProtectedRoute path="/" component={Dashboard} />
      
      {/* Waiter, Admin, Manager Routes */}
      <ProtectedRoute path="/new-order" component={NewOrder} allowedRoles={["waiter", "admin", "manager"]} />
      
      {/* Kitchen Staff Routes */}
      <ProtectedRoute path="/kitchen-tokens" component={KitchenTokens} allowedRoles={["kitchen", "admin", "manager"]} />
      
      {/* Admin, Manager, Waiter Routes */}
      <ProtectedRoute path="/billing" component={Billing} allowedRoles={["admin", "manager", "waiter"]} />
      <ProtectedRoute path="/health-advisor" component={HealthAdvisor} allowedRoles={["admin", "manager", "waiter"]} />
      <ProtectedRoute path="/whatsapp" component={WhatsApp} allowedRoles={["admin", "manager"]} />
      <ProtectedRoute path="/phone-orders" component={PhoneOrders} allowedRoles={["admin", "manager", "waiter"]} />
      <ProtectedRoute path="/ai-call-center" component={AICallCenter} allowedRoles={["admin", "manager"]} />
      <ProtectedRoute path="/test-ai-order" component={TestAIOrder} allowedRoles={["admin", "manager"]} />
      <ProtectedRoute path="/live-tracking" component={LiveTracking} allowedRoles={["admin", "manager", "kitchen", "waiter", "delivery"]} />
      <ProtectedRoute path="/track-order/:orderNumber" component={TrackOrder} allowedRoles={["admin", "manager", "kitchen", "waiter", "delivery", "customer"]} />
      
      {/* Admin, Manager Routes */}
      <ProtectedRoute path="/inventory" component={Inventory} allowedRoles={["admin", "manager"]} />
      <ProtectedRoute path="/customers" component={Customers} allowedRoles={["admin", "manager"]} />
      <ProtectedRoute path="/menu-items" component={MenuItems} allowedRoles={["admin", "manager"]} />
      <ProtectedRoute path="/reports" component={Reports} allowedRoles={["admin", "manager"]} />
      <ProtectedRoute path="/external-integration" component={ExternalIntegration} allowedRoles={["admin"]} />
      <ProtectedRoute path="/voice-assistant" component={VoiceAssistant} allowedRoles={["admin", "manager", "waiter"]} />
      <ProtectedRoute path="/n8n-integration" component={N8nIntegration} allowedRoles={["admin"]} />
      <ProtectedRoute path="/diet-plan" component={DietPlan} allowedRoles={["admin", "manager", "waiter", "customer"]} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppShell>
          <Router />
        </AppShell>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
