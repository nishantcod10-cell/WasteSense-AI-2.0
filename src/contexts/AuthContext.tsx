import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────
export type UserRole = 'admin' | 'store_manager' | 'inventory_staff' | 'operations_manager' | 'partner';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  storeId?: string;
  isDemo?: boolean;
}

interface AuthState {
  user: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  enterDemoMode: () => void;
}

const USERS_KEY = 'ws_v2_users';
const SESSION_KEY = 'ws_v2_session';

// ─── Demo users pre-seeded ─────────────────────────────────────────────────
interface StoredUser extends AppUser {
  passwordHash: string;
}

const DEMO_USERS: StoredUser[] = [
  { id: 'user-admin-01', name: 'Admin', email: 'admin@wastesense.demo', role: 'admin', passwordHash: btoa('admin123'), isDemo: true },
  { id: 'user-mgr-01', name: 'Priya Sharma', email: 'manager@wastesense.demo', role: 'store_manager', passwordHash: btoa('manager123'), storeId: 'store-01', isDemo: true },
  { id: 'user-staff-01', name: 'Arjun Patel', email: 'staff@wastesense.demo', role: 'inventory_staff', passwordHash: btoa('staff123'), storeId: 'store-01', isDemo: true },
  { id: 'user-ops-01', name: 'Meera Gupta', email: 'ops@wastesense.demo', role: 'operations_manager', passwordHash: btoa('ops123'), isDemo: true },
];

function getStoredUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StoredUser[];
  } catch {
    return [];
  }
}

function setStoredUsers(users: StoredUser[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function seedDemoUsers(): void {
  const existing = getStoredUsers();
  const existingEmails = new Set(existing.map(u => u.email));
  const toAdd = DEMO_USERS.filter(u => !existingEmails.has(u.email));
  if (toAdd.length > 0) {
    setStoredUsers([...existing, ...toAdd]);
  }
}

function getSession(): AppUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppUser;
  } catch {
    return null;
  }
}

function setSession(user: AppUser | null): void {
  if (user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

// ─── Context ────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Initialize: seed demo users and restore session
  useEffect(() => {
    seedDemoUsers();
    const session = getSession();
    setState({
      user: session,
      isAuthenticated: !!session,
      isLoading: false,
    });
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const users = getStoredUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      return { success: false, error: 'No account found with this email address.' };
    }

    if (user.passwordHash !== btoa(password)) {
      return { success: false, error: 'Incorrect password. Please try again.' };
    }

    const sessionUser: AppUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      storeId: user.storeId,
      isDemo: user.isDemo,
    };

    setSession(sessionUser);
    setState({ user: sessionUser, isAuthenticated: true, isLoading: false });
    return { success: true };
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, role: UserRole): Promise<{ success: boolean; error?: string }> => {
    const users = getStoredUsers();
    
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, error: 'An account with this email already exists.' };
    }

    const newUser: StoredUser = {
      id: `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      email,
      role,
      passwordHash: btoa(password),
      storeId: 'store-01',
    };

    setStoredUsers([...users, newUser]);

    const sessionUser: AppUser = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      storeId: newUser.storeId,
    };

    setSession(sessionUser);
    setState({ user: sessionUser, isAuthenticated: true, isLoading: false });
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    setSession(null);
    setState({ user: null, isAuthenticated: false, isLoading: false });
  }, []);

  const enterDemoMode = useCallback(() => {
    const demoUser: AppUser = {
      id: 'demo-anonymous',
      name: 'Demo User',
      email: 'demo@wastesense.demo',
      role: 'store_manager',
      storeId: 'store-01',
      isDemo: true,
    };
    setSession(demoUser);
    setState({ user: demoUser, isAuthenticated: true, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, enterDemoMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
