import { useApiDocument } from "@/hooks/use-api-document";

export interface AggregateStats {
  totalClients: number;
  totalEvents: number;
  activeEvents: number;
}

const emptyStats: AggregateStats = {
  totalClients: 0,
  totalEvents: 0,
  activeEvents: 0,
};

export function useAggregateStats() {
  const { data, loading, error } = useApiDocument<AggregateStats>({
    apiPath: "/api/stats",
    queryKey: ["stats"],
  });

  return {
    stats: data ?? emptyStats,
    loading,
    error,
  };
}
