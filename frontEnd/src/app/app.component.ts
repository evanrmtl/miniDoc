import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { NotificationService } from './core/services/notification/notification.service';
import { filter, Subscription } from 'rxjs';
import { ModalState } from './core/state/modalState.service';
import { ShareComponent } from "./features/components/share/share.component";
import { SharePopoverState } from './core/state/sharePopoverState.service';
import { File } from './core/services/API/file/fileAPI.service';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ShareComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  private readonly notificationService = inject(NotificationService);
  
  currentNotification: { message: string, type: string } | null = null;
  private notificationSubscription?: Subscription;
  readonly modalState: ModalState = inject(ModalState)

  readonly sharePopoverState: SharePopoverState = inject(SharePopoverState)
  protected sharePopoverData: File | null = null;
  protected showSharePopover = false;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.notificationSubscription = this.notificationService.notification.subscribe(
      notification => {
        this.currentNotification = notification;
        setTimeout(() => {
          this.currentNotification = null;
        }, 3000);
      }
    );
   this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      const currentRoute = event.urlAfterRedirects;
      this.showSharePopover = !currentRoute.includes('/login') && 
                              !currentRoute.includes('/register');
      
      if (!this.showSharePopover) {
        this.sharePopoverData = null;
      }
    });

    this.sharePopoverState.openPopover.subscribe(
      (data: File) => {
        if (data && this.showSharePopover) { // ← Condition ajoutée
          this.sharePopoverData = data;
        }
      }
    );
  }

  closeSharePopover() {
    this.sharePopoverData = null;
  }

  ngOnDestroy(): void {
    if (this.notificationSubscription) {
      this.notificationSubscription.unsubscribe();
    }
  }
}