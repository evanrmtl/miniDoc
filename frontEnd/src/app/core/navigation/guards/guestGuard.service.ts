import { inject, Injectable } from "@angular/core";
import { CanActivate } from "@angular/router";
import { UserState } from "../../state/userState.service";
import { map, Observable } from "rxjs";

@Injectable({
    providedIn: "root"
})
export class GuestGuard implements CanActivate {
    
    private userState: UserState = inject(UserState)

    canActivate(): Observable<boolean> {
        return this.userState.isLoggedIn().pipe(
            map(isLoggedIn => {
                console.log('GuestGuard - isLoggedIn:', isLoggedIn);
                return !isLoggedIn;
            })
        );
    }
}