import { inject, Injectable } from "@angular/core";
import { CanActivate } from "@angular/router";
import { UserState } from "../../state/userState.service";
import { NavigateService } from "../navigation.service";
import { map, Observable } from "rxjs";

@Injectable({
    providedIn: "root"
})
export class AuthGuard implements CanActivate {
    
    private userState: UserState = inject(UserState)
    private navigator: NavigateService = inject(NavigateService)

    canActivate(): Observable<boolean> {
        return this.userState.isLoggedIn().pipe(
            map(isLoggedIn => {
                if (!isLoggedIn) {
                    this.navigator.openModal('login');
                    return false;
                }
                return true;
            })
        );
    }
}