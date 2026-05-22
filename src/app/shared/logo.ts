import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="logo">
      <span
        class="logo-mark"
        [style.width.px]="px()"
        [style.height.px]="px()"
        [style.font-size.px]="px() * 0.58"
        [style.border-radius.px]="px() * 0.3"
      >字</span>
    </span>
  `,
})
export class Logo {
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  protected readonly px = computed(() =>
    this.size() === 'lg' ? 56 : this.size() === 'sm' ? 24 : 30,
  );
}
