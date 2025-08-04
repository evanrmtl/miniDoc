import { Injectable, signal } from "@angular/core";


@Injectable({
    providedIn: "root"
})
export class RefreshService {
    refreshSignal = signal(false)

    triggerRefresh(){
        this.refreshSignal.set(true);
    }

    clearRefresh(){
        this.refreshSignal.set(false);
    }
}