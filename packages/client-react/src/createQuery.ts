import { useQuery } from '@tanstack/react-query';
import type { QueryConfig } from './types';
import { getQueryKey } from './utils';

export function createQuery<TRoutes, TData, TError = unknown>(
  client: TRoutes,
  route: string
) {
  const path = route.split('.');

  return function useDeesseQuery(
    args: Record<string, unknown>,
    config: QueryConfig<TData, TError> = {}
  ) {
    const queryKey = config.queryKey ?? getQueryKey(path, args);

    return useQuery<TData, TError>({
      queryKey,
      queryFn: async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const procedure = getNestedProperty<TRoutes>(client, path) as (args: Record<string, unknown>) => Promise<TData>;
        return procedure(args);
      },
      ...config.queryOptions,
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
