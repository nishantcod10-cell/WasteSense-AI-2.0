import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Brain,
  Zap,
  Heart,
  BarChart3,
  Package,
  Shield,
  ArrowRight,
  ChevronRight,
  Clock,
  Sparkles,
  TrendingDown,
  Building2,
  CheckCircle,
  Database,
  Layers,
  Leaf,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { HeroOrb3D } from '@/components/3d/HeroOrb3D';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // 4-stage Technology Pipeline
  const pipelineSteps = [
    {
      id: '01',
      title: 'Inventory Data',
      desc: 'Perishable batch tracking, shelf-life dates, and sales velocity history',
      icon: Database,
    },
    {
      id: '02',
      title: 'Demand Forecast',
      desc: 'Weighted daily demand modeling and trend-adjusted consumption rates',
      icon: Brain,
    },
    {
      id: '03',
      title: 'Waste-Risk Assessment',
      desc: 'Quantitative surplus exposure score calculated days before expiration',
      icon: Shield,
    },
    {
      id: '04',
      title: 'Recommended Action',
      desc: 'Mathematically ranked markdowns, store transfers, and donation dispatch',
      icon: Zap,
    },
  ];

  // 4-card How It Works
  const howItWorksCards = [
    {
      title: 'PREDICT',
      label: 'Early Surplus Detection',
      desc: 'Anticipate unsold quantities days before expiry using sales velocity, remaining shelf life, and volatility metrics.',
      icon: Brain,
      tag: '01',
    },
    {
      title: 'PREVENT',
      label: 'Optimal Price Markdowns',
      desc: 'Trigger targeted clearance discounts that stimulate sell-through while preserving maximum inventory margin.',
      icon: Zap,
      tag: '02',
    },
    {
      title: 'RECOVER',
      label: 'Community Donation Dispatch',
      desc: 'Automatically pair edible surplus with certified nearby food banks, shelters, and community kitchens.',
      icon: Heart,
      tag: '03',
    },
    {
      title: 'MEASURE',
      label: 'Verifiable Sustainability Analytics',
      desc: 'Track prevented financial loss, kilograms of food diverted from landfill, and audited carbon savings (CO₂e).',
      icon: BarChart3,
      tag: '04',
    },
  ];

  // Features
  const features = [
    {
      icon: Brain,
      title: 'Demand Forecasting',
      desc: 'Weighted moving average and trend extrapolation tailored specifically for high-velocity perishable items.',
      badge: 'Analytical Engine',
    },
    {
      icon: Zap,
      title: 'Smart Interventions',
      desc: 'Ranked recommendations comparing markdown recovery, inter-store transfers, and scheduled donation runs.',
      badge: 'Action Matrix',
    },
    {
      icon: Heart,
      title: 'Donation Coordination',
      desc: 'Direct dispatch integration with local food assistance non-profits based on accepted categories and capacity.',
      badge: 'Rescue Network',
    },
    {
      icon: Layers,
      title: 'What-If Simulation',
      desc: 'Test price discounts and donation splits with price-elasticity modeling before committing inventory changes.',
      badge: 'Sandbox Tool',
    },
    {
      icon: BarChart3,
      title: 'Impact Auditing',
      desc: 'Separate verified historical prevention from potential pipeline savings for dependable ESG and financial reporting.',
      badge: 'ESG Audit',
    },
    {
      icon: Package,
      title: 'Batch Inventory Control',
      desc: 'Manage stock across produce, dairy, bakery, and prepared foods with full CSV import and export workflows.',
      badge: 'Data Management',
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF9F4] text-[#17231B] selection:bg-[#245B38] selection:text-white">
      {/* =========================================================================
          NAVIGATION BAR
          ========================================================================= */}
      <header className="sticky top-0 z-50 bg-[#FAF9F4]/90 backdrop-blur-md border-b border-[#D4DFCE] transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo & Wordmark */}
          <div
            className="flex items-center gap-3 cursor-pointer select-none"
            onClick={() => navigate('/')}
          >
            <div className="w-10 h-10 rounded-xl bg-[#EEF3E8] border border-[#D4DFCE] flex items-center justify-center text-[#245B38] shadow-xs">
              <Leaf className="w-5 h-5 text-[#245B38]" />
            </div>
            <div>
              <div className="text-xl font-bold tracking-tight text-[#17231B] flex items-center gap-1.5">
                <span>WasteSense</span>
                <span className="text-[#245B38]">AI</span>
              </div>
              <div className="text-[10px] tracking-wider uppercase font-semibold text-[#778178]">
                Perishable Intelligence
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#58645A]">
            <button
              onClick={() => scrollToSection('technology')}
              className="hover:text-[#245B38] transition-colors cursor-pointer"
            >
              Technology
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-[#245B38] transition-colors cursor-pointer"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className="hover:text-[#245B38] transition-colors cursor-pointer"
            >
              Features
            </button>
          </nav>

          {/* Primary CTA */}
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/app')}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Launch Intelligence
            </Button>
          </div>
        </div>
      </header>

      {/* =========================================================================
          HERO SECTION
          ========================================================================= */}
      <section className="relative pt-12 pb-20 lg:pt-16 lg:pb-28 overflow-hidden bg-gradient-hero">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Editorial & Value Proposition */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="lg:col-span-7 flex flex-col items-start text-left space-y-6"
            >
              {/* Eyebrow Label */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EEF3E8] border border-[#D4DFCE] text-[#245B38] text-xs font-semibold tracking-wide">
                <span className="w-2 h-2 rounded-full bg-[#245B38]" />
                <span className="uppercase tracking-wider">SMART FOOD-WASTE PREVENTION</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.12]">
                <span className="text-[#173D2A] block">Predict Before Waste.</span>
                <span className="text-[#4F8A4B] block mt-1">Act Before Loss.</span>
              </h1>

              {/* Supporting Description */}
              <p className="text-lg sm:text-xl text-[#58645A] max-w-2xl leading-relaxed">
                WasteSense AI forecasts demand, identifies inventory likely to remain unsold before expiry,
                and recommends practical actions to prevent waste.
              </p>

              {/* CTA Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-4 w-full sm:w-auto">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => navigate('/app')}
                  className="px-8 py-3.5 text-base font-semibold shadow-sm"
                  icon={<ArrowRight className="w-5 h-5 ml-1" />}
                >
                  Launch Intelligence
                </Button>

                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => scrollToSection('how-it-works')}
                  className="px-7 py-3.5 text-base text-[#17231B]"
                  icon={<ChevronRight className="w-4 h-4" />}
                >
                  Explore How It Works
                </Button>
              </div>

              {/* Trust-oriented Feature Labels */}
              <div className="pt-4 flex flex-wrap items-center gap-3 text-xs font-semibold text-[#58645A]">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFFDF8] border border-[#D4DFCE] shadow-2xs">
                  <CheckCircle className="w-3.5 h-3.5 text-[#245B38]" />
                  <span>Demand Forecasting</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFFDF8] border border-[#D4DFCE] shadow-2xs">
                  <CheckCircle className="w-3.5 h-3.5 text-[#245B38]" />
                  <span>Waste-Risk Intelligence</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFFDF8] border border-[#D4DFCE] shadow-2xs">
                  <CheckCircle className="w-3.5 h-3.5 text-[#245B38]" />
                  <span>Smart Recovery</span>
                </div>
              </div>
            </motion.div>

            {/* Right Column: Editorial Fresh Produce & Floating Cards Composition */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="lg:col-span-5 relative flex items-center justify-center min-h-[460px]"
            >
              {/* Organic Background Halo */}
              <div className="absolute inset-0 bg-[#E4F0DE]/60 rounded-3xl blur-2xl pointer-events-none" />

              {/* Central Produce Showcase Box */}
              <div className="relative w-full max-w-[420px] bg-[#FFFDF8] border border-[#D4DFCE] rounded-3xl p-6 shadow-md">
                {/* Botanical Header Badge */}
                <div className="flex items-center justify-between pb-4 border-b border-[#E7E4DA]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#4F8A4B]" />
                    <span className="text-xs font-bold text-[#17231B] uppercase tracking-wider">
                      Batch Inspection
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-[#778178] bg-[#EEF3E8] px-2 py-0.5 rounded-md border border-[#D4DFCE]">
                    DEMO SIMULATION
                  </span>
                </div>

                {/* 3D Hero Orb — replaces static emoji illustration */}
                <div className="my-4 relative rounded-2xl overflow-hidden" style={{ height: '240px' }}>
                  <HeroOrb3D />
                </div>

                {/* Floating Card 1: Waste Risk Notice */}
                <div className="p-3.5 rounded-xl bg-[#FFFDF8] border border-[#D4DFCE] shadow-xs mb-3 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-[#FFF0DF] border border-[#F8E1CD] text-[#A66E24] shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#17231B]">Waste Risk Alert</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FFF0DF] text-[#A66E24] border border-[#F8E1CD]">
                        3 Days to Expiry
                      </span>
                    </div>
                    <p className="text-[11px] text-[#58645A] mt-0.5">
                      Forecast predicts 18 kg unsold before expiration threshold.
                    </p>
                  </div>
                </div>

                {/* Floating Card 2: Fresh Produce Inventory Status */}
                <div className="p-3.5 rounded-xl bg-[#FFFDF8] border border-[#D4DFCE] shadow-xs mb-3 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-[#EEF3E8] border border-[#D4DFCE] text-[#245B38] shrink-0">
                    <Package className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#17231B]">Fresh Produce Stock</span>
                      <span className="text-[10px] font-bold text-[#245B38]">42 kg on hand</span>
                    </div>
                    <p className="text-[11px] text-[#58645A] mt-0.5">
                      Average daily demand: 8 kg/day &bull; Sell-through pace: Moderate
                    </p>
                  </div>
                </div>

                {/* Floating Card 3: Suggested Preventive Action */}
                <div className="p-3.5 rounded-xl bg-[#EEF3E8] border border-[#DCE8D3] shadow-xs flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-[#245B38] text-white shrink-0">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#245B38]">Suggested Action</span>
                      <span className="text-[10px] font-bold text-[#245B38] bg-white/70 px-2 py-0.5 rounded border border-[#D4DFCE]">
                        Net Benefit +₹1,480
                      </span>
                    </div>
                    <p className="text-[11px] text-[#58645A] mt-0.5">
                      Apply 20% early markdown or route 10 kg to Green Earth Food Bank.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          TECHNOLOGY PIPELINE SECTION
          ========================================================================= */}
      <section id="technology" className="py-20 px-6 max-w-7xl mx-auto border-t border-[#D4DFCE]">
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF3E8] border border-[#D4DFCE] text-[#245B38] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-[#245B38]" />
            <span>INTELLIGENCE ARCHITECTURE</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#173D2A] tracking-tight">
            How The Decision Pipeline Functions
          </h2>
          <p className="text-[#58645A] text-base leading-relaxed">
            WasteSense AI runs a closed-loop intelligence architecture that converts static inventory data into
            timely, actionable prevention.
          </p>
        </div>

        {/* 4-Stage Horizontal Process Diagram */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {pipelineSteps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className="relative bg-[#FFFDF8] border border-[#D4DFCE] rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:border-[#BDCEB4] transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-[#EEF3E8] border border-[#D4DFCE] flex items-center justify-center text-[#245B38]">
                      <Icon className="w-5 h-5 text-[#245B38]" />
                    </div>
                    <span className="text-xs font-mono font-bold text-[#778178] px-2 py-0.5 rounded bg-[#FAF9F4] border border-[#E7E4DA]">
                      STEP {step.id}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#17231B] mb-2">
                    {step.title}
                  </h3>
                  <p className="text-xs text-[#58645A] leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                {idx < pipelineSteps.length - 1 && (
                  <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-20">
                    <div className="w-6 h-6 rounded-full bg-[#FAF9F4] border border-[#D4DFCE] flex items-center justify-center text-[#778178]">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          HOW IT WORKS (4-CARD SECTION)
          ========================================================================= */}
      <section id="how-it-works" className="py-20 px-6 bg-[#EEF3E8]/50 border-y border-[#D4DFCE]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#D4DFCE] text-[#245B38] text-xs font-semibold">
              <CheckCircle className="w-3.5 h-3.5 text-[#245B38]" />
              <span>CORE WORKFLOW</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#173D2A] tracking-tight">
              Four Steps to Zero Food Waste
            </h2>
            <p className="text-[#58645A] text-base leading-relaxed">
              From proactive prediction to audited recovery, every intervention is mathematically optimized to minimize loss.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {howItWorksCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="bg-white border border-[#D4DFCE] rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:shadow-sm transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-11 h-11 rounded-xl bg-[#EEF3E8] border border-[#D4DFCE] flex items-center justify-center text-[#245B38]">
                        <Icon className="w-5 h-5 text-[#245B38]" />
                      </div>
                      <span className="text-xs font-bold text-[#245B38] bg-[#EEF3E8] px-2.5 py-1 rounded-full border border-[#D4DFCE]">
                        {card.tag}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-[#17231B] mb-1">
                      {card.title}
                    </h3>
                    <div className="text-xs font-semibold text-[#4F8A4B] mb-2.5">
                      {card.label}
                    </div>
                    <p className="text-xs text-[#58645A] leading-relaxed">
                      {card.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          FEATURES SECTION
          ========================================================================= */}
      <section id="features" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF3E8] border border-[#D4DFCE] text-[#245B38] text-xs font-semibold">
            <Layers className="w-3.5 h-3.5 text-[#245B38]" />
            <span>PLATFORM CAPABILITIES</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#173D2A] tracking-tight">
            Designed for Modern Perishable Retail
          </h2>
          <p className="text-[#58645A] text-base leading-relaxed">
            Engineered to bridge store-level inventory management with smart clearance, scenario simulation, and hunger-relief donation coordination.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className="bg-[#FFFDF8] border border-[#D4DFCE] rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:border-[#BDCEB4] hover:shadow-sm transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-[#EEF3E8] border border-[#D4DFCE] flex items-center justify-center text-[#245B38]">
                      <Icon className="w-5 h-5 text-[#245B38]" />
                    </div>
                    <span className="text-[11px] font-semibold text-[#58645A] bg-[#FAF9F4] px-2.5 py-1 rounded-md border border-[#E7E4DA]">
                      {feat.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[#17231B] mb-2">
                    {feat.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#58645A] leading-relaxed">
                    {feat.desc}
                  </p>
                </div>

                <div className="pt-5 mt-5 border-t border-[#E7E4DA] flex items-center text-xs font-semibold text-[#245B38] gap-1 cursor-pointer" onClick={() => navigate('/app')}>
                  <span>Launch tool</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          CALL TO ACTION SECTION
          ========================================================================= */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <div className="bg-[#FFFDF8] border border-[#D4DFCE] rounded-3xl p-8 sm:p-14 text-center shadow-sm relative overflow-hidden">
          <div className="max-w-2xl mx-auto space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-[#EEF3E8] border border-[#D4DFCE] flex items-center justify-center text-[#245B38] mx-auto shadow-2xs">
              <Leaf className="w-7 h-7 text-[#245B38]" />
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#173D2A] tracking-tight">
              Ready to eliminate grocery surplus loss?
            </h2>

            <p className="text-sm sm:text-base text-[#58645A]">
              Explore preloaded perishable demo batches, test markdown elasticity, and review community donation workflows in real time.
            </p>

            <div className="pt-3 flex flex-wrap items-center justify-center gap-4">
              <Button
                variant="primary"
                size="lg"
                onClick={() => navigate('/app')}
                className="px-8 py-3.5 text-base font-semibold"
                icon={<ArrowRight className="w-5 h-5 ml-1" />}
              >
                Launch Intelligence
              </Button>

              <Button
                variant="secondary"
                size="lg"
                onClick={() => navigate('/app/inventory')}
                className="px-7 py-3.5 text-base"
              >
                View Demo Inventory
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          FOOTER
          ========================================================================= */}
      <footer className="border-t border-[#D4DFCE] bg-[#FFFDF8] py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#EEF3E8] border border-[#D4DFCE] flex items-center justify-center text-[#245B38]">
              <Leaf className="w-4 h-4 text-[#245B38]" />
            </div>
            <span className="text-base font-bold text-[#17231B]">
              Waste<span className="text-[#245B38]">Sense</span> AI
            </span>
            <span className="text-xs text-[#778178] border-l border-[#D4DFCE] pl-3">
              Built for IIT Hackathon 2024
            </span>
          </div>

          <div className="text-xs sm:text-sm font-medium text-[#58645A] italic">
            "Predict Before Waste. Act Before Loss."
          </div>

          <div className="text-xs text-[#778178]">
            &copy; {new Date().getFullYear()} WasteSense AI &bull; Sustainable Food Intelligence
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
