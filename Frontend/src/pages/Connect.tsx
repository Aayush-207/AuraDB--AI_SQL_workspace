import { useState, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Loader2, AlertCircle, Lock, Eye, EyeOff, Link } from 'lucide-react';
import { connectDatabase, type ConnectionPayload } from '@/api/endpoints';

const Connect = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<ConnectionPayload>({
    host: '',
    port: 5432,
    database: '',
    username: '',
    password: '',
    db_type: 'postgresql',
    connection_string: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shaking, setShaking] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showHostSuggestion, setShowHostSuggestion] = useState(false);
  const [showUsernameSuggestion, setShowUsernameSuggestion] = useState(false);
  const [useConnectionString, setUseConnectionString] = useState(false);
  const hostInputRef = useRef<HTMLInputElement>(null);
  const usernameInputRef = useRef<HTMLInputElement>(null);
  const slideDirection = useRef<1 | -1>(1);

  const isMongo = form.db_type === 'mongodb';

  // Auto-detect connection string pasted into host field
  const handleHostChange = (value: string) => {
    if (value.startsWith('mongodb+srv://') || value.startsWith('mongodb://')) {
      // User pasted a connection string into host — switch to connection string mode
      setUseConnectionString(true);
      // Try to extract database from the URI path
      let dbName = form.database;
      try {
        const pathMatch = value.match(/\.net\/([^?/]+)/);
        if (pathMatch && pathMatch[1]) {
          dbName = pathMatch[1];
        }
      } catch { /* ignore */ }
      setForm(prev => ({ ...prev, host: '', connection_string: value, database: dbName }));
      return;
    }
    setForm(prev => ({ ...prev, host: value }));
  };

  const fields = useMemo(() => {
    const base: { key: keyof ConnectionPayload; label: string; type: string; placeholder: string; required: boolean }[] = [
      { key: 'host', label: 'Host', type: 'text', placeholder: 'localhost or db.example.com', required: true },
      { key: 'port', label: 'Port', type: 'number', placeholder: isMongo ? '27017' : '5432', required: true },
      { key: 'database', label: 'Database Name', type: 'text', placeholder: 'my_database', required: true },
      { key: 'username', label: 'Username', type: 'text', placeholder: isMongo ? '(optional)' : 'postgres', required: !isMongo },
      { key: 'password', label: 'Password', type: 'password', placeholder: isMongo ? '(optional)' : '••••••••', required: !isMongo },
    ];
    return base;
  }, [isMongo]);

  const isValid = useConnectionString
    ? (form.connection_string && form.database)
    : (form.host && form.database && form.port > 0 && (isMongo || (form.username && form.password)));

  const handleDbTypeSwitch = useCallback((type: string) => {
    slideDirection.current = type === 'mongodb' ? 1 : -1;
    setForm(prev => ({
      ...prev,
      db_type: type,
      port: type === 'mongodb' ? 27017 : 5432,
      connection_string: '',
    }));
    setUseConnectionString(type === 'mongodb');
    setError('');
  }, []);

  const formVariants = {
    enter: (dir: number) => ({ x: dir * 80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir * -80, opacity: 0 }),
  };

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
        sessionStorage.setItem('postgresVersion', response.data.postgres_version || '');
        sessionStorage.setItem('dbType', form.db_type);
        if (form.connection_string) {
          sessionStorage.setItem('mongoConnectionString', form.connection_string);
        }
        navigate('/workspace');
      } else {
        setError(response.data.error || 'Connection failed');
        setShaking(true);
        setTimeout(() => setShaking(false), 500);
      }
    } catch (err) {
      // Handle axios error response
      let msg = 'Connection failed';
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        msg = axiosErr.response?.data?.detail || msg;
      } else if (err instanceof Error) {
        msg = err.message;
      }
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
            <h1 className="text-xl font-bold">Connect Your {isMongo ? 'MongoDB' : 'PostgreSQL'} Database</h1>
          </div>
        </div>

        {/* DB Type Slider Toggle */}
        <div className="relative flex mb-6 rounded-lg bg-muted/50 border border-border p-1">
          <motion.div
            className="absolute top-1 bottom-1 rounded-md bg-primary shadow-lg"
            initial={false}
            animate={{ x: isMongo ? '100%' : '0%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            style={{ width: 'calc(50% - 4px)' }}
          />
          <button
            type="button"
            onClick={() => handleDbTypeSwitch('postgresql')}
            className={`relative z-10 flex-1 py-2.5 rounded-md text-sm font-medium transition-colors duration-200 ${
              !isMongo ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            PostgreSQL
          </button>
          <button
            type="button"
            onClick={() => handleDbTypeSwitch('mongodb')}
            className={`relative z-10 flex-1 py-2.5 rounded-md text-sm font-medium transition-colors duration-200 ${
              isMongo ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            MongoDB
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative overflow-hidden">
            <AnimatePresence initial={false} mode="popLayout" custom={slideDirection.current}>
              {isMongo ? (
                <motion.div
                  key="mongodb"
                  custom={slideDirection.current}
                  variants={formVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: 'spring', stiffness: 350, damping: 32, mass: 0.8 }}
                  className="space-y-5"
                >
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                      Connection String
                    </label>
                    <div className="relative">
                      <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                      <input
                        type="text"
                        placeholder="mongodb+srv://user:pass@cluster.mongodb.net/"
                        value={form.connection_string || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setForm(prev => ({ ...prev, connection_string: val }));
                          try {
                            const pathMatch = val.match(/\.net\/([^?/]+)/);
                            if (pathMatch && pathMatch[1] && !form.database) {
                              setForm(prev => ({ ...prev, database: pathMatch[1] }));
                            }
                          } catch { /* ignore */ }
                        }}
                        className="w-full pl-9 pr-4 py-3 rounded-lg bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground/50 outline-none transition-all duration-200 focus:border-primary input-glow font-mono text-xs"
                      />
                    </div>
                    {form.connection_string && (
                      <p className="text-[10px] text-green-500/70 mt-1.5 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Connection string set
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                      Database Name
                    </label>
                    <input
                      type="text"
                      placeholder="my_database"
                      value={form.database}
                      onChange={(e) => setForm(prev => ({ ...prev, database: e.target.value }))}
                      className="w-full px-4 py-3 rounded-lg bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground/50 outline-none transition-all duration-200 focus:border-primary input-glow font-mono text-sm"
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="postgresql"
                  custom={slideDirection.current}
                  variants={formVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: 'spring', stiffness: 350, damping: 32, mass: 0.8 }}
                  className="space-y-5"
                >
                  {fields.map((field, i) => (
                    <motion.div
                      key={field.key}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.04 + i * 0.05 }}
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
                          onChange={(e) => {
                            if (field.key === 'host') {
                              handleHostChange(e.target.value);
                            } else {
                              setForm((prev) => ({
                                ...prev,
                                [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value,
                              }));
                            }
                          }}
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>

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
