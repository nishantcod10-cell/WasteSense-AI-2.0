import React, { useState, useEffect, useMemo } from 'react';
import { Outlet, NavLink, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Package,
  Brain,
  Zap,
  Heart,
  FlaskConical,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Search,
  Calendar,
  Bell,
  Menu,
  X,
  Leaf,
  Database,
  Sliders,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../utils/cn';
import { storage } from '../services/storage';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', path: '/app', icon: LayoutDashboard, exact: true },
  { name: 'Inventory', path: '/app/inventory', icon: Package },
  { name: 'Predictions', path: '/app/predictions', icon: Brain },
  { name: 'Action Center', path: '/app/actions', icon: Zap },
  { name: 'Donations', path: '/app/donations', icon: Heart },
  { name: 'Simulator', path: '/app/simulator', icon: FlaskConical },
  { name: 'Impact', path: '/app/impact', icon: BarChart3 },
  { name: 'Settings', path: '/app/settings', icon: Settings },
];

const MOBILE_BOTTOM_NAV = [
  { name: 'Dashboard', path: '/app', icon: LayoutDashboard, exact: true },
  { name: 'Inventory', path: '/app/inventory', icon: Package },
  { name: 'Predictions', path: '/app/predictions', icon: Brain },
  { name: 'Actions', path: '/app/actions', icon: Zap },
  { name: 'Impact', path: '/app/impact', icon: BarChart3 },
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hasNotificationDot, setHasNotificationDot] = useState<boolean>(true);
  const [settings, setSettings] = useState(() => storage.getSettings());
  const location = useLocation();

  // Keep settings synchronized
  useEffect(() => {
    const handleStorage = () => {
      setSettings(storage.getSettings());
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const isRouteActive = (item: NavItem): boolean => {
    if (item.exact) {
      return location.pathname === item.path || location.pathname === `${item.path}/`;
    }
    return location.pathname.startsWith(item.path);
  };

  const currentDateFormatted = useMemo(() => {
    try {
      return format(new Date(), 'EEE, MMM d, yyyy');
    } catch {
      return 'Today';
    }
  }, []);

  return (
    <div className="relative min-h-screen bg-[#FAF9F4] text-[#17231B] selection:bg-[#245B38] selection:text-white flex flex-col">
      {/* =========================================================================
          AMBIENT BACKGROUND (CSS ONLY, NON-INTERACTIVE)
          ========================================================================= */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        {/* Soft botanical sage glow */}
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#DCE8D3]/35 blur-3xl animate-pulse-slow"
          style={{ animationDuration: '8s' }}
        />
        {/* Warm ivory/mint subtle ambient */}
        <div
          className="absolute top-1/3 -right-36 w-[30rem] h-[30rem] rounded-full bg-[#E4F0DE]/40 blur-3xl animate-pulse-slow"
          style={{ animationDuration: '10s' }}
        />
        {/* Soft sage bottom glow */}
        <div
          className="absolute -bottom-48 left-1/3 w-[36rem] h-[36rem] rounded-full bg-[#EEF3E8]/60 blur-3xl animate-pulse-slow"
          style={{ animationDuration: '12s' }}
        />
      </div>

      {/* =========================================================================
          MOBILE OVERLAY BACKDROP & DRAWER
          ========================================================================= */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-[#17231B]/40 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="fixed inset-y-0 left-0 w-72 z-50 bg-[#FFFDF8] border-r border-[#D4DFCE] p-4 flex flex-col justify-between lg:hidden shadow-xl"
            >
              <div>
                {/* Header inside mobile sidebar */}
                <div className="flex items-center justify-between pb-4 border-b border-ws-border">
                  <Link to="/app" className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-ws-primary/20 border border-ws-primary/30 flex items-center justify-center text-ws-primary">
                      <Leaf className="w-5 h-5 text-ws-primary" />
                    </div>
                    <span className="font-bold text-lg text-ws-text tracking-tight">
                      Waste<span className="text-gradient-primary">Sense</span> AI
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 rounded-lg text-ws-text-secondary hover:text-ws-text hover:bg-white/5"
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Nav Links */}
                <nav className="mt-5 space-y-1">
                  {NAV_ITEMS.map((item) => {
                    const active = isRouteActive(item);
                    const IconComponent = item.icon;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          'relative flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-colors',
                          active
                            ? 'bg-[#EEF3E8] border-l-2 border-[#245B38] text-[#245B38] font-semibold'
                            : 'text-[#58645A] hover:text-[#17231B] hover:bg-[#EEF3E8]/60'
                        )}
                      >
                        <IconComponent className={cn('w-5 h-5 shrink-0', active ? 'text-[#245B38]' : 'text-[#778178]')} />
                        <span>{item.name}</span>
                      </NavLink>
                    );
                  })}
                </nav>
              </div>

              {/* Demo Badge on Mobile */}
              {settings.dataMode === 'demo' && (
                <div className="p-3 rounded-xl bg-[#EEF3E8] border border-[#D4DFCE] flex items-center gap-2 text-xs text-[#245B38]">
                  <Database className="w-4 h-4 text-[#245B38]" />
                  <span className="font-semibold uppercase tracking-wider">Demo Data Active</span>
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="relative z-10 flex flex-1">
        {/* =========================================================================
            DESKTOP SIDEBAR (FIXED ON DESKTOP)
            ========================================================================= */}
        <aside
          className={cn(
            'hidden lg:flex fixed inset-y-0 left-0 z-30 flex-col justify-between bg-[#FFFDF8] border-r border-[#D4DFCE] shadow-sm transition-all duration-300 ease-in-out',
            collapsed ? 'w-[72px]' : 'w-[260px]'
          )}
        >
          {/* Top section: Logo & Nav */}
          <div className="flex flex-col h-full overflow-hidden">
            {/* Logo */}
            <div
              className={cn(
                'h-16 flex items-center border-b border-[#D4DFCE] px-4 transition-all',
                collapsed ? 'justify-center' : 'justify-between'
              )}
            >
              <Link to="/app" className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-[#EEF3E8] border border-[#D4DFCE] flex items-center justify-center text-[#245B38] shadow-sm">
                  <Leaf className="w-5 h-5 text-[#245B38]" />
                </div>
                {!collapsed && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex flex-col whitespace-nowrap"
                  >
                    <span className="font-bold text-base tracking-tight text-[#17231B] leading-tight">
                      Waste<span className="text-[#245B38]">Sense</span> AI
                    </span>
                    <span className="text-[10px] text-[#778178] uppercase tracking-wider font-semibold">
                      Perishable Intelligence
                    </span>
                  </motion.div>
                )}
              </Link>
            </div>

            {/* Navigation items */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const active = isRouteActive(item);
                const IconComponent = item.icon;

                return (
                  <div key={item.path} className="relative group">
                    <NavLink
                      to={item.path}
                      className={cn(
                        'relative flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 outline-none',
                        active
                          ? 'bg-[#EEF3E8] border-l-2 border-[#245B38] text-[#245B38] font-semibold shadow-xs'
                          : 'text-[#58645A] hover:text-[#17231B] hover:bg-[#EEF3E8]/60',
                        collapsed && 'justify-center px-0'
                      )}
                    >
                      {/* Active indicator with Framer Motion layoutId */}
                      {active && (
                        <motion.div
                          layoutId="sidebar-indicator"
                          className="absolute inset-0 rounded-xl bg-[#EEF3E8] pointer-events-none -z-10"
                          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                        />
                      )}

                      <IconComponent
                        className={cn(
                          'w-5 h-5 shrink-0 transition-transform group-hover:scale-105',
                          active ? 'text-[#245B38]' : 'text-[#778178] group-hover:text-[#17231B]'
                        )}
                      />

                      {!collapsed && (
                        <span className="truncate whitespace-nowrap">{item.name}</span>
                      )}
                    </NavLink>

                    {/* Collapsed Tooltip */}
                    {collapsed && (
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1 bg-[#FFFDF8] border border-[#D4DFCE] rounded-lg text-xs font-medium text-[#17231B] shadow-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                        {item.name}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            {/* Demo Data indicator badge */}
            {settings.dataMode === 'demo' && (
              <div className="px-3 pb-2">
                {collapsed ? (
                  <div className="relative group flex justify-center py-2">
                    <div className="w-8 h-8 rounded-lg bg-[#EEF3E8] border border-[#D4DFCE] flex items-center justify-center text-[#245B38] text-[10px] font-bold">
                      DEMO
                    </div>
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2 py-1 bg-[#FFFDF8] border border-[#D4DFCE] rounded-lg text-xs font-semibold text-[#245B38] shadow-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                      DEMO DATA MODE
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-[#EEF3E8] border border-[#D4DFCE] flex items-center gap-2 text-xs text-[#245B38]">
                    <span className="w-2 h-2 rounded-full bg-[#245B38]" />
                    <span className="font-semibold tracking-wider text-[11px] uppercase">DEMO DATA ACTIVE</span>
                  </div>
                )}
              </div>
            )}

            {/* Collapse toggle button at bottom */}
            <div className="p-3 border-t border-[#D4DFCE]">
              <button
                type="button"
                onClick={() => setCollapsed(!collapsed)}
                className={cn(
                  'w-full flex items-center gap-3 p-2 rounded-xl text-xs font-medium text-[#58645A] hover:text-[#17231B] hover:bg-[#EEF3E8] transition-colors',
                  collapsed ? 'justify-center' : 'justify-between'
                )}
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {!collapsed && <span>Collapse Sidebar</span>}
                {collapsed ? (
                  <ChevronRight className="w-5 h-5 text-[#778178] hover:text-[#245B38]" />
                ) : (
                  <ChevronLeft className="w-5 h-5 text-[#778178] hover:text-[#245B38]" />
                )}
              </button>
            </div>
          </div>
        </aside>

        {/* =========================================================================
            MAIN COLUMN (TOP BAR + CONTENT)
            ========================================================================= */}
        <div
          className={cn(
            'flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out',
            collapsed ? 'lg:pl-[72px]' : 'lg:pl-[260px]'
          )}
        >
          {/* Top bar (fixed height 64px) */}
          <header className="sticky top-0 z-20 h-16 bg-[#FFFDF8]/90 backdrop-blur-md border-b border-[#E7E4DA] px-4 sm:px-6 flex items-center justify-between">
            {/* Left: Mobile hamburger or Search input */}
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-xl text-[#58645A] hover:text-[#17231B] hover:bg-[#EEF3E8]"
                aria-label="Open mobile menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Search input with Lucide Search icon */}
              <div className="relative w-full max-w-xs sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#778178] pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search inventory, SKUs, actions..."
                  className="w-full pl-9 pr-3 py-1.5 bg-[#FAF9F4] border border-[#D4DFCE] rounded-xl text-xs sm:text-sm text-[#17231B] placeholder-[#778178] focus:outline-none focus:border-[#245B38] focus:ring-1 focus:ring-[#245B38]/30 transition-all"
                />
              </div>
            </div>

            {/* Right section: Date, Notification Bell, Demo badge, User avatar */}
            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
              {/* Formatted Date */}
              <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-[#58645A] bg-[#FAF9F4] px-3 py-1.5 rounded-xl border border-[#E7E4DA]">
                <Calendar className="w-3.5 h-3.5 text-[#245B38]" />
                <span>{currentDateFormatted}</span>
              </div>

              {/* Demo Badge */}
              {settings.dataMode === 'demo' && (
                <div className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EEF3E8] border border-[#D4DFCE] text-[11px] font-semibold text-[#245B38]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#245B38]" />
                  DEMO MODE
                </div>
              )}

              {/* Notification Bell with indicator */}
              <button
                type="button"
                onClick={() => setHasNotificationDot(false)}
                className="relative p-2 rounded-xl text-[#58645A] hover:text-[#17231B] hover:bg-[#EEF3E8] transition-colors"
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                {hasNotificationDot && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#245B38]" />
                )}
              </button>

              {/* User Avatar Initials 'WS' */}
              <div className="flex items-center gap-2 pl-1 border-l border-[#E7E4DA]">
                <div
                  className="w-8 h-8 rounded-full bg-[#245B38] text-white font-bold text-xs flex items-center justify-center shadow-xs select-none ring-2 ring-[#245B38]/20"
                  title="WasteSense Supervisor"
                >
                  WS
                </div>
              </div>
            </div>
          </header>

          {/* =========================================================================
              CONTENT AREA WITH PAGE TRANSITIONS
              ========================================================================= */}
          <main className="flex-1 pb-20 lg:pb-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="h-full"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* =========================================================================
          MOBILE BOTTOM NAVIGATION (5 KEY ICONS)
          ========================================================================= */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 h-16 bg-[#FFFDF8]/95 backdrop-blur-xl border-t border-[#D4DFCE] px-2 flex items-center justify-around">
        {MOBILE_BOTTOM_NAV.map((item) => {
          const active = isRouteActive(item as NavItem);
          const IconComponent = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-lg text-[10px] font-medium transition-colors',
                active ? 'text-[#245B38] font-semibold' : 'text-[#778178] hover:text-[#17231B]'
              )}
            >
              <IconComponent className={cn('w-5 h-5', active ? 'text-[#245B38]' : 'text-[#778178]')} />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
