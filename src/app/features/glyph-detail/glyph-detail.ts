import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { I18nService } from '../../core/i18n/i18n.service';
import { scriptById } from '../../core/data/scripts';
import { AppBar } from '../../shared/app-bar';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'app-glyph-detail',
  imports: [AppBar, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './glyph-detail.html',
  styleUrl: './glyph-detail.css',
})
export class GlyphDetail {
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly route = inject(ActivatedRoute);
  protected readonly i18n = inject(I18nService);

  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  protected readonly scriptId = computed(() => this.params().get('scriptId') ?? '');
  protected readonly cp = computed(() => this.params().get('cp') ?? '');
  protected readonly script = computed(() => scriptById(this.scriptId()));
  protected readonly glyph = computed(() => {
    const code = parseInt(this.cp(), 16);
    if (!Number.isFinite(code) || code <= 0) return '';
    return String.fromCodePoint(code);
  });

  protected nameOf(): string {
    const s = this.script();
    if (!s) return '';
    return this.i18n.lang() === 'en' ? s.nameEn : s.nameIt;
  }

  protected goBack(): void {
    this.location.back();
  }
  protected goHome(): void {
    this.router.navigate(['/home']);
  }
  protected openScript(): void {
    const s = this.script();
    if (s) this.router.navigate(['/script', s.id]);
  }
}
