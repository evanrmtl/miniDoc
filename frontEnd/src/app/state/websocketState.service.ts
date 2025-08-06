import { computed, Injectable, signal } from "@angular/core";

type Status = 'connecting' | 'open' | 'closing' | 'closed';

interface State {
    status: Status;
    isOpen: boolean;
    error: string | null;
}

@Injectable({
    providedIn: 'root'
})
export class WebSocketState {
    private _state = signal<State>({status: 'closed', isOpen: false, error: null});
    readonly state = this._state.asReadonly();

    readonly status = computed(() => this._state().status);
    readonly isOpen = computed(() => this._state().isOpen);
    readonly error = computed(() => this._state().error);

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
}