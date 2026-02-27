import { useQuery } from '@tanstack/react-query';

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  primary_key: boolean;
}

export interface TableInfo {
  name: string;
  columns: ColumnInfo[];
}

export interface StoredSchema {
  schema_name: string;
  tables: TableInfo[];
}

export const useSchema = () => {
  return useQuery({
    queryKey: ['schema'],
    queryFn: async () => {
      const stored = sessionStorage.getItem('dbSchema');
      if (!stored) {
        throw new Error('No schema found. Please connect to a database first.');
      }
      return JSON.parse(stored) as StoredSchema[];
    },
    retry: false,
    staleTime: Infinity,
  });
};
