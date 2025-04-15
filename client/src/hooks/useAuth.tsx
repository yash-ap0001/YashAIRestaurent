import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "../lib/queryClient";
import { useToast } from "./use-toast";

// User type definition
export type User = {
  id: number;
  username: string;
  fullName: string;
  role: string;
};

// All available user roles
export type UserRole = "admin" | "kitchen" | "waiter" | "manager" | "delivery" | "customer";

// Auth context type definition
type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (formData: RegisterFormData) => Promise<void>;
  setCurrentRole: (role: UserRole) => void;
  currentRole: UserRole;
};

// Registration form data type
export type RegisterFormData = {
  username: string;
  password: string;
  fullName: string;
  role: string;
};

// Create auth context
const AuthContext = createContext<AuthContextType | null>(null);

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [currentRole, setCurrentRole] = useState<UserRole>("waiter");
  
  // Fetch current user data
  const {
    data: user,
    error,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/auth/user");
        if (!res.ok) {
          if (res.status === 401) {
            return null;
          }
          throw new Error("Failed to fetch user data");
        }
        const userData = await res.json();
        return userData as User;
      } catch (err) {
        console.error("Error fetching user data:", err);
        return null;
      }
    },
  });

  // Set current role either from auth or from state
  useEffect(() => {
    if (user && user.role) {
      setCurrentRole(user.role as UserRole);
    }
  }, [user]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", { username, password });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Login failed");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      toast({
        title: "Login successful",
        description: `Welcome back, ${data.fullName}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/logout");
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Logout failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (formData: RegisterFormData) => {
      const res = await apiRequest("POST", "/api/auth/register", formData);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Registration failed");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      toast({
        title: "Registration successful",
        description: `Welcome, ${data.fullName}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Login function
  const login = async (username: string, password: string) => {
    await loginMutation.mutateAsync({ username, password });
  };

  // Logout function
  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  // Register function
  const register = async (formData: RegisterFormData) => {
    await registerMutation.mutateAsync(formData);
  };

  // Return the auth context provider
  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: isLoading || loginMutation.isPending || logoutMutation.isPending || registerMutation.isPending,
        error,
        login,
        logout,
        register,
        setCurrentRole,
        currentRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}