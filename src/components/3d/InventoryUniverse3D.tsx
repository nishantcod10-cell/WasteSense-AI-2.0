import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { InventoryItem, ForecastResult, RiskLevel } from '../../types';
import { formatCurrency } from '../../utils/format';

interface InventoryUniverse3DProps {
  items: InventoryItem[];
  forecasts: ForecastResult[];
  onSelectItem?: (item: InventoryItem) => void;
  className?: string;
}

export const InventoryUniverse3D: React.FC<InventoryUniverse3DProps> = ({
  items,
  forecasts,
  onSelectItem,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hasWebGL, setHasWebGL] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<{
    item: InventoryItem;
    forecast?: ForecastResult;
  } | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');

  // Map forecast to items for fast lookup
  const forecastMap = useMemo(() => {
    const map = new Map<string, ForecastResult>();
    forecasts.forEach((f) => map.set(f.productId, f));
    return map;
  }, [forecasts]);

  // Extract distinct categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    items.forEach((it) => cats.add(it.category));
    return Array.from(cats);
  }, [items]);

  useEffect(() => {
    // Check WebGL
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

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x040d09, 0.05);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 4.5, 9.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0x0b211a, 3.0);
    scene.add(ambientLight);

    const centerPointLight = new THREE.PointLight(0x18c784, 4.0, 20);
    centerPointLight.position.set(0, 0, 0);
    scene.add(centerPointLight);

    const topLight = new THREE.DirectionalLight(0x9cf5c3, 2.0);
    topLight.position.set(0, 10, 5);
    scene.add(topLight);

    // 3. Grid Plane (Subtle scientific reference matrix)
    const gridHelper = new THREE.GridHelper(16, 24, 0x1a3d2e, 0x0e261d);
    gridHelper.position.y = -2;
    scene.add(gridHelper);

    // 4. Galaxy / Universe Group
    const universeGroup = new THREE.Group();
    scene.add(universeGroup);

    // Category Hub Centers
    const catPositions = new Map<string, THREE.Vector3>();
    const angleStep = (Math.PI * 2) / Math.max(1, categories.length);
    const clusterRadius = 4.2;

    categories.forEach((cat, idx) => {
      const angle = idx * angleStep;
      const pos = new THREE.Vector3(
        Math.cos(angle) * clusterRadius,
        (Math.sin(idx * 1.5) * 0.8),
        Math.sin(angle) * clusterRadius
      );
      catPositions.set(cat, pos);

      // Category Cluster Hub Ring
      const hubGeo = new THREE.RingGeometry(0.4, 0.44, 32);
      const hubMat = new THREE.MeshBasicMaterial({
        color: 0x2a5e48,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.45,
      });
      const hub = new THREE.Mesh(hubGeo, hubMat);
      hub.position.copy(pos);
      hub.rotation.x = Math.PI / 2;
      universeGroup.add(hub);
    });

    // Color mapper for risk
    const getRiskColorInt = (level?: RiskLevel) => {
      switch (level) {
        case 'expired':
          return 0x888888;
        case 'critical':
          return 0xff7777;
        case 'high':
          return 0xff9944;
        case 'moderate':
          return 0xf5b94c;
        case 'low':
        default:
          return 0x18c784;
      }
    };

    // Product Meshes
    const interactiveMeshes: THREE.Mesh[] = [];
    const meshItemMap = new Map<THREE.Mesh, { item: InventoryItem; forecast?: ForecastResult }>();

    items.forEach((item, itemIdx) => {
      const forecast = forecastMap.get(item.id);

      // Filtering check
      const matchesCat = categoryFilter === 'all' || item.category === categoryFilter;
      const matchesRisk = riskFilter === 'all' || forecast?.riskLevel === riskFilter;

      const hubPos = catPositions.get(item.category) || new THREE.Vector3(0, 0, 0);

      // Local cluster offset based on item index within cluster
      const localRadius = 0.5 + (itemIdx % 5) * 0.28;
      const localAngle = (itemIdx * 1.37);
      const itemPos = new THREE.Vector3(
        hubPos.x + Math.cos(localAngle) * localRadius,
        hubPos.y + ((itemIdx % 3) - 1) * 0.35,
        hubPos.z + Math.sin(localAngle) * localRadius
      );

      // Sphere size scaled by stock quantity
      const radius = Math.max(0.12, Math.min(0.32, 0.12 + (item.quantity / 300) * 0.18));
      const sphereGeo = new THREE.SphereGeometry(radius, 20, 20);

      const colorInt = getRiskColorInt(forecast?.riskLevel);
      const isFilteredOut = !matchesCat || !matchesRisk;

      const sphereMat = new THREE.MeshStandardMaterial({
        color: colorInt,
        emissive: colorInt,
        emissiveIntensity: isFilteredOut ? 0.05 : (forecast?.riskLevel === 'critical' ? 1.6 : 0.8),
        roughness: 0.2,
        metalness: 0.2,
        transparent: true,
        opacity: isFilteredOut ? 0.15 : 0.95,
      });

      const mesh = new THREE.Mesh(sphereGeo, sphereMat);
      mesh.position.copy(itemPos);
      universeGroup.add(mesh);

      // Save references for raycasting
      interactiveMeshes.push(mesh);
      meshItemMap.set(mesh, { item, forecast });
    });

    // Central Data Core / Beacon
    const centralGeo = new THREE.OctahedronGeometry(0.65, 0);
    const centralMat = new THREE.MeshStandardMaterial({
      color: 0x18c784,
      emissive: 0x18c784,
      emissiveIntensity: 1.0,
      wireframe: true,
    });
    const centralCore = new THREE.Mesh(centralGeo, centralMat);
    universeGroup.add(centralCore);

    // 5. Raycasting for Interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-999, -999);
    let hoveredMesh: THREE.Mesh | null = null;
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onPointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      if (isDragging) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;
        universeGroup.rotation.y += deltaX * 0.006;
        universeGroup.rotation.x = Math.max(-0.4, Math.min(0.6, universeGroup.rotation.x + deltaY * 0.004));
      }
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onPointerDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const onClick = () => {
      if (hoveredMesh) {
        const data = meshItemMap.get(hoveredMesh);
        if (data) {
          setSelectedProduct(data);
          onSelectItem?.(data.item);
        }
      }
    };

    container.addEventListener('mousemove', onPointerMove);
    container.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mouseup', onPointerUp);
    container.addEventListener('click', onClick);

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

    // Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      if (!isDragging) {
        universeGroup.rotation.y += delta * 0.08;
      }
      centralCore.rotation.y += delta * 0.4;
      centralCore.rotation.z += delta * 0.2;

      // Raycast check
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactiveMeshes);

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh;
        if (hoveredMesh !== hitMesh) {
          if (hoveredMesh) {
            hoveredMesh.scale.set(1, 1, 1);
          }
          hoveredMesh = hitMesh;
          hoveredMesh.scale.set(1.4, 1.4, 1.4);
          container.style.cursor = 'pointer';
        }
      } else {
        if (hoveredMesh) {
          hoveredMesh.scale.set(1, 1, 1);
          hoveredMesh = null;
          container.style.cursor = 'grab';
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener('mousemove', onPointerMove);
      container.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('mouseup', onPointerUp);
      container.removeEventListener('click', onClick);
      resizeObserver.disconnect();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      gridHelper.dispose();
      centralGeo.dispose();
      centralMat.dispose();
    };
  }, [items, forecasts, categoryFilter, riskFilter, categories, forecastMap, onSelectItem]);

  // 2D Fallback
  if (!hasWebGL) {
    return (
      <div className={`glass-card p-6 ${className}`}>
        <h4 className="text-sm font-semibold text-ws-primary mb-3">Inventory Distribution (2.5D Mode)</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {items.slice(0, 8).map((item) => {
            const f = forecastMap.get(item.id);
            return (
              <div
                key={item.id}
                onClick={() => onSelectItem?.(item)}
                className="p-3 rounded-xl bg-ws-bg-card border border-ws-border hover:border-ws-primary transition-all cursor-pointer"
              >
                <div className="text-xs text-ws-text-secondary truncate">{item.category}</div>
                <div className="font-semibold text-sm text-ws-text truncate">{item.name}</div>
                <div className="flex justify-between items-center mt-2 text-xs">
                  <span className="text-ws-text-muted">{item.quantity} {item.unit}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold risk-${f?.riskLevel || 'low'}`}>
                    {f?.riskLevel || 'Normal'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden glass-card border border-ws-border ${className}`}>
      {/* 3D Canvas Viewport */}
      <div
        ref={mountRef}
        className="w-full h-[460px] cursor-grab active:cursor-grabbing select-none"
      />

      {/* Control HUD Header */}
      <div className="absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        <div className="glass-card px-4 py-2 pointer-events-auto border border-ws-border/60 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-ws-primary animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider text-ws-primary-light">
              Inventory Universe 3D
            </span>
            <span className="text-[11px] text-ws-text-muted">({items.length} live SKU batches)</span>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl bg-ws-bg-dark/80 text-ws-text border border-ws-border focus:border-ws-primary outline-none backdrop-blur-md"
          >
            <option value="all">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Risk Filter */}
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl bg-ws-bg-dark/80 text-ws-text border border-ws-border focus:border-ws-primary outline-none backdrop-blur-md"
          >
            <option value="all">All Risk Levels</option>
            <option value="critical">Critical Risk</option>
            <option value="high">High Risk</option>
            <option value="moderate">Moderate Risk</option>
            <option value="low">Low Risk</option>
          </select>
        </div>
      </div>

      {/* Selected Product HUD Inspection Panel */}
      {selectedProduct && (
        <div className="absolute bottom-4 left-4 right-4 md:right-auto md:w-96 glass-card p-4 border border-ws-primary/40 backdrop-blur-xl animate-fade-in shadow-2xl">
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="text-[10px] uppercase font-bold text-ws-text-muted">
                {selectedProduct.item.category} • {selectedProduct.item.batchId}
              </span>
              <h4 className="text-sm font-bold text-ws-text">{selectedProduct.item.name}</h4>
            </div>
            <button
              onClick={() => setSelectedProduct(null)}
              className="text-ws-text-muted hover:text-ws-text text-sm p-1"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 my-2 py-2 border-y border-ws-border/60 text-center">
            <div>
              <div className="text-[10px] text-ws-text-muted">Stock Qty</div>
              <div className="text-xs font-bold text-ws-text">
                {selectedProduct.item.quantity} {selectedProduct.item.unit}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-ws-text-muted">Days Left</div>
              <div className="text-xs font-bold text-ws-amber">
                {selectedProduct.forecast?.daysRemaining ?? 'N/A'} d
              </div>
            </div>
            <div>
              <div className="text-[10px] text-ws-text-muted">Risk Score</div>
              <div className="text-xs font-bold text-ws-coral">
                {selectedProduct.forecast?.riskScore ?? 0}/100
              </div>
            </div>
          </div>

          {selectedProduct.forecast && (
            <div className="text-[11px] text-ws-text-secondary mt-1 line-clamp-2">
              💡 {selectedProduct.forecast.recommendation}
            </div>
          )}

          <div className="mt-3 flex justify-between items-center pt-2">
            <span className="text-xs font-semibold text-ws-primary">
              Val: {formatCurrency(selectedProduct.item.quantity * selectedProduct.item.sellingPrice)}
            </span>
            <button
              onClick={() => onSelectItem?.(selectedProduct.item)}
              className="px-3 py-1 rounded-lg bg-ws-primary text-ws-bg-darkest text-xs font-semibold hover:brightness-110"
            >
              Open Record
            </button>
          </div>
        </div>
      )}

      {/* Legend & Interaction Prompt Footer */}
      <div className="absolute bottom-3 right-4 hidden md:flex items-center gap-3 text-[11px] text-ws-text-muted pointer-events-none">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#18C784]" /> Low
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#F5B94C]" /> Mod
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#FF9944]" /> High
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#FF7777]" /> Critical
        </span>
        <span className="text-ws-border-light">|</span>
        <span>Drag to rotate • Click node to inspect</span>
      </div>
    </div>
  );
};
