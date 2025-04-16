import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
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
      let geometry;
      
      // Create different geometric shapes based on dish name to simulate different dishes
      if (dishName.toLowerCase().includes('soup') || dishName.toLowerCase().includes('curry')) {
        // Bowl shape for soups and curries
        geometry = new THREE.CylinderGeometry(1, 0.8, 0.5, 32);
      } else if (dishName.toLowerCase().includes('cake') || dishName.toLowerCase().includes('pastry')) {
        // Cake shape
        geometry = new THREE.CylinderGeometry(1, 1, 0.7, 32);
      } else if (dishName.toLowerCase().includes('pizza')) {
        // Pizza shape
        geometry = new THREE.CylinderGeometry(1.5, 1.5, 0.1, 32);
      } else if (dishName.toLowerCase().includes('biryani') || dishName.toLowerCase().includes('rice')) {
        // Rice dish shape
        geometry = new THREE.ConeGeometry(1.2, 1, 32);
      } else {
        // Default plate shape
        geometry = new THREE.CylinderGeometry(1, 1, 0.2, 32);
      }
      
      // Choose color based on food type
      let color = 0xffcc99; // Default food color
      
      if (dishName.toLowerCase().includes('veg')) {
        color = 0x99ff99; // Green for vegetarian
      } else if (dishName.toLowerCase().includes('chicken')) {
        color = 0xffcc66; // Yellowish for chicken
      } else if (dishName.toLowerCase().includes('paneer')) {
        color = 0xffeecc; // Light yellow for paneer
      }
      
      const material = new THREE.MeshPhongMaterial({ color });
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
      
      // Decorate with additional elements
      if (dishName.toLowerCase().includes('biryani')) {
        // Add rice grains effect
        const riceCount = 20;
        const riceGeometry = new THREE.BoxGeometry(0.05, 0.05, 0.2);
        const riceMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
        
        for (let i = 0; i < riceCount; i++) {
          const rice = new THREE.Mesh(riceGeometry, riceMaterial);
          rice.position.set(
            (Math.random() - 0.5) * 1.5,
            0.5 + Math.random() * 0.3,
            (Math.random() - 0.5) * 1.5
          );
          rice.rotation.x = Math.random() * Math.PI;
          rice.rotation.y = Math.random() * Math.PI;
          scene.add(rice);
        }
      }
      
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