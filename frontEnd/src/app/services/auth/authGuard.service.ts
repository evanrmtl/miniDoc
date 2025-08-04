import { inject, Inject, Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, CanActivate, GuardResult, MaybeAsync, Router, RouterStateSnapshot } from "@angular/router"
import { AuthService } from "./authService.service";

@Injectable({
    providedIn: 'root'
})
export class AuthGuard implements CanActivate {

    constructor(private router : Router, private auth: AuthService) {}

    canActivate(){
        if (this.auth.isLoggedIn()) {
            return true;
        }
        this.router.navigate([{ outlets: { modal: ['login'] } }]);
        return false;
    }
}