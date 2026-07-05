import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../core/api/api-client';
import { ListResult } from '../../core/models/api.model';
import { Venue, VenueStatus } from '../../core/models/domain.model';
import { ListQuery } from '../../core/models/query.model';

export interface CreateVenue {
  name: string;
  owner: string;
  orgId: string | null;
  branchId: string | null;
  type: string;
  timezone: string;
  currency: string;
  status?: VenueStatus;
  city?: string;
  country?: string;
}

@Injectable({ providedIn: 'root' })
export class VenuesService {
  private readonly api = inject(ApiClient);
  private readonly base = '/v3/sales/venues';

  list(query?: ListQuery): Observable<ListResult<Venue>> {
    return this.api.getList<Venue>(this.base, query);
  }

  get(id: string): Observable<Venue> {
    return this.api.get<Venue>(`${this.base}/${id}`);
  }

  create(body: CreateVenue): Observable<Venue> {
    return this.api.post<Venue>(this.base, body);
  }

  update(id: string, patch: Partial<Venue>): Observable<Venue> {
    return this.api.put<Venue>(`${this.base}/${id}`, patch);
  }

  setStatus(id: string, status: VenueStatus): Observable<Venue> {
    return this.update(id, { status });
  }
}
