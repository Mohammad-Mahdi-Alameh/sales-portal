import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../core/api/api-client';
import { ListResult } from '../../core/models/api.model';
import { Client } from '../../core/models/domain.model';
import { ListQuery } from '../../core/models/query.model';

export interface CreateClient {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class ClientsService {
  private readonly api = inject(ApiClient);
  private readonly base = '/v3/sales/clients';

  list(query?: ListQuery): Observable<ListResult<Client>> {
    return this.api.getList<Client>(this.base, query);
  }

  get(id: string): Observable<Client> {
    return this.api.get<Client>(`${this.base}/${id}`);
  }

  create(body: CreateClient): Observable<Client> {
    return this.api.post<Client>(this.base, body);
  }

  update(id: string, patch: Partial<Client>): Observable<Client> {
    return this.api.put<Client>(`${this.base}/${id}`, patch);
  }

  remove(id: string): Observable<{ id: string }> {
    return this.api.delete<{ id: string }>(`${this.base}/${id}`);
  }
}
