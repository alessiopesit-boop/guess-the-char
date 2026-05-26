import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { AppStateService } from '../../core/state/app-state.service';
import { FriendEntry, FriendsService } from '../../core/firebase/friends.service';
import { AppBar } from '../../shared/app-bar';

type Tab = 'friends' | 'requests';

/**
 * Pagina /amici: due tab "Amici" e "Richieste". Le liste sono lazy, refetch
 * ad ogni cambio tab e ogni volta che si torna sulla pagina. Niente
 * real-time: serve aprire/cambiare rotta per vedere richieste nuove.
 */
@Component({
  selector: 'app-friends',
  imports: [AppBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './friends.html',
  styleUrl: './friends.css',
})
export class Friends {
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  protected readonly i18n = inject(I18nService);
  protected readonly appState = inject(AppStateService);
  private readonly fSvc = inject(FriendsService);

  protected readonly tab = signal<Tab>('friends');
  protected readonly loading = signal(true);
  protected readonly friends = signal<FriendEntry[]>([]);
  protected readonly requests = signal<FriendEntry[]>([]);
  protected readonly pendingAction = signal<string | null>(null);

  /** True se l'utente non e' loggato: la pagina mostra CTA "Accedi". */
  protected readonly notLogged = computed(
    () => !this.appState.state().account,
  );

  constructor() {
    // Ricarica liste ogni volta che il tab cambia.
    effect(() => {
      this.tab();
      if (this.notLogged()) {
        this.loading.set(false);
        return;
      }
      void this.refetch();
    });
  }

  private async refetch(): Promise<void> {
    this.loading.set(true);
    try {
      const all = await this.fSvc.listAll();
      this.friends.set(all.filter((f) => f.status === 'accepted'));
      this.requests.set(all.filter((f) => f.status === 'pending-received'));
    } catch (e) {
      console.warn('[friends] refetch error:', e);
    } finally {
      this.loading.set(false);
    }
  }

  protected setTab(t: Tab): void {
    this.tab.set(t);
  }

  protected async accept(uid: string): Promise<void> {
    this.pendingAction.set(uid);
    try {
      await this.fSvc.accept(uid);
      await this.refetch();
    } catch (e) {
      console.warn('[friends] accept error:', e);
    } finally {
      this.pendingAction.set(null);
    }
  }

  protected async decline(uid: string): Promise<void> {
    this.pendingAction.set(uid);
    try {
      await this.fSvc.decline(uid);
      await this.refetch();
    } catch (e) {
      console.warn('[friends] decline error:', e);
    } finally {
      this.pendingAction.set(null);
    }
  }

  protected async remove(uid: string): Promise<void> {
    if (typeof window !== 'undefined') {
      const msg =
        this.i18n.lang() === 'it'
          ? 'Vuoi davvero rimuovere questo amico?'
          : 'Really remove this friend?';
      if (!window.confirm(msg)) return;
    }
    this.pendingAction.set(uid);
    try {
      await this.fSvc.remove(uid);
      await this.refetch();
    } catch (e) {
      console.warn('[friends] remove error:', e);
    } finally {
      this.pendingAction.set(null);
    }
  }

  protected openProfile(nickname: string): void {
    if (!nickname) return;
    this.router.navigate(['/u', nickname]);
  }

  protected goLogin(): void {
    this.router.navigate(['/login']);
  }
  protected goSearch(): void {
    this.router.navigate(['/search']);
  }
  protected goBack(): void {
    this.location.back();
  }
  protected goHome(): void {
    this.router.navigate(['/home']);
  }
}
