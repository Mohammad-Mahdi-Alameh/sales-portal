import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { VenuesListComponent } from './venues-list.component';
import { VenuesService } from './venues.service';
import { ApiError } from '../../core/models/api.model';
import { Venue } from '../../core/models/domain.model';

const venue: Venue = {
  id: 'venue_1',
  name: 'Indie Bistro',
  owner: 'client_1',
  orgId: null,
  branchId: null,
  status: 'Trial',
  type: 'restaurant',
};

describe('VenuesListComponent optimistic status change', () => {
  function setup(setStatusReturn: () => ReturnType<VenuesService['setStatus']>) {
    const service = {
      list: vi.fn().mockReturnValue(
        of({ data: [venue], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } }),
      ),
      setStatus: vi.fn().mockImplementation(setStatusReturn),
    };
    TestBed.configureTestingModule({
      imports: [VenuesListComponent],
      providers: [provideRouter([]), { provide: VenuesService, useValue: service }],
    });
    const fixture = TestBed.createComponent(VenuesListComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance as any, service };
  }

  it('applies status immediately then rolls back on error', () => {
    const { component } = setup(() => throwError(() => new ApiError('SERVER', 'boom', 500)));
    const row = component.rows()[0];

    component.changeStatus(row, 'Active');

    // Rolled back to original after the failed call.
    expect(component.rows()[0].status).toBe('Trial');
  });

  it('keeps the new status on success', () => {
    const { component } = setup(() => of({ ...venue, status: 'Active' }));
    const row = component.rows()[0];

    component.changeStatus(row, 'Active');

    expect(component.rows()[0].status).toBe('Active');
  });
});
