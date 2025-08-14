import { Injectable } from "@angular/core";
import { Subject } from "rxjs";

interface AuthEvent<T extends any>{
    type: 'LOGOUT_REQUEST' | 'UNAUTHENTICATION_REQUEST' | 'AUTHENTICATION_REQUEST' | 'IS_LOGINED_IN';
    timestamp: number;
    data?: T;
}

@Injectable({
    providedIn: 'root'
})
export class AuthEventBus {

    private readonly _event = new Subject<AuthEvent<any>>();

    readonly event = this._event.asObservable()

    emit<T>(type: AuthEvent<T>['type'], data?: T, timestamp = Date.now()): void {
        this._event.next({
            type,
            timestamp,
            data,
        })
    }
}