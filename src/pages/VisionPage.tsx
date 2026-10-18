import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, ScanBarcode, X, CheckCircle, AlertTriangle, Loader2, Image as ImageIcon, Plus, RefreshCw } from 'lucide-react';
import { storage } from '../services/storage';
import { useToast } from '../context/ToastContext';
import type { InventoryItem, ProductCategory, QualityStatus, UnitType, StorageType } from '../types';

// ─── Color heuristic classifier ─────────────────────────────────────────────
function classifyCategoryByColor(imageData: ImageData): { category: ProductCategory | string; confidence: string; method: string } {
  const data = imageData.data;
  const w = imageData.width;
  const h = imageData.height;
  // Sample center 40% of image
  const x0 = Math.floor(w * 0.3), x1 = Math.floor(w * 0.7);
  const y0 = Math.floor(h * 0.3), y1 = Math.floor(h * 0.7);
  let r = 0, g = 0, b = 0, count = 0;

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const idx = (y * w + x) * 4;
      r += data[idx]; g += data[idx + 1]; b += data[idx + 2];
      count++;
    }
  }

  if (count === 0) return { category: 'Fresh Produce', confidence: 'Very Low', method: 'Fallback — insufficient image data' };
  r = Math.round(r / count); g = Math.round(g / count); b = Math.round(b / count);

  if (g > r && g > b && g > 100) return { category: 'Fresh Produce', confidence: 'Low', method: 'Color-based heuristic (green-dominant)' };
  if (r > 150 && g < 100 && b < 100) return { category: 'Meat & Seafood', confidence: 'Low', method: 'Color-based heuristic (red-dominant)' };
  if (r > 150 && g > 100 && b < 100) return { category: 'Bakery', confidence: 'Low', method: 'Color-based heuristic (warm/brown tones)' };
  if (r > 200 && g > 200 && b > 200) return { category: 'Dairy & Eggs', confidence: 'Low', method: 'Color-based heuristic (light/white tones)' };
  return { category: 'Prepared Foods', confidence: 'Very Low', method: 'Color-based heuristic (no strong signal)' };
}

// ─── Barcode Detection ──────────────────────────────────────────────────────
async function detectBarcode(source: ImageBitmapSource): Promise<{ value: string; format: string } | null> {
  if (!('BarcodeDetector' in window)) return null;
  try {
    const detector = new (window as any).BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code'] });
    const barcodes = await detector.detect(source);
    if (barcodes.length > 0) return { value: barcodes[0].rawValue, format: barcodes[0].format };
  } catch { /* swallow */ }
  return null;
}

const CATEGORIES: ProductCategory[] = ['Fresh Produce', 'Dairy & Eggs', 'Bakery', 'Meat & Seafood', 'Prepared Foods', 'Pantry & Dry Goods', 'Beverages'];
const UNITS: UnitType[] = ['kg', 'units', 'packs', 'cases', 'lbs', 'bunches'];
const QUALITY: QualityStatus[] = ['optimal', 'good', 'fair', 'inspect', 'compromised'];
const STORAGE_TYPES: StorageType[] = ['ambient', 'refrigerated', 'frozen'];

export default function VisionPage() {
  const { success, error, info } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [barcode, setBarcode] = useState<{ value: string; format: string } | null>(null);
  const [classification, setClassification] = useState<{ category: string; confidence: string; method: string } | null>(null);
  const [dataSource, setDataSource] = useState<'none' | 'barcode' | 'color_heuristic' | 'manual'>('none');

  // Form state
  const [form, setForm] = useState({
    name: '', sku: '', category: 'Fresh Produce' as string,
    quantity: '', unit: 'kg' as string, expiryDate: '',
    costPerUnit: '', sellingPrice: '', storageType: 'ambient' as string,
    qualityStatus: 'good' as string, salesHistory: '',
  });

  const updateForm = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  // ─── Camera ─────────────────────────────────────────────────────────────
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; }
      setCameraActive(true);
      setCapturedImage(null); setBarcode(null); setClassification(null); setDataSource('none');
    } catch {
      error('Camera access denied or unavailable.');
    }
  };

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  useEffect(() => () => { streamRef.current?.getTracks().forEach(t => t.stop()); }, []);

  const captureFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);
    stopCamera();
    await processImage(canvas, ctx);
  };

  // ─── File upload ────────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { error('Please upload an image file.'); return; }
    if (file.size > 10 * 1024 * 1024) { error('File size must be under 10MB.'); return; }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setCapturedImage(dataUrl);
      stopCamera();

      const img = new Image();
      img.onload = async () => {
        const canvas = canvasRef.current!;
        canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        await processImage(canvas, ctx);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // ─── Process image ──────────────────────────────────────────────────────
  const processImage = async (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    setIsProcessing(true);
    setBarcode(null); setClassification(null);

    // Try barcode
    try {
      const bitmapSource = canvas as any;
      const bc = await detectBarcode(bitmapSource);
      if (bc) {
        setBarcode(bc);
        setDataSource('barcode');
        // Try to match existing product
        const inventory = storage.getInventory();
        const match = inventory.find(i => i.sku === bc.value || i.batchId === bc.value);
        if (match) {
          setForm({ name: match.name, sku: match.sku, category: match.category, quantity: '', unit: match.unit, expiryDate: '', costPerUnit: String(match.costPerUnit), sellingPrice: String(match.sellingPrice), storageType: match.storageType, qualityStatus: 'good', salesHistory: '' });
          success(`Matched product: ${match.name}`);
        } else {
          updateForm('sku', bc.value);
          info(`Barcode detected: ${bc.value}. No matching product found — fill details manually.`);
        }
      }
    } catch { /* barcode detection failed silently */ }

    // Color classification
    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const result = classifyCategoryByColor(imageData);
      setClassification(result);
      if (!barcode) {
        updateForm('category', result.category);
        setDataSource('color_heuristic');
      }
    } catch { /* classification failed */ }

    setIsProcessing(false);
    if (!barcode) {
      info('Image processed. Please verify and complete the product details.');
    }
  };

  // ─── Save ───────────────────────────────────────────────────────────────
  const handleSave = () => {
    if (!form.name.trim()) { error('Product name is required.'); return; }
    if (!form.quantity || Number(form.quantity) <= 0) { error('Valid quantity is required.'); return; }
    if (!form.expiryDate) { error('Expiry date is required.'); return; }
    if (!form.costPerUnit || Number(form.costPerUnit) <= 0) { error('Valid cost per unit is required.'); return; }
    if (!form.sellingPrice || Number(form.sellingPrice) <= 0) { error('Valid selling price is required.'); return; }

    const salesHistory = form.salesHistory ? form.salesHistory.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n)) : [];
    const avgDailySales = salesHistory.length > 0 ? salesHistory.reduce((a, b) => a + b, 0) / salesHistory.length : Number(form.quantity) * 0.1;

    const newItem: InventoryItem = {
      id: `vis-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name: form.name.trim(),
      sku: form.sku.trim() || `SKU-${Date.now().toString(36).toUpperCase()}`,
      category: form.category,
      quantity: Number(form.quantity),
      unit: form.unit as UnitType,
      expiryDate: form.expiryDate,
      avgDailySales: Number(avgDailySales.toFixed(1)),
      salesHistory: salesHistory.length > 0 ? salesHistory : Array.from({ length: 7 }, () => Math.max(0, Math.round(avgDailySales + (Math.random() - 0.5) * avgDailySales * 0.4))),
      costPerUnit: Number(form.costPerUnit),
      sellingPrice: Number(form.sellingPrice),
      leadTimeDays: 2,
      storageType: form.storageType as StorageType,
      lastUpdated: new Date().toISOString(),
      batchId: `BATCH-${form.sku.trim() || 'VIS'}-${Date.now().toString(36).toUpperCase().slice(-3)}`,
      qualityStatus: form.qualityStatus as QualityStatus,
    };

    const existing = storage.getInventory();
    storage.setInventory([...existing, newItem]);
    success(`${newItem.name} added to inventory.`);

    // Reset
    setForm({ name: '', sku: '', category: 'Fresh Produce', quantity: '', unit: 'kg', expiryDate: '', costPerUnit: '', sellingPrice: '', storageType: 'ambient', qualityStatus: 'good', salesHistory: '' });
    setCapturedImage(null); setBarcode(null); setClassification(null); setDataSource('none');
  };

  const resetAll = () => {
    stopCamera(); setCapturedImage(null); setBarcode(null); setClassification(null); setDataSource('none');
    setForm({ name: '', sku: '', category: 'Fresh Produce', quantity: '', unit: 'kg', expiryDate: '', costPerUnit: '', sellingPrice: '', storageType: 'ambient', qualityStatus: 'good', salesHistory: '' });
  };

  return (
    <div className="space-y-4 p-1">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: '#192820' }}>
            <Camera className="w-6 h-6" style={{ color: '#235A43' }} />
            Smart Inventory Intake
          </h1>
          <p className="text-sm mt-1" style={{ color: '#63716A' }}>Capture, scan, or upload to add products with camera assistance</p>
        </div>
        <button onClick={resetAll} className="px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 hover:shadow-sm transition-all" style={{ borderColor: '#DDE5DC', color: '#63716A' }}>
          <RefreshCw className="w-3 h-3" /> Reset
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ─── LEFT: Camera / Image ────────────────────────────────── */}
        <div className="space-y-4">
          <div className="rounded-2xl border overflow-hidden relative" style={{ borderColor: '#DDE5DC', minHeight: '360px', backgroundColor: '#F0EDE5' }}>
            {cameraActive ? (
              <div className="relative">
                <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-2xl" style={{ maxHeight: '400px', objectFit: 'cover' }} />
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
                  <button onClick={captureFrame} className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center gap-2 shadow-lg" style={{ backgroundColor: '#235A43' }}>
                    <Camera className="w-4 h-4" /> Capture
                  </button>
                  <button onClick={stopCamera} className="px-4 py-2.5 rounded-xl bg-white/90 text-sm font-medium shadow-lg" style={{ color: '#C75D4B' }}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : capturedImage ? (
              <div className="relative">
                <img src={capturedImage} alt="Captured" className="w-full rounded-2xl" style={{ maxHeight: '400px', objectFit: 'contain' }} />
                {isProcessing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-2xl">
                    <div className="bg-white rounded-xl px-4 py-3 flex items-center gap-2 shadow-lg">
                      <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#235A43' }} />
                      <span className="text-sm font-medium" style={{ color: '#192820' }}>Processing...</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-80 text-center px-6">
                <ImageIcon className="w-16 h-16 mb-4" style={{ color: '#DDE5DC' }} />
                <p className="text-sm font-medium mb-1" style={{ color: '#192820' }}>No image captured</p>
                <p className="text-xs mb-4" style={{ color: '#63716A' }}>Use the camera, upload an image, or enter details manually</p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-3 gap-3">
            <button onClick={startCamera} disabled={cameraActive}
              className="py-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all hover:shadow-md disabled:opacity-50"
              style={{ borderColor: '#235A43', color: '#235A43', backgroundColor: '#E9F2E8' }}>
              <Camera className="w-5 h-5" /> Open Camera
            </button>
            <button onClick={() => fileInputRef.current?.click()}
              className="py-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all hover:shadow-md"
              style={{ borderColor: '#DDE5DC', color: '#192820' }}>
              <Upload className="w-5 h-5" /> Upload Image
            </button>
            <button onClick={() => { setDataSource('manual'); info('Manual entry mode — fill in all fields.'); }}
              className="py-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all hover:shadow-md"
              style={{ borderColor: '#DDE5DC', color: '#192820' }}>
              <ScanBarcode className="w-5 h-5" /> Manual Entry
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          <canvas ref={canvasRef} className="hidden" />

          {/* Detection results */}
          <AnimatePresence>
            {(barcode || classification) && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="rounded-xl border p-4 space-y-2" style={{ borderColor: '#DDE5DC', backgroundColor: '#FAF9F5' }}>
                <p className="text-xs font-semibold" style={{ color: '#192820' }}>Detection Results</p>
                {barcode && (
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircle className="w-4 h-4" style={{ color: '#235A43' }} />
                    <span style={{ color: '#192820' }}>Barcode: <strong>{barcode.value}</strong> ({barcode.format})</span>
                  </div>
                )}
                {classification && (
                  <div className="flex items-start gap-2 text-xs">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#D99239' }} />
                    <div>
                      <span style={{ color: '#192820' }}>Suggested category: <strong>{classification.category}</strong></span>
                      <p style={{ color: '#63716A' }}>Confidence: {classification.confidence} • {classification.method}</p>
                      <p className="mt-1 italic" style={{ color: '#D99239' }}>⚠ Not ML classification. Please verify and correct.</p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ─── RIGHT: Product Form ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl border p-6 space-y-4" style={{ borderColor: '#DDE5DC' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold" style={{ color: '#192820' }}>Product Details</h2>
            <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{
              backgroundColor: dataSource === 'barcode' ? '#E9F2E8' : dataSource === 'color_heuristic' ? '#FEF6E8' : '#FAF9F5',
              color: dataSource === 'barcode' ? '#235A43' : dataSource === 'color_heuristic' ? '#D99239' : '#63716A',
            }}>
              {dataSource === 'barcode' ? '✓ Barcode Match' : dataSource === 'color_heuristic' ? '⚠ Color Heuristic' : 'Manual Entry'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {([
              { id: 'name', label: 'Product Name *', type: 'text', placeholder: 'e.g. Organic Tomatoes' },
              { id: 'sku', label: 'SKU / Barcode', type: 'text', placeholder: 'Auto-generated if empty' },
            ] as const).map((f) => (
              <div key={f.id}>
                <label htmlFor={`vis-${f.id}`} className="block text-xs font-medium mb-1" style={{ color: '#192820' }}>{f.label}</label>
                <input id={`vis-${f.id}`} type={f.type} value={form[f.id]} onChange={(e) => updateForm(f.id, e.target.value)}
                  placeholder={f.placeholder} className="w-full px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2"
                  style={{ borderColor: '#DDE5DC', color: '#192820', backgroundColor: '#FAF9F5' }} />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="vis-category" className="block text-xs font-medium mb-1" style={{ color: '#192820' }}>Category *</label>
              <select id="vis-category" value={form.category} onChange={(e) => updateForm('category', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2"
                style={{ borderColor: '#DDE5DC', color: '#192820', backgroundColor: '#FAF9F5' }}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="vis-qty" className="block text-xs font-medium mb-1" style={{ color: '#192820' }}>Quantity *</label>
                <input id="vis-qty" type="number" min="0" value={form.quantity} onChange={(e) => updateForm('quantity', e.target.value)}
                  placeholder="0" className="w-full px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2"
                  style={{ borderColor: '#DDE5DC', color: '#192820', backgroundColor: '#FAF9F5' }} />
              </div>
              <div>
                <label htmlFor="vis-unit" className="block text-xs font-medium mb-1" style={{ color: '#192820' }}>Unit</label>
                <select id="vis-unit" value={form.unit} onChange={(e) => updateForm('unit', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2"
                  style={{ borderColor: '#DDE5DC', color: '#192820', backgroundColor: '#FAF9F5' }}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="vis-expiry" className="block text-xs font-medium mb-1" style={{ color: '#192820' }}>Expiry Date *</label>
              <input id="vis-expiry" type="date" value={form.expiryDate} onChange={(e) => updateForm('expiryDate', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2"
                style={{ borderColor: '#DDE5DC', color: '#192820', backgroundColor: '#FAF9F5' }} />
            </div>
            <div>
              <label htmlFor="vis-cost" className="block text-xs font-medium mb-1" style={{ color: '#192820' }}>Cost/Unit (₹) *</label>
              <input id="vis-cost" type="number" min="0" step="0.01" value={form.costPerUnit} onChange={(e) => updateForm('costPerUnit', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2"
                style={{ borderColor: '#DDE5DC', color: '#192820', backgroundColor: '#FAF9F5' }} />
            </div>
            <div>
              <label htmlFor="vis-price" className="block text-xs font-medium mb-1" style={{ color: '#192820' }}>Sell Price (₹) *</label>
              <input id="vis-price" type="number" min="0" step="0.01" value={form.sellingPrice} onChange={(e) => updateForm('sellingPrice', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2"
                style={{ borderColor: '#DDE5DC', color: '#192820', backgroundColor: '#FAF9F5' }} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="vis-storage" className="block text-xs font-medium mb-1" style={{ color: '#192820' }}>Storage Type</label>
              <select id="vis-storage" value={form.storageType} onChange={(e) => updateForm('storageType', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2"
                style={{ borderColor: '#DDE5DC', color: '#192820', backgroundColor: '#FAF9F5' }}>
                {STORAGE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="vis-quality" className="block text-xs font-medium mb-1" style={{ color: '#192820' }}>Quality Status</label>
              <select id="vis-quality" value={form.qualityStatus} onChange={(e) => updateForm('qualityStatus', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2"
                style={{ borderColor: '#DDE5DC', color: '#192820', backgroundColor: '#FAF9F5' }}>
                {QUALITY.map(q => <option key={q} value={q}>{q}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="vis-sales" className="block text-xs font-medium mb-1" style={{ color: '#192820' }}>
              Sales History <span className="font-normal" style={{ color: '#63716A' }}>(comma-separated daily values, optional)</span>
            </label>
            <input id="vis-sales" type="text" value={form.salesHistory} onChange={(e) => updateForm('salesHistory', e.target.value)}
              placeholder="e.g. 12, 15, 10, 18, 14, 16, 11" className="w-full px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2"
              style={{ borderColor: '#DDE5DC', color: '#192820', backgroundColor: '#FAF9F5' }} />
          </div>

          <button onClick={handleSave}
            className="w-full py-3 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90"
            style={{ backgroundColor: '#235A43' }}>
            <Plus className="w-4 h-4" /> Confirm & Save to Inventory
          </button>
        </div>
      </div>
    </div>
  );
}
