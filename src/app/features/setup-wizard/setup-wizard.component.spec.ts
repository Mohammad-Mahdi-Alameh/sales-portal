import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SetupWizardComponent } from './setup-wizard.component';
import { WizardStateService } from './services/wizard-state.service';
import { ClientsService } from '../clients/clients.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { BranchesService } from '../branches/branches.service';
import { VenuesService } from '../venues/venues.service';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';

describe('SetupWizardComponent', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  function setup() {
    TestBed.configureTestingModule({
      imports: [SetupWizardComponent],
      providers: [
        provideRouter([]),
        { provide: ClientsService, useValue: { create: vi.fn() } },
        { provide: OrganizationsService, useValue: { create: vi.fn() } },
        { provide: BranchesService, useValue: { create: vi.fn() } },
        { provide: VenuesService, useValue: { create: vi.fn() } },
        { provide: ConfirmService, useValue: { ask: vi.fn() } },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(SetupWizardComponent);
    const state = TestBed.inject(WizardStateService);
    fixture.detectChanges();
    return { fixture, state, el: fixture.nativeElement as HTMLElement };
  }

  function nextBtn(el: HTMLElement): HTMLButtonElement | undefined {
    return (Array.from(el.querySelectorAll('button')) as HTMLButtonElement[]).find(
      (b) => b.textContent?.trim() === 'Next',
    );
  }

  // ---------------------------------------------------------------------------
  // Next button enabled/disabled
  // ---------------------------------------------------------------------------

  describe('Next button state', () => {
    it('is enabled at the path step (path step is always valid)', () => {
      const { el, state } = setup();
      expect(state.activeStep().key).toBe('path');
      expect(nextBtn(el)?.disabled).toBe(false);
    });

    it('is disabled on the client step when name and email are empty', () => {
      const { fixture, state, el } = setup();
      state.next();
      fixture.detectChanges();
      expect(state.activeStep().key).toBe('client');
      expect(nextBtn(el)?.disabled).toBe(true);
    });

    it('becomes enabled once both name and email are filled', () => {
      const { fixture, state, el } = setup();
      state.next();
      state.patch('client', { name: 'Jane Doe', email: 'jane@example.test' });
      fixture.detectChanges();
      expect(nextBtn(el)?.disabled).toBe(false);
    });

    it('goes back to disabled if email is cleared after being valid', () => {
      const { fixture, state, el } = setup();
      state.next();
      state.patch('client', { name: 'Jane Doe', email: 'jane@example.test' });
      state.patch('client', { email: '' });
      fixture.detectChanges();
      expect(nextBtn(el)?.disabled).toBe(true);
    });

    it('is disabled on the venue step when venue name is empty', () => {
      const { fixture, state, el } = setup();
      state.setPath('standalone');
      state.next(); // path → client
      state.patch('client', { name: 'Jane', email: 'jane@example.test' });
      state.next(); // client → venue
      fixture.detectChanges();
      expect(state.activeStep().key).toBe('venue');
      expect(nextBtn(el)?.disabled).toBe(true);
    });

    it('becomes enabled once venue name is filled', () => {
      const { fixture, state, el } = setup();
      state.setPath('standalone');
      state.next();
      state.patch('client', { name: 'Jane', email: 'jane@example.test' });
      state.next();
      state.patch('venue', { name: 'Indie Bistro' });
      fixture.detectChanges();
      expect(nextBtn(el)?.disabled).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Path switching at step 0
  // ---------------------------------------------------------------------------

  describe('path switching at step 0', () => {
    it('defaults to the organization path with org and branch steps', () => {
      const { state } = setup();
      expect(state.path()).toBe('organization');
      const keys = state.steps().map((s) => s.key);
      expect(keys).toContain('organization');
      expect(keys).toContain('branch');
    });

    it('switching to standalone removes org and branch steps', () => {
      const { state } = setup();
      state.setPath('standalone');
      const keys = state.steps().map((s) => s.key);
      expect(keys).not.toContain('organization');
      expect(keys).not.toContain('branch');
      expect(keys).toContain('client');
      expect(keys).toContain('venue');
    });

    it('switching path stays at step 0', () => {
      const { state } = setup();
      state.setPath('standalone');
      expect(state.currentStep()).toBe(0);
      expect(state.activeStep().key).toBe('path');
    });

    it('switching back to organization restores org and branch steps', () => {
      const { state } = setup();
      state.setPath('standalone');
      state.setPath('organization');
      const keys = state.steps().map((s) => s.key);
      expect(keys).toContain('organization');
      expect(keys).toContain('branch');
    });

    it('Next is enabled regardless of which path is selected at step 0', () => {
      const { fixture, state, el } = setup();
      state.setPath('standalone');
      fixture.detectChanges();
      expect(nextBtn(el)?.disabled).toBe(false);
    });
  });
});
