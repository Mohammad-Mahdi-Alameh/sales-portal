export type SortOrder = 'asc' | 'desc';

/** Common list query params supported by the mock API. */
export interface ListQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: SortOrder;
  // entity filters
  salesId?: string;
  orgId?: string;
  branchId?: string;
  status?: string;
  venueType?: 'organization' | 'standalone';
  [key: string]: string | number | boolean | null | undefined;
}
