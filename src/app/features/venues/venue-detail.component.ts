import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { VenuesService } from './venues.service';
import { Venue } from '../../core/models/domain.model';
import { ApiError } from '../../core/models/api.model';

@Component({
  selector: 'app-venue-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './venue-detail.component.html',
})
export class VenueDetailComponent implements OnInit {
  private readonly service = inject(VenuesService);

  readonly id = input.required<string>();

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly venue = signal<Venue | null>(null);

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.get(this.id()).subscribe({
      next: (v) => {
        this.venue.set(v);
        this.loading.set(false);
      },
      error: (err: ApiError) => {
        this.error.set(err.message ?? 'Failed to load venue');
        this.loading.set(false);
      },
    });
  }
}
