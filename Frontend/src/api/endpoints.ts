import apiClient from './client';

export interface ConnectionPayload {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  db_type: string;
  connection_string?: string;
}

export interface SchemaTable {
  name: string;
  schema: string;
  columns: {
    name: string;
    type: string;
    nullable: boolean;
    primary_key: boolean;
  }[];
}

export interface GenerateSQLPayload {
  prompt: string;
}

export interface GenerateSQLResponse {
  sql: string;
  explanation: string;
}

export interface AIQueryPayload {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  prompt: string;
  safe_mode?: boolean;
  db_type: string;
  connection_string?: string;
}

export interface AIQueryResponse {
  success: boolean;
  query?: string;
  rows?: Record<string, unknown>[];
  columns?: string[];
  affected_rows?: number;
  error?: string;
  details?: string;
}

export interface ExecutePayload {
  sql: string;
}

export interface ExecuteResponse {
  columns: string[];
  rows: Record<string, unknown>[];
  row_count: number;
  execution_time_ms: number;
}

export const connectDatabase = (payload: ConnectionPayload) =>
  apiClient.post<{ success: boolean; schemas?: { schema_name: string; tables: string[] }[]; error?: string }>('/connect', payload);

export const fetchSchema = () =>
  apiClient.get<{ tables: SchemaTable[] }>('/api/schema');

export const generateSQL = (payload: GenerateSQLPayload) =>
  apiClient.post<GenerateSQLResponse>('/api/generate-sql', payload);

export const aiQuery = (payload: AIQueryPayload) =>
  apiClient.post<AIQueryResponse>('/ai-query', payload);

export const executeQuery = (payload: ExecutePayload) =>
  apiClient.post<ExecuteResponse>('/execute', payload);
