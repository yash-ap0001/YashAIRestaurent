import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, PlusSquare, Receipt, CreditCard, Package2, Users, MenuSquare, BarChart3, LogOut,
  Menu, Bell, HandPlatter, ChevronDown, HeartPulse, MessageCircle, Phone, PhoneCall, Cpu, Activity,
  Radio, Signal, Globe, ExternalLink, Mic, Workflow, Salad, Apple, UserCog, Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ChatInterface, MinimizedChatButton } from "@/components/chatbot/ChatInterface";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth, UserRole } from "@/hooks/useAuth";
import UserMenu from "@/components/auth/UserMenu";
import { RoleBasedContent } from "@/components/auth/ProtectedRoute";
import { ConnectionStatus } from "@/components/ui/ConnectionStatus";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const mainNavItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: "Simple Dashboard", href: "/simplified-dashboard", icon: <UserCog className="w-5 h-5" /> },
  { label: "New Order", href: "/new-order", icon: <PlusSquare className="w-5 h-5" /> },
  { label: "Kitchen Tokens", href: "/kitchen-tokens", icon: <Receipt className="w-5 h-5" /> },
  { label: "Billing", href: "/billing", icon: <CreditCard className="w-5 h-5" /> },
  { label: "Live Tracking", href: "/live-tracking", icon: <Activity className="w-5 h-5" /> },
  { label: "Health Advisor", href: "/health-advisor", icon: <HeartPulse className="w-5 h-5" /> },
  { label: "WhatsApp", href: "/whatsapp", icon: <MessageCircle className="w-5 h-5" /> },
  { label: "Phone Orders", href: "/phone-orders", icon: <Phone className="w-5 h-5" /> },
  { label: "AI Call Center", href: "/ai-call-center", icon: <PhoneCall className="w-5 h-5" /> },
];

const managementNavItems: NavItem[] = [
  { label: "Inventory", href: "/inventory", icon: <Package2 className="w-5 h-5" /> },
  { label: "Customers", href: "/customers", icon: <Users className="w-5 h-5" /> },
  { label: "Menu Items", href: "/menu-items", icon: <MenuSquare className="w-5 h-5" /> },
  { label: "AR Menu Preview", href: "/ar-menu-preview", icon: <Eye className="w-5 h-5" /> },
  { label: "Diet Plan", href: "/diet-plan", icon: <Apple className="w-5 h-5" /> },
  { label: "Reports", href: "/reports", icon: <BarChart3 className="w-5 h-5" /> },
];

const testingNavItems: NavItem[] = [
  { label: "AI Order Simulator", href: "/test-ai-order", icon: <Cpu className="w-5 h-5" /> },
  { label: "External Integration", href: "/external-integration", icon: <ExternalLink className="w-5 h-5" /> },
  { label: "Voice Assistant", href: "/voice-assistant", icon: <Mic className="w-5 h-5" /> },
  { label: "n8n Integration", href: "/n8n-integration", icon: <Workflow className="w-5 h-5" /> },
  { label: "Notification Test", href: "/notification-test", icon: <Bell className="w-5 h-5" /> },
];

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);
  const { user, currentRole, setCurrentRole } = useAuth();

  const currentPage = mainNavItems.find(item => item.href === location) || 
                      managementNavItems.find(item => item.href === location) ||
                      { label: "Dashboard" };
  
  // Determine the user type based on the current role for chatbot
  const getUserType = () => {
    return currentRole;
  };
  
  // Filter navigation items based on user role and route permissions
  const getFilteredNavItems = (items: NavItem[], role: string) => {
    return items.filter(item => {
      const allowedRoles = routePermissions[item.href] || [];
      return allowedRoles.includes(role);
    });
  };
  
  // Import routePermissions from the ProtectedRoute component
  const routePermissions: Record<string, string[]> = {
    // Main routes
    "/": ["admin", "manager", "waiter", "kitchen", "delivery", "customer"],
    "/simplified-dashboard": ["admin", "manager", "waiter", "kitchen"],
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
    "/ar-menu-preview": ["admin", "manager", "waiter", "customer"],
    "/reports": ["admin", "manager"],
    "/external-integration": ["admin", "manager"],
    "/voice-assistant": ["admin", "manager"],
    "/n8n-integration": ["admin", "manager"],
    "/diet-plan": ["admin", "manager", "customer"],
    "/notification-test": ["admin", "manager"]
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-neutral-900 text-neutral-200">
      {/* Sidebar - hidden on mobile */}
      <aside className="hidden md:flex md:w-64 flex-col bg-black border-r border-neutral-800 h-full">
        <div className="p-4 flex items-center space-x-3 border-b border-neutral-800">
          <div className="h-8 w-8 rounded-md bg-purple-600 flex items-center justify-center text-white">
            <HandPlatter size={20} />
          </div>
          <h1 className="text-lg font-semibold text-white">YashHotelBot</h1>
        </div>
        
        <nav className="flex-1 pt-4 pb-4">
          <div className="px-3 mb-2">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Main</p>
          </div>
          <ul>
            {getFilteredNavItems(mainNavItems, currentRole).map((item) => (
              <li key={item.href}>
                <Link 
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-md mx-2 mt-1",
                    location === item.href 
                      ? "text-purple-400 bg-purple-900 bg-opacity-40" 
                      : "text-neutral-400 hover:bg-neutral-800"
                  )}
                >
                  <span className="mr-3 text-current">{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          
          {getFilteredNavItems(managementNavItems, currentRole).length > 0 && (
            <>
              <div className="px-3 mb-2 mt-6">
                <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Management</p>
              </div>
              <ul>
                {getFilteredNavItems(managementNavItems, currentRole).map((item) => (
                  <li key={item.href}>
                    <Link 
                      href={item.href}
                      className={cn(
                        "flex items-center px-3 py-2 text-sm font-medium rounded-md mx-2 mt-1",
                        location === item.href 
                          ? "text-purple-400 bg-purple-900 bg-opacity-40" 
                          : "text-neutral-400 hover:bg-neutral-800"
                      )}
                    >
                      <span className="mr-3 text-current">{item.icon}</span>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
          
          {(currentRole === "admin" || currentRole === "manager") && (
            <>
              <div className="px-3 mb-2 mt-6">
                <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Testing</p>
              </div>
              <ul>
                {getFilteredNavItems(testingNavItems, currentRole).map((item) => (
                  <li key={item.href}>
                    <Link 
                      href={item.href}
                      className={cn(
                        "flex items-center px-3 py-2 text-sm font-medium rounded-md mx-2 mt-1",
                        location === item.href 
                          ? "text-purple-400 bg-purple-900 bg-opacity-40" 
                          : "text-neutral-400 hover:bg-neutral-800"
                      )}
                    >
                      <span className="mr-3 text-current">{item.icon}</span>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </nav>
        
        <div className="p-4 border-t border-neutral-800">
          <div className="text-xs text-neutral-400 text-center">
            <p>YashHotelBot v1.2.0</p>
            <p className="mt-1">© 2025 Yash Solutions</p>
          </div>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 border-b border-neutral-800 bg-black flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center md:hidden">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5 text-neutral-300" />
              <span className="sr-only">Open menu</span>
            </Button>
            <h1 className="ml-3 text-lg font-semibold text-white">{currentPage.label}</h1>
          </div>
          
          <div className="hidden md:block">
            <h1 className="text-lg font-semibold text-white">{currentPage.label}</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Quick Order Button */}
            <Button 
              variant="outline" 
              size="sm"
              className="bg-purple-700 hover:bg-purple-600 border-purple-600 text-white"
              onClick={async () => {
                try {
                  const response = await fetch('/api/simulator/create-order', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      tableNumber: 'T1',
                      orderItems: [
                        {
                          menuItemId: 1,
                          quantity: 1,
                          price: 370,
                          specialInstructions: 'Quick order test'
                        }
                      ]
                    }),
                  });
                  
                  if (response.ok) {
                    const data = await response.json();
                    console.log('Quick order created:', data);
                    alert(`Quick order created: #${data.orderNumber}`);
                  } else {
                    console.error('Failed to create quick order');
                  }
                } catch (error) {
                  console.error('Error creating quick order:', error);
                }
              }}
            >
              <PlusSquare className="h-4 w-4 mr-1" />
              Quick Order
            </Button>
            
            <div className="relative">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5 text-neutral-300" />
                <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-purple-500"></span>
                <span className="sr-only">Notifications</span>
              </Button>
            </div>
            
            {/* WebSocket connection status indicator */}
            <div className="relative">
              <ConnectionStatus />
            </div>
            
            {/* User menu - always visible in top right corner */}
            <UserMenu />
          </div>
        </header>
        
        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-6 bg-neutral-900">
          {children}
        </div>
      </main>

      {/* Mobile menu */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-64 p-0 bg-black border-r-neutral-800">
          <div className="p-4 flex items-center space-x-3 border-b border-neutral-800">
            <div className="h-8 w-8 rounded-md bg-purple-600 flex items-center justify-center text-white">
              <HandPlatter size={20} />
            </div>
            <h1 className="text-lg font-semibold text-white">YashHotelBot</h1>
          </div>
          
          <nav className="flex-1 pt-4 pb-4">
            <div className="px-3 mb-2">
              <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Main</p>
            </div>
            <ul>
              {getFilteredNavItems(mainNavItems, currentRole).map((item) => (
                <li key={item.href}>
                  <Link 
                    href={item.href}
                    className={cn(
                      "flex items-center px-3 py-2 text-sm font-medium rounded-md mx-2 mt-1",
                      location === item.href 
                        ? "text-purple-400 bg-purple-900 bg-opacity-40" 
                        : "text-neutral-400 hover:bg-neutral-800"
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="mr-3 text-current">{item.icon}</span>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            
            {getFilteredNavItems(managementNavItems, currentRole).length > 0 && (
              <>
                <div className="px-3 mb-2 mt-6">
                  <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Management</p>
                </div>
                <ul>
                  {getFilteredNavItems(managementNavItems, currentRole).map((item) => (
                    <li key={item.href}>
                      <Link 
                        href={item.href}
                        className={cn(
                          "flex items-center px-3 py-2 text-sm font-medium rounded-md mx-2 mt-1",
                          location === item.href 
                            ? "text-purple-400 bg-purple-900 bg-opacity-40" 
                            : "text-neutral-400 hover:bg-neutral-800"
                        )}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <span className="mr-3 text-current">{item.icon}</span>
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
            
            {(currentRole === "admin" || currentRole === "manager") && (
              <>
                <div className="px-3 mb-2 mt-6">
                  <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Testing</p>
                </div>
                <ul>
                  {getFilteredNavItems(testingNavItems, currentRole).map((item) => (
                    <li key={item.href}>
                      <Link 
                        href={item.href}
                        className={cn(
                          "flex items-center px-3 py-2 text-sm font-medium rounded-md mx-2 mt-1",
                          location === item.href 
                            ? "text-purple-400 bg-purple-900 bg-opacity-40" 
                            : "text-neutral-400 hover:bg-neutral-800"
                        )}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <span className="mr-3 text-current">{item.icon}</span>
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </nav>
          
          {/* Footer section with app version */}
          <div className="p-4 border-t border-neutral-800">
            <div className="text-xs text-neutral-400 text-center">
              <p>YashHotelBot v1.2.0</p>
              <p className="mt-1">© 2025 Yash Solutions</p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      
      {/* Mobile Bottom Navigation - visible only on small screens */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-neutral-800 px-4 py-2 z-10">
        <div className="flex justify-around">
          {getFilteredNavItems(mainNavItems, currentRole).slice(0, 4).map((item) => (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex flex-col items-center px-2 py-1",
                location === item.href ? "text-purple-400" : "text-neutral-400"
              )}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs mt-1">{item.label.split(' ')[0]}</span>
            </Link>
          ))}
          
          {routePermissions["/test-ai-order"].includes(currentRole) && (
            <Link 
              href="/test-ai-order"
              className={cn(
                "flex flex-col items-center px-2 py-1",
                location === "/test-ai-order" ? "text-purple-400" : "text-neutral-400"
              )}
            >
              <span className="text-xl"><Cpu className="w-5 h-5" /></span>
              <span className="text-xs mt-1">Test AI</span>
            </Link>
          )}
          
          {routePermissions["/whatsapp"].includes(currentRole) && (
            <Link 
              href="/whatsapp"
              className={cn(
                "flex flex-col items-center px-2 py-1",
                location === "/whatsapp" ? "text-purple-400" : "text-neutral-400"
              )}
            >
              <span className="text-xl"><MessageCircle className="w-5 h-5" /></span>
              <span className="text-xs mt-1">WhatsApp</span>
            </Link>
          )}
          
          {routePermissions["/phone-orders"].includes(currentRole) && (
            <Link 
              href="/phone-orders"
              className={cn(
                "flex flex-col items-center px-2 py-1",
                location === "/phone-orders" ? "text-purple-400" : "text-neutral-400"
              )}
            >
              <span className="text-xl"><Phone className="w-5 h-5" /></span>
              <span className="text-xs mt-1">Phone</span>
            </Link>
          )}
        </div>
      </nav>
      
      {/* Chat Interface */}
      {chatVisible ? (
        <div className="fixed bottom-16 md:bottom-4 right-4 z-20">
          <ChatInterface 
            userType={getUserType()}
            minimized={false}
            onMinimize={() => setChatVisible(false)}
          />
        </div>
      ) : (
        <div className="fixed bottom-20 md:bottom-4 right-4 z-20">
          <MinimizedChatButton onClick={() => setChatVisible(true)} />
        </div>
      )}
    </div>
  );
}