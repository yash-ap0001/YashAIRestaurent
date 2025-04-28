import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
// Fix for OrbitControls import
// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Button } from '@/components/ui/button';
import { Loader2, Maximize2, Minimize2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface ARMenuViewerProps {
  dishName: string;
  modelPath?: string; // Path to the 3D model (if we have one)
}

const ARMenuViewer: React.FC<ARMenuViewerProps> = ({ dishName, modelPath }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize and set up the 3D scene
  useEffect(() => {
    if (!containerRef.current) return;

    // Create scene, camera, and renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 5;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Add orbit controls for user interaction
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enableZoom = true;
    controlsRef.current = controls;

    // Add ambient light so we can see the model
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Add directional light for shadows
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // For testing, create a simple placeholder 3D model
    // In a production app, we would load actual dish models here
    setLoading(true);
    
    try {
      // Create a group for our dish
      const dishGroup = new THREE.Group();
      
      // Create a plate/base for all dishes
      const plateGeometry = new THREE.CylinderGeometry(1.5, 1.5, 0.1, 32);
      const plateMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xf5f5f5, 
        shininess: 100,
        specular: 0x111111
      });
      const plate = new THREE.Mesh(plateGeometry, plateMaterial);
      plate.position.y = -0.2; // Position plate below the food
      dishGroup.add(plate);
      
      // Create different food models based on dish name
      if (dishName.toLowerCase().includes('soup') || dishName.toLowerCase().includes('curry')) {
        // Create bowl
        const bowlOuterGeometry = new THREE.CylinderGeometry(1, 0.8, 0.5, 32);
        const bowlInnerGeometry = new THREE.CylinderGeometry(0.9, 0.7, 0.5, 32);
        const bowlMaterial = new THREE.MeshPhongMaterial({ 
          color: 0xefefef, 
          shininess: 100,
          specular: 0x333333
        });
        
        const bowlOuter = new THREE.Mesh(bowlOuterGeometry, bowlMaterial);
        bowlOuter.position.y = 0.1;
        dishGroup.add(bowlOuter);
        
        // Create soup/curry liquid with realistic material
        const soupGeometry = new THREE.CylinderGeometry(0.85, 0.65, 0.4, 32);
        let soupColor = 0xe25822; // Default tomato soup color
        
        if (dishName.toLowerCase().includes('tomato')) {
          soupColor = 0xe25822; // Tomato red
        } else if (dishName.toLowerCase().includes('spinach') || dishName.toLowerCase().includes('palak')) {
          soupColor = 0x2e8b57; // Dark green for spinach
        } else if (dishName.toLowerCase().includes('chicken')) {
          soupColor = 0xd4a76a; // Chicken soup color
        } else if (dishName.toLowerCase().includes('lentil') || dishName.toLowerCase().includes('dal')) {
          soupColor = 0xffc125; // Yellow for dal
        } else if (dishName.toLowerCase().includes('cream')) {
          soupColor = 0xfdf5e6; // Creamy white
        }
        
        const soupMaterial = new THREE.MeshPhongMaterial({ 
          color: soupColor,
          transparent: true,
          opacity: 0.9,
          shininess: 30
        });
        
        const soup = new THREE.Mesh(soupGeometry, soupMaterial);
        soup.position.y = 0.15;
        dishGroup.add(soup);
        
        // Add garnish on top (herbs or cream)
        if (!dishName.toLowerCase().includes('plain')) {
          const garnishCount = 8;
          const garnishGeometry = new THREE.SphereGeometry(0.05, 8, 8);
          const garnishMaterial = new THREE.MeshPhongMaterial({ 
            color: dishName.toLowerCase().includes('cream') ? 0xffffff : 0x2e8b57 
          });
          
          for (let i = 0; i < garnishCount; i++) {
            const garnish = new THREE.Mesh(garnishGeometry, garnishMaterial);
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 0.6;
            garnish.position.set(
              Math.cos(angle) * radius,
              0.4, // Just on the soup surface
              Math.sin(angle) * radius
            );
            dishGroup.add(garnish);
          }
        }
        
      } else if (dishName.toLowerCase().includes('pizza')) {
        // Create pizza base with texture
        const pizzaGeometry = new THREE.CylinderGeometry(1.2, 1.2, 0.1, 32);
        
        // Create textured crust material
        const crustMaterial = new THREE.MeshPhongMaterial({ 
          color: 0xe2c38d,  // Crust color
          shininess: 10
        });
        
        // Create sauce material
        const sauceMaterial = new THREE.MeshPhongMaterial({ 
          color: 0xb22222,  // Tomato sauce
          shininess: 20
        });
        
        // Create cheese material with specular highlights
        const cheeseMaterial = new THREE.MeshPhongMaterial({ 
          color: 0xf5deb3,  // Cheese color
          shininess: 30,
          specular: 0x111111
        });
        
        // Pizza base
        const pizzaBase = new THREE.Mesh(pizzaGeometry, crustMaterial);
        dishGroup.add(pizzaBase);
        
        // Pizza sauce layer (slightly smaller and on top of base)
        const sauceGeometry = new THREE.CylinderGeometry(1.15, 1.15, 0.03, 32);
        const pizzaSauce = new THREE.Mesh(sauceGeometry, sauceMaterial);
        pizzaSauce.position.y = 0.06; // Stack on top of the base
        dishGroup.add(pizzaSauce);
        
        // Pizza cheese layer (slightly smaller than sauce)
        const cheeseGeometry = new THREE.CylinderGeometry(1.1, 1.1, 0.03, 32);
        const pizzaCheese = new THREE.Mesh(cheeseGeometry, cheeseMaterial);
        pizzaCheese.position.y = 0.09; // Stack on top of the sauce
        dishGroup.add(pizzaCheese);
        
        // Add toppings
        const toppingCount = 20;
        const pepperoniMaterial = new THREE.MeshPhongMaterial({ color: 0x8b0000 }); // Dark red
        const mushroomMaterial = new THREE.MeshPhongMaterial({ color: 0x8b7355 }); // Brown
        const oliveMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 }); // Black
        
        for (let i = 0; i < toppingCount; i++) {
          // Choose topping type based on pizza variety
          let toppingGeometry, toppingMaterial;
          if (dishName.toLowerCase().includes('pepperoni')) {
            toppingGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.02, 12);
            toppingMaterial = pepperoniMaterial;
          } else if (dishName.toLowerCase().includes('mushroom')) {
            toppingGeometry = new THREE.SphereGeometry(0.1, 8, 8);
            toppingMaterial = mushroomMaterial;
          } else if (dishName.toLowerCase().includes('olive')) {
            toppingGeometry = new THREE.RingGeometry(0.05, 0.1, 12);
            toppingMaterial = oliveMaterial;
          } else {
            // Mix of toppings for supreme
            const toppingType = Math.floor(Math.random() * 3);
            if (toppingType === 0) {
              toppingGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.02, 12);
              toppingMaterial = pepperoniMaterial;
            } else if (toppingType === 1) {
              toppingGeometry = new THREE.SphereGeometry(0.1, 8, 8);
              toppingMaterial = mushroomMaterial;
            } else {
              toppingGeometry = new THREE.RingGeometry(0.05, 0.1, 12);
              toppingMaterial = oliveMaterial;
            }
          }
          
          const topping = new THREE.Mesh(toppingGeometry, toppingMaterial);
          
          // Random position within pizza circle
          const angle = Math.random() * Math.PI * 2;
          const radius = Math.random() * 0.9; // Keep within pizza radius
          
          topping.position.set(
            Math.cos(angle) * radius,
            0.12, // Just above cheese
            Math.sin(angle) * radius
          );
          
          // Only rotate rings (olives)
          if (toppingGeometry instanceof THREE.RingGeometry) {
            topping.rotation.x = Math.PI / 2; // Lay flat
          }
          
          dishGroup.add(topping);
        }
        
      } else if (dishName.toLowerCase().includes('biryani') || dishName.toLowerCase().includes('rice')) {
        // Create main rice mound
        const riceGeometry = new THREE.SphereGeometry(1, 32, 32);
        riceGeometry.scale(1, 0.6, 1); // Flatten the sphere for a rice mound
        
        let riceColor = 0xf8e8b0; // Default rice color
        
        if (dishName.toLowerCase().includes('veg')) {
          riceColor = 0xf5f5dc; // Lighter for veg biryani
        } else if (dishName.toLowerCase().includes('chicken')) {
          riceColor = 0xf0e68c; // Slightly yellowish
        } else if (dishName.toLowerCase().includes('mutton')) {
          riceColor = 0xdeb887; // Darker for mutton biryani
        }
        
        const riceMaterial = new THREE.MeshPhongMaterial({ 
          color: riceColor,
          shininess: 5 // Rice isn't very shiny
        });
        
        const riceMound = new THREE.Mesh(riceGeometry, riceMaterial);
        riceMound.position.y = 0.2;
        dishGroup.add(riceMound);
        
        // Add individual rice grains for texture
        const grainsCount = 100;
        const grainGeometry = new THREE.BoxGeometry(0.05, 0.02, 0.2);
        const grainMaterial = new THREE.MeshPhongMaterial({ 
          color: 0xfffaf0, // Slightly whiter than the mound
          shininess: 30
        });
        
        for (let i = 0; i < grainsCount; i++) {
          const grain = new THREE.Mesh(grainGeometry, grainMaterial);
          
          // Position grains on the surface of the mound
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.random() * Math.PI / 2; // Upper hemisphere only
          const radius = 0.9 + Math.random() * 0.2; // Slightly varied radius
          
          grain.position.set(
            radius * Math.sin(phi) * Math.cos(theta),
            0.2 + radius * Math.cos(phi), // Offset by mound position
            radius * Math.sin(phi) * Math.sin(theta)
          );
          
          // Random rotation for natural look
          grain.rotation.x = Math.random() * Math.PI;
          grain.rotation.y = Math.random() * Math.PI;
          grain.rotation.z = Math.random() * Math.PI;
          
          dishGroup.add(grain);
        }
        
        // Add garnishes (saffron, herbs, etc.)
        const garnishCount = 20;
        const saffronGeometry = new THREE.BoxGeometry(0.01, 0.01, 0.07);
        const saffronMaterial = new THREE.MeshPhongMaterial({ color: 0xff4500 }); // Orange-red
        const mintGeometry = new THREE.PlaneGeometry(0.1, 0.2);
        const mintMaterial = new THREE.MeshPhongMaterial({ 
          color: 0x00aa00,
          side: THREE.DoubleSide
        });
        
        for (let i = 0; i < garnishCount; i++) {
          const isHerb = Math.random() > 0.6;
          const garnish = new THREE.Mesh(
            isHerb ? mintGeometry : saffronGeometry,
            isHerb ? mintMaterial : saffronMaterial
          );
          
          // Position garnishes on top of rice
          const theta = Math.random() * Math.PI * 2;
          const radius = Math.random() * 0.8;
          
          garnish.position.set(
            radius * Math.cos(theta),
            0.7 + Math.random() * 0.1, // Top of rice
            radius * Math.sin(theta)
          );
          
          // Random rotation
          garnish.rotation.x = Math.random() * Math.PI;
          garnish.rotation.y = Math.random() * Math.PI;
          garnish.rotation.z = Math.random() * Math.PI;
          
          dishGroup.add(garnish);
        }
      } else if (dishName.toLowerCase().includes('cake') || dishName.toLowerCase().includes('pastry')) {
        // Base cake layer
        const cakeGeometry = new THREE.CylinderGeometry(1, 1, 0.7, 32);
        
        let cakeColor = 0xf5deb3; // Default vanilla cake
        
        if (dishName.toLowerCase().includes('chocolate')) {
          cakeColor = 0x3c280d; // Chocolate brown
        } else if (dishName.toLowerCase().includes('red velvet')) {
          cakeColor = 0xb22222; // Deep red
        } else if (dishName.toLowerCase().includes('strawberry')) {
          cakeColor = 0xffb6c1; // Light pink
        }
        
        const cakeMaterial = new THREE.MeshPhongMaterial({ 
          color: cakeColor,
          shininess: 10
        });
        
        const cake = new THREE.Mesh(cakeGeometry, cakeMaterial);
        cake.position.y = 0.15;
        dishGroup.add(cake);
        
        // Frosting on top
        const frostingGeometry = new THREE.CylinderGeometry(1.05, 1, 0.2, 32);
        
        let frostingColor = 0xffffff; // Default white frosting
        
        if (dishName.toLowerCase().includes('chocolate frosting')) {
          frostingColor = 0x3c1f0d; // Dark chocolate
        } else if (dishName.toLowerCase().includes('strawberry')) {
          frostingColor = 0xff69b4; // Pink
        } else if (dishName.toLowerCase().includes('buttercream')) {
          frostingColor = 0xfff8dc; // Cream
        }
        
        const frostingMaterial = new THREE.MeshPhongMaterial({ 
          color: frostingColor,
          shininess: 80,
          specular: 0x333333
        });
        
        const frosting = new THREE.Mesh(frostingGeometry, frostingMaterial);
        frosting.position.y = 0.6; // Top of cake
        dishGroup.add(frosting);
        
        // Add decorations
        if (dishName.toLowerCase().includes('fruit') || 
            dishName.toLowerCase().includes('berry') || 
            dishName.toLowerCase().includes('strawberry')) {
          // Add berries
          const berryCount = 10;
          const berryGeometry = new THREE.SphereGeometry(0.1, 16, 16);
          const strawberryMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xff0000, 
            shininess: 100,
            specular: 0xffffff
          });
          const blueberryMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x0000ff, 
            shininess: 100,
            specular: 0xffffff
          });
          
          for (let i = 0; i < berryCount; i++) {
            const berry = new THREE.Mesh(
              berryGeometry, 
              Math.random() > 0.5 ? strawberryMaterial : blueberryMaterial
            );
            
            const angle = Math.random() * Math.PI * 2;
            const radius = 0.7 * Math.sqrt(Math.random()); // More concentrated in center
            
            berry.position.set(
              Math.cos(angle) * radius,
              0.75, // Top of frosting
              Math.sin(angle) * radius
            );
            
            berry.scale.set(
              0.7 + Math.random() * 0.6,
              0.7 + Math.random() * 0.6, 
              0.7 + Math.random() * 0.6
            );
            
            dishGroup.add(berry);
          }
        } else if (dishName.toLowerCase().includes('chocolate')) {
          // Add chocolate shavings or pieces
          const shavingCount = 20;
          const shavingGeometry = new THREE.BoxGeometry(0.1, 0.02, 0.3);
          const shavingMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x3c1f0d,
            shininess: 100,
            specular: 0x333333
          });
          
          for (let i = 0; i < shavingCount; i++) {
            const shaving = new THREE.Mesh(shavingGeometry, shavingMaterial);
            
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 0.8;
            
            shaving.position.set(
              Math.cos(angle) * radius,
              0.75 + Math.random() * 0.05, // Slightly varied height
              Math.sin(angle) * radius
            );
            
            shaving.rotation.x = Math.random() * Math.PI;
            shaving.rotation.y = Math.random() * Math.PI;
            shaving.rotation.z = Math.random() * Math.PI;
            
            dishGroup.add(shaving);
          }
        }
      } else {
        // Create a generic dish for any other food type
        // First create a plate
        const plateRimGeometry = new THREE.TorusGeometry(1.4, 0.1, 16, 32);
        const plateRimMaterial = new THREE.MeshPhongMaterial({ 
          color: 0xffffff,
          shininess: 100
        });
        const plateRim = new THREE.Mesh(plateRimGeometry, plateRimMaterial);
        plateRim.rotation.x = Math.PI / 2; // Make it flat
        plateRim.position.y = 0;
        dishGroup.add(plateRim);
        
        // Create food portion based on dish name
        let foodGeometry, foodMaterial;
        let foodColor = 0xcd853f; // Default brownish
        
        if (dishName.toLowerCase().includes('salad')) {
          // Create a leafy look for salad
          foodGeometry = new THREE.SphereGeometry(1, 16, 16);
          foodGeometry.scale(1, 0.4, 1); // Flatten sphere
          foodColor = 0x32cd32; // Lime green
        } else if (dishName.toLowerCase().includes('pasta') || dishName.toLowerCase().includes('noodle')) {
          // Pasta dish with a mound of noodles
          foodGeometry = new THREE.SphereGeometry(0.9, 16, 16);
          foodGeometry.scale(1, 0.6, 1);
          foodColor = 0xf5deb3; // Wheat color for pasta
        } else if (dishName.toLowerCase().includes('steak') || dishName.toLowerCase().includes('meat')) {
          // Steak or meat portion
          foodGeometry = new THREE.BoxGeometry(1.2, 0.3, 0.8);
          foodGeometry.translate(0, 0.15, 0); // Center on plate
          
          if (dishName.toLowerCase().includes('well done')) {
            foodColor = 0x8b4513; // Brown
          } else if (dishName.toLowerCase().includes('medium')) {
            foodColor = 0xa0522d; // Medium brown
          } else {
            foodColor = 0xcd5c5c; // Reddish for rare
          }
        } else {
          // Default food mound
          foodGeometry = new THREE.SphereGeometry(0.9, 16, 16);
          foodGeometry.scale(1, 0.5, 1);
          
          if (dishName.toLowerCase().includes('veg')) {
            foodColor = 0x228b22; // Forest green
          } else if (dishName.toLowerCase().includes('chicken')) {
            foodColor = 0xf0e68c; // Khaki
          } else if (dishName.toLowerCase().includes('paneer')) {
            foodColor = 0xfffacd; // Lemon chiffon
          }
        }
        
        foodMaterial = new THREE.MeshPhongMaterial({ 
          color: foodColor,
          shininess: 20
        });
        
        const food = new THREE.Mesh(foodGeometry, foodMaterial);
        food.position.y = 0.1;
        dishGroup.add(food);
        
        // Add garnish or sauce
        if (!dishName.toLowerCase().includes('plain')) {
          // Sauce drizzles or garnish elements
          const garnishCount = 15;
          let garnishGeometry, garnishMaterial;
          
          if (dishName.toLowerCase().includes('sauce') || 
              dishName.toLowerCase().includes('gravy')) {
            // Sauce drips
            garnishGeometry = new THREE.SphereGeometry(0.05, 8, 8);
            
            let sauceColor = 0x8b0000; // Default deep red
            if (dishName.toLowerCase().includes('white')) {
              sauceColor = 0xfffaf0;
            } else if (dishName.toLowerCase().includes('green')) {
              sauceColor = 0x006400;
            }
            
            garnishMaterial = new THREE.MeshPhongMaterial({ 
              color: sauceColor,
              shininess: 100
            });
          } else {
            // Herb garnish
            garnishGeometry = new THREE.PlaneGeometry(0.1, 0.1);
            garnishMaterial = new THREE.MeshPhongMaterial({ 
              color: 0x006400, // Dark green
              side: THREE.DoubleSide
            });
          }
          
          for (let i = 0; i < garnishCount; i++) {
            const garnish = new THREE.Mesh(garnishGeometry, garnishMaterial);
            
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 0.7;
            
            garnish.position.set(
              Math.cos(angle) * radius,
              0.4 + Math.random() * 0.1,
              Math.sin(angle) * radius
            );
            
            garnish.rotation.x = Math.random() * Math.PI;
            garnish.rotation.y = Math.random() * Math.PI;
            
            dishGroup.add(garnish);
          }
        }
      }
      
      scene.add(dishGroup);
      
      // Add subtle ambient occlusion effect
      const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
      hemiLight.position.set(0, 20, 0);
      scene.add(hemiLight);
      
      // Animation loop
      const animate = () => {
        requestAnimationFrame(animate);
        
        if (controlsRef.current) {
          controlsRef.current.update();
        }
        
        if (rendererRef.current && cameraRef.current && sceneRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
      };
      
      animate();
      setLoading(false);
    } catch (err) {
      console.error('Error initializing 3D scene:', err);
      setError('Failed to load 3D model. Please try again later.');
      setLoading(false);
    }

    // Cleanup on component unmount
    return () => {
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, [dishName, modelPath]);

  // Handle container resize to maintain aspect ratio
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && cameraRef.current && rendererRef.current) {
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
        
        rendererRef.current.setSize(width, height);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <Card className={`relative ${expanded ? 'fixed inset-4 z-50' : 'w-full h-60'}`}>
      <Button 
        variant="ghost" 
        size="sm"
        className="absolute top-2 right-2 z-10" 
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </Button>
      
      <CardContent className="p-0 h-full">
        {loading ? (
          <div className="flex items-center justify-center w-full h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading 3D model...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center w-full h-full text-red-500">
            {error}
          </div>
        ) : (
          <div ref={containerRef} className="w-full h-full" />
        )}
      </CardContent>
    </Card>
  );
};

export default ARMenuViewer;