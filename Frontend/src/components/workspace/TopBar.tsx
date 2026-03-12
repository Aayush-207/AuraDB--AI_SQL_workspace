import { motion } from 'framer-motion';
import { 
  PanelLeft, 
  PanelLeftClose, 
  ShieldCheck, 
  ShieldOff, 
  Database, 
  LogOut,
  Download,
  RotateCcw,
  Play,
  Check,
  Trash2,
  History
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TopBarProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  safeMode: boolean;
  onToggleSafeMode: () => void;
  onRollback: () => void;
  onBeginTransaction: () => void;
  onCommit: () => void;
  onExport: () => void;
  onClear: () => void;
  hasResults: boolean;
  isMongo?: boolean;
}

const TopBar = ({ 
  sidebarCollapsed, 
  onToggleSidebar, 
  safeMode, 
  onToggleSafeMode,
  onRollback,
  onBeginTransaction,
  onCommit,
  onExport,
  onClear,
  hasResults,
  isMongo = false
}: TopBarProps) => {
  const navigate = useNavigate();

  const handleDisconnect = () => {
    sessionStorage.removeItem('dbConnection');
    sessionStorage.removeItem('dbSchema');
    sessionStorage.removeItem('safeMode');
    sessionStorage.removeItem('postgresVersion');
    sessionStorage.removeItem('dbType');
    sessionStorage.removeItem('mongoConnectionString');
    navigate('/connect');
  };

  return (
    <div className="h-12 flex items-center justify-between px-4 bg-sidebar border-b border-border">
      {/* Left - Sidebar Toggle + Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleSidebar}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted/50 transition-colors"
          title={sidebarCollapsed ? 'Expand Schema Explorer' : 'Collapse Schema Explorer'}
        >
          {sidebarCollapsed ? (
            <PanelLeft className="w-4 h-4 text-muted-foreground" />
          ) : (
            <PanelLeftClose className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Transaction Buttons - PostgreSQL only */}
        {!isMongo && (
        <>
        <div className="flex items-center gap-1">
          <button
            onClick={onBeginTransaction}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/30 transition-colors"
            title="Start a new transaction (BEGIN)"
          >
            <Play className="w-3 h-3" />
            BEGIN
          </button>
          <button
            onClick={onCommit}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/30 transition-colors"
            title="Commit current transaction"
          >
            <Check className="w-3 h-3" />
            COMMIT
          </button>
          <button
            onClick={onRollback}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 border border-orange-500/30 transition-colors"
            title="Rollback current transaction"
          >
            <RotateCcw className="w-3 h-3" />
            ROLLBACK
          </button>
        </div>

        <div className="w-px h-6 bg-border mx-1" />
        </>
        )}

        {/* Results Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={onExport}
            disabled={!hasResults}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              hasResults 
                ? 'bg-muted/50 hover:bg-muted text-foreground' 
                : 'bg-muted/20 text-muted-foreground cursor-not-allowed'
            }`}
            title="Export results as CSV"
          >
            <Download className="w-3 h-3" />
            Export
          </button>
          <button
            onClick={onClear}
            disabled={!hasResults}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              hasResults 
                ? 'bg-muted/50 hover:bg-muted text-foreground' 
                : 'bg-muted/20 text-muted-foreground cursor-not-allowed'
            }`}
            title="Clear results"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        </div>
      </div>

      {/* Center - App Name */}
      <div className="flex items-center gap-2">
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        >
          <Database className="w-5 h-5 text-primary" />
        </motion.div>
        <h1 className="text-sm font-semibold tracking-wide">
          <span className="text-primary">AuraDB</span>
          <span className="text-muted-foreground mx-1.5">—</span>
          <span className="text-foreground/80">AI SQL Workspace</span>
        </h1>
      </div>

      {/* Right - Safe Mode Toggle + Disconnect */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleSafeMode}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
            safeMode 
              ? 'bg-green-500/10 hover:bg-green-500/20 border border-green-500/30' 
              : 'bg-destructive/10 hover:bg-destructive/20 border border-destructive/30'
          }`}
          title={safeMode ? 'Safe Mode: ON - Dangerous queries blocked' : 'Safe Mode: OFF - All queries allowed'}
        >
          {safeMode ? (
            <ShieldCheck className="w-4 h-4 text-green-500" />
          ) : (
            <ShieldOff className="w-4 h-4 text-destructive" />
          )}
          <span className={`text-xs font-medium ${safeMode ? 'text-green-500' : 'text-destructive'}`}>
            Safe Mode
          </span>
          <div className={`w-8 h-4 rounded-full relative transition-colors ${
            safeMode ? 'bg-green-500' : 'bg-destructive'
          }`}>
            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all ${
              safeMode ? 'right-0.5' : 'left-0.5'
            }`} />
          </div>
        </button>

        <div className="w-px h-6 bg-border" />

        <button
          onClick={handleDisconnect}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 border border-destructive/30 transition-colors"
          title="Disconnect from database"
        >
          <LogOut className="w-4 h-4 text-destructive" />
          <span className="text-xs font-medium text-destructive">Disconnect</span>
        </button>
      </div>
    </div>
  );
};

export default TopBar;
