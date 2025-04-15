import { ReactNode } from "react";
import { Route, Redirect } from "wouter";
import { useAuth, UserRole } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  path: string;
  component: React.FC;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute = ({ path, component: Component, allowedRoles }: ProtectedRouteProps) => {
  const { user, isLoading, currentRole } = useAuth();

  return (
    <Route path={path}>
      {() => {
        if (isLoading) {
          return (
            <div className="flex h-screen w-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          );
        }

        // If user is not logged in, redirect to login page
        if (!user) {
          return <Redirect to="/login" />;
        }

        // If there are allowed roles and the user's role is not in the allowed roles
        if (allowedRoles && !allowedRoles.includes(currentRole as UserRole)) {
          return (
            <div className="flex h-screen w-full flex-col items-center justify-center p-4 text-center">
              <h1 className="text-3xl font-bold">Access Denied</h1>
              <p className="mt-4 text-lg text-muted-foreground">
                You don't have permission to access this page.
              </p>
            </div>
          );
        }

        return <Component />;
      }}
    </Route>
  );
};

interface RoleBasedContentProps {
  children: ReactNode;
  allowedRoles: UserRole[];
}

export const RoleBasedContent = ({ children, allowedRoles }: RoleBasedContentProps) => {
  const { currentRole } = useAuth();

  if (!allowedRoles.includes(currentRole as UserRole)) {
    return null;
  }

  return <>{children}</>;
};