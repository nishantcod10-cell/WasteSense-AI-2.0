import { useState, useMemo, Suspense, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Html, Environment } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, RotateCcw, Eye, EyeOff, Layers, AlertTriangle, ArrowRight, Package, X } from 'lucide-react';
import * as THREE from 'three';
import { storage } from '../services/storage';
import { analyzeInventory } from '../domain/forecasting/engine';
import type { ForecastResult, InventoryItem, ProductCategory } from '../types';
import { GlassCard } from '../components/ui';

// ─── Category → shelf position mapping ──────────────────────────────────────
const SHELF_LAYOUT: { category: string; position: [number, number, number]; color: string }[] = [
  { category: 'Fresh Produce', position: [-6, 0, -3], color: '#4CAF50' },
  { category: 'Dairy & Eggs', position: [-2, 0, -3], color: '#2196F3' },
  { category: 'Bakery', position: [2, 0, -3], color: '#FF9800' },
  { category: 'Meat & Seafood', position: [6, 0, -3], color: '#F44336' },
  { category: 'Prepared Foods', position: [-4, 0, 3], color: '#9C27B0' },
  { category: 'Beverages', position: [0, 0, 3], color: '#00BCD4' },
  { category: 'Pantry & Dry Goods', position: [4, 0, 3], color: '#795548' },
];

function getRiskColor(riskLevel: string): string {
  switch (riskLevel) {
    case 'critical': case 'expired': return '#C75D4B';
    case 'high': return '#D99239';
    case 'moderate': return '#70A77B';
    default: return '#235A43';
  }
}

// ─── 3D Shelf Component ─────────────────────────────────────────────────────
function ShelfUnit({
  category, position, items, forecasts, showRiskOverlay, onSelect, selectedId,
}: {
  category: string; position: [number, number, number];
  items: InventoryItem[]; forecasts: ForecastResult[];
  showRiskOverlay: boolean; onSelect: (id: string | null) => void; selectedId: string | null;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  
  const categoryItems = items.filter(i => i.category === category);
  const categoryForecasts = forecasts.filter(f => categoryItems.some(i => i.id === f.productId));
  const worstRisk = categoryForecasts.length > 0
    ? categoryForecasts.reduce((max, f) => f.riskScore > max.riskScore ? f : max, categoryForecasts[0])
    : null;

  const shelfColor = showRiskOverlay && worstRisk
    ? getRiskColor(worstRisk.riskLevel)
    : '#8B7355';

  return (
    <group ref={groupRef} position={position}>
      {/* Shelf base */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[3.2, 0.1, 1.8]} />
        <meshStandardMaterial color="#D4C4A8" />
      </mesh>

      {/* Back panel */}
      <mesh position={[0, 1.1, -0.85]}>
        <boxGeometry args={[3.2, 2.1, 0.08]} />
        <meshStandardMaterial color="#E8DCC8" />
      </mesh>

      {/* Side panels */}
      <mesh position={[-1.55, 1.1, 0]}>
        <boxGeometry args={[0.1, 2.1, 1.8]} />
        <meshStandardMaterial color="#D4C4A8" />
      </mesh>
      <mesh position={[1.55, 1.1, 0]}>
        <boxGeometry args={[0.1, 2.1, 1.8]} />
        <meshStandardMaterial color="#D4C4A8" />
      </mesh>

      {/* Shelves */}
      {[0.5, 1.1, 1.7].map((y, i) => (
        <mesh key={i} position={[0, y, 0]}>
          <boxGeometry args={[3.0, 0.06, 1.6]} />
          <meshStandardMaterial color="#C4B498" />
        </mesh>
      ))}

      {/* Product indicators on shelves */}
      {categoryItems.slice(0, 9).map((item, idx) => {
        const forecast = categoryForecasts.find(f => f.productId === item.id);
        const row = Math.floor(idx / 3);
        const col = idx % 3;
        const boxColor = showRiskOverlay && forecast ? getRiskColor(forecast.riskLevel) : shelfColor;
        const isSelected = selectedId === item.id;

        return (
          <mesh
            key={item.id}
            position={[col * 0.8 - 0.8, 0.55 + row * 0.6 + 0.15, 0.2]}
            onClick={(e) => { e.stopPropagation(); onSelect(isSelected ? null : item.id); }}
            onPointerEnter={() => setHovered(true)}
            onPointerLeave={() => setHovered(false)}
            scale={isSelected ? 1.15 : 1}
          >
            <boxGeometry args={[0.55, 0.35, 0.5]} />
            <meshStandardMaterial
              color={boxColor}
              emissive={isSelected ? boxColor : '#000000'}
              emissiveIntensity={isSelected ? 0.3 : 0}
              transparent={true}
              opacity={0.9}
            />
          </mesh>
        );
      })}

      {/* Category label */}
      <Text
        position={[0, 2.4, 0]}
        fontSize={0.22}
        color="#192820"
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        {category}
      </Text>

      {/* Risk indicator glow */}
      {showRiskOverlay && worstRisk && worstRisk.riskScore > 60 && (
        <pointLight
          position={[0, 1.5, 1]}
          color={getRiskColor(worstRisk.riskLevel)}
          intensity={0.5}
          distance={3}
        />
      )}
    </group>
  );
}

// ─── Store Floor ────────────────────────────────────────────────────────────
function StoreFloor() {
  return (
    <group>
      {/* Main floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[20, 14]} />
        <meshStandardMaterial color="#F5F0E8" />
      </mesh>
      {/* Grid lines */}
      <gridHelper args={[20, 20, '#DDD8CC', '#DDD8CC']} position={[0, 0, 0]} />
    </group>
  );
}

// ─── Floating Camera ────────────────────────────────────────────────────────
function CameraRig() {
  useFrame(({ camera, clock }) => {
    const t = clock.getElapsedTime() * 0.05;
    camera.position.x += (Math.sin(t) * 0.02 - camera.position.x * 0.001);
  });
  return null;
}

// ─── Batch Info Panel ───────────────────────────────────────────────────────
function BatchInfoPanel({
  item, forecast, onClose, onNavigateActions,
}: {
  item: InventoryItem; forecast: ForecastResult | undefined;
  onClose: () => void; onNavigateActions: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="w-80 bg-white rounded-2xl border shadow-xl overflow-hidden"
      style={{ borderColor: '#DDE5DC' }}
    >
      {/* Header */}
      <div className="p-4 flex items-start justify-between" style={{ backgroundColor: '#E9F2E8' }}>
        <div>
          <h3 className="font-semibold text-sm" style={{ color: '#192820' }}>{item.name}</h3>
          <p className="text-xs mt-0.5" style={{ color: '#63716A' }}>{item.batchId}</p>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/50 transition-colors">
          <X className="w-4 h-4" style={{ color: '#63716A' }} />
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Quantity', value: `${item.quantity} ${item.unit}` },
            { label: 'Expiry', value: item.expiryDate },
            { label: 'Days Left', value: forecast ? `${forecast.daysRemaining}d` : 'N/A' },
            { label: 'Risk Score', value: forecast ? `${forecast.riskScore}/100` : 'N/A' },
          ].map((m) => (
            <div key={m.label} className="p-2 rounded-lg" style={{ backgroundColor: '#FAF9F5' }}>
              <p className="text-xs" style={{ color: '#63716A' }}>{m.label}</p>
              <p className="text-sm font-semibold" style={{ color: '#192820' }}>{m.value}</p>
            </div>
          ))}
        </div>

        {forecast && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#FAF9F5' }}>
                <p className="text-xs" style={{ color: '#63716A' }}>Forecast Demand</p>
                <p className="text-sm font-semibold" style={{ color: '#192820' }}>{forecast.forecastDemand.toFixed(0)} units</p>
              </div>
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#FAF9F5' }}>
                <p className="text-xs" style={{ color: '#63716A' }}>Expected Surplus</p>
                <p className="text-sm font-semibold" style={{ color: forecast.expectedSurplus > 0 ? '#D99239' : '#235A43' }}>
                  {forecast.expectedSurplus.toFixed(0)} units
                </p>
              </div>
            </div>

            {/* Risk level badge */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: getRiskColor(forecast.riskLevel) }}>
                {forecast.riskLevel.toUpperCase()}
              </span>
              <span className="text-xs" style={{ color: '#63716A' }}>
                Exposure: ₹{forecast.financialExposure.toFixed(0)}
              </span>
            </div>

            {/* Risk factors */}
            {forecast.riskFactors.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: '#192820' }}>Risk Factors:</p>
                <ul className="space-y-1">
                  {forecast.riskFactors.slice(0, 3).map((f, i) => (
                    <li key={i} className="text-xs flex items-start gap-1" style={{ color: '#63716A' }}>
                      <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: '#D99239' }} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommended action */}
            <div className="p-3 rounded-xl" style={{ backgroundColor: '#E9F2E8' }}>
              <p className="text-xs font-medium" style={{ color: '#235A43' }}>Suggested:</p>
              <p className="text-xs mt-0.5" style={{ color: '#192820' }}>{forecast.recommendation}</p>
            </div>
          </>
        )}

        <button
          onClick={onNavigateActions}
          className="w-full py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 text-white transition-all hover:opacity-90"
          style={{ backgroundColor: '#235A43' }}
        >
          View in Actions <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── 2D Fallback ────────────────────────────────────────────────────────────
function FallbackFloorPlan({
  items, forecasts, showRiskOverlay, selectedId, onSelect,
}: {
  items: InventoryItem[]; forecasts: ForecastResult[];
  showRiskOverlay: boolean; selectedId: string | null; onSelect: (id: string | null) => void;
}) {
  const categories = [...new Set(items.map(i => i.category))];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
      {categories.map((cat) => {
        const catItems = items.filter(i => i.category === cat);
        const catForecasts = forecasts.filter(f => catItems.some(i => i.id === f.productId));
        const worstRisk = catForecasts.reduce((max, f) => (!max || f.riskScore > max.riskScore ? f : max), null as ForecastResult | null);

        return (
          <div key={cat} className="rounded-xl border p-4" style={{
            borderColor: showRiskOverlay && worstRisk ? getRiskColor(worstRisk.riskLevel) : '#DDE5DC',
            borderWidth: showRiskOverlay && worstRisk && worstRisk.riskScore > 60 ? 2 : 1,
          }}>
            <h3 className="text-sm font-semibold mb-2" style={{ color: '#192820' }}>{cat}</h3>
            <div className="space-y-1">
              {catItems.map((item) => {
                const f = catForecasts.find(fc => fc.productId === item.id);
                return (
                  <button key={item.id}
                    onClick={() => onSelect(selectedId === item.id ? null : item.id)}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-all ${selectedId === item.id ? 'ring-2' : 'hover:bg-gray-50'}`}
                    style={{ color: '#192820' }}>
                    <span className="flex items-center gap-1.5">
                      {showRiskOverlay && f && (
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getRiskColor(f.riskLevel) }} />
                      )}
                      <span className="truncate">{item.name}</span>
                      <span className="ml-auto text-xs" style={{ color: '#63716A' }}>{item.quantity}{item.unit}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── WebGL Detection ────────────────────────────────────────────────────────
function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch {
    return false;
  }
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function DigitalTwinPage() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showRiskOverlay, setShowRiskOverlay] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const webglAvailable = useMemo(() => isWebGLAvailable(), []);

  const inventory = storage.getInventory();
  const settings = storage.getSettings();
  const forecasts = useMemo(() => analyzeInventory(inventory, settings), [inventory, settings]);

  const filteredItems = categoryFilter === 'all'
    ? inventory
    : inventory.filter(i => i.category === categoryFilter);

  const selectedItem = selectedId ? inventory.find(i => i.id === selectedId) : null;
  const selectedForecast = selectedId ? forecasts.find(f => f.productId === selectedId) : undefined;

  const categories = [...new Set(inventory.map(i => i.category))];

  return (
    <div className="space-y-4 p-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: '#192820' }}>
            <Store className="w-6 h-6" style={{ color: '#235A43' }} />
            3D Store Digital Twin
          </h1>
          <p className="text-sm mt-1" style={{ color: '#63716A' }}>
            Interactive store view synchronized with live inventory data
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border text-xs"
            style={{ borderColor: '#DDE5DC', color: '#192820', backgroundColor: '#FAF9F5' }}
          >
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <button
            onClick={() => setShowRiskOverlay(!showRiskOverlay)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all`}
            style={{
              backgroundColor: showRiskOverlay ? '#235A43' : '#E9F2E8',
              color: showRiskOverlay ? 'white' : '#235A43',
            }}
          >
            {showRiskOverlay ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            Risk Overlay
          </button>

          <button
            onClick={() => setSelectedId(null)}
            className="px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all hover:shadow-sm"
            style={{ borderColor: '#DDE5DC', color: '#63716A' }}
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* 3D / 2D View */}
        <div className="flex-1 rounded-2xl border overflow-hidden relative" style={{ borderColor: '#DDE5DC', minHeight: '500px', backgroundColor: '#F8F5EE' }}>
          {webglAvailable ? (
            <Canvas
              camera={{ position: [0, 12, 14], fov: 45 }}
              shadows
              dpr={[1, 1.5]}
              style={{ background: 'linear-gradient(180deg, #F0EDE5 0%, #E8E3D8 100%)' }}
            >
              <ambientLight intensity={0.6} />
              <directionalLight position={[8, 12, 5]} intensity={0.8} castShadow />
              <directionalLight position={[-5, 8, -3]} intensity={0.3} color="#B8D4C0" />

              <StoreFloor />
              <CameraRig />

              <Suspense fallback={null}>
                {SHELF_LAYOUT.map((shelf) => {
                  const shelfItems = filteredItems.filter(i => i.category === shelf.category);
                  return (
                    <ShelfUnit
                      key={shelf.category}
                      category={shelf.category}
                      position={shelf.position}
                      items={shelfItems}
                      forecasts={forecasts}
                      showRiskOverlay={showRiskOverlay}
                      onSelect={setSelectedId}
                      selectedId={selectedId}
                    />
                  );
                })}
              </Suspense>

              <OrbitControls
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
                maxPolarAngle={Math.PI / 2.5}
                minPolarAngle={Math.PI / 6}
                maxDistance={25}
                minDistance={5}
                target={[0, 0, 0]}
              />
            </Canvas>
          ) : (
            <FallbackFloorPlan
              items={filteredItems}
              forecasts={forecasts}
              showRiskOverlay={showRiskOverlay}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-xl border p-3 text-xs"
            style={{ borderColor: '#DDE5DC' }}>
            <p className="font-medium mb-1.5" style={{ color: '#192820' }}>Risk Legend</p>
            <div className="space-y-1">
              {[
                { color: '#235A43', label: 'Low Risk' },
                { color: '#70A77B', label: 'Moderate' },
                { color: '#D99239', label: 'High' },
                { color: '#C75D4B', label: 'Critical' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: l.color }} />
                  <span style={{ color: '#63716A' }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-sm rounded-xl border px-3 py-2 text-xs"
            style={{ borderColor: '#DDE5DC', color: '#63716A' }}>
            <Layers className="inline w-3 h-3 mr-1" />
            Click products to inspect • Drag to rotate • Scroll to zoom
          </div>
        </div>

        {/* Right Panel */}
        <AnimatePresence>
          {selectedItem && (
            <div className="w-full lg:w-80 flex-shrink-0">
              <BatchInfoPanel
                item={selectedItem}
                forecast={selectedForecast}
                onClose={() => setSelectedId(null)}
                onNavigateActions={() => navigate('/app/actions')}
              />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Category Summary Grid (below 3D) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
        {SHELF_LAYOUT.map((shelf) => {
          const catItems = inventory.filter(i => i.category === shelf.category);
          const catForecasts = forecasts.filter(f => catItems.some(i => i.id === f.productId));
          const atRisk = catForecasts.filter(f => f.riskScore > 55).length;

          return (
            <GlassCard key={shelf.category} className="p-3 text-center cursor-pointer"
              onClick={() => setCategoryFilter(categoryFilter === shelf.category ? 'all' : shelf.category)}>
              <Package className="w-4 h-4 mx-auto mb-1" style={{ color: atRisk > 0 ? '#D99239' : '#235A43' }} />
              <p className="text-xs font-medium truncate" style={{ color: '#192820' }}>{shelf.category}</p>
              <p className="text-xs" style={{ color: '#63716A' }}>{catItems.length} items</p>
              {atRisk > 0 && (
                <p className="text-xs font-semibold" style={{ color: '#C75D4B' }}>{atRisk} at risk</p>
              )}
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
