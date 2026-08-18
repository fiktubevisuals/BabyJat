import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { LogIn } from 'lucide-react';

export default function Login() {
  const { user, profile, signInWithGoogle, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    if (user && profile && !loading) {
      if (profile.role === 'admin' && from === '/') {
         navigate('/admin', { replace: true });
      } else {
         navigate(from, { replace: true });
      }
    }
  }, [user, profile, loading, navigate, from]);

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md p-10 glass-panel flex flex-col items-center text-center">
        <h1 className="text-3xl font-display text-primary mb-2">Welcome Back</h1>
        <p className="text-primary-medium mb-8">Sign in to access your BabyJat account.</p>
        
        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="w-full bg-primary text-surface px-6 py-4 rounded-full font-medium flex items-center justify-center gap-3 hover:bg-primary-light transition-colors disabled:opacity-50"
        >
          {loading ? (
             <div className="w-5 h-5 border-2 border-surface/20 border-t-surface rounded-full animate-spin" />
          ) : (
            <>
              <LogIn className="w-5 h-5" />
              <span>Continue with Google</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
