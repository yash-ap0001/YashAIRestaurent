import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Moon, Sun, Monitor, Palette } from "lucide-react";

export default function ThemeTest() {
  const { theme, setTheme } = useTheme();
  const [selectedTab, setSelectedTab] = useState("components");

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Theme Testing Page</h1>
          <p className="text-muted-foreground">
            Test and preview theme settings for light and dark mode. Current theme: <strong>{theme}</strong>
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            variant={theme === "light" ? "default" : "outline"} 
            size="sm" 
            onClick={() => setTheme("light")}
            className="flex items-center gap-2"
          >
            <Sun className="h-4 w-4" />
            Light
          </Button>
          <Button 
            variant={theme === "dark" ? "default" : "outline"} 
            size="sm" 
            onClick={() => setTheme("dark")}
            className="flex items-center gap-2"
          >
            <Moon className="h-4 w-4" />
            Dark
          </Button>
          <Button 
            variant={theme === "system" ? "default" : "outline"} 
            size="sm" 
            onClick={() => setTheme("system")}
            className="flex items-center gap-2"
          >
            <Monitor className="h-4 w-4" />
            System
          </Button>
        </div>
      </div>

      <Tabs defaultValue={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="components">UI Components</TabsTrigger>
          <TabsTrigger value="colors">Color Variables</TabsTrigger>
        </TabsList>
        
        <TabsContent value="components" className="space-y-6 mt-6">
          <h2 className="text-2xl font-bold">Component Previews</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card Demo */}
            <Card>
              <CardHeader>
                <CardTitle>Card Component</CardTitle>
                <CardDescription>
                  Preview of card styling in the current theme
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p>This is a sample card component with content that demonstrates the current theme styling.</p>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline">Cancel</Button>
                <Button>Submit</Button>
              </CardFooter>
            </Card>
            
            {/* Button Demo */}
            <Card>
              <CardHeader>
                <CardTitle>Button Variants</CardTitle>
                <CardDescription>
                  Different button styles in the current theme
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button variant="default">Default</Button>
                  <Button variant="destructive">Destructive</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="link">Link</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button disabled>Disabled</Button>
                  <Button size="sm">Small</Button>
                  <Button size="lg">Large</Button>
                </div>
              </CardContent>
            </Card>
            
            {/* Form Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Form Controls</CardTitle>
                <CardDescription>
                  Form elements in the current theme
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="email">Email</Label>
                  <input 
                    type="email" 
                    id="email" 
                    placeholder="example@email.com" 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="airplane-mode" />
                  <Label htmlFor="airplane-mode">Airplane Mode</Label>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="colors" className="mt-6">
          <h2 className="text-2xl font-bold mb-4">Theme Color Variables</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Primary Colors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="h-12 w-full rounded-md bg-primary mb-1"></div>
                    <div className="flex justify-between text-sm">
                      <span>Primary</span>
                      <code>bg-primary</code>
                    </div>
                  </div>
                  
                  <div>
                    <div className="h-12 w-full rounded-md bg-primary-foreground border border-border mb-1"></div>
                    <div className="flex justify-between text-sm">
                      <span>Primary Foreground</span>
                      <code>bg-primary-foreground</code>
                    </div>
                  </div>
                  
                  <div>
                    <div className="h-12 w-full rounded-md bg-secondary mb-1"></div>
                    <div className="flex justify-between text-sm">
                      <span>Secondary</span>
                      <code>bg-secondary</code>
                    </div>
                  </div>
                  
                  <div>
                    <div className="h-12 w-full rounded-md bg-secondary-foreground mb-1"></div>
                    <div className="flex justify-between text-sm">
                      <span>Secondary Foreground</span>
                      <code>bg-secondary-foreground</code>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Base Colors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="h-12 w-full rounded-md bg-background border border-border mb-1"></div>
                    <div className="flex justify-between text-sm">
                      <span>Background</span>
                      <code>bg-background</code>
                    </div>
                  </div>
                  
                  <div>
                    <div className="h-12 w-full rounded-md bg-foreground mb-1"></div>
                    <div className="flex justify-between text-sm">
                      <span>Foreground</span>
                      <code>bg-foreground</code>
                    </div>
                  </div>
                  
                  <div>
                    <div className="h-12 w-full rounded-md bg-card border border-border mb-1"></div>
                    <div className="flex justify-between text-sm">
                      <span>Card</span>
                      <code>bg-card</code>
                    </div>
                  </div>
                  
                  <div>
                    <div className="h-12 w-full rounded-md bg-card-foreground mb-1"></div>
                    <div className="flex justify-between text-sm">
                      <span>Card Foreground</span>
                      <code>bg-card-foreground</code>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Theme Implementation Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-2">
            <li>The theme system uses CSS variables defined in <code>index.css</code> with different values for light and dark modes.</li>
            <li>The active theme is stored in localStorage and restored on page reload.</li>
            <li>System theme detection uses the <code>prefers-color-scheme</code> media query.</li>
            <li>Theme changes are applied by adding <code>.dark</code> or <code>.light</code> class to the document root element.</li>
            <li>Components use Tailwind CSS classes that reference theme variables (e.g., <code>bg-background</code>, <code>text-foreground</code>).</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}