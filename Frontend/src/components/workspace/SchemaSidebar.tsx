import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Table2, ChevronRight, Database, Loader2, AlertCircle, Columns3, Key, AlertTriangle, X } from 'lucide-react';
import { useSchema, type StoredSchema, type TableInfo } from '@/hooks/useSchema';

interface SchemaSidebarProps {
  collapsed?: boolean;
}

const TableItem = ({ table, schemaName }: { table: TableInfo; schemaName: string }) => {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-muted-foreground hover:bg-muted/30 transition-colors text-left group"
      >
        <ChevronRight
          className={`w-3 h-3 text-muted-foreground/60 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
        />
        <Table2 className="w-3 h-3 flex-shrink-0 text-primary/70" />
        <span className="truncate font-mono">{table.name}</span>
        <span className="ml-auto text-[10px] text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity">
          {table.columns.length}
        </span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="ml-5 pl-2 border-l border-border/30 space-y-0.5 py-1">
              {table.columns.map((col) => (
                <div
                  key={col.name}
                  className="flex items-center gap-2 px-2 py-1 rounded text-[11px] text-muted-foreground/70 hover:bg-muted/20 transition-colors"
                >
                  {col.primary_key ? (
                    <Key className="w-2.5 h-2.5 flex-shrink-0 text-yellow-500" />
                  ) : (
                    <Columns3 className="w-2.5 h-2.5 flex-shrink-0" />
                  )}
                  <span className="truncate font-mono">{col.name}</span>
                  <span className="ml-auto text-[9px] opacity-60 font-mono">{col.type}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SchemaItem = ({ schema }: { schema: StoredSchema }) => {
  const [open, setOpen] = useState(true);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-muted/50 transition-colors text-left group"
      >
        <ChevronRight
          className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
        />
        <Database className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="truncate font-medium">{schema.schema_name}</span>
        <span className="ml-auto text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          {schema.tables.length}
        </span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="ml-6 pl-3 border-l border-border/50 space-y-0.5 py-1">
              {schema.tables.map((table) => (
                <TableItem key={table.name} table={table} schemaName={schema.schema_name} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Warning Modal Component
const SafeModeWarningModal = ({ 
  isOpen, 
  onConfirm, 
  onCancel 
}: { 
  isOpen: boolean; 
  onConfirm: () => void; 
  onCancel: () => void;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-card border border-border rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
      >
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold">Disable Safe Mode?</h3>
        </div>

        <div className="space-y-3 mb-6">
          <p className="text-sm text-muted-foreground">
            Turning off Safe Mode will allow execution of <strong className="text-foreground">dangerous SQL operations</strong> that can permanently modify or destroy your data:
          </p>
          <ul className="text-sm text-muted-foreground space-y-2 ml-4">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
              <code className="text-destructive font-mono text-xs">DROP</code> - Delete entire tables or databases
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
              <code className="text-orange-500 font-mono text-xs">ALTER</code> - Modify table structure
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
              <code className="text-yellow-500 font-mono text-xs">TRUNCATE</code> - Remove all data from tables
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <code className="text-amber-500 font-mono text-xs">DELETE</code> - Delete rows (without restrictions)
            </li>
          </ul>
          <p className="text-xs text-destructive/80 bg-destructive/10 p-3 rounded-lg">
            These operations cannot be undone. Make sure you have backups before proceeding.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted/50 transition-colors"
          >
            Go Back
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:brightness-110 transition-all"
          >
            Got It
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const SchemaSidebar = ({ collapsed = false }: SchemaSidebarProps) => {
  const { data: schemas, isLoading, error } = useSchema();

  if (collapsed) {
    return (
      <div className="h-full flex flex-col bg-sidebar border-r border-border w-12">
        <div className="flex-1" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-sidebar border-r border-border">
      <div className="px-3 py-3 border-b border-border flex items-center gap-2">
        <h2 className="text-sm font-semibold text-sidebar-foreground">Schema Explorer</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {isLoading && (
          <div className="space-y-3 p-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 rounded-lg bg-muted/50 animate-pulse" />
            ))}
          </div>
        )}
        {error && (
          <div className="flex flex-col items-center justify-center p-6 text-center gap-3">
            <AlertCircle className="w-8 h-8 text-destructive/60" />
            <p className="text-sm text-muted-foreground">Failed to load schema</p>
          </div>
        )}
        {schemas?.map((schema) => (
          <SchemaItem key={schema.schema_name} schema={schema} />
        ))}
        {schemas && schemas.length === 0 && (
          <p className="text-sm text-muted-foreground text-center p-6">No schemas found</p>
        )}
      </div>
    </div>
  );
};

export { SafeModeWarningModal };
export default SchemaSidebar;
