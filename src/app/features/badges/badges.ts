import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { AppStateService } from '../../core/state/app-state.service';
import { BadgeWithProgress, computeBadges } from '../../core/data/badges';
import { AppBar } from '../../shared/app-bar';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'app-badges',
  imports: [AppBar, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './badges.html',
  styleUrl: './badges.css',
})
export class Badges {
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  protected readonly i18n = inject(I18nService);
  protected readonly appState = inject(AppStateService);

  protected readonly state = this.appState.state;
  protected readonly badges = computed<BadgeWithProgress[]>(() => computeBadges(this.state()));
  protected readonly unlocked = computed(() => this.badges().filter((b) => b.unlocked).length);
  protected readonly total = computed(() => this.badges().length);
  protected readonly progress = computed(() => this.unlocked() / Math.max(1, this.total()));

  protected readonly detail = signal<BadgeWithProgress | null>(null);

  protected open(b: BadgeWithProgress): void {
    this.detail.set(b);
  }

  protected closeDetail(): void {
    this.detail.set(null);
  }

  protected titleOf(b: BadgeWithProgress): string {
    return this.i18n.lang() === 'en' ? b.titleEn : b.titleIt;
  }
  protected descOf(b: BadgeWithProgress): string {
    return this.i18n.lang() === 'en' ? b.descEn : b.descIt;
  }

  protected progressPct(b: BadgeWithProgress): number {
    return Math.round(b.progress * 100);
  }

  protected goBack(): void {
    this.location.back();
  }

  protected goHome(): void {
    this.router.navigate(['/home']);
  }

  @HostListener('window:keydown', ['$event'])
  protected onKey(e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.detail()) {
      e.preventDefault();
      this.closeDetail();
    }
  }
}
