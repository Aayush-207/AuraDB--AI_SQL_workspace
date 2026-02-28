import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import SchemaSidebar, { SafeModeWarningModal } from '@/components/workspace/SchemaSidebar';
import AIPanel from '@/components/workspace/AIPanel';
import ResultsPanel from '@/components/workspace/ResultsPanel';
import TopBar from '@/components/workspace/TopBar';
import StatusBar from '@/components/workspace/StatusBar';
import TerminalPanel, { type LogEntry } from '@/components/workspace/TerminalPanel';

interface AIResultsData {
  columns: string[];
  rows: Record<string, unknown>[];
  query: string;
}

const Workspace = () => {
  const [pendingSQL, setPendingSQL] = useState<string | null>(null);
  const [aiResults, setAIResults] = useState<AIResultsData | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [safeMode, setSafeMode] = useState(() => {
    const stored = sessionStorage.getItem('safeMode');
    return stored !== 'false'; // Default to true
  });
  const [showSafeModeWarning, setShowSafeModeWarning] = useState(false);

  const addLog = useCallback((type: LogEntry['type'], message: string, details?: string) => {
    const newLog: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      details,
      timestamp: new Date(),
    };
    setLogs(prev => [...prev, newLog]);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Initial connection log
  useEffect(() => {
    const connection = sessionStorage.getItem('dbConnection');
    if (connection) {
      try {
        const conn = JSON.parse(connection);
        addLog('success', `Connected to ${conn.database}@${conn.host}:${conn.port}`);
      } catch (e) {
        // ignore
      }
    }
  }, [addLog]);

  // Persist Safe Mode setting
  useEffect(() => {
    sessionStorage.setItem('safeMode', String(safeMode));
  }, [safeMode]);

  // Auto-execute query on first table when workspace loads
  useEffect(() => {
    const stored = sessionStorage.getItem('dbSchema');
    if (stored) {
      try {
        const schemas = JSON.parse(stored);
        // Find the first table in the first schema that has tables
        for (const schema of schemas) {
          if (schema.tables && schema.tables.length > 0) {
            const firstTable = schema.tables[0].name;
            const schemaName = schema.schema_name;
            // Use schema-qualified name if not public
            const tableName = schemaName === 'public' ? firstTable : `${schemaName}.${firstTable}`;
            setPendingSQL(`SELECT * FROM ${tableName} LIMIT 100;`);
            break;
          }
        }
      } catch (e) {
        console.error('Failed to parse schema:', e);
      }
    }
  }, []);

  const handleAIResults = (results: AIResultsData) => {
    setAIResults(results);
    setPendingSQL(null); // Clear any pending SQL execution
  };

  const handleToggleSafeMode = () => {
    if (safeMode) {
      // Turning OFF - show warning
      setShowSafeModeWarning(true);
    } else {
      // Turning ON - no warning needed
      setSafeMode(true);
    }
  };

  const handleConfirmDisableSafeMode = () => {
    setSafeMode(false);
    setShowSafeModeWarning(false);
  };

  const handleCancelDisableSafeMode = () => {
    setShowSafeModeWarning(false);
  };

  return (
    <motion.div
      className="h-screen flex flex-col bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Top Bar */}
      <TopBar
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        safeMode={safeMode}
        onToggleSafeMode={handleToggleSafeMode}
      />

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Schema Sidebar */}
        <motion.div 
          className="flex-shrink-0 overflow-hidden"
          animate={{ width: sidebarCollapsed ? 0 : 256 }}
          transition={{ duration: 0.2 }}
        >
          <div className="w-64 h-full">
            <SchemaSidebar collapsed={sidebarCollapsed} />
          </div>
        </motion.div>

        {/* AI Panel */}
        <div className="flex-1 min-w-0">
          <AIPanel 
            onSQLReady={(sql) => {
              setAIResults(null);
              setPendingSQL(sql);
            }} 
            onAIResults={handleAIResults}
            onLog={addLog}
          />
        </div>

        {/* Results Panel + Terminal */}
        <div className="w-[45%] flex-shrink-0 flex flex-col">
          <div className="flex-1 min-h-0">
            <ResultsPanel
              sqlToExecute={pendingSQL}
              aiResults={aiResults}
              onClear={() => {
                setPendingSQL(null);
                setAIResults(null);
              }}
              onLog={addLog}
            />
          </div>
          <TerminalPanel logs={logs} onClearLogs={clearLogs} />
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar isConnected={true} />

      {/* Safe Mode Warning Modal */}
      <SafeModeWarningModal
        isOpen={showSafeModeWarning}
        onConfirm={handleConfirmDisableSafeMode}
        onCancel={handleCancelDisableSafeMode}
      />
    </motion.div>
  );
};

export default Workspace;
