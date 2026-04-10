import { useMutation } from '@tanstack/react-query';
import type { MutationConfig } from './types';

export function createMutation<TRoutes, TData, TError = unknown, TVariables = Record<string, unknown>>(
  client: TRoutes,
  route: string
) {
  const path = route.split('.');

  return function useDeesseMutation(
    config: MutationConfig<TData, TError, TVariables> = {}
  ) {
    return useMutation<TData, TError, TVariables>({
      mutationFn: async (args) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const procedure = getNestedProperty<TRoutes>(client, path) as (args: Record<string, unknown>) => Promise<TData>;
        return procedure(args as Record<string, unknown>);
      },
      onSuccess: () => {
        // Invalidate related queries
        // Could use server events for smarter invalidation
      },
      ...config.mutationOptions,
    });
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getNestedProperty<TObj>(obj: TObj, path: string[]): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = obj;
  for (const key of path) {
    current = current[key];
  }
  return current;
}
