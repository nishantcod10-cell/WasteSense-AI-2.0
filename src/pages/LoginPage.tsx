import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Leaf, Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, enterDemoMode } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    if (!password) { setError('Please enter your password.'); return; }

    setIsLoading(true);
    const result = await login(email.trim(), password);
    setIsLoading(false);

    if (result.success) {
      navigate('/app');
    } else {
      setError(result.error || 'Login failed.');
    }
  };

  const handleDemoMode = () => {
    enterDemoMode();
    navigate('/app');
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: '#FAF9F5' }}>
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #70A77B 0%, transparent 70%)' }} />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #235A43 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5" style={{ background: 'radial-gradient(circle, #123B2A 0%, transparent 60%)' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#123B2A' }}>
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold" style={{ color: '#123B2A' }}>WasteSense AI</span>
          </Link>
          <p className="mt-3 text-sm" style={{ color: '#63716A' }}>Sign in to your sustainability dashboard</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border p-8" style={{ borderColor: '#DDE5DC' }}>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium mb-1.5" style={{ color: '#192820' }}>
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#63716A' }} />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="manager@wastesense.demo"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none transition-all focus:ring-2"
                  style={{ borderColor: '#DDE5DC', color: '#192820', backgroundColor: '#FAF9F5' }}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-password" className="block text-sm font-medium mb-1.5" style={{ color: '#192820' }}>
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#63716A' }} />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-2.5 rounded-xl border text-sm outline-none transition-all focus:ring-2"
                  style={{ borderColor: '#DDE5DC', color: '#192820', backgroundColor: '#FAF9F5' }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" style={{ color: '#63716A' }} /> : <Eye className="w-4 h-4" style={{ color: '#63716A' }} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm px-3 py-2 rounded-lg"
                style={{ color: '#C75D4B', backgroundColor: '#FEF2F0' }}
              >
                {error}
              </motion.p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#123B2A' }}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
              {!isLoading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ backgroundColor: '#DDE5DC' }} />
            <span className="text-xs" style={{ color: '#63716A' }}>or</span>
            <div className="flex-1 h-px" style={{ backgroundColor: '#DDE5DC' }} />
          </div>

          {/* Demo Mode */}
          <button
            onClick={handleDemoMode}
            className="w-full py-2.5 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 transition-all hover:shadow-md"
            style={{ borderColor: '#235A43', color: '#235A43', backgroundColor: '#E9F2E8' }}
          >
            <Sparkles className="w-4 h-4" />
            Explore Live Demo
          </button>

          {/* Register link */}
          <p className="text-center mt-5 text-sm" style={{ color: '#63716A' }}>
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold hover:underline" style={{ color: '#235A43' }}>
              Create Account
            </Link>
          </p>

          {/* Demo credentials hint */}
          <div className="mt-5 p-3 rounded-xl text-xs" style={{ backgroundColor: '#E9F2E8', color: '#235A43' }}>
            <p className="font-semibold mb-1">Demo Credentials:</p>
            <p>manager@wastesense.demo / manager123</p>
            <p>admin@wastesense.demo / admin123</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
