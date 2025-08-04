import { ChangeDetectorRef, Component, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UiService } from './services/UI/UiService.service';
import { NotificationService } from './services/notification/notification.service';
import { RefreshService } from './services/refresh/refreash.service';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'miniDoc';

  private notification: { message: string, type: string } | null = null;

  constructor(
    private refreshService: RefreshService,
    private cdRef: ChangeDetectorRef, 
    private uiService: UiService, 
    private notificationService: NotificationService
  ) {
    this.notificationService.notification.subscribe(msg => {
      this.notification = msg; 
      setTimeout(() => this.notification = null, 2000);
    });

    effect(() => {
      if (this.refreshService.refreshSignal()) {
        this.reload();
        this.refreshService.clearRefresh()
      }
    });
  }

  ngAfterViewInit() {
    this.cdRef.detectChanges();
  }

  get getNotification(): { message: string, type: string } | null {
    return this.notification;
  }

  get isModalOpen(): boolean {
    return this.uiService.isModalOpen;
  }

  reload(){
    this.uiService.closeLoginModal()
  }
}