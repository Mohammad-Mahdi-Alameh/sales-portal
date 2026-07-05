import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DashboardService } from './dashboard.service';
import { DashboardSummary } from '../../core/models/domain.model';
import { ApiError } from '../../core/models/api.model';

interface Kpi {
  label: string;
  value: number;
  accent: string;
}

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private readonly service = inject(DashboardService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly summary = signal<DashboardSummary | null>(null);

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.summary().subscribe({
      next: (data) => {
        this.summary.set(data);
        this.loading.set(false);
      },
      error: (err: ApiError) => {
        this.error.set(err.message ?? 'Failed to load dashboard');
        this.loading.set(false);
      },
    });
  }

  protected kpis(): Kpi[] {
    const c = this.summary()?.cards;
    if (!c) return [];
    return [
      { label: 'Active organizations', value: c.activeOrganizations, accent: 'text-indigo-600' },
      { label: 'Active venues', value: c.activeVenues, accent: 'text-emerald-600' },
      { label: 'Trial venues', value: c.trialVenues, accent: 'text-amber-600' },
      { label: 'Renewals due soon', value: c.renewalsDueSoon, accent: 'text-rose-600' },
    ];
  }
}
