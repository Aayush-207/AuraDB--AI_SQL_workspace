import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, MessageSquare, Code, Play, Bot, User } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { aiQuery, type AIQueryResponse } from '@/api/endpoints';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  aiResponse?: AIQueryResponse;
}

interface AIPanelProps {
  onSQLReady: (sql: string) => void;
  onAIResults?: (results: { columns: string[]; rows: Record<string, unknown>[]; query: string }) => void;
}

const AIPanel = ({ onSQLReady, onAIResults }: AIPanelProps) => {
  const [prompt, setPrompt] = useState('');
  const [sqlInput, setSqlInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mode, setMode] = useState<'ai' | 'sql'>('ai');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getConnectionDetails = () => {
    const stored = sessionStorage.getItem('dbConnection');
    if (!stored) return null;
    return JSON.parse(stored);
  };

  const getSafeMode = () => {
    const stored = sessionStorage.getItem('safeMode');
    return stored !== 'false'; // Default to true
  };

  const mutation = useMutation({
    mutationFn: async (p: string) => {
      const conn = getConnectionDetails();
      if (!conn) throw new Error('No database connection. Please reconnect.');
      const response = await aiQuery({
        host: conn.host,
        port: conn.port,
        database: conn.database,
        username: conn.username,
        password: conn.password,
        prompt: p,
        safe_mode: getSafeMode(),
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Add AI response to chat
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        type: 'ai',
        content: data.query || data.error || 'No response',
        timestamp: new Date(),
        aiResponse: data,
      };
      setMessages(prev => [...prev, aiMessage]);

      // If we have results and a callback, send them directly
      if (data.success && data.rows && data.columns && onAIResults) {
        onAIResults({
          columns: data.columns,
          rows: data.rows,
          query: data.query || '',
        });
      }
    },
    onError: (error) => {
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        type: 'ai',
        content: error.message,
        timestamp: new Date(),
        aiResponse: { success: false, error: error.message },
      };
      setMessages(prev => [...prev, aiMessage]);
    },
  });

  const handleSubmit = () => {
    if (!prompt.trim() || mutation.isPending) return;
    
    // Add user message to chat
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: prompt.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    
    mutation.mutate(prompt.trim());
    setPrompt('');
  };

  const handleExecuteSQL = () => {
    if (!sqlInput.trim()) return;
    onSQLReady(sqlInput.trim());
  };

  const handleReExecute = (query: string) => {
    onSQLReady(query);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-semibold">Query Panel</h2>
        <div className="flex items-center gap-1 glass rounded-lg p-0.5">
          <button
            onClick={() => setMode('ai')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              mode === 'ai' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <MessageSquare className="w-3 h-3 inline mr-1" />
            AI
          </button>
          <button
            onClick={() => setMode('sql')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              mode === 'sql' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Code className="w-3 h-3 inline mr-1" />
            SQL
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait" initial={false}>
          {mode === 'sql' ? (
            <motion.div
              key="sql"
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="absolute inset-0 flex flex-col"
            >
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
            </motion.div>
          ) : (
            <motion.div
              key="ai"
              initial={{ x: '-100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-100%', opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="absolute inset-0 flex flex-col"
            >
          {/* Chat Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && !mutation.isPending && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-full text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <MessageSquare className="w-7 h-7 text-primary" />
                </div>
                <p className="text-muted-foreground text-sm">
                  Start a conversation about your database
                </p>
                <p className="text-muted-foreground/50 text-xs mt-2">
                  Ask questions in natural language and get SQL queries
                </p>
              </motion.div>
            )}

            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-3 max-w-[85%] ${message.type === 'user' ? 'flex-row-reverse' : ''}`}>
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.type === 'user' 
                        ? 'bg-primary' 
                        : 'bg-gradient-to-br from-violet-500 to-purple-600'
                    }`}>
                      {message.type === 'user' ? (
                        <User className="w-4 h-4 text-primary-foreground" />
                      ) : (
                        <Bot className="w-4 h-4 text-white" />
                      )}
                    </div>

                    {/* Message Bubble */}
                    <div className={`rounded-2xl px-4 py-3 ${
                      message.type === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'glass rounded-tl-sm'
                    }`}>
                      {message.type === 'user' ? (
                        <p className="text-sm">{message.content}</p>
                      ) : (
                        <div className="space-y-3">
                          {message.aiResponse?.success ? (
                            <>
                              {message.aiResponse.query && (
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                      Generated SQL
                                    </span>
                                    <button
                                      onClick={() => handleReExecute(message.aiResponse!.query!)}
                                      className="px-2 py-0.5 rounded text-[10px] font-medium bg-primary/20 text-primary hover:bg-primary/30 transition-all"
                                    >
                                      Execute
                                    </button>
                                  </div>
                                  <pre className="text-sm font-mono text-foreground whitespace-pre-wrap leading-relaxed bg-muted/30 rounded-lg p-3 overflow-x-auto">
                                    {message.aiResponse.query}
                                  </pre>
                                </div>
                              )}
                              {message.aiResponse.affected_rows !== undefined && (
                                <p className="text-xs text-green-500">
                                  ✓ {message.aiResponse.affected_rows} row(s) affected
                                  {message.aiResponse.rows && message.aiResponse.rows.length > 0 && (
                                    <span> • Table refreshed in results</span>
                                  )}
                                </p>
                              )}
                              {message.aiResponse.affected_rows === undefined && message.aiResponse.rows && message.aiResponse.rows.length > 0 && (
                                <p className="text-xs text-green-500">
                                  ✓ {message.aiResponse.rows.length} rows returned
                                </p>
                              )}
                            </>
                          ) : (
                            <div className="text-sm">
                              <p className="text-destructive font-medium">{message.aiResponse?.error}</p>
                              {message.aiResponse?.details && (
                                <p className="text-xs text-muted-foreground mt-1">{message.aiResponse.details}</p>
                              )}
                              {message.aiResponse?.query && (
                                <pre className="text-xs font-mono text-muted-foreground mt-2 p-2 bg-muted/30 rounded">
                                  {message.aiResponse.query}
                                </pre>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      <p className="text-[10px] text-muted-foreground/50 mt-2">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Loading indicator */}
            {mutation.isPending && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="flex gap-3 max-w-[85%]">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="glass rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">Generating SQL...</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AIPanel;
