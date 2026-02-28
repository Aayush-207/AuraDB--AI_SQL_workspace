import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, ChevronUp, ChevronDown, Trash2, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

export interface LogEntry {
  id: string;
  type: 'info' | 'error' | 'warning' | 'success';
  message: string;
  details?: string;
  timestamp: Date;
}

interface TerminalPanelProps {
  logs: LogEntry[];
  onClearLogs: () => void;
}

const LogIcon = ({ type }: { type: LogEntry['type'] }) => {
  switch (type) {
    case 'error':
      return <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />;
    case 'warning':
      return <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />;
    case 'success':
      return <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />;
    default:
      return <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />;
  }
};

const TerminalPanel = ({ logs, onClearLogs }: TerminalPanelProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (scrollRef.current && !isCollapsed) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isCollapsed]);

  const toggleLogExpand = (logId: string) => {
    setExpandedLogs(prev => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'error':
        return 'text-destructive';
      case 'warning':
        return 'text-yellow-500';
      case 'success':
        return 'text-green-500';
      default:
        return 'text-blue-400';
    }
  };

  const errorCount = logs.filter(l => l.type === 'error').length;
  const warningCount = logs.filter(l => l.type === 'warning').length;

  return (
    <div className="border-t border-border bg-sidebar flex flex-col">
      {/* Header */}
      <div 
        className="px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium">Console</span>
          </div>
          {(errorCount > 0 || warningCount > 0) && (
            <div className="flex items-center gap-2">
              {errorCount > 0 && (
                <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-destructive/20 text-destructive">
                  <AlertCircle className="w-3 h-3" />
                  {errorCount}
                </span>
              )}
              {warningCount > 0 && (
                <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-500">
                  <AlertTriangle className="w-3 h-3" />
                  {warningCount}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {logs.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClearLogs();
              }}
              className="p-1 rounded hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
              title="Clear console"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          {isCollapsed ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 160 }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div 
              ref={scrollRef}
              className="h-40 overflow-y-auto px-4 py-2 font-mono text-xs space-y-1 bg-background/50"
            >
              {logs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground/50">
                  Console output will appear here
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="group">
                    <div 
                      className={`flex items-start gap-2 py-0.5 ${log.details ? 'cursor-pointer hover:bg-muted/20 rounded px-1 -mx-1' : ''}`}
                      onClick={() => log.details && toggleLogExpand(log.id)}
                    >
                      <span className="text-muted-foreground/50 flex-shrink-0">
                        [{formatTime(log.timestamp)}]
                      </span>
                      <LogIcon type={log.type} />
                      <span className={getLogColor(log.type)}>
                        {log.message}
                      </span>
                      {log.details && (
                        <span className="text-muted-foreground/30 ml-auto">
                          {expandedLogs.has(log.id) ? '▼' : '▶'}
                        </span>
                      )}
                    </div>
                    {log.details && expandedLogs.has(log.id) && (
                      <motion.pre
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="ml-6 mt-1 p-2 rounded bg-muted/30 text-[11px] text-muted-foreground whitespace-pre-wrap overflow-x-auto border-l-2 border-destructive/50"
                      >
                        {log.details}
                      </motion.pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TerminalPanel;
