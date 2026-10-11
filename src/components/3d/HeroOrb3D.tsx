import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface HeroOrb3DProps {
  className?: string;
}

export const HeroOrb3D: React.FC<HeroOrb3DProps> = ({ className = '' }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hasWebGL, setHasWebGL] = useState(true);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    // Check reduced motion
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(motionQuery.matches);
    const motionListener = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
    motionQuery.addEventListener('change', motionListener);

    // WebGL capability check
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setHasWebGL(false);
        return;
      }
    } catch {
      setHasWebGL(false);
      return;
    }

    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 480;
    const height = container.clientHeight || 480;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 7;

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0x071511, 2.5);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x18c784, 3.5);
    keyLight.position.set(5, 5, 5);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0x9cf5c3, 2.0, 15);
    rimLight.position.set(-4, -2, -3);
    scene.add(rimLight);

    const limeLight = new THREE.PointLight(0xd6ff8b, 1.8, 12);
    limeLight.position.set(2, -4, 4);
    scene.add(limeLight);

    // 4. Centerpiece Objects Group
    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    // Central Sustainable Core (Icosahedron wireframe + inner glowing sphere)
    const coreGeo = new THREE.SphereGeometry(1.35, 48, 48);
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: 0x072218,
      emissive: 0x0d4731,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.1,
      transmission: 0.6,
      thickness: 1.2,
      transparent: true,
      opacity: 0.88,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreGroup.add(coreMesh);

    // Inner Glowing Seed / Energy Orb
    const seedGeo = new THREE.SphereGeometry(0.7, 32, 32);
    const seedMat = new THREE.MeshBasicMaterial({
      color: 0x18c784,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const seedMesh = new THREE.Mesh(seedGeo, seedMat);
    coreGroup.add(seedMesh);

    // Outer Translucent Icosahedron lattice
    const latticeGeo = new THREE.IcosahedronGeometry(1.65, 1);
    const latticeMat = new THREE.MeshStandardMaterial({
      color: 0x9cf5c3,
      wireframe: true,
      transparent: true,
      opacity: 0.22,
    });
    const latticeMesh = new THREE.Mesh(latticeGeo, latticeMat);
    coreGroup.add(latticeMesh);

    // Orbital Ring 1 (Emerald equatorial ring)
    const ring1Geo = new THREE.TorusGeometry(2.35, 0.022, 16, 100);
    const ring1Mat = new THREE.MeshStandardMaterial({
      color: 0x18c784,
      emissive: 0x18c784,
      emissiveIntensity: 0.8,
      roughness: 0.3,
    });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.x = Math.PI * 0.32;
    ring1.rotation.y = Math.PI * 0.15;
    coreGroup.add(ring1);

    // Orbital Ring 2 (Lime inclined ring)
    const ring2Geo = new THREE.TorusGeometry(2.7, 0.016, 16, 100);
    const ring2Mat = new THREE.MeshStandardMaterial({
      color: 0xd6ff8b,
      emissive: 0xd6ff8b,
      emissiveIntensity: 0.6,
      roughness: 0.4,
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = -Math.PI * 0.28;
    ring2.rotation.z = Math.PI * 0.4;
    coreGroup.add(ring2);

    // Orbital Ring 3 (Outer subtle halo)
    const ring3Geo = new THREE.TorusGeometry(3.1, 0.012, 16, 100);
    const ring3Mat = new THREE.MeshBasicMaterial({
      color: 0x9cf5c3,
      transparent: true,
      opacity: 0.28,
    });
    const ring3 = new THREE.Mesh(ring3Geo, ring3Mat);
    ring3.rotation.y = Math.PI * 0.55;
    ring3.rotation.x = Math.PI * 0.12;
    coreGroup.add(ring3);

    // Floating Data Particle Cloud (Atmospheric sustainability nodes)
    const particleCount = 140;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    const c1 = new THREE.Color(0x18c784);
    const c2 = new THREE.Color(0xd6ff8b);
    const c3 = new THREE.Color(0x9cf5c3);

    for (let i = 0; i < particleCount; i++) {
      const radius = 2.0 + Math.random() * 2.2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      particlePos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      particlePos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      particlePos[i * 3 + 2] = radius * Math.cos(phi);

      const colorPick = Math.random();
      const col = colorPick > 0.6 ? c1 : colorPick > 0.3 ? c2 : c3;
      particleColors[i * 3] = col.r;
      particleColors[i * 3 + 1] = col.g;
      particleColors[i * 3 + 2] = col.b;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    coreGroup.add(particleSystem);

    // Orbiting Satellite Nodes (representing Inventory, Prediction, Prevention, Recovery)
    const satelliteNodes: { mesh: THREE.Mesh; angle: number; speed: number; radius: number; yOffset: number }[] = [];
    const satColors = [0x18c784, 0x9cf5c3, 0xd6ff8b, 0xf5b94c];

    for (let i = 0; i < 4; i++) {
      const satGeo = new THREE.SphereGeometry(0.12, 16, 16);
      const satMat = new THREE.MeshStandardMaterial({
        color: satColors[i],
        emissive: satColors[i],
        emissiveIntensity: 1.2,
      });
      const sat = new THREE.Mesh(satGeo, satMat);
      coreGroup.add(sat);

      satelliteNodes.push({
        mesh: sat,
        angle: (i * Math.PI) / 2,
        speed: 0.4 + i * 0.08,
        radius: 2.35 + (i % 2) * 0.35,
        yOffset: ((i - 1.5) * 0.4),
      });
    }

    // Mouse / Pointer Parallax tracking
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouse.targetX = nx * 0.4;
      mouse.targetY = ny * 0.3;
    };
    window.addEventListener('mousemove', onMouseMove);

    // Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    // Visibility / Intersection observer to pause when off-screen
    let isVisible = true;
    const visibilityObserver = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0].isIntersecting;
      },
      { threshold: 0.1 }
    );
    visibilityObserver.observe(container);

    // Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (!isVisible) return;

      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Smooth mouse follow
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      coreGroup.rotation.y = mouse.x + (motionQuery.matches ? 0 : elapsed * 0.12);
      coreGroup.rotation.x = -mouse.y + (motionQuery.matches ? 0 : Math.sin(elapsed * 0.25) * 0.06);

      // Spin rings
      if (!motionQuery.matches) {
        ring1.rotation.z += delta * 0.25;
        ring2.rotation.z -= delta * 0.18;
        ring3.rotation.y += delta * 0.1;
        latticeMesh.rotation.y -= delta * 0.08;
        latticeMesh.rotation.x += delta * 0.05;
        seedMesh.rotation.y += delta * 0.3;
        particleSystem.rotation.y += delta * 0.04;

        // Animate satellites
        satelliteNodes.forEach((sat) => {
          sat.angle += delta * sat.speed;
          sat.mesh.position.x = Math.cos(sat.angle) * sat.radius;
          sat.mesh.position.z = Math.sin(sat.angle) * sat.radius;
          sat.mesh.position.y = sat.yOffset + Math.sin(sat.angle * 2) * 0.2;
        });
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', onMouseMove);
      motionQuery.removeEventListener('change', motionListener);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      seedGeo.dispose();
      seedMat.dispose();
      latticeGeo.dispose();
      latticeMat.dispose();
      ring1Geo.dispose();
      ring1Mat.dispose();
      ring2Geo.dispose();
      ring2Mat.dispose();
      ring3Geo.dispose();
      ring3Mat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
    };
  }, []);

  // 2D CSS Fallback if WebGL unavailable
  if (!hasWebGL) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <div className="w-72 h-72 rounded-full border-2 border-ws-primary/40 flex items-center justify-center bg-ws-bg-card/40 backdrop-blur-xl animate-pulse-slow">
          <div className="w-48 h-48 rounded-full border border-ws-lime/50 flex items-center justify-center">
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-ws-primary to-ws-lime opacity-80 blur-md" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      className={`relative w-full h-full min-h-[380px] max-h-[520px] pointer-events-auto select-none ${className}`}
      aria-label="Interactive 3D WasteSense Intelligence Core"
    />
  );
};
