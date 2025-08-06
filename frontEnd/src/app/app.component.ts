import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificationService } from './services/notification/notification.service';
import { Subscription } from 'rxjs';
import { ModalState } from './state/modalState.service';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  private readonly notificationService = inject(NotificationService);
  
  currentNotification: { message: string, type: string } | null = null;
  private notificationSubscription?: Subscription;
  readonly modalState: ModalState = inject(ModalState)

  ngOnInit(): void {
    this.notificationSubscription = this.notificationService.notification.subscribe(
      notification => {
        this.currentNotification = notification;
        setTimeout(() => {
          this.currentNotification = null;
        }, 3000);
      }
    );
  }

  ngOnDestroy(): void {
    if (this.notificationSubscription) {
      this.notificationSubscription.unsubscribe();
    }
  }
}