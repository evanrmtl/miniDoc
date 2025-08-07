import { inject, Injectable } from "@angular/core";
import { WebSocketState } from "../../state/websocketState.service";
import { WebSocketErrorHandler } from "./errorHandler/webSocketHandler.service";
import { AuthEventBus } from "../../events/authEvent/authEvent.service";
import { Token, TokenService } from "../token/token.service";
import { NavigateService } from "../../navigation/navigation.service";

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

    connect(): void {
        
        this.websocketState.setError(null);
        this.socket = new WebSocket('ws://localhost:3000/ws');


        this.updateFromSocket();

        this.socket.addEventListener("open", (event) => {
            console.log("server connecté");
            this.sendAuth()
            this.updateFromSocket();
        });

        this.socket.addEventListener("close", (event: CloseEvent) => {
            console.log("WebSocket fermé");
            this.updateFromSocket();
            if (!event.wasClean){
                this.errorHandler.handleWebSocketError(event);
            }
        });

        this.socket.addEventListener('message', message => {
            console.log("message arrive");
            this.listenMessage(message);
        })

        this.socket.addEventListener("error", err => {
            this.websocketState.setError('Erreur de connexion WebSocket');
            this.errorHandler.handleWebSocketError(err);
        });
    }

    private sendAuth(): void {
        const token = this.tokenService.getToken();
        const username = this.tokenService.getParsedToken()?.username;
        
        if (token && username) {
            this.socket.send(JSON.stringify({
                type: "auth", 
                DataRequest: { token, username }
            }));
        } else {
            this.disconnect()
        }
    }

    listenMessage(received: MessageEvent){
        console.log("message est la")
        const message: Message = JSON.parse(received.data);
        console.log(message)
        switch(message.type){
            case 'Auth_success':
                console.log("Auth_success")
                if (message.data.renewed === true){
                    this.replaceJWT(message.data.token);
                }
                break;
            case 'Auth_failed':
                console.log("Auth_failed")
                this.eventBus.emit('LOGOUT_REQUEST')
                this.navigator.openModal('login')
                break;
            default:
                break;
        }
    }



    replaceJWT(token: string): void {
        this.tokenService.replaceToken(token);
    }

    sendJWT() {
        console.log(this.tokenService.getToken())
        const message: Message = { type: "auth", data: this.tokenService.getToken() || "" };
        this.socket.send(JSON.stringify(message));
    }

    private updateFromSocket(){
        if(!this.socket.readyState){
            return;
        }
        switch(this.socket.readyState){
            case this.socket.OPEN:
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
            this.eventBus.emit('LOGOUT_REQUEST')
        }
    }
}
