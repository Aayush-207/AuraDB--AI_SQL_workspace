import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import SchemaSidebar, { SafeModeWarningModal } from '@/components/workspace/SchemaSidebar';
import AIPanel from '@/components/workspace/AIPanel';
import ResultsPanel from '@/components/workspace/ResultsPanel';
import TopBar from '@/components/workspace/TopBar';
import StatusBar from '@/components/workspace/StatusBar';
import TerminalPanel, { type LogEntry } from '@/components/workspace/TerminalPanel';
import { executeQuery } from '@/api/endpoints';

interface AIResultsData {
  columns: string[];
  rows: Record<string, unknown>[];
  query: string;
}

interface ResultsData {
  columns: string[];
  rows: Record<string, unknown>[];
}

const Workspace = () => {
  const [pendingSQL, setPendingSQL] = useState<string | null>(null);
  const [aiResults, setAIResults] = useState<AIResultsData | null>(null);
  const [currentResults, setCurrentResults] = useState<ResultsData | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [safeMode, setSafeMode] = useState(() => {
    const stored = sessionStorage.getItem('safeMode');
    return stored !== 'false'; // Default to true
  });
  const [showSafeModeWarning, setShowSafeModeWarning] = useState(false);

  const dbType = sessionStorage.getItem('dbType') || 'postgresql';
  const isMongo = dbType === 'mongodb';

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

  // Track results when they change
  const handleResultsUpdate = useCallback((results: ResultsData | null) => {
    setCurrentResults(results);
  }, []);

  // Transaction controls
  const executeTransactionSQL = useCallback(async (sql: string, successMsg: string, errorMsg: string) => {
    try {
      await executeQuery({ sql });
      addLog('success', successMsg);
    } catch (error) {
      const errorDetail = error instanceof Error ? error.message : String(error);
      addLog('error', errorMsg, errorDetail);
    }
  }, [addLog]);

  const handleRollback = useCallback(() => {
    executeTransactionSQL('ROLLBACK;', 'Transaction rolled back', 'Rollback failed');
  }, [executeTransactionSQL]);

  const handleBeginTransaction = useCallback(() => {
    executeTransactionSQL('BEGIN;', 'Transaction started', 'Failed to start transaction');
  }, [executeTransactionSQL]);

  const handleCommit = useCallback(() => {
    executeTransactionSQL('COMMIT;', 'Transaction committed', 'Commit failed');
  }, [executeTransactionSQL]);

  // Export results as CSV
  const handleExport = useCallback(() => {
    if (!currentResults || !currentResults.columns.length || !currentResults.rows.length) {
      addLog('warning', 'No results to export');
      return;
    }

    const { columns, rows } = currentResults;
    
    // Build CSV content
    const escapeCsv = (value: unknown): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvHeader = columns.map(escapeCsv).join(',');
    const csvRows = rows.map(row => 
      columns.map(col => escapeCsv(row[col])).join(',')
    );
    const csvContent = [csvHeader, ...csvRows].join('\n');

    // Create download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `query_results_${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addLog('success', `Exported ${rows.length} rows to CSV`);
  }, [currentResults, addLog]);

  // Clear results
  const handleClearResults = useCallback(() => {
    setPendingSQL(null);
    setAIResults(null);
    setCurrentResults(null);
    addLog('info', 'Results cleared');
  }, [addLog]);

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
    const storedDbType = sessionStorage.getItem('dbType') || 'postgresql';
    if (stored) {
      try {
        const schemas = JSON.parse(stored);
        // Find the first table/collection in the first schema
        for (const schema of schemas) {
          if (schema.tables && schema.tables.length > 0) {
            const firstName = schema.tables[0].name;
            if (storedDbType === 'mongodb') {
              // MongoDB: use JSON query format
              setPendingSQL(JSON.stringify({ collection: firstName, operation: 'find', filter: {}, limit: 100 }));
            } else {
              // PostgreSQL / MySQL: use SQL
              const schemaName = schema.schema_name;
              const tableName = storedDbType === 'mysql' ? firstName : (schemaName === 'public' ? firstName : `${schemaName}.${firstName}`);
              setPendingSQL(`SELECT * FROM ${tableName} LIMIT 100;`);
            }
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
        onRollback={handleRollback}
        onBeginTransaction={handleBeginTransaction}
        onCommit={handleCommit}
        onExport={handleExport}
        onClear={handleClearResults}
        hasResults={currentResults !== null && currentResults.rows.length > 0}
        isMongo={isMongo}
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
              onResultsUpdate={handleResultsUpdate}
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
