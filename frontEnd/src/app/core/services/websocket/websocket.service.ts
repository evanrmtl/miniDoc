import { inject, Injectable } from "@angular/core";
import { WebSocketState } from "../../state/websocketState.service";
import { WebSocketErrorHandler } from "./errorHandler/webSocketHandler.service";
import { AuthEventBus } from "../../events/authEvent/authEvent.service";
import { Token, TokenService } from "../token/token.service";
import { NavigateService } from "../../navigation/navigation.service";
import { range } from "rxjs";
import { webSocket } from "rxjs/webSocket";
import { NotificationService } from "../notification/notification.service";

interface Message{
    type: string;
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

    private sessionId = crypto.randomUUID();
    private hasShownDisconnectNotif = false;
    private maxAutoReconnect: number = 4;
    

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
        console.log("server connecté");
        this.sendAuth();
        this.updateFromSocket();
        this.hasShownDisconnectNotif = false;
    };

    private onClose = async (event: CloseEvent) => {
        console.log("WebSocket fermé");
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
        console.log("message arrive");
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
        const sessionID = this.sessionId
        
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
                break;
            case 'Auth_failed':
                this.disconnect()
                break;
            default:
                break;
        }
    }



    replaceJWT(token: string): void {
        this.tokenService.replaceToken(token);
    }

    private updateFromSocket(){
        if(!this.socket.readyState){
            return;
        }
        switch(this.socket.readyState){
            case this.socket.OPEN:
                this.websocketState.setIsReconnecting(false);
                this.websocketState.setStatus('open');
                this.websocketState.setIsOpen(true);
                break;
            case this.socket.CONNECTING:
                this.websocketState.setStatus('connecting')
                this.websocketState.setIsOpen(false);
                break;
            case this.socket.CLOSING:
                this.websocketState.setStatus('closing');
                this.websocketState.setIsOpen(false);
                break;
            case this.socket.CLOSED:
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
                console.log("attempts nb :" + attempts)
                if (this.socket.readyState === this.socket.OPEN) {
                    resolve(true);
                    return;
                } else if (attempts >= this.maxAutoReconnect) {
                    this.errorHandler.handleWebSocketError("Automatic reconnection failed. Please check your connection and try again.");
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
}
