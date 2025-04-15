import { ReactNode } from "react";
import { Route, useLocation } from "wouter";
import NotFound from "@/pages/not-found";

// Define the allowed user roles for each path
export const routePermissions: Record<string, string[]> = {
  // Main routes
  "/": ["admin", "manager", "waiter", "kitchen", "delivery", "customer"],
  "/new-order": ["admin", "manager", "waiter"],
  "/kitchen-tokens": ["admin", "kitchen", "manager"],
  "/billing": ["admin", "manager", "waiter"],
  "/health-advisor": ["admin", "customer"],
  "/whatsapp": ["admin", "manager", "waiter"],
  "/phone-orders": ["admin", "manager", "waiter"],
  "/ai-call-center": ["admin", "manager"],
  "/test-ai-order": ["admin", "manager", "waiter"],
  "/live-tracking": ["admin", "manager", "kitchen", "waiter", "delivery", "customer"],
  "/track-order": ["admin", "manager", "kitchen", "waiter", "delivery", "customer"],
  
  // Management routes
  "/inventory": ["admin", "manager", "kitchen"],
  "/customers": ["admin", "manager"],
  "/menu-items": ["admin", "manager", "kitchen"],
  "/reports": ["admin", "manager"],
  "/external-integration": ["admin", "manager"],
  "/voice-assistant": ["admin", "manager"],
  "/n8n-integration": ["admin", "manager"],
  "/diet-plan": ["admin", "manager", "customer"]
};

interface ProtectedRouteProps {
  path: string;
  userRole: string;
  component: React.ComponentType;
  children?: ReactNode;
}

export function ProtectedRoute({ path, userRole, component: Component, children }: ProtectedRouteProps) {
  const [_, setLocation] = useLocation();
  
  // Get the allowed roles for this path
  const allowedRoles = routePermissions[path] || [];
  
  // If the path starts with /track-order/, extract the base path
  const basePath = path.startsWith("/track-order/") ? "/track-order" : path;
  const baseAllowedRoles = routePermissions[basePath] || [];
  
  // Check if the user role is allowed to access this path
  const isAllowed = allowedRoles.includes(userRole) || baseAllowedRoles.includes(userRole);
  
  return (
    <Route path={path}>
      {isAllowed ? <Component /> : <NotFound />}
      {children}
    </Route>
  );
}