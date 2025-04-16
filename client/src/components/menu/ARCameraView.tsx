import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Button } from '@/components/ui/button';
import { 
  Camera, 
  Loader2, 
  RotateCcw, 
  X,
  AlertCircle,
  Check,
  Smartphone, 
  Image
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ARCameraViewProps {
  dishName: string;
  onClose: () => void;
}

const ARCameraView: React.FC<ARCameraViewProps> = ({ dishName, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  
  const [activeTab, setActiveTab] = useState<string>('camera');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [modelPosition, setModelPosition] = useState({ x: 0, y: 0 });
  const [modelScale, setModelScale] = useState<number>(1);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  
  // Initialize camera
  useEffect(() => {
    if (activeTab !== 'camera') return;
    
    const enableCamera = async () => {
      try {
        if (!videoRef.current) return;
        
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false
        });
        
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        setError(null);
      } catch (err) {
        console.error('Error accessing camera:', err);
        setError('Could not access camera. Please check permissions and try again.');
        setCameraActive(false);
      }
    };
    
    enableCamera();
    
    return () => {
      // Cleanup camera stream
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        videoRef.current.srcObject = null;
        setCameraActive(false);
      }
    };
  }, [activeTab]);
  
  // Initialize 3D scene
  useEffect(() => {
    if (!containerRef.current) return;
    
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 5;
    cameraRef.current = camera;
    
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true, // Enable transparency
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);
    
    // Create dish model based on dish name
    setLoading(true);
    
    try {
      const group = new THREE.Group();
      
      let geometry;
      let color = 0xffcc99; // Default food color
      
      // Create basic geometry based on dish name
      if (dishName.toLowerCase().includes('soup') || dishName.toLowerCase().includes('curry')) {
        // Bowl shape for soups and curries
        geometry = new THREE.CylinderGeometry(1, 0.8, 0.5, 32);
        
        if (dishName.toLowerCase().includes('tomato')) {
          color = 0xff6347; // Tomato red
        } else if (dishName.toLowerCase().includes('spinach') || dishName.toLowerCase().includes('palak')) {
          color = 0x228b22; // Forest green
        }
      } else if (dishName.toLowerCase().includes('cake') || dishName.toLowerCase().includes('pastry')) {
        // Cake shape
        geometry = new THREE.CylinderGeometry(1, 1, 0.7, 32);
        
        if (dishName.toLowerCase().includes('chocolate')) {
          color = 0x3c280d; // Chocolate brown
        } else if (dishName.toLowerCase().includes('strawberry')) {
          color = 0xff69b4; // Hot pink
        }
      } else if (dishName.toLowerCase().includes('pizza')) {
        // Pizza shape
        geometry = new THREE.CylinderGeometry(1.5, 1.5, 0.1, 32);
        color = 0xd2691e; // Pizza crust color
      } else if (dishName.toLowerCase().includes('biryani') || dishName.toLowerCase().includes('rice')) {
        // Rice dish shape
        geometry = new THREE.ConeGeometry(1.2, 1, 32);
        color = 0xf5deb3; // Wheat/rice color
      } else {
        // Default plate shape
        geometry = new THREE.CylinderGeometry(1, 1, 0.2, 32);
      }
      
      const material = new THREE.MeshPhongMaterial({ color });
      const mesh = new THREE.Mesh(geometry, material);
      group.add(mesh);
      
      // Add details based on food type
      if (dishName.toLowerCase().includes('pizza')) {
        // Add pizza toppings
        const toppingGeometry = new THREE.SphereGeometry(0.1, 16, 16);
        const toppingMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 }); // Red for pepperoni
        
        for (let i = 0; i < 10; i++) {
          const topping = new THREE.Mesh(toppingGeometry, toppingMaterial);
          const angle = Math.random() * Math.PI * 2;
          const radius = Math.random() * 1.2;
          topping.position.set(
            Math.cos(angle) * radius,
            0.06, // Slightly above the pizza surface
            Math.sin(angle) * radius
          );
          group.add(topping);
        }
      } else if (dishName.toLowerCase().includes('biryani')) {
        // Add rice grains
        const riceGeometry = new THREE.BoxGeometry(0.05, 0.05, 0.2);
        const riceMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
        
        for (let i = 0; i < 20; i++) {
          const rice = new THREE.Mesh(riceGeometry, riceMaterial);
          rice.position.set(
            (Math.random() - 0.5) * 1,
            0.3 + Math.random() * 0.3,
            (Math.random() - 0.5) * 1
          );
          rice.rotation.x = Math.random() * Math.PI;
          rice.rotation.y = Math.random() * Math.PI;
          group.add(rice);
        }
      }
      
      group.position.set(modelPosition.x, modelPosition.y, 0);
      group.scale.set(modelScale, modelScale, modelScale);
      scene.add(group);
      modelRef.current = group;
      
      setLoading(false);
    } catch (err) {
      console.error('Error creating 3D model:', err);
      setError('Failed to create 3D model');
      setLoading(false);
    }
    
    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      if (modelRef.current) {
        modelRef.current.rotation.y += 0.01;
      }
      
      if (rendererRef.current && cameraRef.current && sceneRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    
    animate();
    
    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (rendererRef.current && containerRef.current) {
        rendererRef.current.dispose();
        if (containerRef.current.contains(rendererRef.current.domElement)) {
          containerRef.current.removeChild(rendererRef.current.domElement);
        }
      }
    };
  }, [dishName, modelPosition, modelScale]);
  
  // Capture image
  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to data URL
    const dataUrl = canvas.toDataURL('image/jpeg');
    setCapturedImage(dataUrl);
    setActiveTab('preview');
  };
  
  // Reset capture
  const resetCapture = () => {
    setCapturedImage(null);
    setActiveTab('camera');
  };
  
  // Handle drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
  };
  
  // Handle drag end
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  // Handle model movement
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current || !modelRef.current) return;
    
    // Calculate new position based on container dimensions
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    
    setModelPosition({ x, y });
    
    if (modelRef.current) {
      modelRef.current.position.set(x, y, 0);
    }
  };
  
  // Increase model size
  const increaseSize = () => {
    const newScale = modelScale + 0.1;
    setModelScale(newScale);
    
    if (modelRef.current) {
      modelRef.current.scale.set(newScale, newScale, newScale);
    }
  };
  
  // Decrease model size
  const decreaseSize = () => {
    const newScale = Math.max(0.1, modelScale - 0.1);
    setModelScale(newScale);
    
    if (modelRef.current) {
      modelRef.current.scale.set(newScale, newScale, newScale);
    }
  };
  
  return (
    <div className="relative h-full w-full">
      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute top-2 right-2 z-50" 
        onClick={onClose}
      >
        <X className="h-5 w-5" />
      </Button>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <TabsList className="mb-2 self-center">
          <TabsTrigger value="camera" disabled={!cameraActive}>
            <Camera className="h-4 w-4 mr-2" />
            Camera
          </TabsTrigger>
          <TabsTrigger value="preview" disabled={!capturedImage}>
            <Image className="h-4 w-4 mr-2" />
            Preview
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="camera" className="flex-grow relative">
          {error ? (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <>
              {/* Camera view */}
              <video 
                ref={videoRef}
                autoPlay 
                playsInline 
                className="w-full h-full object-cover bg-muted"
              />
              
              {/* 3D model overlay container */}
              <div 
                ref={containerRef}
                className="absolute inset-0 z-10 cursor-move"
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onMouseMove={handleMouseMove}
              >
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2 text-primary">Loading 3D model...</span>
                  </div>
                )}
              </div>
              
              {/* Control buttons */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                <Button onClick={decreaseSize} size="sm" variant="secondary">-</Button>
                <Button onClick={captureImage} variant="default">
                  <Camera className="h-4 w-4 mr-2" />
                  Capture
                </Button>
                <Button onClick={increaseSize} size="sm" variant="secondary">+</Button>
              </div>
              
              {/* Hidden canvas for capturing */}
              <canvas ref={canvasRef} className="hidden" />
            </>
          )}
        </TabsContent>
        
        <TabsContent value="preview" className="flex-grow">
          {capturedImage ? (
            <div className="relative h-full">
              <img 
                src={capturedImage} 
                alt="Captured AR" 
                className="w-full h-full object-contain"
              />
              
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                <Button onClick={resetCapture} variant="outline">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retake
                </Button>
                <Button variant="default">
                  <Check className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <p>No image captured yet.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ARCameraView;