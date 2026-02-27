import { useQuery } from '@tanstack/react-query';
import { fetchSchema } from '@/api/endpoints';

export const useSchema = () => {
  return useQuery({
    queryKey: ['schema'],
    queryFn: async () => {
      const { data } = await fetchSchema();
      return data.tables;
    },
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });
};
