import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Leaf, User, Mail, Lock, Shield, ArrowRight } from 'lucide-react';
import { useAuth, type UserRole } from '../contexts/AuthContext';

const ROLE_OPTIONS: { value: UserRole; label: string; description: string }[] = [
  { value: 'store_manager', label: 'Store Manager', description: 'Monitor inventory, approve actions' },
  { value: 'inventory_staff', label: 'Inventory Staff', description: 'Create batches, scan products' },
  { value: 'operations_manager', label: 'Operations Manager', description: 'Compare stores, coordinate transfers' },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('store_manager');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) { setError('Please enter your name.'); return; }
    if (!email.trim()) { setError('Please enter your email.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }

    setIsLoading(true);
    const result = await register(name.trim(), email.trim(), password, role);
    setIsLoading(false);

    if (result.success) {
      navigate('/app');
    } else {
      setError(result.error || 'Registration failed.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden py-12" style={{ backgroundColor: '#FAF9F5' }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #70A77B 0%, transparent 70%)' }} />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #235A43 0%, transparent 70%)' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#123B2A' }}>
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold" style={{ color: '#123B2A' }}>WasteSense AI</span>
          </Link>
          <p className="mt-3 text-sm" style={{ color: '#63716A' }}>Create your account to get started</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border p-8" style={{ borderColor: '#DDE5DC' }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reg-name" className="block text-sm font-medium mb-1.5" style={{ color: '#192820' }}>Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#63716A' }} />
                <input id="reg-name" type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Priya Sharma" className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2"
                  style={{ borderColor: '#DDE5DC', color: '#192820', backgroundColor: '#FAF9F5' }} />
              </div>
            </div>

            <div>
              <label htmlFor="reg-email" className="block text-sm font-medium mb-1.5" style={{ color: '#192820' }}>Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#63716A' }} />
                <input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com" className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2"
                  style={{ borderColor: '#DDE5DC', color: '#192820', backgroundColor: '#FAF9F5' }} autoComplete="email" />
              </div>
            </div>

            <div>
              <label htmlFor="reg-password" className="block text-sm font-medium mb-1.5" style={{ color: '#192820' }}>Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#63716A' }} />
                <input id="reg-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters" className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2"
                  style={{ borderColor: '#DDE5DC', color: '#192820', backgroundColor: '#FAF9F5' }} autoComplete="new-password" />
              </div>
            </div>

            <div>
              <label htmlFor="reg-confirm" className="block text-sm font-medium mb-1.5" style={{ color: '#192820' }}>Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#63716A' }} />
                <input id="reg-confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password" className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2"
                  style={{ borderColor: '#DDE5DC', color: '#192820', backgroundColor: '#FAF9F5' }} autoComplete="new-password" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#192820' }}>
                <Shield className="inline w-4 h-4 mr-1" />
                Your Role
              </label>
              <div className="grid gap-2">
                {ROLE_OPTIONS.map((opt) => (
                  <label key={opt.value}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${role === opt.value ? 'ring-2' : 'hover:shadow-sm'}`}
                    style={{ borderColor: role === opt.value ? '#235A43' : '#DDE5DC', backgroundColor: role === opt.value ? '#E9F2E8' : 'white' }}>
                    <input type="radio" name="role" value={opt.value} checked={role === opt.value}
                      onChange={() => setRole(opt.value)} className="mt-0.5 accent-[#235A43]" />
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#192820' }}>{opt.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#63716A' }}>{opt.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-sm px-3 py-2 rounded-lg" style={{ color: '#C75D4B', backgroundColor: '#FEF2F0' }}>
                {error}
              </motion.p>
            )}

            <button type="submit" disabled={isLoading}
              className="w-full py-2.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50 mt-2"
              style={{ backgroundColor: '#123B2A' }}>
              {isLoading ? 'Creating Account...' : 'Create Account'}
              {!isLoading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <p className="text-center mt-5 text-sm" style={{ color: '#63716A' }}>
            Already have an account?{' '}
            <Link to="/login" className="font-semibold hover:underline" style={{ color: '#235A43' }}>Sign In</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
