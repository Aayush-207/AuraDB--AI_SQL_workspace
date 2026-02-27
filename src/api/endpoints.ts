import apiClient from './client';

export interface ConnectionPayload {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
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
  apiClient.post<{ message: string; session_id: string }>('/api/connect', payload);

export const fetchSchema = () =>
  apiClient.get<{ tables: SchemaTable[] }>('/api/schema');

export const generateSQL = (payload: GenerateSQLPayload) =>
  apiClient.post<GenerateSQLResponse>('/api/generate-sql', payload);

export const executeQuery = (payload: ExecutePayload) =>
  apiClient.post<ExecuteResponse>('/api/execute', payload);
