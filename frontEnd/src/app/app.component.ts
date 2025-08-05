import { ChangeDetectorRef, Component, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UiService } from './services/UI/Ui.service';
import { NotificationService } from './services/notification/notification.service';
import { RefreshService } from './services/refresh/refreash.service';
import { v4 as uuidv4} from 'uuid';
import { WebSocketService } from './services/websocket/websocket.service';


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
    private notificationService: NotificationService,
    private socket: WebSocketService
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

    const sessionID = this.getSessionID()
    console.log('sessionID for this tab:', sessionID)
  }

  ngOnInit() {
    const jwt = localStorage.getItem('JWT');
    if (jwt) {
      this.socket.connect();
    }
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

  getSessionID(): string{
    let sessionID = sessionStorage.getItem("sessionID")
    if (!sessionID) {
      sessionID = uuidv4()
      sessionStorage.setItem("sessionID", sessionID)
    }
    return sessionID;
  }
}