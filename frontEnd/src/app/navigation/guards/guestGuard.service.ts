import { inject, Injectable } from "@angular/core";
import { CanActivate } from "@angular/router";
import { UserState } from "../../state/userState.service";

@Injectable({
    providedIn: "root"
})
export class GuestGuard implements CanActivate {
    
    private userState: UserState = inject(UserState)

    canActivate(): boolean {
        if (this.userState.isLoggedIn()){
            return false;
        }
        return true;
    }
}