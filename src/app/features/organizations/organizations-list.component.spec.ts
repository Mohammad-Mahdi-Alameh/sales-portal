import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { OrganizationsListComponent } from './organizations-list.component';
import { OrganizationsService } from './organizations.service';
import { ApiError } from '../../core/models/api.model';
import { Organization } from '../../core/models/domain.model';

const org: Organization = {
  id: 'org_1',
  name: 'Acme Corp',
  adminId: 'client_1',
  isActive: true,
  status: 'active',
};

describe('OrganizationsListComponent optimistic toggle', () => {
  function setup(setActiveReturn: () => ReturnType<OrganizationsService['setActive']>) {
    const service = {
      list: vi.fn().mockReturnValue(
        of({ data: [org], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } }),
      ),
      setActive: vi.fn().mockImplementation(setActiveReturn),
    };
    TestBed.configureTestingModule({
      imports: [OrganizationsListComponent],
      providers: [provideRouter([]), { provide: OrganizationsService, useValue: service }],
    });
    const fixture = TestBed.createComponent(OrganizationsListComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance as any, service };
  }

  afterEach(() => TestBed.resetTestingModule());

  it('applies the toggle immediately then rolls back isActive and status on error', () => {
    const { component } = setup(() =>
      throwError(() => new ApiError('SERVER', 'boom', 500)),
    );
    const row = component.rows()[0]; // isActive: true, status: 'active'

    component.toggleActive(row);

    // Both fields rolled back to the original values.
    expect(component.rows()[0].isActive).toBe(true);
    expect(component.rows()[0].status).toBe('active');
  });

  it('keeps the flipped isActive and status on success', () => {
    const { component } = setup(() =>
      of({ ...org, isActive: false, status: 'inactive' as const }),
    );
    const row = component.rows()[0];

    component.toggleActive(row);

    expect(component.rows()[0].isActive).toBe(false);
    expect(component.rows()[0].status).toBe('inactive');
  });
});
