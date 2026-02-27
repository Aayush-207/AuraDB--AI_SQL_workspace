import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Table, BarChart3, Loader2, Inbox, Clock } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { executeQuery, type ExecuteResponse } from '@/api/endpoints';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ResultsPanelProps {
  sqlToExecute: string | null;
  onClear: () => void;
}

const ResultsPanel = ({ sqlToExecute, onClear }: ResultsPanelProps) => {
  const [tab, setTab] = useState<'table' | 'chart'>('table');
  const [result, setResult] = useState<ExecuteResponse | null>(null);

  const mutation = useMutation({
    mutationFn: (sql: string) => executeQuery({ sql }).then((r) => r.data),
    onSuccess: (data) => {
      setResult(data);
      onClear();
    },
  });

  // Auto-execute when new SQL arrives
  if (sqlToExecute && !mutation.isPending) {
    mutation.mutate(sqlToExecute);
  }

  const numericColumns = result
    ? result.columns.filter((col) =>
        result.rows.length > 0 && typeof result.rows[0][col] === 'number'
      )
    : [];

  const hasChart = numericColumns.length > 0 && result && result.rows.length > 0;

  return (
    <div className="h-full flex flex-col border-l border-border">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-semibold">Results</h2>
        {result && (
          <div className="flex items-center gap-1 glass rounded-lg p-0.5">
            <button
              onClick={() => setTab('table')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                tab === 'table' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Table className="w-3 h-3 inline mr-1" />
              Table
            </button>
            {hasChart && (
              <button
                onClick={() => setTab('chart')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  tab === 'chart' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <BarChart3 className="w-3 h-3 inline mr-1" />
                Chart
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4">
        <AnimatePresence mode="wait">
          {mutation.isPending && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16 gap-3"
            >
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Executing query...</p>
            </motion.div>
          )}

          {!mutation.isPending && !result && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 text-center gap-3"
            >
              <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center">
                <Inbox className="w-7 h-7 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground">Results will appear here</p>
            </motion.div>
          )}

          {!mutation.isPending && result && tab === 'table' && (
            <motion.div
              key="table"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{result.row_count} row{result.row_count !== 1 ? 's' : ''}</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {result.execution_time_ms}ms
                </span>
              </div>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      {result.columns.map((col) => (
                        <th key={col} className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        {result.columns.map((col) => (
                          <td key={col} className="px-4 py-2.5 font-mono text-xs whitespace-nowrap">
                            {String(row[col] ?? 'NULL')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {!mutation.isPending && result && tab === 'chart' && hasChart && (
            <motion.div
              key="chart"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="h-80"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={result.rows as Record<string, unknown>[]} >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 30% 18%)" />
                  <XAxis
                    dataKey={result.columns.find((c) => !numericColumns.includes(c)) || result.columns[0]}
                    stroke="hsl(215 20% 55%)"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis stroke="hsl(215 20% 55%)" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(222 40% 10%)',
                      border: '1px solid hsl(217 30% 18%)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  {numericColumns.map((col, i) => (
                    <Bar
                      key={col}
                      dataKey={col}
                      fill={i === 0 ? 'hsl(217 91% 60%)' : 'hsl(260 85% 65%)'}
                      radius={[4, 4, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}
        </AnimatePresence>

        {mutation.error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-destructive p-3 rounded-lg bg-destructive/10 border border-destructive/20 mt-4"
          >
            {mutation.error.message}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ResultsPanel;
