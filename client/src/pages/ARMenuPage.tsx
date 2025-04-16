import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Scan } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ARMenuViewer from '@/components/menu/ARMenuViewer';
import { MenuItem } from '@shared/schema';

const ARMenuPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [arDialogOpen, setArDialogOpen] = useState(false);
  
  const { data: menuItems, isLoading } = useQuery<MenuItem[]>({
    queryKey: ['/api/menu-items'],
  });
  
  // Filter menu items based on search query
  const filteredMenuItems = menuItems ? menuItems.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.dietaryTags?.some(tag => 
      tag.toLowerCase().includes(searchQuery.toLowerCase())
    )
  ) : [];
  
  // Group menu items by category
  const menuByCategory: Record<string, MenuItem[]> = {};
  
  if (filteredMenuItems.length > 0) {
    filteredMenuItems.forEach(item => {
      const category = item.category || 'Other';
      if (!menuByCategory[category]) {
        menuByCategory[category] = [];
      }
      menuByCategory[category].push(item);
    });
  }
  
  return (
    <div className="container mx-auto p-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">AR Menu Experience</h1>
        <p className="text-muted-foreground">
          Preview dishes in 3D before ordering. Rotate and zoom to see every detail!
        </p>
      </div>
      
      <div className="relative mb-6">
        <Input
          type="text"
          placeholder="Search dishes, categories, or dietary preferences..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10"
        />
        <Scan className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading menu items...</span>
        </div>
      ) : filteredMenuItems.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold mb-2">No menu items found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search or check back later for new additions.
          </p>
        </div>
      ) : (
        <Tabs defaultValue={Object.keys(menuByCategory)[0] || 'all'}>
          <TabsList className="mb-6 flex flex-wrap">
            {Object.keys(menuByCategory).map((category) => (
              <TabsTrigger key={category} value={category}>
                {category}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {Object.entries(menuByCategory).map(([category, items]) => (
            <TabsContent key={category} value={category} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((item) => (
                  <Card key={item.id} className="overflow-hidden h-full flex flex-col">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-xl">{item.name}</CardTitle>
                        <div className="text-xl font-bold">₹{item.price}</div>
                      </div>
                      <CardDescription>
                        {item.description || 'No description available'}
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="flex-grow">
                      <div className="flex flex-wrap gap-2 mb-4">
                        {item.dietaryTags?.map((tag) => (
                          <Badge key={tag} variant="outline">{tag}</Badge>
                        ))}
                      </div>
                      
                      {/* Simple placeholder for dish image */}
                      <div className="bg-muted rounded-md w-full h-32 flex items-center justify-center mb-4">
                        <span className="text-muted-foreground">Dish image</span>
                      </div>
                    </CardContent>
                    
                    <CardFooter className="pt-0">
                      <Button 
                        variant="default" 
                        className="w-full" 
                        onClick={() => {
                          setSelectedMenuItem(item);
                          setArDialogOpen(true);
                        }}
                      >
                        View in 3D
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
      
      {/* AR Viewer Dialog */}
      <Dialog open={arDialogOpen} onOpenChange={setArDialogOpen}>
        <DialogContent className="sm:max-w-[90vw] sm:max-h-[90vh] h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedMenuItem?.name} - 3D Preview</DialogTitle>
            <DialogDescription>
              Rotate the dish with your mouse. Zoom in and out to see details.
            </DialogDescription>
          </DialogHeader>
          
          <div className="h-full w-full pt-4">
            {selectedMenuItem && (
              <ARMenuViewer dishName={selectedMenuItem.name} />
            )}
          </div>
          
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-muted-foreground">
              {selectedMenuItem?.dietaryTags?.join(', ')}
            </div>
            <div className="text-xl font-bold">
              ₹{selectedMenuItem?.price}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ARMenuPage;