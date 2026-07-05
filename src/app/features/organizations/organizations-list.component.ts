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
import { OrganizationsService } from './organizations.service';
import { Organization } from '../../core/models/domain.model';
import { ApiError, Pagination } from '../../core/models/api.model';
import { ListQuery } from '../../core/models/query.model';
import { ToastService } from '../../core/ui/toast.service';
import { DataTableComponent, SortState } from '../../shared/ui/data-table.component';
import { ColumnDef } from '../../shared/ui/column-def';

@Component({
  selector: 'app-organizations-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DataTableComponent],
  templateUrl: './organizations-list.component.html',
})
export class OrganizationsListComponent implements OnInit {
  private readonly service = inject(OrganizationsService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly rows = signal<Organization[]>([]);
  protected readonly pagination = signal<Pagination | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly sort = signal<SortState>({ sortBy: 'createdAt', sortOrder: 'desc' });

  private readonly search$ = new Subject<string>();

  protected readonly columns: ColumnDef[] = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'adminName', label: 'Admin' },
    { key: 'branchCount', label: 'Branches', align: 'center' },
    { key: 'venueCount', label: 'Venues', align: 'center' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: '', align: 'right' },
  ];

  ngOnInit(): void {
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
      limit: 9,
      search: this.search() || undefined,
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
        this.error.set(err.message ?? 'Failed to load organizations');
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

  protected goNew(): void {
    this.router.navigate(['/organizations/new']);
  }

  /** Optimistic activate/deactivate: flip locally, call API, roll back on failure. */
  protected toggleActive(org: Organization): void {
    const next = !org.isActive;
    this.patchRow(org.id, { isActive: next, status: next ? 'active' : 'inactive' });

    this.service.setActive(org.id, next).subscribe({
      next: () => {
        this.toast.success(`${org.name} ${next ? 'activated' : 'deactivated'}`);
      },
      error: (err: ApiError) => {
        // rollback
        this.patchRow(org.id, { isActive: org.isActive, status: org.status });
        this.toast.error(err.message ?? 'Could not update status — rolled back');
      },
    });
  }

  private patchRow(id: string, patch: Partial<Organization>): void {
    this.rows.update((list) =>
      list.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    );
  }
}
