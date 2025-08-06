import { inject, Injectable } from "@angular/core";
import { WebSocketState } from "../../state/websocketState.service";
import { WebSocketErrorHandler } from "./errorHandler/webSocketHandler.service";

@Injectable({
    providedIn: 'root'
})
export class WebSocketService {
    
    private socket!: WebSocket;
    readonly websocketState: WebSocketState = inject(WebSocketState)
    readonly errorHandler: WebSocketErrorHandler = inject(WebSocketErrorHandler)

    connect(): void {
        if (this.socket && this.socket.readyState == WebSocket.OPEN) {
            console.log("WebSocket déjà connecté");
            return;
        }

        this.websocketState.setError(null);
        this.socket = new WebSocket('ws://localhost:3000/ws');
        this.updateFromSocket();

        this.socket.addEventListener("open", (event) => {
            console.log("server connecté");
            this.updateFromSocket();
        });

        this.socket.addEventListener("close", (event: CloseEvent) => {
            console.log("WebSocket fermé");
            this.updateFromSocket();
            if (!event.wasClean){
                this.errorHandler.handleWebSocketError(event);
            }
        });

        this.socket.addEventListener("error", err => {
            this.websocketState.setError('Erreur de connexion WebSocket');
            this.errorHandler.handleWebSocketError(err);
        });
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
        }
    }
}
