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
import { BranchesService } from './branches.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { Branch, Organization } from '../../core/models/domain.model';
import { ApiError, Pagination } from '../../core/models/api.model';
import { ListQuery } from '../../core/models/query.model';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { DataTableComponent, SortState } from '../../shared/ui/data-table.component';
import { ColumnDef } from '../../shared/ui/column-def';

@Component({
  selector: 'app-branches-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DataTableComponent],
  templateUrl: './branches-list.component.html',
})
export class BranchesListComponent implements OnInit {
  private readonly service = inject(BranchesService);
  private readonly orgsService = inject(OrganizationsService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly rows = signal<Branch[]>([]);
  protected readonly pagination = signal<Pagination | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly sort = signal<SortState>({ sortBy: 'createdAt', sortOrder: 'desc' });
  protected readonly orgFilter = signal('');
  protected readonly organizations = signal<Organization[]>([]);
  protected readonly rowError = signal<string | null>(null);

  private readonly search$ = new Subject<string>();

  protected readonly columns: ColumnDef[] = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'orgName', label: 'Organization' },
    { key: 'city', label: 'City' },
    { key: 'venueCount', label: 'Venues', align: 'center' },
    { key: 'active', label: 'Status', align: 'center' },
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
        this.error.set(err.message ?? 'Failed to load branches');
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

  protected onOrgFilter(orgId: string): void {
    this.orgFilter.set(orgId);
    this.load(1);
  }

  protected async remove(branch: Branch): Promise<void> {
    this.rowError.set(null);

    // Known dependency → block before the request so the mock's 409 never hits
    // the network (no browser console error) and we report the exact count.
    const knownVenues = branch.venueCount ?? 0;
    if (knownVenues > 0) {
      const blocked = `Cannot delete “${branch.name}” — it still has ${knownVenues} venue${
        knownVenues === 1 ? '' : 's'
      }.`;
      this.rowError.set(blocked);
      this.toast.error(blocked);
      return;
    }

    const ok = await this.confirm.ask({
      title: 'Delete branch',
      message: `Delete “${branch.name}”? This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;

    this.service.remove(branch.id).subscribe({
      next: () => {
        this.toast.success('Branch deleted');
        this.load();
      },
      error: (err: ApiError) => {
        let msg: string;
        if (err.code === 'HAS_DEPENDENCIES') {
          const d = (err.details ?? {}) as { venues?: number };
          const venues = d.venues ?? 0;
          msg = `Cannot delete “${branch.name}” — it still has ${venues} venue${
            venues === 1 ? '' : 's'
          }.`;
        } else {
          msg = err.message ?? 'Could not delete branch';
        }
        this.rowError.set(msg);
        this.toast.error(msg);
      },
    });
  }

  protected goNew(): void {
    this.router.navigate(['/branches/new']);
  }
}
