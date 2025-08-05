import { Injectable } from "@angular/core";

@Injectable({
    providedIn: 'root'
})
export class WebSocketService {
    
    private socket!: WebSocket;
    private isConnected: boolean = false;

    constructor() {
    }

    connect(): void {
        if (this.isConnected) {
            console.log("WebSocket déjà connecté");
            return;
        }

        this.socket = new WebSocket('ws://localhost:3000/ws');

        this.socket.addEventListener("open", (event) => {
            console.log("server connecté");
            this.isConnected = true;
            this.send('Hello server');
        });

        this.socket.addEventListener("close", () => {
            console.log("WebSocket fermé");
            this.isConnected = false;
        });

        this.socket.addEventListener("error", err => {
            console.error("WebSocket erreur", err);
        });
    }

    public send(message: string): void {
        if (this.isConnected && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(message);
        } else {
            console.error('WebSocket is not open. Message not sent:', message);
        }
    }
}
