import { computed, Injectable, signal } from "@angular/core";

type Status = 'connecting' | 'open' | 'closing' | 'closed';

interface State {
    status: Status;
    isOpen: boolean;
    error: string | null;
    isReconnecting: boolean;
    sessionId: string;
}

@Injectable({
    providedIn: 'root'
})
export class WebSocketState {
    private _state = signal<State>({status: 'closed', isOpen: false, error: null, isReconnecting: false, sessionId: crypto.randomUUID()});
    readonly state = this._state.asReadonly();

    readonly status = computed(() => this._state().status);
    readonly isOpen = computed(() => this._state().isOpen);
    readonly error = computed(() => this._state().error);
    readonly isReconnecting = computed(() => this._state().isReconnecting);
    readonly sessionUUID =  computed(() => this._state().sessionId);


    setStatus(status: Status): void {
        this._state.update((current) => ({
            ...current,
            status: status
        }))
    }

    setIsOpen(isOpen: boolean): void {
        this._state.update((current) => ({
            ...current,
            isOpen: isOpen
        }))
    }

    setError(error: string | null): void {
        this._state.update((current) => ({
            ...current,
            error: error
        }))
    }

    setIsReconnecting(isReconnecting: boolean): void {
        this._state.update((current) => ({
            ...current,
            isReconnecting: isReconnecting
        }))
    }

    resetSession(){
        this._state.update((current) => ({
            ...current,
            sessionId: crypto.randomUUID()
        }));
    }
}