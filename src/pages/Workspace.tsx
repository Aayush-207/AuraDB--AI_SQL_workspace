import { useState } from 'react';
import { motion } from 'framer-motion';
import SchemaSidebar from '@/components/workspace/SchemaSidebar';
import AIPanel from '@/components/workspace/AIPanel';
import ResultsPanel from '@/components/workspace/ResultsPanel';

const Workspace = () => {
  const [pendingSQL, setPendingSQL] = useState<string | null>(null);

  return (
    <motion.div
      className="h-screen flex bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Schema Sidebar */}
      <div className="w-64 flex-shrink-0">
        <SchemaSidebar />
      </div>

      {/* AI Panel */}
      <div className="flex-1 min-w-0">
        <AIPanel onSQLReady={(sql) => setPendingSQL(sql)} />
      </div>

      {/* Results Panel */}
      <div className="w-[45%] flex-shrink-0">
        <ResultsPanel
          sqlToExecute={pendingSQL}
          onClear={() => setPendingSQL(null)}
        />
      </div>
    </motion.div>
  );
};

export default Workspace;
