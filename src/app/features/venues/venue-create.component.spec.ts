import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { VenueCreateComponent } from './venue-create.component';
import { VenuesService } from './venues.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { BranchesService } from '../branches/branches.service';
import { ClientsService } from '../clients/clients.service';
import { ToastService } from '../../core/ui/toast.service';

const emptyPage = { page: 1, limit: 100, total: 0, totalPages: 1 };
const emptyList = () => of({ data: [], pagination: emptyPage });

describe('VenueCreateComponent – branchId required logic', () => {
  beforeEach(() => TestBed.resetTestingModule());

  function setup() {
    const venuesService = { create: vi.fn() };
    TestBed.configureTestingModule({
      imports: [VenueCreateComponent],
      providers: [
        provideRouter([{ path: 'venues/:id', children: [] }]),
        { provide: VenuesService, useValue: venuesService },
        { provide: OrganizationsService, useValue: { list: vi.fn().mockReturnValue(emptyList()) } },
        { provide: BranchesService, useValue: { list: vi.fn().mockReturnValue(emptyList()) } },
        { provide: ClientsService, useValue: { list: vi.fn().mockReturnValue(emptyList()) } },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(VenueCreateComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance as any, venuesService };
  }

  // ---------------------------------------------------------------------------
  // Standalone mode (default)
  // ---------------------------------------------------------------------------

  it('form is valid without branchId in standalone mode', () => {
    const { component } = setup();
    component.form.controls.name.setValue('My Venue');
    component.form.controls.owner.setValue('client_1');
    // branchId is disabled with no required validator — form should be valid
    expect(component.form.valid).toBe(true);
  });

  it('submit sends orgId:null and branchId:null in standalone mode', () => {
    const { component, venuesService } = setup();
    venuesService.create.mockReturnValue(of({ id: 'venue_1' }));
    component.form.controls.name.setValue('My Venue');
    component.form.controls.owner.setValue('client_1');

    component.submit();

    expect(venuesService.create).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: null, branchId: null }),
    );
  });

  // ---------------------------------------------------------------------------
  // Org-attached mode
  // ---------------------------------------------------------------------------

  it('form is invalid without branchId once org mode is active and an org is selected', () => {
    const { component } = setup();
    component.setMode('organization');
    component.form.controls.name.setValue('My Venue');
    component.form.controls.owner.setValue('client_1');
    component.onOrgChange('org_1'); // enables branchId control; branchId stays empty

    expect(component.form.valid).toBe(false);
    expect(component.form.controls.branchId.errors?.['required']).toBeTruthy();
  });

  it('form becomes valid and submit body includes orgId and branchId once a branch is selected', () => {
    const { component, venuesService } = setup();
    venuesService.create.mockReturnValue(of({ id: 'venue_1' }));

    component.setMode('organization');
    component.form.controls.name.setValue('My Venue');
    component.form.controls.owner.setValue('client_1');
    component.onOrgChange('org_1');
    component.form.controls.branchId.setValue('branch_1');

    expect(component.form.valid).toBe(true);

    component.submit();

    expect(venuesService.create).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: 'org_1', branchId: 'branch_1' }),
    );
  });
});
