import { inject, Injectable } from "@angular/core";
import { WebSocketState } from "../../state/websocketState.service";
import { WebSocketErrorHandler } from "./errorHandler/webSocketHandler.service";
import { AuthEventBus } from "../../events/authEvent/authEvent.service";
import { Token, TokenService } from "../token/token.service";
import { NavigateService } from "../../navigation/navigation.service";
import { BehaviorSubject, Observable, range } from "rxjs";
import { NotificationService } from "../notification/notification.service";

interface Message{
    type: string;
    data: any;
}

export interface FileNotification {
    notificationType: string;
    targetUser: number;
    data: SharedFileData | revokeFileData;
}

export interface SharedUsers{
    username: string;
    role: string;
}

export interface SharedFileData {
    fileUUID: string;
    fileName: string;
    updatedAt: number;
    sharedUsers: SharedUsers[];
}

export interface revokeFileData {
    fileUUID: string;
}

export interface FileEvent {
    eventType: string;
    data: any;
}

@Injectable({
    providedIn: 'root'
})
export class WebSocketService {
    
    private socket!: WebSocket;
    readonly websocketState: WebSocketState = inject(WebSocketState)
    readonly errorHandler: WebSocketErrorHandler = inject(WebSocketErrorHandler)
    readonly eventBus: AuthEventBus = inject(AuthEventBus)
    readonly tokenService: TokenService = inject(TokenService)
    readonly navigator: NavigateService = inject(NavigateService);
    readonly notification: NotificationService = inject(NotificationService)

    private hasShownDisconnectNotif = false;
    private maxAutoReconnect: number = 4;

    private fileNotifications = new BehaviorSubject<FileNotification | null>(null);

    connect(): void {

        if (this.socket) {
            this.socket.removeEventListener("open", this.onOpen);
            this.socket.removeEventListener("close", this.onClose);
            this.socket.removeEventListener("message", this.onMessage);
            this.socket.removeEventListener("error", this.onError);
        }

        this.websocketState.setError(null);
        this.socket = new WebSocket('ws://localhost:3000/v1/ws');

        this.updateFromSocket();

        this.socket.addEventListener("open", this.onOpen);
        this.socket.addEventListener("close", this.onClose);
        this.socket.addEventListener("message", this.onMessage);
        this.socket.addEventListener("error", this.onError);
    }

    private onOpen = (event: Event) => {
        this.sendAuth();
        this.updateFromSocket();
        this.hasShownDisconnectNotif = false;
        console.log("connected")
    };

    private onClose = async (event: CloseEvent) => {
        this.updateFromSocket();
        if (!event.wasClean) {
            if (!this.hasShownDisconnectNotif) {
                this.errorHandler.handleWebSocketError("Connection Lost.");
                this.hasShownDisconnectNotif = true;
            }
            const connected = await this.autoReconnect();
            if (!connected) {
                this.websocketState.setStatus("closed");
                this.websocketState.setIsOpen(false);
            } else {
                this.notification.show('Connected !', 'success');
                this.hasShownDisconnectNotif = false;
            }
        } else {
            this.websocketState.setError(null);
        }
    };

    private onMessage = (message: MessageEvent) => {
        this.listenMessage(message);
    };

    private onError = (err: Event) => {
        this.websocketState.setError('Erreur de connexion WebSocket');
        this.errorHandler.handleWebSocketError(err);
    };


    private sendAuth(): void {
        const token = this.tokenService.getToken();
        const username = this.tokenService.getParsedToken()?.username;
        const userID = this.tokenService.getParsedToken()?.userId;
        const sessionID = this.websocketState.sessionUUID()
        
        if (token && username) {
            this.socket.send(JSON.stringify({
                type: "auth", 
                data: { token, username, userID, sessionID}
            }));
        } else {
            this.disconnect()
        }
    }

    listenMessage(received: MessageEvent){
        const message: Message = JSON.parse(received.data);
        switch(message.type){
            case 'Auth_success':
                if (message.data.renewed === true){
                    this.replaceJWT(message.data.token);
                }
                this.notification.show('Connected !', 'success');
                break;
            case 'Auth_failed':
                this.disconnect()
                break;
            case 'notification':
                this.handleFileNotification(message);
                break;
            case 'file_event':
                console.log(message)
                this.handleFileEvent(message);
                break;
            default:
                break;
        }
    }

    private handleFileNotification(message: any){
        const notification: FileNotification = {
            notificationType: message.data.notificationType,
            targetUser: message.data.targetUser,
            data: message.data.fileData
        };
        this.fileNotifications.next(notification)
    }


    private handleFileEvent(message: any){
        this.navigator.navigateToHome()
        this.notification.show("This file has been deleted by its owner", "info")
    }


    replaceJWT(token: string): void {
        this.tokenService.replaceToken(token);
    }

    private updateFromSocket(){
        if(this.socket.readyState === undefined || this.socket.readyState === null){
            return;
        }
        switch(this.socket.readyState){
           case WebSocket.OPEN:
                this.websocketState.setIsReconnecting(false);
                this.websocketState.setStatus('open');
                this.websocketState.setIsOpen(true);
                break;
            case WebSocket.CONNECTING:
                this.websocketState.setStatus('connecting')
                this.websocketState.setIsOpen(false);
                break;
            case WebSocket.CLOSING:
                this.websocketState.setStatus('closing');
                this.websocketState.setIsOpen(false);
                break;
            case WebSocket.CLOSED:
                this.websocketState.setStatus('closed');
                this.websocketState.setIsOpen(false);
                break;
        }
    }

    disconnect(): void {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.websocketState.setStatus('closing');
            this.socket.close();
        }
        this.eventBus.emit('WEBSOCKET_LOGOUT')
    }

    autoReconnect(): Promise<boolean> {
        if (this.websocketState.isReconnecting()){
            return Promise.resolve(false)
        }
        let attempts = 0;
        this.websocketState.setIsReconnecting(true)
        return new Promise<boolean>((resolve) => {
            const tryAgain = () => {
                if (this.socket.readyState === this.socket.OPEN) {
                    resolve(true);
                    return;
                } else if (attempts >= this.maxAutoReconnect) {
                    this.errorHandler.handleWebSocketError("Automatic reconnection failed. Please check your connection and try again.");
                    this.websocketState.resetSession()
                    resolve(false);
                    return;
                }
                this.connect();
                attempts++;
                setTimeout(tryAgain, 10000);
            };
            tryAgain();
        });
    }

    sendMessage(type: string, data: string | null = null){
          this.socket.send(JSON.stringify({
                type: type, 
                data: data
            }));
    }

    getFileNotifications(): Observable<FileNotification | null> {
        return this.fileNotifications.asObservable();
    }
}
