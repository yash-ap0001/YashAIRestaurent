import { useState } from "react";
import { useAuth, UserRole } from "@/hooks/useAuth";
import { LogOut, User, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Role colors for visual distinction
const roleColors: Record<UserRole, string> = {
  admin: "bg-rose-500 hover:bg-rose-600",
  kitchen: "bg-amber-500 hover:bg-amber-600",
  waiter: "bg-sky-500 hover:bg-sky-600",
  manager: "bg-emerald-500 hover:bg-emerald-600",
  delivery: "bg-violet-500 hover:bg-violet-600",
  customer: "bg-slate-500 hover:bg-slate-600",
};

// Role labels for display
const roleLabels: Record<UserRole, string> = {
  admin: "Administrator",
  kitchen: "Kitchen Staff",
  waiter: "Waiter",
  manager: "Manager",
  delivery: "Delivery Staff",
  customer: "Customer",
};

export default function UserMenu() {
  const [open, setOpen] = useState(false);
  const { user, logout, currentRole, setCurrentRole } = useAuth();

  if (!user) {
    return null;
  }

  // Get initials from user's full name
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  // Function to get the badge color based on role
  const getBadgeColor = (role: UserRole) => {
    switch (role) {
      case "admin":
        return "bg-rose-500 text-white hover:bg-rose-600";
      case "kitchen":
        return "bg-amber-500 text-white hover:bg-amber-600";
      case "waiter":
        return "bg-sky-500 text-white hover:bg-sky-600";
      case "manager":
        return "bg-emerald-500 text-white hover:bg-emerald-600";
      case "delivery":
        return "bg-violet-500 text-white hover:bg-violet-600";
      case "customer":
        return "bg-slate-500 text-white hover:bg-slate-600";
      default:
        return "bg-primary text-white hover:bg-primary/90";
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials(user.fullName)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.fullName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              @{user.username}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel>Current Role</DropdownMenuLabel>
        <DropdownMenuItem className="p-0">
          <Badge 
            className={`w-full rounded-sm font-normal justify-between ${getBadgeColor(currentRole as UserRole)}`}
          >
            {roleLabels[currentRole as UserRole]}
            <ChevronDown className="h-4 w-4 ml-2" />
          </Badge>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Switch Role</DropdownMenuLabel>

        {/* Only show role options the user has permission for */}
        {user.role === "admin" && (
          <>
            <DropdownMenuItem onClick={() => handleRoleChange("admin")}>
              <User className="mr-2 h-4 w-4" />
              <span>Administrator</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleRoleChange("kitchen")}>
              <User className="mr-2 h-4 w-4" />
              <span>Kitchen Staff</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleRoleChange("waiter")}>
              <User className="mr-2 h-4 w-4" />
              <span>Waiter</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleRoleChange("manager")}>
              <User className="mr-2 h-4 w-4" />
              <span>Manager</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleRoleChange("delivery")}>
              <User className="mr-2 h-4 w-4" />
              <span>Delivery Staff</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleRoleChange("customer")}>
              <User className="mr-2 h-4 w-4" />
              <span>Customer</span>
            </DropdownMenuItem>
          </>
        )}

        {/* For non-admin users, just show their role */}
        {user.role !== "admin" && (
          <DropdownMenuItem onClick={() => handleRoleChange(user.role as UserRole)}>
            <User className="mr-2 h-4 w-4" />
            <span>{roleLabels[user.role as UserRole]}</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="text-red-500 focus:text-red-500 focus:bg-red-50" 
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}