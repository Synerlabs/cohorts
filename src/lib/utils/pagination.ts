export type PaginationOptions = {
  page?: number;
  pageSize?: number;
};

export type PaginationResult<T> = {
  data: T[];
  metadata: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
  };
};

export function mapPagination<T>(
  data: T[],
  options: PaginationOptions,
  totalCount: number
): PaginationResult<T> {
  const page = options.page || 1;
  const pageSize = options.pageSize || 10;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    data,
    metadata: {
      currentPage: page,
      pageSize,
      totalPages,
      totalCount,
    },
  };
}

export function getPaginationRange(
  options: PaginationOptions
): { from: number; to: number } {
  const page = options.page || 1;
  const pageSize = options.pageSize || 10;
  const from = (page - 1) * pageSize;
  const to = from + pageSize;

  return { from, to };
}

export function validatePaginationOptions(options: PaginationOptions): PaginationOptions {
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize || 10));

  return { page, pageSize };
} 