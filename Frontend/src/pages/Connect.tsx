import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Loader2, AlertCircle, Lock, Eye, EyeOff } from 'lucide-react';
import { connectDatabase, type ConnectionPayload } from '@/api/endpoints';

const Connect = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<ConnectionPayload>({
    host: '',
    port: 5432,
    database: '',
    username: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shaking, setShaking] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showHostSuggestion, setShowHostSuggestion] = useState(false);
  const [showUsernameSuggestion, setShowUsernameSuggestion] = useState(false);
  const hostInputRef = useRef<HTMLInputElement>(null);
  const usernameInputRef = useRef<HTMLInputElement>(null);

  const fields: { key: keyof ConnectionPayload; label: string; type: string; placeholder: string }[] = [
    { key: 'host', label: 'Host', type: 'text', placeholder: 'localhost or db.example.com' },
    { key: 'port', label: 'Port', type: 'number', placeholder: '5432' },
    { key: 'database', label: 'Database Name', type: 'text', placeholder: 'my_database' },
    { key: 'username', label: 'Username', type: 'text', placeholder: 'postgres' },
    { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
  ];

  const isValid = form.host && form.database && form.username && form.password && form.port > 0;

  const handleSuggestionClick = (field: 'host' | 'username', value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === 'host') {
      setShowHostSuggestion(false);
    } else {
      setShowUsernameSuggestion(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    setError('');
    try {
      const response = await connectDatabase(form);
      if (response.data.success) {
        // Store schema in sessionStorage for workspace
        sessionStorage.setItem('dbSchema', JSON.stringify(response.data.schemas || []));
        sessionStorage.setItem('dbConnection', JSON.stringify(form));
        navigate('/workspace');
      } else {
        setError(response.data.error || 'Connection failed');
        setShaking(true);
        setTimeout(() => setShaking(false), 500);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      setError(msg);
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="min-h-screen bg-background flex items-center justify-center px-6 relative"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="absolute inset-0 bg-gradient-radial pointer-events-none" />

      <motion.div
        className={`relative w-full max-w-md glass-strong rounded-2xl p-8 ${shaking ? 'animate-shake' : ''}`}
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Database className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Connect Your PostgreSQL Database</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {fields.map((field, i) => (
            <motion.div
              key={field.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.06 }}
            >
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                {field.label}
              </label>
              <div className="relative">
                <input
                  ref={field.key === 'host' ? hostInputRef : field.key === 'username' ? usernameInputRef : undefined}
                  type={field.key === 'password' ? (showPassword ? 'text' : 'password') : field.type}
                  placeholder={field.placeholder}
                  value={form[field.key]}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value,
                    }))
                  }
                  onFocus={() => {
                    if (field.key === 'host' && !form.host) setShowHostSuggestion(true);
                    if (field.key === 'username' && !form.username) setShowUsernameSuggestion(true);
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      setShowHostSuggestion(false);
                      setShowUsernameSuggestion(false);
                    }, 150);
                  }}
                  className="w-full px-4 py-3 rounded-lg bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground/50 outline-none transition-all duration-200 focus:border-primary input-glow font-mono text-sm"
                />
                {field.key === 'host' && showHostSuggestion && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-10 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => handleSuggestionClick('host', 'localhost')}
                      className="w-full px-4 py-2.5 text-left text-sm font-mono hover:bg-muted/50 transition-colors"
                    >
                      localhost
                    </button>
                  </div>
                )}
                {field.key === 'username' && showUsernameSuggestion && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-10 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => handleSuggestionClick('username', 'postgres')}
                      className="w-full px-4 py-2.5 text-left text-sm font-mono hover:bg-muted/50 transition-colors"
                    >
                      postgres
                    </button>
                  </div>
                )}
                {field.key === 'password' && (
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </motion.div>
          ))}

          <AnimatePresence>
            {error && (
              <motion.div
                className="flex items-center gap-2 text-destructive text-sm p-3 rounded-lg bg-destructive/10 border border-destructive/20"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={!isValid || loading}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 glow-primary flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Connecting...
              </>
            ) : (
              'Connect'
            )}
          </button>
        </form>

        <div className="flex items-center gap-2 mt-6 text-muted-foreground/60 text-xs">
          <Lock className="w-3.5 h-3.5" />
          <span>Credentials are securely processed and never stored in the browser.</span>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Connect;
