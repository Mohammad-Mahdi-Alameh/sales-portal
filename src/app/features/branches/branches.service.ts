import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../core/api/api-client';
import { ListResult } from '../../core/models/api.model';
import { Branch } from '../../core/models/domain.model';
import { ListQuery } from '../../core/models/query.model';

export interface CreateBranch {
  orgId: string;
  name: string;
  city?: string;
  country?: string;
  active?: boolean;
}

@Injectable({ providedIn: 'root' })
export class BranchesService {
  private readonly api = inject(ApiClient);
  private readonly base = '/v3/sales/branches';

  list(query?: ListQuery): Observable<ListResult<Branch>> {
    return this.api.getList<Branch>(this.base, query);
  }

  get(id: string): Observable<Branch> {
    return this.api.get<Branch>(`${this.base}/${id}`);
  }

  create(body: CreateBranch): Observable<Branch> {
    return this.api.post<Branch>(this.base, body);
  }

  update(id: string, patch: Partial<Branch>): Observable<Branch> {
    return this.api.put<Branch>(`${this.base}/${id}`, patch);
  }

  remove(id: string): Observable<{ id: string }> {
    return this.api.delete<{ id: string }>(`${this.base}/${id}`);
  }
}
