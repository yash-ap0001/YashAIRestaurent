import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MenuItem } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Search, SearchCheck, Tag } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import ARMenuPreview from '@/components/menu/ARMenuPreview';
import { Badge } from '@/components/ui/badge';

export default function ARMenuPreviewPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);

  // Fetch menu items
  const {
    data: menuItems,
    isLoading,
    error
  } = useQuery<MenuItem[]>({
    queryKey: ['/api/menu-items'],
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div className="mt-4 text-muted-foreground">Loading menu items...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-destructive font-bold">Error loading menu items</div>
        <div className="mt-4 text-muted-foreground">
          {(error as Error).message}
        </div>
      </div>
    );
  }

  // Get unique categories from menu items
  const categories = menuItems 
    ? Array.from(new Set(menuItems.map(item => item.category || 'Uncategorized')))
    : [];

  // Filter menu items by search term and category
  const filteredMenuItems = menuItems
    ? menuItems.filter(item => {
        const matchesSearch = 
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.description ? item.description.toLowerCase().includes(searchTerm.toLowerCase()) : false);
        
        const matchesCategory = 
          !selectedCategory || item.category === selectedCategory;
        
        return matchesSearch && matchesCategory;
      })
    : [];

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6">Menu Preview with AR</h1>
      
      <div className="flex flex-col md:flex-row gap-6">
        {/* Menu items section */}
        <div className="w-full md:w-2/3">
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search menu items..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Tabs
              defaultValue="all"
              value={selectedCategory || 'all'}
              onValueChange={(value) => setSelectedCategory(value === 'all' ? null : value)}
              className="w-full sm:w-auto"
            >
              <TabsList className="w-full">
                <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
                {categories.map(category => (
                  <TabsTrigger key={category} value={category} className="flex-1">
                    {category}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMenuItems.map(item => (
              <Card key={item.id} className="overflow-hidden h-full flex flex-col">
                <div className="aspect-video bg-muted relative overflow-hidden">
                  {/* Placeholder for menu item image */}
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/40">
                    <Tag className="h-12 w-12 text-primary-foreground/50" />
                  </div>
                </div>
                
                <CardHeader className="pb-2">
                  <CardTitle>{item.name}</CardTitle>
                </CardHeader>
                
                <CardContent className="pb-2 flex-grow">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {item.description || "No description available"}
                  </p>
                  
                  <div className="mt-2 flex flex-wrap gap-1">
                    {item.dietaryTags && item.dietaryTags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
                
                <CardFooter className="flex justify-between items-center">
                  <div className="font-bold">₹{item.price.toFixed(2)}</div>
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={() => setSelectedMenuItem(item)}
                    className="flex items-center gap-1"
                  >
                    <Eye className="h-4 w-4" />
                    <span>View in 3D</span>
                  </Button>
                </CardFooter>
              </Card>
            ))}
            
            {filteredMenuItems.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center p-8 text-center">
                <SearchCheck className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-xl font-medium">No menu items found</p>
                <p className="text-muted-foreground">
                  Try adjusting your search or category filter
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* AR Preview section - show placeholder when no item is selected */}
        <div className="w-full md:w-1/3">
          {selectedMenuItem ? (
            <ARMenuPreview 
              menuItem={selectedMenuItem} 
              onClose={() => setSelectedMenuItem(null)} 
            />
          ) : (
            <Card className="h-full flex flex-col items-center justify-center p-8 text-center">
              <Eye className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-xl font-bold mb-2">3D Menu Preview</h2>
              <p className="text-muted-foreground mb-4">
                Select a menu item from the list to view it in 3D or Augmented Reality
              </p>
              <div className="bg-muted p-4 rounded-lg text-sm">
                <p className="font-medium">Experience our food in 3D!</p>
                <ul className="list-disc list-inside mt-2 text-muted-foreground">
                  <li>Rotate and zoom to see details</li>
                  <li>Use AR mode to place dishes on your table</li>
                  <li>Visualize portion sizes before ordering</li>
                </ul>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}