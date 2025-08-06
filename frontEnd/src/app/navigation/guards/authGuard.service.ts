import { inject, Injectable } from "@angular/core";
import { CanActivate } from "@angular/router";
import { UserState } from "../../state/userState.service";
import { NavigateService } from "../navigation.service";

@Injectable({
    providedIn: "root"
})
export class AuthGuard implements CanActivate {
    
    private userState: UserState = inject(UserState)
    private navigator: NavigateService = inject(NavigateService)

    canActivate(): boolean {
        if (this.userState.isLoggedIn()){
            return true;
        }
        this.navigator.openModal('login');
        return false;
    }
}