import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { disableBodyScroll, enableBodyScroll } from 'body-scroll-lock';

@Injectable({
  providedIn: 'root'
})
export class UiService {

    private modalOpen = false;

    constructor(private router: Router) {}

    openLoginModal(){
        this.router.navigate([{ outlets: { modal: ['login'] } }])
        setTimeout(() => {
            this.modalOpen = true;
            disableBodyScroll(document.body);
        });
    }

    closeLoginModal(){
        this.router.navigate([{ outlets : { modal : null } }])
        setTimeout(() => {
            this.modalOpen = false;
            enableBodyScroll(document.body);
        });
    }

    get isModalOpen(): boolean {
        return this.modalOpen;
    }
}