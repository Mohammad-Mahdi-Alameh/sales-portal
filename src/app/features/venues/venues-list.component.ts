import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { VenuesService } from './venues.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { Organization, Venue, VenueStatus } from '../../core/models/domain.model';
import { ApiError, Pagination } from '../../core/models/api.model';
import { ListQuery } from '../../core/models/query.model';
import { ToastService } from '../../core/ui/toast.service';
import { DataTableComponent, SortState } from '../../shared/ui/data-table.component';
import { ColumnDef } from '../../shared/ui/column-def';

@Component({
  selector: 'app-venues-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DataTableComponent],
  templateUrl: './venues-list.component.html',
})
export class VenuesListComponent implements OnInit {
  private readonly service = inject(VenuesService);
  private readonly orgsService = inject(OrganizationsService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly rows = signal<Venue[]>([]);
  protected readonly pagination = signal<Pagination | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly sort = signal<SortState>({ sortBy: 'createdAt', sortOrder: 'desc' });
  protected readonly typeFilter = signal<'' | 'organization' | 'standalone'>('');
  protected readonly statusFilter = signal('');
  protected readonly orgFilter = signal('');
  protected readonly organizations = signal<Organization[]>([]);

  protected readonly statuses: VenueStatus[] = ['Active', 'Trial', 'Inactive'];

  private readonly search$ = new Subject<string>();

  protected readonly columns: ColumnDef[] = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'ownerName', label: 'Owner', sortable: true },
    { key: 'orgName', label: 'Organization' },
    { key: 'type', label: 'Type' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: '', align: 'right' },
  ];

  ngOnInit(): void {
    this.orgsService.list({ limit: 100 }).subscribe({
      next: (res) => this.organizations.set(res.data),
    });
    this.search$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => {
        this.search.set(term);
        this.load(1);
      });
    this.load(1);
  }

  protected load(page = this.pagination()?.page ?? 1): void {
    this.loading.set(true);
    this.error.set(null);
    const query: ListQuery = {
      page,
      limit: 10,
      search: this.search() || undefined,
      orgId: this.orgFilter() || undefined,
      venueType: this.typeFilter() || undefined,
      status: this.statusFilter() || undefined,
      sortBy: this.sort().sortBy,
      sortOrder: this.sort().sortOrder,
    };
    this.service.list(query).subscribe({
      next: (res) => {
        this.rows.set(res.data);
        this.pagination.set(res.pagination);
        this.loading.set(false);
      },
      error: (err: ApiError) => {
        this.error.set(err.message ?? 'Failed to load venues');
        this.loading.set(false);
      },
    });
  }

  protected onSearch(term: string): void {
    this.search$.next(term);
  }

  protected onSort(sort: SortState): void {
    this.sort.set(sort);
    this.load(1);
  }

  protected onTypeFilter(value: string): void {
    this.typeFilter.set(value as '' | 'organization' | 'standalone');
    this.load(1);
  }

  protected onStatusFilter(value: string): void {
    this.statusFilter.set(value);
    this.load(1);
  }

  protected onOrgFilter(value: string): void {
    this.orgFilter.set(value);
    this.load(1);
  }

  /** Optimistic status change with rollback. */
  protected changeStatus(venue: Venue, status: VenueStatus): void {
    if (status === venue.status) return;
    const previous = venue.status;
    this.patchRow(venue.id, { status });

    this.service.setStatus(venue.id, status).subscribe({
      next: () => this.toast.success(`${venue.name} → ${status}`),
      error: (err: ApiError) => {
        this.patchRow(venue.id, { status: previous });
        this.toast.error(err.message ?? 'Could not change status — rolled back');
      },
    });
  }

  private patchRow(id: string, patch: Partial<Venue>): void {
    this.rows.update((list) => list.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  }

  protected goNew(): void {
    this.router.navigate(['/venues/new']);
  }
}
