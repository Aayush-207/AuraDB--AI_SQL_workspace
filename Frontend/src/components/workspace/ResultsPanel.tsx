import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Table, BarChart3, Loader2, Inbox, Clock } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { executeQuery, type ExecuteResponse } from '@/api/endpoints';
import type { LogEntry } from './TerminalPanel';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface AIResultsData {
  columns: string[];
  rows: Record<string, unknown>[];
  query: string;
}

interface ResultsPanelProps {
  sqlToExecute: string | null;
  aiResults?: AIResultsData | null;
  onClear: () => void;
  onLog?: (type: LogEntry['type'], message: string, details?: string) => void;
  onResultsUpdate?: (results: { columns: string[]; rows: Record<string, unknown>[] } | null) => void;
}

const ResultsPanel = ({ sqlToExecute, aiResults, onClear, onLog, onResultsUpdate }: ResultsPanelProps) => {
  const [tab, setTab] = useState<'table' | 'chart'>('table');
  const [result, setResult] = useState<ExecuteResponse | null>(null);
  const [lastQuery, setLastQuery] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (sql: string) => {
      setLastQuery(sql);
      return executeQuery({ sql }).then((r) => r.data);
    },
    onSuccess: (data) => {
      setResult(data);
      onLog?.('success', `Query executed: ${data.row_count} row(s) in ${data.execution_time_ms}ms`);
    },
    onError: (error: Error) => {
      const errorMessage = error.message || 'Unknown error';
      onLog?.('error', 'Query execution failed', `Query: ${lastQuery}\n\nError: ${errorMessage}`);
    },
  });

  useEffect(() => {
    if (sqlToExecute) {
      mutation.mutate(sqlToExecute);
      onClear();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sqlToExecute]);

  // Use AI results if available, otherwise use mutation result
  const displayData = aiResults ? {
    columns: aiResults.columns,
    rows: aiResults.rows,
    row_count: aiResults.rows.length,
    execution_time_ms: 0, // AI results don't have execution time
  } : result;

  // Notify parent of results changes
  useEffect(() => {
    if (displayData) {
      onResultsUpdate?.({ columns: displayData.columns, rows: displayData.rows });
    } else {
      onResultsUpdate?.(null);
    }
  }, [displayData, onResultsUpdate]);

  const numericColumns = displayData
    ? displayData.columns.filter((col) =>
        displayData.rows.length > 0 && typeof displayData.rows[0][col] === 'number'
      )
    : [];

  const hasChart = numericColumns.length > 0 && displayData && displayData.rows.length > 0;

  return (
    <div className="h-full flex flex-col border-l border-border">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-semibold">Results</h2>
        {displayData && (
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

          {!mutation.isPending && !displayData && (
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

          {!mutation.isPending && displayData && tab === 'table' && (
            <motion.div
              key="table"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{displayData.row_count} row{displayData.row_count !== 1 ? 's' : ''}</span>
                {displayData.execution_time_ms > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {displayData.execution_time_ms}ms
                  </span>
                )}
                {aiResults && (
                  <span className="text-primary">AI Generated</span>
                )}
              </div>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      {displayData.columns.map((col) => (
                        <th key={col} className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayData.rows.map((row, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        {displayData.columns.map((col) => (
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

          {!mutation.isPending && displayData && tab === 'chart' && hasChart && (
            <motion.div
              key="chart"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="h-80"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={displayData.rows as Record<string, unknown>[]} >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 30% 18%)" />
                  <XAxis
                    dataKey={displayData.columns.find((c) => !numericColumns.includes(c)) || displayData.columns[0]}
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
      </div>
    </div>
  );
};

export default ResultsPanel;
