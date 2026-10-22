"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Loader2 } from "lucide-react";

interface BrainModelViewerProps {
  modelUrl?: string;
  className?: string;
}

export default function BrainModelViewer({
  modelUrl = "/brain_project.glb",
  className = "",
}: BrainModelViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 500;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0.3, 4.2);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.appendChild(renderer.domElement);

    // OrbitControls for cursor interaction
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false; // Fixed scale
    controls.enablePan = false; // Fixed position
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 2.2; // Smooth left-to-right rotation
    controls.minPolarAngle = Math.PI * 0.2;
    controls.maxPolarAngle = Math.PI * 0.8;

    // Recenter tracking
    const initialOffset = new THREE.Vector3().copy(camera.position).sub(controls.target);
    const defaultRadius = initialOffset.length();
    const defaultPhi = Math.acos(initialOffset.y / defaultRadius);
    let isInteracting = false;
    let lastInteractionTime = 0;

    const onControlsStart = () => {
      isInteracting = true;
      controls.autoRotate = false;
    };

    const onControlsEnd = () => {
      isInteracting = false;
      lastInteractionTime = performance.now();
      controls.autoRotate = true;
    };

    controls.addEventListener("start", onControlsStart);
    controls.addEventListener("end", onControlsEnd);

    // Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 2.5);
    dirLight1.position.set(5, 8, 5);
    scene.add(dirLight1);

    // Cyan/Sky fill light
    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 2.2);
    dirLight2.position.set(-5, 3, -2);
    scene.add(dirLight2);

    // Indigo rim light
    const dirLight3 = new THREE.DirectionalLight(0x818cf8, 2.4);
    dirLight3.position.set(0, -4, 4);
    scene.add(dirLight3);

    // Neural glow core point light
    const pointLight = new THREE.PointLight(0x60a5fa, 2.5, 10);
    pointLight.position.set(0, 0, 1);
    scene.add(pointLight);

    // Root Group
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);

    // GLTF Loader
    const loader = new GLTFLoader();
    let isDisposed = false;

    loader.load(
      modelUrl,
      (gltf) => {
        if (isDisposed) return;

        const model = gltf.scene;

        // Compute bounding box and center precisely
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Center the model geometry at local (0, 0, 0)
        model.position.x = -center.x;
        model.position.y = -center.y;
        model.position.z = -center.z;

        // Fixed normalized scale regardless of raw export units
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2.4 / (maxDim || 1);
        modelGroup.scale.setScalar(scale);

        // Optimize materials and mesh rendering
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach((m) => (m.needsUpdate = true));
              } else {
                child.material.needsUpdate = true;
              }
            }
          }
        });

        modelGroup.add(model);
        setLoading(false);
      },
      undefined,
      (err) => {
        if (isDisposed) return;
        console.error("Error loading 3D brain model:", err);
        setError("Failed to load 3D model");
        setLoading(false);
      }
    );

    // Handle Resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Re-center back to default vertical tilt/axis when interaction stops
      if (!isInteracting && performance.now() - lastInteractionTime > 600) {
        const currentPhi = controls.getPolarAngle();
        const diffPhi = defaultPhi - currentPhi;

        if (Math.abs(diffPhi) > 0.001) {
          const currentOffset = new THREE.Vector3().copy(camera.position).sub(controls.target);
          const radius = currentOffset.length();
          const theta = Math.atan2(currentOffset.x, currentOffset.z);
          const newPhi = currentPhi + diffPhi * 0.045; // Smooth spring-like easing

          camera.position.x = controls.target.x + radius * Math.sin(newPhi) * Math.sin(theta);
          camera.position.y = controls.target.y + radius * Math.cos(newPhi);
          camera.position.z = controls.target.z + radius * Math.sin(newPhi) * Math.cos(theta);
          camera.lookAt(controls.target);
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      isDisposed = true;
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      controls.removeEventListener("start", onControlsStart);
      controls.removeEventListener("end", onControlsEnd);
      controls.dispose();

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else if (obj.material) {
            obj.material.dispose();
          }
        }
      });

      renderer.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [modelUrl]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing select-none ${className}`}
    >
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-white/20 backdrop-blur-sm rounded-2xl">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Loading Neural 3D Model...
          </span>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center z-10 p-4 text-center bg-white/20 backdrop-blur-sm rounded-2xl">
          <p className="text-xs text-red-500 font-medium">{error}</p>
        </div>
      )}
    </div>
  );
}
