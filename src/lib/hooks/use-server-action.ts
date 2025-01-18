"use client";

import { useState } from "react";

export function useServerAction<TInput, TOutput>(
  action: (data: TInput) => Promise<TOutput>
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<TOutput | null>(null);

  const execute = async (input: TInput) => {
    try {
      setLoading(true);
      setError(null);
      const result = await action(input);
      setData(result);
      return result;
    } catch (e) {
      const error = e instanceof Error ? e : new Error("Unknown error occurred");
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    execute,
    loading,
    error,
    data,
  };
} 