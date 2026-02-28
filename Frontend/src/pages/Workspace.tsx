import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import SchemaSidebar, { SafeModeWarningModal } from '@/components/workspace/SchemaSidebar';
import AIPanel from '@/components/workspace/AIPanel';
import ResultsPanel from '@/components/workspace/ResultsPanel';
import TopBar from '@/components/workspace/TopBar';
import StatusBar from '@/components/workspace/StatusBar';

interface AIResultsData {
  columns: string[];
  rows: Record<string, unknown>[];
  query: string;
}

const Workspace = () => {
  const [pendingSQL, setPendingSQL] = useState<string | null>(null);
  const [aiResults, setAIResults] = useState<AIResultsData | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [safeMode, setSafeMode] = useState(() => {
    const stored = sessionStorage.getItem('safeMode');
    return stored !== 'false'; // Default to true
  });
  const [showSafeModeWarning, setShowSafeModeWarning] = useState(false);

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
          className="flex-shrink-0"
          animate={{ width: sidebarCollapsed ? 0 : 256 }}
          transition={{ duration: 0.2 }}
        >
          <SchemaSidebar collapsed={sidebarCollapsed} />
        </motion.div>

        {/* AI Panel */}
        <div className="flex-1 min-w-0">
          <AIPanel 
            onSQLReady={(sql) => {
              setAIResults(null);
              setPendingSQL(sql);
            }} 
            onAIResults={handleAIResults}
          />
        </div>

        {/* Results Panel */}
        <div className="w-[45%] flex-shrink-0">
          <ResultsPanel
            sqlToExecute={pendingSQL}
            aiResults={aiResults}
            onClear={() => {
              setPendingSQL(null);
              setAIResults(null);
            }}
          />
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
