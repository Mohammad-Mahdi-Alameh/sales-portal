import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OrganizationsService } from './organizations.service';
import { BranchesService } from '../branches/branches.service';
import { VenuesService } from '../venues/venues.service';
import { Branch, Organization, Venue } from '../../core/models/domain.model';
import { ApiError } from '../../core/models/api.model';

@Component({
  selector: 'app-organization-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './organization-detail.component.html',
})
export class OrganizationDetailComponent implements OnInit {
  private readonly orgs = inject(OrganizationsService);
  private readonly branchesSvc = inject(BranchesService);
  private readonly venuesSvc = inject(VenuesService);

  /** Bound from the route param via withComponentInputBinding. */
  readonly id = input.required<string>();

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly org = signal<Organization | null>(null);
  protected readonly branches = signal<Branch[]>([]);
  protected readonly venues = signal<Venue[]>([]);

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    const orgId = this.id();
    this.orgs.get(orgId).subscribe({
      next: (org) => {
        this.org.set(org);
        this.loading.set(false);
      },
      error: (err: ApiError) => {
        this.error.set(err.message ?? 'Failed to load organization');
        this.loading.set(false);
      },
    });
    this.branchesSvc.list({ orgId, limit: 50 }).subscribe({
      next: (res) => this.branches.set(res.data),
    });
    this.venuesSvc.list({ orgId, limit: 50 }).subscribe({
      next: (res) => this.venues.set(res.data),
    });
  }
}
