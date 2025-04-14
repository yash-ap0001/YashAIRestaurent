import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, PlusSquare, Receipt, CreditCard, Package2, Users, MenuSquare, BarChart3, LogOut,
  Menu, Bell, HandPlatter, ChevronDown, HeartPulse, MessageCircle, Phone, PhoneCall, Cpu, Activity,
  Radio, Signal, Globe, ExternalLink, Mic
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ChatInterface, MinimizedChatButton } from "@/components/chatbot/ChatInterface";

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
];

const managementNavItems: NavItem[] = [
  { label: "Inventory", href: "/inventory", icon: <Package2 className="w-5 h-5" /> },
  { label: "Customers", href: "/customers", icon: <Users className="w-5 h-5" /> },
  { label: "Menu Items", href: "/menu-items", icon: <MenuSquare className="w-5 h-5" /> },
  { label: "Reports", href: "/reports", icon: <BarChart3 className="w-5 h-5" /> },
];

const testingNavItems: NavItem[] = [
  { label: "AI Order Simulator", href: "/test-ai-order", icon: <Cpu className="w-5 h-5" /> },
  { label: "External Integration", href: "/external-integration", icon: <ExternalLink className="w-5 h-5" /> },
  { label: "Voice Assistant", href: "/voice-assistant", icon: <Mic className="w-5 h-5" /> },
];

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);

  const currentPage = mainNavItems.find(item => item.href === location) || 
                      managementNavItems.find(item => item.href === location) ||
                      { label: "Dashboard" };
                      
  // Determine the user type based on the current location
  const getUserType = () => {
    if (location.includes("kitchen")) {
      return "kitchen";
    }
    
    const adminRoutes = ["/inventory", "/customers", "/menu-items", "/reports"];
    if (adminRoutes.some(route => location === route)) {
      return "admin";
    }
    
    return "customer";
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
            {mainNavItems.map((item) => (
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
          
          <div className="px-3 mb-2 mt-6">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Management</p>
          </div>
          <ul>
            {managementNavItems.map((item) => (
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
          
          <div className="px-3 mb-2 mt-6">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Testing</p>
          </div>
          <ul>
            {testingNavItems.map((item) => (
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
        </nav>
        
        <div className="p-4 border-t border-neutral-800">
          <div className="flex items-center">
            <Avatar className="h-8 w-8">
              <AvatarImage src="https://images.unsplash.com/photo-1568602471122-7832951cc4c5?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=facearea&facepad=2&w=300&h=300&q=80" />
              <AvatarFallback>YS</AvatarFallback>
            </Avatar>
            <div className="ml-3">
              <p className="text-sm font-medium text-neutral-200">Yash Sharma</p>
              <p className="text-xs text-neutral-400">Admin</p>
            </div>
            <Button variant="ghost" size="icon" className="ml-auto">
              <LogOut className="h-4 w-4 text-neutral-400 hover:text-purple-400" />
            </Button>
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
            <div className="relative">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5 text-neutral-300" />
                <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-purple-500"></span>
                <span className="sr-only">Notifications</span>
              </Button>
            </div>
            
            <div className="md:hidden">
              <Avatar className="h-8 w-8">
                <AvatarImage src="https://images.unsplash.com/photo-1568602471122-7832951cc4c5?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=facearea&facepad=2&w=300&h=300&q=80" />
                <AvatarFallback>YS</AvatarFallback>
              </Avatar>
            </div>
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
              {mainNavItems.map((item) => (
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
            
            <div className="px-3 mb-2 mt-6">
              <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Management</p>
            </div>
            <ul>
              {managementNavItems.map((item) => (
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
            
            <div className="px-3 mb-2 mt-6">
              <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Testing</p>
            </div>
            <ul>
              {testingNavItems.map((item) => (
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
          </nav>
          
          <div className="p-4 border-t border-neutral-800">
            <div className="flex items-center">
              <Avatar className="h-8 w-8">
                <AvatarImage src="https://images.unsplash.com/photo-1568602471122-7832951cc4c5?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=facearea&facepad=2&w=300&h=300&q=80" />
                <AvatarFallback>YS</AvatarFallback>
              </Avatar>
              <div className="ml-3">
                <p className="text-sm font-medium text-neutral-200">Yash Sharma</p>
                <p className="text-xs text-neutral-400">Admin</p>
              </div>
              <Button variant="ghost" size="icon" className="ml-auto">
                <LogOut className="h-4 w-4 text-neutral-400 hover:text-purple-400" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      
      {/* Mobile Bottom Navigation - visible only on small screens */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-neutral-800 px-4 py-2 z-10">
        <div className="flex justify-around">
          {mainNavItems.slice(0, 4).map((item) => (
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
          <Link 
            href="/ai-call-center"
            className={cn(
              "flex flex-col items-center px-2 py-1",
              location === "/ai-call-center" ? "text-purple-400" : "text-neutral-400"
            )}
          >
            <span className="text-xl"><PhoneCall className="w-5 h-5" /></span>
            <span className="text-xs mt-1">AI Call</span>
          </Link>
        </div>
      </nav>
      
      {/* Chatbot UI */}
      {chatVisible ? (
        <ChatInterface 
          userType={getUserType()}
          minimized={false}
          onMinimize={() => setChatVisible(false)}
        />
      ) : (
        <MinimizedChatButton onClick={() => setChatVisible(true)} />
      )}
    </div>
  );
}
