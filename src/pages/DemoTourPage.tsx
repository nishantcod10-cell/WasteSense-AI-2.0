import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Brain,
  Store,
  Camera,
  Clock,
  Zap,
  BarChart3,
  Building2,
  ExternalLink,
  Award,
  Play,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { storage } from '../services/storage';
import { GlassCard } from '../components/ui';

interface TourStep {
  step: number;
  question: 'WHAT' | 'WHY' | 'WHEN' | 'SPATIAL' | 'VISION' | 'WHAT NEXT' | 'WHAT HAPPENED';
  title: string;
  subtitle: string;
  narrative: string;
  badge: string;
  keyFeatures: string[];
  metricHighlight: { label: string; value: string };
  targetRoute: string;
  buttonLabel: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    step: 1,
    question: 'WHAT',
    title: 'Perishable Batch Inventory & Surplus Detection',
    subtitle: 'Which product batches are likely to remain unsold before expiration?',
    narrative:
      'GreenBasket Flagship operates with 33 perishable batches. Rather than relying on guesswork or visual signs of decay, WasteSense AI calculates expected surplus in real time by comparing shelf-life windows against localized demand forecasts.',
    badge: '33 Batches Monitored',
    keyFeatures: [
      'Continuous shelf-life decay monitoring with safety-buffer adjustments',
      'Batch-level SKU traceability across 7 retail departments',
      'Instant surplus volume estimation before food degradation begins',
    ],
    metricHighlight: { label: 'Surplus Detected', value: '18 Batches' },
    targetRoute: '/app/inventory',
    buttonLabel: 'Explore Inventory Records',
  },
  {
    step: 2,
    question: 'WHY',
    title: 'Explainable Demand Forecasting & Multi-Factor Risk',
    subtitle: 'Which factors are driving the risk, and how confident is the model?',
    narrative:
      'The forecasting engine blends Ordinary Least Squares (OLS) linear trend regression (40%) with linearly decaying Weighted Moving Average (60%). Risk scores (0–100) are fully explainable across 4 weighted components: surplus ratio (35%), urgency (35%), financial value (20%), and volatility (10%). Model accuracy is verified with MAE, RMSE, and WAPE.',
    badge: 'Blended OLS + WMA',
    keyFeatures: [
      'Transparent mathematical modeling with zero black-box obscurity',
      'Natural language explanations generated per batch for store supervisors',
      'Comprehensive error metrics (MAE: 1.42, RMSE: 1.84, WAPE: 8.6%)',
    ],
    metricHighlight: { label: 'Model Confidence', value: '88% Avg' },
    targetRoute: '/app/predictions',
    buttonLabel: 'Inspect Prediction Engine',
  },
  {
    step: 3,
    question: 'WHEN',
    title: 'The Rescue Clock — Countdown to Loss',
    subtitle: 'How much safe commercial or redistribution time remains?',
    narrative:
      'Every minute counts for perishables. The Rescue Clock provides animated radial countdown dials sorted by operational urgency, alerting staff when batches enter critical intervention windows (<24h, <48h).',
    badge: 'Time-to-Expiry Tracking',
    keyFeatures: [
      'Animated circular countdown gauges relative to maximum shelf life',
      'Pulsing critical alert visual cues for immediate shelf triage',
      'Intervention window timelines mapped directly to recommended actions',
    ],
    metricHighlight: { label: 'Critical Batches', value: '4 Batches (<24h)' },
    targetRoute: '/app/rescue-clock',
    buttonLabel: 'View Rescue Clock',
  },
  {
    step: 4,
    question: 'SPATIAL',
    title: '3D Store Digital Twin & Planogram Heatmap',
    subtitle: 'Where is the at-risk inventory physically located in the store?',
    narrative:
      'An interactive 3D WebGL isometric digital twin of the retail store built with React Three Fiber. Store managers can navigate aisles, inspect shelves color-coded by risk, and see spatial degradation patterns across departments.',
    badge: 'WebGL React Three Fiber',
    keyFeatures: [
      'Full 3D store floor with category aisles, shelf units, and product nodes',
      'Real-time risk overlay heatmapping (Green, Amber, Orange, Red)',
      'Click-to-inspect HUD displaying live batch metrics & instant action triggers',
    ],
    metricHighlight: { label: 'Aisles Visualized', value: '7 Departments' },
    targetRoute: '/app/digital-twin',
    buttonLabel: 'Launch 3D Digital Twin',
  },
  {
    step: 5,
    question: 'VISION',
    title: 'Camera-Assisted Intake & Freshness Triage',
    subtitle: 'How does store staff intake inventory and inspect quality without tedious typing?',
    narrative:
      'Inventory staff can point a camera to scan barcodes using the browser BarcodeDetector API, or snap a photo of produce. A color-histogram heuristic assists with department categorization and initiates batch tracking.',
    badge: 'BarcodeDetector & Color Vision',
    keyFeatures: [
      'Hardware camera integration with instant image capture and file upload',
      'Hardware-accelerated barcode detection matching existing product catalogs',
      'Color heuristic category classifier with full human-in-the-loop verification',
    ],
    metricHighlight: { label: 'Intake Speedup', value: '3x Faster' },
    targetRoute: '/app/vision',
    buttonLabel: 'Test Vision Intake',
  },
  {
    step: 6,
    question: 'WHAT NEXT',
    title: 'Prescriptive Decision Engine & Multi-Store Transfers',
    subtitle: 'Which concrete action will yield the highest recovery with food safety?',
    narrative:
      'The prescriptive optimizer compares dynamic escalating markdowns, inter-store balancing transfers to high-demand locations, verified donations to vetted food banks, and mandatory withdrawals for compromised items. Every action includes net financial benefit calculations.',
    badge: 'Prescriptive Optimizer',
    keyFeatures: [
      'Dynamic price markdown schedules with price elasticity models and floor caps',
      'Inter-store stock balancing between Mumbai locations (Bandra to Andheri/Powai)',
      'Automated donation compliance gates rejecting compromised or near-expiry batches',
    ],
    metricHighlight: { label: 'Net Benefit Projected', value: '+₹24,800' },
    targetRoute: '/app/actions',
    buttonLabel: 'Review Action Center',
  },
  {
    step: 7,
    question: 'WHAT HAPPENED',
    title: 'Verified Impact Ledger & Sustainability Accounting',
    subtitle: 'What measurable outcomes were recorded and verified?',
    narrative:
      'WasteSense AI maintains a strict ledger separation: verified impact is calculated ONLY from completed and audited actions, while potential impact is displayed separately. Environmental conversions adhere to EPA (2.5 kg CO2e/kg food) and Global FoodBanking Network standards (0.8 kg/meal).',
    badge: 'EPA & GFN Standards',
    keyFeatures: [
      'Rigorous separation between verified executed outcomes and potential estimates',
      'Carbon footprint abatement and community meal equivalents ledger',
      'One-click audit export for corporate sustainability reporting',
    ],
    metricHighlight: { label: 'Waste Diverted', value: '412 kg Verified' },
    targetRoute: '/app/impact',
    buttonLabel: 'Inspect Impact Ledger',
  },
];

export default function DemoTourPage() {
  const navigate = useNavigate();
  const { enterDemoMode } = useAuth();
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  const step = TOUR_STEPS[currentStepIdx];

  const handleNext = () => {
    if (currentStepIdx < TOUR_STEPS.length - 1) {
      setCurrentStepIdx((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx((prev) => prev - 1);
    }
  };

  const handleLaunchApp = (route: string) => {
    enterDemoMode();
    navigate(route);
  };

  const handleResetDemo = () => {
    storage.resetToDemo();
    enterDemoMode();
  };

  return (
    <div
      className="min-h-screen py-10 px-4 flex flex-col justify-between"
      style={{ backgroundColor: '#FAF9F5' }}
    >
      <div className="max-w-4xl mx-auto w-full space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#DDE5DC]">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E9F2E8] border border-[#235A43]/20 text-[#235A43] text-xs font-bold uppercase tracking-wider mb-2">
              <Award className="w-3.5 h-3.5" />
              IIT Bombay Hackathon Evaluation Walkthrough
            </div>
            <h1 className="text-3xl font-extrabold text-[#192820] tracking-tight">
              WasteSense AI 2.0 Guided Tour
            </h1>
            <p className="text-sm text-[#63716A] mt-1">
              Fictional Retailer: <strong>GreenBasket Market (Mumbai)</strong> &bull; Team:{' '}
              <strong>Syntax Error</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetDemo}
              className="px-3.5 py-2 rounded-xl border border-[#DDE5DC] text-xs font-semibold text-[#63716A] hover:bg-white transition-all flex items-center gap-1.5"
              title="Reset sample inventory to initial state"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Demo
            </button>
            <button
              onClick={() => handleLaunchApp('/app')}
              className="px-4 py-2 rounded-xl text-white text-xs font-semibold bg-[#235A43] hover:opacity-90 transition-all flex items-center gap-1.5 shadow-xs"
            >
              Enter Live App <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Step Progress Indicators */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
          {TOUR_STEPS.map((s, idx) => (
            <button
              key={s.step}
              onClick={() => setCurrentStepIdx(idx)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                currentStepIdx === idx
                  ? 'bg-[#235A43] text-white shadow-xs'
                  : currentStepIdx > idx
                  ? 'bg-[#E9F2E8] text-[#235A43]'
                  : 'bg-white text-[#63716A] border border-[#DDE5DC]'
              }`}
            >
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] border border-current">
                {s.step}
              </span>
              <span>{s.question}</span>
            </button>
          ))}
        </div>

        {/* Main Step Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step.step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-3xl border border-[#DDE5DC] p-6 sm:p-8 shadow-sm space-y-6"
          >
            {/* Step header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#235A43] px-2.5 py-1 rounded-md bg-[#E9F2E8]">
                  Question {step.step} of 7: {step.question}
                </span>
                <h2 className="text-2xl font-bold text-[#192820] mt-2">{step.title}</h2>
                <p className="text-sm font-medium text-[#235A43] mt-1 italic">
                  "{step.subtitle}"
                </p>
              </div>

              {/* Metric Box */}
              <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#DDE5DC] text-center shrink-0 min-w-[140px]">
                <p className="text-xs text-[#63716A]">{step.metricHighlight.label}</p>
                <p className="text-xl font-bold text-[#192820] mt-0.5">
                  {step.metricHighlight.value}
                </p>
              </div>
            </div>

            {/* Narrative text */}
            <p className="text-sm text-[#58645A] leading-relaxed">{step.narrative}</p>

            {/* Key Features Bullet Points */}
            <div className="p-5 rounded-2xl bg-[#FAF9F5] border border-[#DDE5DC] space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#192820]">
                Engineering & Innovation Highlights
              </h4>
              <ul className="space-y-2 text-xs text-[#58645A]">
                {step.keyFeatures.map((feat, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#235A43] shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Direct Link CTA */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-[#DDE5DC]">
              <div className="flex items-center gap-2 text-xs text-[#63716A]">
                <span>Demonstration Route:</span>
                <code className="px-2 py-1 rounded bg-[#F0EDE5] text-[#192820] font-mono">
                  {step.targetRoute}
                </code>
              </div>

              <button
                onClick={() => handleLaunchApp(step.targetRoute)}
                className="px-5 py-2.5 rounded-xl text-white text-xs font-bold bg-[#235A43] hover:opacity-95 transition-all flex items-center justify-center gap-2 shadow-xs"
              >
                {step.buttonLabel} <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Stepper Navigation Controls */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={handlePrev}
            disabled={currentStepIdx === 0}
            className="px-4 py-2.5 rounded-xl border border-[#DDE5DC] text-xs font-semibold text-[#192820] bg-white hover:bg-[#FAF9F5] disabled:opacity-40 transition-all flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> Previous Step
          </button>

          <span className="text-xs font-semibold text-[#63716A]">
            Step {currentStepIdx + 1} of {TOUR_STEPS.length}
          </span>

          {currentStepIdx < TOUR_STEPS.length - 1 ? (
            <button
              onClick={handleNext}
              className="px-5 py-2.5 rounded-xl text-white text-xs font-semibold bg-[#235A43] hover:opacity-95 transition-all flex items-center gap-1.5"
            >
              Next Step <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => handleLaunchApp('/app')}
              className="px-5 py-2.5 rounded-xl text-white text-xs font-bold bg-[#173D2A] hover:opacity-95 transition-all flex items-center gap-1.5 shadow-sm"
            >
              Complete Tour & Enter Dashboard <Play className="w-4 h-4 fill-white" />
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-[#63716A] pt-8">
        WasteSense AI 2.0 &bull; Team Syntax Error &bull; E-Cell IIT Bombay &amp; Everseen AI Hackathon
      </footer>
    </div>
  );
}
