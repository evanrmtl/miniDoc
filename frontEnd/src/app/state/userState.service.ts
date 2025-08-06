import { computed, inject, Injectable, signal } from "@angular/core";
import { WebSocketService } from "../services/websocket/websocket.service";

interface State {
    username: string | null;
    hasJWT: boolean;
    error: string | null;
}

interface Token {
    username: string;
    userID: number;
    iat: number;
    expiresAt: number;
}

@Injectable({
    providedIn: "root"
})
export class UserState {
    
    private _state = signal<State>({username: null, hasJWT: false, error: null});
    readonly state = this._state.asReadonly();

    readonly username = computed(() => this._state().username);
    readonly hasJWT = computed(() => this._state().hasJWT);
    readonly error = computed(() => this._state().error);
    readonly isLoggedIn = computed(() => this._state().hasJWT);

    readonly websocketService: WebSocketService = inject(WebSocketService)

    private token!: Token

    constructor(){
        try {
            const token = this.getToken();
            if (token) {
                const jwt = this.parseToken(token);
                this.setAuthenticated(jwt.username, true);
            }   
        } catch (error) {
            this.removeToken()
        }
        
    }

    setUsername(username: string){
        this._state.update((current) => ({
            ...current,
            username: username
        }))
    }

    setHasJWT(hasJWT : boolean){
        this._state.update((current) => ({
            ...current,
            hasJWT: hasJWT
        }))
    }

    setError(error: string) {
        this._state.update((current) => ({
            ...current,
            error : error
        }))
    }

    clearError() {
        this._state.update((current) => ({
            ...current,
            error: null
        }))
    }

    setAuthenticated(username: string, hasJWT: boolean){
        this._state.update((current) => ({
            ...current,
            username: username,
            hasJWT: hasJWT
        }))
        if (hasJWT){
            this.websocketService.connect();
        }
    }

    setUnauthenticated(){
        this._state.update((current) => ({
            ...current,
            username: null,
            hasJWT: false
        }))
    }

    logout(): void {
        this.removeToken();
        this.setUnauthenticated();
        this.websocketService.disconnect();
    }

    getToken(): string | null {
        return localStorage.getItem("JWT");
    }

    setToken(token: string): void {
        localStorage.setItem("JWT", token)
    }

    hasToken(): boolean {
        return this.getToken() ? true : false;
    }

    removeToken(){
        localStorage.removeItem("JWT")
        this.setUnauthenticated()
    }

    isTokenExpired(): boolean {
        const jwt = this.getToken()
        if(jwt){
            const token = this.parseToken(jwt)
            if(token.expiresAt < Date.now() / 1000){
                return true
            }
        }
        return false
    }

    parseToken(token: string): Token {
        try {
            const parts = token.split('.');
            if (parts.length !== 3){
                throw new Error('invalid JWT');
            }
            const payload = parts[1]
            const decodedPayload = atob(payload);
            const tokenData = JSON.parse(decodedPayload)
            return tokenData as Token
        } catch (error) {
            throw new Error('JWT parsing is impossible')
        }
    }
}