import { computed, inject, Injectable, signal } from "@angular/core";
import { WebSocketService } from "../services/websocket/websocket.service";
import { AuthEventBus } from "../events/authEvent/authEvent.service";
import { BehaviorSubject, Observable, Subscription } from "rxjs";
import { TokenService } from "../services/token/token.service";
import { ModalState } from "./modalState.service";

interface State {
    username: string | null;
    hasJWT: boolean;
    error: string | null;
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

    private _isLoggedIn = new BehaviorSubject<boolean>(false);

    readonly tokenService: TokenService = inject(TokenService);
    readonly websocketService: WebSocketService = inject(WebSocketService);
    readonly modalState: ModalState = inject(ModalState)

    readonly eventBus: AuthEventBus = inject(AuthEventBus);
    
    private eventSubscription?: Subscription;



    constructor(){
        this.initializeEventHandling();
        try {
            const token = this.tokenService.getToken();
            if (token) {
                const jwt = this.tokenService.parseToken(token);
                this.setAuthenticated(jwt.username, true);
            }   
        } catch (error) {
            this.removeToken();
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

    isLoggedIn(): Observable<boolean> {
        return this._isLoggedIn.asObservable();
    }

    setLoggedIn(status: boolean): void {
        this._isLoggedIn.next(status);
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

    private setAuthenticated(username: string, hasJWT: boolean){
        this._state.update((current) => ({
            ...current,
            username: username,
            hasJWT: hasJWT
        }))
        this.setLoggedIn(true);
        if (hasJWT){
            this.websocketService.connect();
        }
    }

    private setUnauthenticated(){
        this._state.update((current) => ({
            ...current,
            username: null,
            hasJWT: false
        }))
        this.setLoggedIn(false);
    }

    logout(): void {
        this.removeToken();
        this._isLoggedIn.next(false);
        this.websocketService.disconnect();
    }

    websocketLogout(): void {
        this.removeToken();
        this._isLoggedIn.next(false)
    }

    setToken(token: string){
        this.tokenService.setToken(token);
    }

    getToken(): string | null{
        return this.tokenService.getToken();
    }

    removeToken() {
        this.tokenService.removeToken();
    }

    initializeEventHandling() {
        if (this.eventSubscription) {
            this.eventSubscription.unsubscribe();
        }
        this.eventSubscription = this.eventBus.event.subscribe((event) => {
            switch(event.type){
                case 'LOGOUT_REQUEST':
                    this.logout();
                    break;
                case 'UNAUTHENTICATION_REQUEST':
                    this.setUnauthenticated();
                    break;
                case 'AUTHENTICATION_REQUEST':
                    this.setAuthenticated(event.data.username, event.data.hasJWT)
                    break;
                case 'IS_LOGINED_IN':
                    this.setLoggedIn(true);
                    break;
                case 'WEBSOCKET_LOGOUT':
                    this.websocketLogout();
                    break;
            }
        })
    }
}