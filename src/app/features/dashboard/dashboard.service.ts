import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../core/api/api-client';
import { DashboardSummary } from '../../core/models/domain.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api = inject(ApiClient);

  summary(): Observable<DashboardSummary> {
    return this.api.get<DashboardSummary>('/v3/sales/dashboard/summary');
  }
}
