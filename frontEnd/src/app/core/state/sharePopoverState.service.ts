import { Injectable, signal, computed } from '@angular/core';
import { Subject } from 'rxjs';
import { File } from "../services/API/file/fileAPI.service";

@Injectable({
    providedIn: 'root'
})
export class SharePopoverState {
    private _openPopover = new Subject<any>();
    readonly openPopover = this._openPopover.asObservable();
    private _error = signal<string | null>(null);
    readonly error = computed(() => this._error());
    
    openSharePopover(fileData: File) {
        console.log('Service called with:', fileData);
        this.clearError();
        this._openPopover.next(fileData)
    }
    
    closeSharePopover() {
        this.clearError();
        this._openPopover.next(null);
    }

    setError(error: string){
        this._error.set(error)
    }

    clearError() {
        this._error.set(null)
    }

    getError() {
        return this._error.set(null)
    }
}