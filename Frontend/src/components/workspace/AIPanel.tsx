import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Code, MessageSquare, Play } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { generateSQL, type GenerateSQLResponse } from '@/api/endpoints';

interface AIPanelProps {
  onSQLReady: (sql: string) => void;
}

const AIPanel = ({ onSQLReady }: AIPanelProps) => {
  const [prompt, setPrompt] = useState('');
  const [sqlInput, setSqlInput] = useState('');
  const [result, setResult] = useState<GenerateSQLResponse | null>(null);
  const [mode, setMode] = useState<'natural' | 'sql'>('sql');

  const mutation = useMutation({
    mutationFn: (p: string) => generateSQL({ prompt: p }).then((r) => r.data),
    onSuccess: (data) => setResult(data),
  });

  const handleSubmit = () => {
    if (!prompt.trim() || mutation.isPending) return;
    mutation.mutate(prompt.trim());
  };

  const handleExecuteGenerated = () => {
    if (result?.sql) onSQLReady(result.sql);
  };

  const handleExecuteSQL = () => {
    if (!sqlInput.trim()) return;
    onSQLReady(sqlInput.trim());
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-semibold">Query Panel</h2>
        <div className="flex items-center gap-1 glass rounded-lg p-0.5">
          <button
            onClick={() => setMode('sql')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              mode === 'sql' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Code className="w-3 h-3 inline mr-1" />
            SQL
          </button>
          <button
            onClick={() => setMode('natural')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              mode === 'natural' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <MessageSquare className="w-3 h-3 inline mr-1" />
            AI
          </button>
        </div>
      </div>

      {mode === 'sql' ? (
        // SQL Mode
        <div className="flex-1 flex flex-col">
          <div className="flex-1 p-4">
            <div className="h-full glass rounded-xl p-4 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  SQL Query
                </span>
                <button
                  onClick={handleExecuteSQL}
                  disabled={!sqlInput.trim()}
                  className="px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:brightness-110 transition-all disabled:opacity-30 flex items-center gap-1.5"
                >
                  <Play className="w-3 h-3" />
                  Execute
                </button>
              </div>
              <textarea
                value={sqlInput}
                onChange={(e) => setSqlInput(e.target.value)}
                placeholder="SELECT * FROM customers;"
                className="flex-1 w-full bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/50 resize-none leading-relaxed"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    handleExecuteSQL();
                  }
                }}
              />
              <p className="text-[10px] text-muted-foreground/50 mt-2">
                Press Ctrl+Enter to execute
              </p>
            </div>
          </div>
        </div>
      ) : (
        // AI Natural Language Mode
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <AnimatePresence mode="wait">
              {mutation.isPending && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center py-12"
                >
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Generating SQL...</p>
                  </div>
                </motion.div>
              )}

              {!mutation.isPending && result && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {result.explanation && (
                    <div className="glass rounded-xl p-4">
                      <p className="text-sm text-muted-foreground leading-relaxed">{result.explanation}</p>
                    </div>
                  )}
                  <div className="glass rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Generated SQL
                      </span>
                      <button
                        onClick={handleExecuteGenerated}
                        className="px-3 py-1 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:brightness-110 transition-all"
                      >
                        Execute
                      </button>
                    </div>
                    <pre className="text-sm font-mono text-foreground whitespace-pre-wrap leading-relaxed overflow-x-auto">
                      {result.sql}
                    </pre>
                  </div>
                </motion.div>
              )}

              {!mutation.isPending && !result && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-16 text-center"
                >
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                    <MessageSquare className="w-7 h-7 text-primary" />
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Describe what you want to query in natural language
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {mutation.error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-destructive p-3 rounded-lg bg-destructive/10 border border-destructive/20"
              >
                {mutation.error.message}
              </motion.div>
            )}
          </div>

          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-2 glass rounded-xl px-4 py-2">
              <input
                type="text"
                placeholder="Ask anything about your database..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground/50"
              />
              <button
                onClick={handleSubmit}
                disabled={!prompt.trim() || mutation.isPending}
                className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-30 hover:brightness-110 transition-all"
              >
                {mutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AIPanel;
