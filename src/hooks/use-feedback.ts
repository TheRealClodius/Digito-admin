"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useApiCollection } from "@/hooks/use-api-collection";
import type { FeedbackEntry } from "@/types/feedback";

export function useFeedback(eventCode: string) {
  const queryKey = ["events", eventCode, "feedback"];
  const queryClient = useQueryClient();

  const { data, loading, error } = useApiCollection<FeedbackEntry>({
    apiPath: `/api/events/${eventCode}/feedback`,
    queryKey,
    enabled: !!eventCode,
  });

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  return { data, loading, error: error?.message ?? null, refresh };
}
