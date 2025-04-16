import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
// Note: TypeScript might not find the OrbitControls, but it will work at runtime
// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CameraIcon, Image, RotateCw } from "lucide-react";
import { MenuItem } from "@shared/schema";

interface ARMenuPreviewProps {
  menuItem: MenuItem;
  onClose: () => void;
}

const ARMenuPreview: React.FC<ARMenuPreviewProps> = ({ menuItem, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<'3d' | 'ar'>('3d');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // This will store the ThreeJS instances
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    model: THREE.Mesh;
    light: THREE.DirectionalLight;
    ambientLight: THREE.AmbientLight;
    animationId: number | null;
  } | null>(null);

  // Initialize the 3D scene
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    
    try {
      setIsLoading(true);
      const canvas = canvasRef.current;
      const container = containerRef.current;
      
      // Create scene, camera, and renderer
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf5f5f5);
      
      const camera = new THREE.PerspectiveCamera(
        75, 
        container.clientWidth / container.clientHeight, 
        0.1, 
        1000
      );
      camera.position.z = 5;
      
      const renderer = new THREE.WebGLRenderer({ 
        canvas,
        antialias: true,
        alpha: true // transparent background
      });
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      
      // Add lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);
      
      const light = new THREE.DirectionalLight(0xffffff, 0.8);
      light.position.set(0, 10, 10);
      scene.add(light);
      
      // Create a basic model - this will be replaced with the actual food model
      const geometry = createFoodGeometry(menuItem.name);
      const material = new THREE.MeshStandardMaterial({ 
        color: getFoodColor(menuItem.name),
        roughness: 0.7,
        metalness: 0.1
      });
      const model = new THREE.Mesh(geometry, material);
      scene.add(model);
      
      // Add a platform/plate under the food
      const plateGeometry = new THREE.CylinderGeometry(2, 2, 0.2, 32);
      const plateMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffffff,
        roughness: 0.3,
        metalness: 0.2
      });
      const plate = new THREE.Mesh(plateGeometry, plateMaterial);
      plate.position.y = -1.5;
      scene.add(plate);
      
      // Add OrbitControls for interaction
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.minDistance = 3;
      controls.maxDistance = 10;
      controls.maxPolarAngle = Math.PI / 2;
      
      // Animation function
      const animate = () => {
        model.rotation.y += 0.005;
        controls.update();
        renderer.render(scene, camera);
        sceneRef.current!.animationId = requestAnimationFrame(animate);
      };
      
      // Store references for cleanup
      sceneRef.current = {
        scene,
        camera,
        renderer,
        controls,
        model,
        light,
        ambientLight,
        animationId: null
      };
      
      // Handle window resize
      const handleResize = () => {
        if (!container || !sceneRef.current) return;
        
        const { camera, renderer } = sceneRef.current;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
      };
      
      window.addEventListener('resize', handleResize);
      
      // Start animation
      sceneRef.current.animationId = requestAnimationFrame(animate);
      setIsLoading(false);
      
      // Cleanup function
      return () => {
        if (sceneRef.current?.animationId) {
          cancelAnimationFrame(sceneRef.current.animationId);
        }
        window.removeEventListener('resize', handleResize);
        
        // Dispose geometries and materials to prevent memory leaks
        model.geometry.dispose();
        (model.material as THREE.Material).dispose();
        plateGeometry.dispose();
        plateMaterial.dispose();
        
        // Remove event listeners from controls
        controls.dispose();
      };
    } catch (err) {
      console.error("Error initializing 3D scene:", err);
      setError("Failed to load 3D preview. Please try again.");
      setIsLoading(false);
    }
  }, [menuItem.name]);
  
  // Create different geometries based on food type
  const createFoodGeometry = (foodName: string): THREE.BufferGeometry => {
    const lowerName = foodName.toLowerCase();
    
    // Create different shapes based on food type
    if (lowerName.includes('pizza')) {
      // Create a pizza shape (cylinder with small height)
      return new THREE.CylinderGeometry(2, 2, 0.3, 32);
    } else if (lowerName.includes('burger')) {
      // Create a burger shape (stacked cylinders)
      const group = new THREE.Group();
      
      // Bottom bun
      const bottomBun = new THREE.Mesh(
        new THREE.CylinderGeometry(1.2, 1, 0.3, 32),
        new THREE.MeshStandardMaterial({ color: 0xe0a861 })
      );
      bottomBun.position.y = -0.6;
      group.add(bottomBun);
      
      // Patty
      const patty = new THREE.Mesh(
        new THREE.CylinderGeometry(1.1, 1.1, 0.3, 32),
        new THREE.MeshStandardMaterial({ color: 0x5c3518 })
      );
      patty.position.y = -0.3;
      group.add(patty);
      
      // Cheese
      const cheese = new THREE.Mesh(
        new THREE.CylinderGeometry(1.15, 1.15, 0.1, 32),
        new THREE.MeshStandardMaterial({ color: 0xfcd444 })
      );
      cheese.position.y = -0.1;
      group.add(cheese);
      
      // Lettuce
      const lettuce = new THREE.Mesh(
        new THREE.CylinderGeometry(1.2, 1.2, 0.15, 32),
        new THREE.MeshStandardMaterial({ color: 0x3cb043 })
      );
      lettuce.position.y = 0.1;
      group.add(lettuce);
      
      // Top bun
      const topBun = new THREE.Mesh(
        new THREE.CylinderGeometry(1, 1.2, 0.6, 32),
        new THREE.MeshStandardMaterial({ color: 0xe0a861 })
      );
      topBun.position.y = 0.4;
      group.add(topBun);
      
      // Return a simple geometry for now
      // In real implementation, we would return a custom geometry for the group
      return new THREE.SphereGeometry(1, 32, 32);
    } else if (lowerName.includes('curry') || lowerName.includes('soup')) {
      // Bowl of curry or soup
      return new THREE.SphereGeometry(1.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    } else if (lowerName.includes('noodle') || lowerName.includes('pasta')) {
      // Bowl of noodles or pasta
      return new THREE.TorusKnotGeometry(1, 0.3, 100, 16);
    } else if (lowerName.includes('ice cream') || lowerName.includes('dessert')) {
      // Ice cream cone
      return new THREE.ConeGeometry(1, 2, 32);
    } else {
      // Default food shape for other items
      return new THREE.SphereGeometry(1.5, 32, 32);
    }
  };
  
  // Get appropriate color based on food type
  const getFoodColor = (foodName: string): number => {
    const lowerName = foodName.toLowerCase();
    
    if (lowerName.includes('pizza')) {
      return 0xd6723b; // Reddish-orange for pizza
    } else if (lowerName.includes('burger')) {
      return 0xa86038; // Brown for burger
    } else if (lowerName.includes('curry')) {
      return 0xf3ce5e; // Yellow/orange for curry
    } else if (lowerName.includes('noodle') || lowerName.includes('pasta')) {
      return 0xf0e68c; // Pale yellow for noodles/pasta
    } else if (lowerName.includes('salad') || lowerName.includes('vegetable')) {
      return 0x4caf50; // Green for salads
    } else if (lowerName.includes('ice cream')) {
      return 0xfae0dd; // Pale pink for ice cream
    } else if (lowerName.includes('chicken')) {
      return 0xe9c79e; // Light brown for chicken
    } else if (lowerName.includes('fish') || lowerName.includes('seafood')) {
      return 0xf5f5dc; // Beige for fish/seafood
    } else {
      return 0xf5deb3; // Default food color (wheat)
    }
  };
  
  const handleARMode = () => {
    if (!navigator.xr) {
      setError("WebXR is not supported in your browser");
      return;
    }
    
    setMode('ar');
    // Implementation of AR would go here
    // For now, we'll just show a message
    alert("AR mode is not fully implemented in this demo. This would launch the device camera.");
  };
  
  const resetView = () => {
    if (!sceneRef.current) return;
    
    const { camera, controls } = sceneRef.current;
    camera.position.set(0, 0, 5);
    controls.reset();
  };
  
  return (
    <Card className="w-full max-w-3xl mx-auto overflow-hidden">
      <div className="bg-primary p-4 text-primary-foreground flex justify-between items-center">
        <h2 className="text-xl font-bold">{menuItem.name} - 3D Preview</h2>
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </div>
      
      <CardContent className="p-0">
        <Tabs defaultValue="3d" onValueChange={(value) => setMode(value as '3d' | 'ar')}>
          <div className="bg-muted p-2 border-b">
            <TabsList>
              <TabsTrigger value="3d" className="flex items-center gap-2">
                <Image size={16} />
                <span>3D View</span>
              </TabsTrigger>
              <TabsTrigger value="ar" className="flex items-center gap-2">
                <CameraIcon size={16} />
                <span>AR View</span>
              </TabsTrigger>
            </TabsList>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-2 float-right"
              onClick={resetView}
            >
              <RotateCw size={16} className="mr-1" />
              Reset View
            </Button>
          </div>
          
          <div ref={containerRef} className="aspect-video w-full relative">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            )}
            
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                <div className="text-destructive text-center p-4">
                  <p className="font-bold">{error}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => setError(null)}
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            )}
            
            <TabsContent value="3d" className="m-0 h-full">
              <canvas ref={canvasRef} className="w-full h-full" />
            </TabsContent>
            
            <TabsContent value="ar" className="m-0 h-full">
              <div className="w-full h-full flex flex-col items-center justify-center p-6">
                <div className="mb-4 text-center">
                  <p className="text-lg font-medium">
                    Point your camera at a flat surface to place the dish.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    This feature requires camera access and AR support in your browser.
                  </p>
                </div>
                
                <Button 
                  variant="default" 
                  size="lg" 
                  className="mt-4"
                  onClick={handleARMode}
                >
                  <CameraIcon className="mr-2 h-5 w-5" />
                  Launch AR View
                </Button>
              </div>
            </TabsContent>
          </div>
        </Tabs>
        
        <div className="p-4">
          <h3 className="font-bold text-lg mb-2">{menuItem.name}</h3>
          <p className="text-muted-foreground mb-3">{menuItem.description || 'No description available'}</p>
          <div className="flex justify-between items-center">
            <div className="text-lg font-bold">₹{menuItem.price.toFixed(2)}</div>
            <Button variant="default">Add to Order</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ARMenuPreview;