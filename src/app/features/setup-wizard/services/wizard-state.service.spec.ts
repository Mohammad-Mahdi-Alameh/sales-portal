import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { WizardStateService } from './wizard-state.service';
import { ClientsService } from '../../clients/clients.service';
import { OrganizationsService } from '../../organizations/organizations.service';
import { BranchesService } from '../../branches/branches.service';
import { VenuesService } from '../../venues/venues.service';
import { ApiError } from '../../../core/models/api.model';

function makeService() {
  const clients = { create: vi.fn() };
  const organizations = { create: vi.fn() };
  const branches = { create: vi.fn() };
  const venues = { create: vi.fn() };

  TestBed.configureTestingModule({
    providers: [
      WizardStateService,
      { provide: ClientsService, useValue: clients },
      { provide: OrganizationsService, useValue: organizations },
      { provide: BranchesService, useValue: branches },
      { provide: VenuesService, useValue: venues },
    ],
  });

  const state = TestBed.inject(WizardStateService);
  return { state, clients, organizations, branches, venues };
}

describe('WizardStateService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('switches step set when path changes', () => {
    const { state } = makeService();
    state.setPath('organization');
    expect(state.steps().map((s) => s.key)).toEqual([
      'path',
      'client',
      'organization',
      'branch',
      'venue',
      'review',
    ]);
    state.setPath('standalone');
    expect(state.steps().map((s) => s.key)).toEqual(['path', 'client', 'venue', 'review']);
  });

  it('validates client step by name and email', () => {
    const { state } = makeService();
    expect(state.isStepValid('client')).toBe(false);
    state.patch('client', { name: 'Jane' });
    expect(state.isStepValid('client')).toBe(false);
    state.patch('client', { email: 'jane@example.test' });
    expect(state.isStepValid('client')).toBe(true);
  });

  it('runs the standalone sequence: client then venue with null org/branch', async () => {
    const { state, clients, organizations, venues } = makeService();
    clients.create.mockReturnValue(of({ id: 'client_1' }));
    venues.create.mockReturnValue(of({ id: 'venue_1' }));

    state.setPath('standalone');
    state.patch('client', { name: 'Jane', email: 'jane@example.test' });
    state.patch('venue', { name: 'Indie Bistro' });

    const venueId = await state.submit();

    expect(venueId).toBe('venue_1');
    expect(organizations.create).not.toHaveBeenCalled();
    expect(venues.create).toHaveBeenCalledWith(
      expect.objectContaining({ owner: 'client_1', orgId: null, branchId: null }),
    );
  });

  it('runs the organization sequence in order with wired ids', async () => {
    const { state, clients, organizations, branches, venues } = makeService();
    clients.create.mockReturnValue(of({ id: 'client_1' }));
    organizations.create.mockReturnValue(of({ id: 'org_1' }));
    branches.create.mockReturnValue(of({ id: 'branch_1' }));
    venues.create.mockReturnValue(of({ id: 'venue_1' }));

    state.setPath('organization');
    state.patch('client', { name: 'Jane', email: 'jane@example.test' });
    state.patch('organization', { name: 'Acme' });
    state.patch('branch', { name: 'Downtown' });
    state.patch('venue', { name: 'Acme Venue' });

    const venueId = await state.submit();

    expect(venueId).toBe('venue_1');
    expect(organizations.create).toHaveBeenCalledWith(expect.objectContaining({ adminId: 'client_1' }));
    expect(branches.create).toHaveBeenCalledWith(expect.objectContaining({ orgId: 'org_1' }));
    expect(venues.create).toHaveBeenCalledWith(
      expect.objectContaining({ owner: 'client_1', orgId: 'org_1', branchId: 'branch_1' }),
    );
  });

  it('retry skips already-created entities', async () => {
    const { state, clients, venues } = makeService();
    clients.create.mockReturnValue(of({ id: 'client_1' }));
    // First venue attempt fails.
    venues.create.mockReturnValueOnce(
      throwError(() => new ApiError('SERVER', 'boom', 500)),
    );

    state.setPath('standalone');
    state.patch('client', { name: 'Jane', email: 'jane@example.test' });
    state.patch('venue', { name: 'Indie Bistro' });

    const first = await state.submit();
    expect(first).toBeNull();
    expect(state.createdIds().clientId).toBe('client_1');
    expect(state.submitError()).toBeTruthy();

    // Retry: client already created, only venue re-attempted.
    venues.create.mockReturnValueOnce(of({ id: 'venue_1' }));
    const second = await state.retry();

    expect(second).toBe('venue_1');
    expect(clients.create).toHaveBeenCalledTimes(1);
  });

  it('clears persisted cache on total success', async () => {
    const { state, clients, venues } = makeService();
    clients.create.mockReturnValue(of({ id: 'client_1' }));
    venues.create.mockReturnValue(of({ id: 'venue_1' }));

    state.setPath('standalone');
    state.patch('client', { name: 'Jane', email: 'jane@example.test' });
    state.patch('venue', { name: 'Indie Bistro' });

    await state.submit();
    expect(localStorage.getItem('sp.wizard')).toBeNull();
  });
});
