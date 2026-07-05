import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../core/ui/toast.service';

@Component({
  selector: 'app-toast-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
      @for (t of toasts.toasts(); track t.id) {
        <div
          role="status"
          class="pointer-events-auto flex items-start gap-2 rounded-md border px-3 py-2 text-sm shadow-lg"
          [class.bg-emerald-50]="t.kind === 'success'"
          [class.border-emerald-200]="t.kind === 'success'"
          [class.text-emerald-800]="t.kind === 'success'"
          [class.bg-red-50]="t.kind === 'error'"
          [class.border-red-200]="t.kind === 'error'"
          [class.text-red-800]="t.kind === 'error'"
          [class.bg-slate-50]="t.kind === 'info'"
          [class.border-slate-200]="t.kind === 'info'"
          [class.text-slate-800]="t.kind === 'info'"
        >
          <span class="flex-1">{{ t.text }}</span>
          <button
            type="button"
            class="text-current/60 hover:text-current"
            (click)="toasts.dismiss(t.id)"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastContainerComponent {
  protected readonly toasts = inject(ToastService);
}
