import { inject, Injectable } from "@angular/core";
import { NotificationService } from "../../notification/notification.service";
import { UserState } from "../../../state/userState.service";
import { AuthEventBus } from "../../../events/authEvent/authEvent.service";

@Injectable({
    providedIn: 'root'
})
export class WebSocketErrorHandler {

    readonly notification: NotificationService = inject(NotificationService);
    readonly authEvent: AuthEventBus = inject(AuthEventBus);

    handleWebSocketError(error: Event | CloseEvent): void {
        let userMessage: string;
    
        if (error instanceof CloseEvent) {
            switch (error.code) {
                case 1000:
                    return;
                case 1001:
                    userMessage = "Connection closed by the server";
                    break;
                case 1006:
                    userMessage = "Connection lost. Please check your internet connection.";
                    break;
                case 1011:
                    userMessage = "Server error, reconnecting automatically...";
                    break;
                case 4001:
                    userMessage = "Session expired, please log in again";
                    this.authEvent.emit('LOGOUT_REQUEST')
                    break;
                case 4003:
                    userMessage = "Invalid token, please log in again";
                    this.authEvent.emit('LOGOUT_REQUEST')
                    break;
                default:
                    userMessage = "Connection interrupted, attempting to reconnect...";
            }
        }
        else {
            userMessage = "Network connection issue";
        }
        this.notification.show(userMessage, 'error')
    }
}
