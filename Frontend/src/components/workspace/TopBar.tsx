import { motion } from 'framer-motion';
import { PanelLeft, PanelLeftClose, ShieldCheck, ShieldOff, Database } from 'lucide-react';

interface TopBarProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  safeMode: boolean;
  onToggleSafeMode: () => void;
}

const TopBar = ({ 
  sidebarCollapsed, 
  onToggleSidebar, 
  safeMode, 
  onToggleSafeMode 
}: TopBarProps) => {
  return (
    <div className="h-12 flex items-center justify-between px-4 bg-sidebar border-b border-border">
      {/* Left - Sidebar Toggle */}
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

      {/* Right - Safe Mode Toggle */}
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
    </div>
  );
};

export default TopBar;
