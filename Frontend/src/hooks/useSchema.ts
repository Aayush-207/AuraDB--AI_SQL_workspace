import { useQuery } from '@tanstack/react-query';

export interface StoredSchema {
  schema_name: string;
  tables: string[];
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
