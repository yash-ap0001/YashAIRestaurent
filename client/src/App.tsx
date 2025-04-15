import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import CustomerDashboard from "@/pages/CustomerDashboard";
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
import CustomerRegistration from "@/pages/CustomerRegistration";
import { AppShell } from "@/components/layouts/AppShell";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

function Router() {
  const { user } = useAuth();
  
  // Determine which component to use for the home route based on user role
  const HomeComponent = user?.role === "customer" ? CustomerDashboard : Dashboard;
  
  return (
    <Switch>
      {/* Authentication Routes */}
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={CustomerRegistration} />
      
      {/* Protected Routes - Home page based on role */}
      <ProtectedRoute path="/" component={HomeComponent} />
      
      {/* Customer specific routes */}
      <ProtectedRoute path="/customer-dashboard" component={CustomerDashboard} allowedRoles={["customer"]} />
      
      {/* Waiter, Admin, Manager Routes */}
      <ProtectedRoute path="/new-order" component={NewOrder} allowedRoles={["waiter", "admin", "manager", "customer"]} />
      
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
        <AppContent />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

// AppContent component to conditionally render AppShell based on authentication
function AppContent() {
  const { user, isLoading } = useAuth();
  
  // If loading, show a loading spinner
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-900">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  
  // If user is not logged in, render router without AppShell
  if (!user) {
    return <Router />;
  }
  
  // If user is logged in, render router with AppShell
  return (
    <AppShell>
      <Router />
    </AppShell>
  );
}

export default App;
