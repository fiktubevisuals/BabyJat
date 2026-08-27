import React, { useState, useEffect } from 'react';
import { useAuth, UserRole } from '../../contexts/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { LogIn, UserPlus, Mail, Lock, User as UserIcon, ShieldAlert } from 'lucide-react';

export default function Login() {
  const { user, profile, signInWithGoogle, signInWithEmail, signUpWithEmail, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('client');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    if (user && profile && !loading) {
      const destination = (from && from !== '/login') 
        ? from 
        : (profile.role === 'admin' ? '/admin' : '/');
      navigate(destination, { replace: true });
    }
  }, [user, profile, loading, navigate, from]);

  const handleGoogleSignIn = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.warn("Google sign in notice:", err);
      if (err?.code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized in Firebase OAuth settings. Please use Email & Password Sign In.');
      } else if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        setError('Sign-in popup closed. Please try again or use email sign in.');
      } else if (err?.code === 'auth/popup-blocked') {
        setError('Browser blocked the sign-in popup. Please allow popups or use email sign in.');
      } else if (err?.code === 'auth/operation-not-allowed') {
        setError('Google Sign-In is disabled in Firebase console. Please use Email Sign In.');
      } else {
        setError(err.message || 'Unable to sign in with Google. Please try email sign in.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    if (mode === 'signup' && !displayName.trim()) {
      setError('Please enter your full name.');
      return;
    }

    setSubmitting(true);

    try {
      if (mode === 'signin') {
        await signInWithEmail(email.trim(), password);
      } else {
        await signUpWithEmail(email.trim(), password, displayName.trim(), role);
      }
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('Database is closing') || err.message?.includes('database is closing') || err.code === 'auth/internal-error') {
        setError('Storage connection refreshed. Please tap Sign In again.');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password. If you do not have an account yet, click "Create Account" above.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('This email address is already registered. Please sign in instead.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters long.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password login is not enabled in Firebase Auth console.');
      } else {
        setError(err.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 md:p-8 font-body-md relative overflow-hidden">
      {/* Background Decorative Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-surface-container-lowest border border-outline/10 shadow-2xl rounded-3xl p-8 md:p-10 relative z-10 space-y-6">
        {/* Brand Title */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-block group">
            <h1 className="font-headline-md text-3xl italic tracking-tight text-primary group-hover:opacity-90 transition-opacity">
              BabyJat
            </h1>
            <p className="font-label-caps text-[11px] text-secondary tracking-widest uppercase mt-0.5">
              Salon &amp; Luxury Spa
            </p>
          </Link>
          <p className="text-sm text-secondary pt-2">
            {mode === 'signin' ? 'Welcome back! Sign in to manage your appointments & shop.' : 'Create your account for instant bookings & perks.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-surface-container p-1 rounded-2xl border border-outline/10">
          <button
            type="button"
            onClick={() => { setMode('signin'); setError(null); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-label-caps transition-all ${
              mode === 'signin'
                ? 'bg-surface text-primary font-bold shadow-sm'
                : 'text-secondary hover:text-on-surface'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(null); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-label-caps transition-all ${
              mode === 'signup'
                ? 'bg-surface text-primary font-bold shadow-sm'
                : 'text-secondary hover:text-on-surface'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 bg-error-container/40 border border-error/30 text-error rounded-2xl text-xs flex items-center gap-2.5 animate-fade-in">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Google Authentication Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={submitting || loading}
          className="w-full bg-surface border border-outline/20 text-on-surface py-3.5 px-4 rounded-2xl font-label-caps text-xs font-bold flex items-center justify-center gap-3 hover:bg-surface-variant/50 transition-all duration-200 shadow-sm disabled:opacity-50"
        >
          {submitting ? (
            <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>

        <div className="relative my-4 flex items-center justify-center">
          <div className="border-t border-outline/10 w-full" />
          <span className="bg-surface-container-lowest px-3 text-[11px] font-label-caps text-secondary uppercase tracking-wider absolute">
            or email
          </span>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="space-y-1.5">
              <label className="text-xs font-label-caps text-secondary">Full Name</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Mubiru Shafik"
                  className="w-full pl-10 pr-4 py-3 bg-surface-container-low border border-outline/15 rounded-2xl text-xs focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-label-caps text-secondary">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-3 bg-surface-container-low border border-outline/15 rounded-2xl text-xs focus:ring-2 focus:ring-primary/20 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-label-caps text-secondary">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-surface-container-low border border-outline/15 rounded-2xl text-xs focus:ring-2 focus:ring-primary/20 focus:outline-none"
              />
            </div>
          </div>

          {mode === 'signup' && (
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-label-caps text-secondary">Account Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-4 py-3 bg-surface-container-low border border-outline/15 rounded-2xl text-xs focus:ring-2 focus:ring-primary/20 focus:outline-none"
              >
                <option value="client">Client (Appointments &amp; Shopping)</option>
                <option value="stylist">Stylist / Staff Member</option>
                <option value="admin">Salon Administrator</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary text-on-primary py-3.5 px-4 rounded-2xl font-label-caps text-xs font-bold hover:opacity-90 transition-all duration-200 shadow-md flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-on-primary/20 border-t-on-primary rounded-full animate-spin" />
            ) : mode === 'signin' ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Account</span>
              </>
            )}
          </button>
        </form>

        {/* Storefront Link */}
        <div className="text-center pt-2">
          <Link to="/" className="text-xs text-secondary hover:text-primary transition-colors">
            ← Back to Storefront
          </Link>
        </div>
      </div>
    </div>
  );
}
