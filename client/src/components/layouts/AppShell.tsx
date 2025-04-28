import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import "@/assets/custom-theme.css";
import { 
  LayoutDashboard, PlusSquare, Receipt, CreditCard, Package2, Users, MenuSquare, BarChart3, LogOut,
  Menu, Bell, HandPlatter, ChevronDown, HeartPulse, MessageCircle, Phone, PhoneCall, Cpu, Activity,
  Radio, Signal, Globe, ExternalLink, Mic, Workflow, Salad, Apple, UserCog, Eye, Utensils,
  ChevronRight, PanelLeftClose, PanelLeftOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ChatInterface, MinimizedChatButton } from "@/components/chatbot/ChatInterface";
import { ColumnColorSettings } from "@/components/settings/ColumnColorSettings";
import { ThemeToggle } from "@/components/ui/theme-toggle";
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
import { SingleOrderDialog } from "@/components/orders/SingleOrderDialog";
import { useColumnColors } from "@/contexts/ColumnColorContext";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const mainNavItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: "New Order", href: "/new-order", icon: <PlusSquare className="w-5 h-5" /> },
  { label: "Kitchen Tokens", href: "/kitchen-tokens", icon: <Receipt className="w-5 h-5" /> },
  { label: "Billing", href: "/billing", icon: <CreditCard className="w-5 h-5" /> },
  { label: "Live Tracking", href: "/live-tracking", icon: <Activity className="w-5 h-5" /> },
  { label: "Health Advisor", href: "/health-advisor", icon: <HeartPulse className="w-5 h-5" /> },
  { label: "WhatsApp", href: "/whatsapp", icon: <MessageCircle className="w-5 h-5" /> },
  { label: "Phone Orders", href: "/phone-orders", icon: <Phone className="w-5 h-5" /> },
  { label: "AI Call Center", href: "/ai-call-center", icon: <PhoneCall className="w-5 h-5" /> },
  { label: "Restaurant Chatbot", href: "/chatbot", icon: <Utensils className="w-5 h-5" /> },
];

const managementNavItems: NavItem[] = [
  { label: "Inventory", href: "/inventory", icon: <Package2 className="w-5 h-5" /> },
  { label: "Customers", href: "/customers", icon: <Users className="w-5 h-5" /> },
  { label: "Menu Items", href: "/menu-items", icon: <MenuSquare className="w-5 h-5" /> },
  { label: "Diet Plan", href: "/diet-plan", icon: <Apple className="w-5 h-5" /> },
  { label: "Reports", href: "/reports", icon: <BarChart3 className="w-5 h-5" /> },
];

// Testing navigation items with Theme Test and AI Order Simulator removed
const testingNavItems: NavItem[] = [
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
  const [singleOrderOpen, setSingleOrderOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, currentRole, setCurrentRole } = useAuth();
  const { currentMode, getThemeStyles } = useTheme();

  const currentPage = mainNavItems.find(item => item.href === location) || 
                    managementNavItems.find(item => item.href === location) ||
                    testingNavItems.find(item => item.href === location) ||
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
    "/chatbot": ["admin", "manager", "waiter", "customer"],
    
    // Management routes
    "/inventory": ["admin", "manager", "kitchen"],
    "/customers": ["admin", "manager"],
    "/menu-items": ["admin", "manager", "kitchen"],
    "/reports": ["admin", "manager"],
    "/external-integration": ["admin", "manager"],
    "/voice-assistant": ["admin", "manager"],
    "/n8n-integration": ["admin", "manager"],
    "/diet-plan": ["admin", "manager", "customer"],
    "/notification-test": ["admin", "manager"],
    "/test-theme": ["admin", "manager"]
  };

  return (
    <div className="app-container flex min-h-screen h-screen w-full overflow-hidden bg-black text-white">
      {/* Collapsible Sidebar - hidden on mobile */}
      <aside className={cn(
        "hidden md:flex flex-col h-screen transition-all duration-300 bg-purple-700",
        sidebarCollapsed ? "md:w-16" : "md:w-64"
      )}>
        <div className="p-4 flex items-center justify-between border-b border-purple-800">
          <div className={cn("flex items-center", sidebarCollapsed ? "justify-center w-full" : "")}>
            <div className="h-8 w-8 rounded-md flex items-center justify-center text-white app-logo">
              <HandPlatter size={20} className="nav-item-icon" />
            </div>
            {!sidebarCollapsed && <h1 className="text-lg font-semibold ml-3 text-white">YashHotelBot</h1>}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="p-1 text-white hover:bg-purple-800"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </Button>
        </div>
        
        {sidebarCollapsed ? (
          // Collapsed sidebar - only icons
          <nav className="flex-1 pt-4 pb-4 overflow-hidden">
            <ul className="space-y-2">
              {getFilteredNavItems(mainNavItems, currentRole).map((item) => (
                <li key={item.href} className="px-4">
                  <Link 
                    href={item.href}
                    className={cn(
                      "flex justify-center items-center p-2 rounded-md",
                      location === item.href 
                        ? "text-white font-medium bg-purple-800" 
                        : "text-white hover:bg-purple-800"
                    )}
                    title={item.label}
                  >
                    {item.icon}
                  </Link>
                </li>
              ))}
              
              {getFilteredNavItems(managementNavItems, currentRole).length > 0 && 
                getFilteredNavItems(managementNavItems, currentRole).map((item) => (
                  <li key={item.href} className="px-4">
                    <Link 
                      href={item.href}
                      className={cn(
                        "flex justify-center items-center p-2 rounded-md",
                        location === item.href 
                          ? "text-white font-medium bg-purple-800" 
                          : "text-white hover:bg-purple-800"
                      )}
                      title={item.label}
                    >
                      {item.icon}
                    </Link>
                  </li>
                ))
              }
              
              {(currentRole === "admin" || currentRole === "manager") && 
                getFilteredNavItems(testingNavItems, currentRole).length > 0 && (
                  getFilteredNavItems(testingNavItems, currentRole).map((item) => (
                    <li key={item.href} className="px-4">
                      <Link 
                        href={item.href}
                        className={cn(
                          "flex justify-center items-center p-2 rounded-md",
                          location === item.href 
                            ? "text-white font-medium bg-purple-800" 
                            : "text-white hover:bg-purple-800"
                        )}
                        title={item.label}
                      >
                        {item.icon}
                      </Link>
                    </li>
                  ))
                )
              }
            </ul>
          </nav>
        ) : (
          // Expanded sidebar with accordion
          <nav className="flex-1 pt-4 pb-4 overflow-hidden">
            <Accordion type="single" defaultValue="main" collapsible={false} className="border-none">
              <AccordionItem value="main" className="border-none">
                <AccordionTrigger className="py-2 px-3 text-xs font-medium text-white uppercase tracking-wider hover:no-underline">
                  Main
                </AccordionTrigger>
                <AccordionContent className="pt-0 pb-1">
                  <ul>
                    {getFilteredNavItems(mainNavItems, currentRole).map((item) => (
                      <li key={item.href}>
                        <Link 
                          href={item.href}
                          className={cn(
                            "flex items-center px-3 py-2 text-sm font-medium rounded-md mx-2 mt-1",
                            location === item.href 
                              ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 font-medium" 
                              : "text-[#6B7280] dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-[#111827] dark:hover:text-white"
                          )}
                        >
                          <span className="mr-3 text-current">{item.icon}</span>
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
              
              {getFilteredNavItems(managementNavItems, currentRole).length > 0 && (
                <AccordionItem value="management" className="border-none">
                  <AccordionTrigger className="py-2 px-3 text-xs font-medium text-white uppercase tracking-wider hover:no-underline">
                    Management
                  </AccordionTrigger>
                  <AccordionContent className="pt-0 pb-1">
                    <ul>
                      {getFilteredNavItems(managementNavItems, currentRole).map((item) => (
                        <li key={item.href}>
                          <Link 
                            href={item.href}
                            className={cn(
                              "flex items-center px-3 py-2 text-sm font-medium rounded-md mx-2 mt-1",
                              location === item.href 
                                ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 font-medium" 
                                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white"
                            )}
                          >
                            <span className="mr-3 text-current">{item.icon}</span>
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              )}
              
              {(currentRole === "admin" || currentRole === "manager") && 
                getFilteredNavItems(testingNavItems, currentRole).length > 0 && (
                <AccordionItem value="testing" className="border-none">
                  <AccordionTrigger className="py-2 px-3 text-xs font-medium text-white uppercase tracking-wider hover:no-underline">
                    Testing
                  </AccordionTrigger>
                  <AccordionContent className="pt-0 pb-1">
                    <ul>
                      {getFilteredNavItems(testingNavItems, currentRole).map((item) => (
                        <li key={item.href}>
                          <Link 
                            href={item.href}
                            className={cn(
                              "flex items-center px-3 py-2 text-sm font-medium rounded-md mx-2 mt-1",
                              location === item.href 
                                ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 font-medium" 
                                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white"
                            )}
                          >
                            <span className="mr-3 text-current">{item.icon}</span>
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </nav>
        )}
        
        {!sidebarCollapsed && (
          <div className="p-4 border-t border-purple-800">
            <div className="text-xs text-white text-center">
              <p>YashHotelBot v1.2.0</p>
              <p className="mt-1">© 2025 Yash Solutions</p>
            </div>
          </div>
        )}
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden h-screen">
        {/* Top Bar - Black header */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 bg-black text-white border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center md:hidden mr-2">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setMobileMenuOpen(true)}
                className="bg-transparent hover:bg-purple-800"
              >
                <Menu className="h-5 w-5 text-white" />
                <span className="sr-only">Open menu</span>
              </Button>
            </div>
            
            <div className="h-8 w-8 rounded-md flex items-center justify-center text-white app-logo">
              <HandPlatter size={20} className="nav-item-icon" />
            </div>
            
            <h1 className="text-lg font-semibold text-white">{currentPage.label}</h1>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Notifications icon */}
            <Button variant="ghost" size="icon" className="relative bg-transparent hover:bg-purple-800">
              <Bell className="h-5 w-5 text-white" />
              <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-blue-500"></span>
              <span className="sr-only">Notifications</span>
            </Button>
            
            {/* Theme toggle */}
            <div className="relative">
              <ThemeToggle />
            </div>
            
            {/* WebSocket connection status */}
            <div className="relative">
              <ConnectionStatus />
            </div>
            
            {/* User menu */}
            <UserMenu />
          </div>
        </header>
        
        {/* Page Content - Black background */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-6 bg-black min-h-0">
          {children}
        </div>
      </main>

      {/* Mobile menu */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-64 p-0 border-r dark:border-gray-700" 
          style={getThemeStyles("sidebar")}>
          <div className="p-4 flex items-center space-x-3 border-b border-[#E5E7EB] dark:border-gray-700">
            <div className="h-8 w-8 rounded-md flex items-center justify-center text-white app-logo">
              <HandPlatter size={20} className="nav-item-icon" />
            </div>
            <h1 className="text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">YashHotelBot</h1>
          </div>
          
          <nav className="flex-1 pt-4 pb-4 overflow-hidden">
            <Accordion type="single" defaultValue="main" collapsible={false} className="border-none">
              <AccordionItem value="main" className="border-none">
                <AccordionTrigger className="py-2 px-3 text-xs font-medium text-[#6B7280] uppercase tracking-wider hover:no-underline">
                  Main
                </AccordionTrigger>
                <AccordionContent className="pt-0 pb-1">
                  <ul>
                    {getFilteredNavItems(mainNavItems, currentRole).map((item) => (
                      <li key={item.href}>
                        <Link 
                          href={item.href}
                          className={cn(
                            "flex items-center px-3 py-2 text-sm font-medium rounded-md mx-2 mt-1",
                            location === item.href 
                              ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 font-medium" 
                              : "text-[#6B7280] dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-[#111827] dark:hover:text-white"
                          )}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <span className="mr-3 text-current">{item.icon}</span>
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
              
              {getFilteredNavItems(managementNavItems, currentRole).length > 0 && (
                <AccordionItem value="management" className="border-none">
                  <AccordionTrigger className="py-2 px-3 text-xs font-medium text-[#6B7280] uppercase tracking-wider hover:no-underline">
                    Management
                  </AccordionTrigger>
                  <AccordionContent className="pt-0 pb-1">
                    <ul>
                      {getFilteredNavItems(managementNavItems, currentRole).map((item) => (
                        <li key={item.href}>
                          <Link 
                            href={item.href}
                            className={cn(
                              "flex items-center px-3 py-2 text-sm font-medium rounded-md mx-2 mt-1",
                              location === item.href 
                                ? "text-[#111827] font-medium underline" 
                                : "text-[#6B7280] hover:text-[#111827]"
                            )}
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <span className="mr-3 text-current">{item.icon}</span>
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              )}
              
              {(currentRole === "admin" || currentRole === "manager") && 
               getFilteredNavItems(testingNavItems, currentRole).length > 0 && (
                <AccordionItem value="testing-mobile" className="border-none">
                  <AccordionTrigger className="py-2 px-3 text-xs font-medium text-[#6B7280] uppercase tracking-wider hover:no-underline">
                    Testing
                  </AccordionTrigger>
                  <AccordionContent className="pt-0 pb-1">
                    <ul>
                      {getFilteredNavItems(testingNavItems, currentRole).map((item) => (
                        <li key={item.href}>
                          <Link 
                            href={item.href}
                            className={cn(
                              "flex items-center px-3 py-2 text-sm font-medium rounded-md mx-2 mt-1",
                              location === item.href 
                                ? "text-[#111827] font-medium underline" 
                                : "text-[#6B7280] hover:text-[#111827]"
                            )}
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <span className="mr-3 text-current">{item.icon}</span>
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </nav>
          
          <div className="p-4 border-t border-[#E5E7EB] dark:border-gray-700">
            <Button
              onClick={() => {
                setMobileMenuOpen(false);
                setChatVisible(true);
              }}
              className="w-full text-white btn-primary-custom"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat with AI Assistant
            </Button>
          </div>
        </SheetContent>
      </Sheet>
      
      {/* Chat Interface */}
      {chatVisible ? (
        <div className="fixed bottom-4 right-4 z-50">
          <ChatInterface
            onClose={() => setChatVisible(false)}
            userType={getUserType()}
          />
        </div>
      ) : (
        <div className="fixed bottom-4 right-4 z-50">
          <MinimizedChatButton onClick={() => setChatVisible(true)} />
        </div>
      )}
      
      {/* Single Order Dialog (global) */}
      <SingleOrderDialog 
        open={singleOrderOpen} 
        onClose={() => setSingleOrderOpen(false)} 
      />
    </div>
  );
}