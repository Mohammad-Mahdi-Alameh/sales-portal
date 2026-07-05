import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../core/api/api-client';
import { ListResult } from '../../core/models/api.model';
import { Organization } from '../../core/models/domain.model';
import { ListQuery } from '../../core/models/query.model';

export interface CreateOrganization {
  name: string;
  adminId: string;
  country?: string;
  timezone?: string;
  currency?: string;
  billingEmail?: string;
}

@Injectable({ providedIn: 'root' })
export class OrganizationsService {
  private readonly api = inject(ApiClient);
  private readonly base = '/v3/sales/organizations';

  list(query?: ListQuery): Observable<ListResult<Organization>> {
    return this.api.getList<Organization>(this.base, query);
  }

  get(id: string): Observable<Organization> {
    return this.api.get<Organization>(`${this.base}/${id}`);
  }

  create(body: CreateOrganization): Observable<Organization> {
    return this.api.post<Organization>(this.base, body);
  }

  update(id: string, patch: Partial<Organization>): Observable<Organization> {
    return this.api.put<Organization>(`${this.base}/${id}`, patch);
  }

  setActive(id: string, isActive: boolean): Observable<Organization> {
    return this.update(id, { isActive });
  }
}
