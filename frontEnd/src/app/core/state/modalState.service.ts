import { Injectable, signal, computed } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class ModalState {
    private _isOpen = signal(false);
    readonly isOpen = this._isOpen.asReadonly();
    
    openModal() {
        this._isOpen.set(true);
    }
    
    closeModal() {
        this._isOpen.set(false);
    }
}