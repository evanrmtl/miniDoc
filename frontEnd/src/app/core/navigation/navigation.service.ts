import { inject, Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { Location } from '@angular/common';
import { ModalState } from "../state/modalState.service";
;


export type ModalType = 'login' | 'register' | null;

@Injectable({
    providedIn: 'root'
  })
export class NavigateService{

    private readonly router = inject(Router);
    private readonly location = inject(Location);
    private modalState: ModalState = inject(ModalState)

    
    navigateToHome(): Promise<boolean> {
        return this.router.navigate(['/home']);
    }

    navigateToLogin(): Promise<boolean> {
        return this.router.navigate(['/login']);
    }

    navigateToRegister(): Promise<boolean> {
        return this.router.navigate(['/register']);
    }

    openModal(type: ModalType): Promise<boolean> {
        if (!type) {
            return Promise.resolve(false);
        }
        this.modalState.openModal();
        return this.router.navigate([{ outlets: { modal: [type] } }]);
    }

    closeModal(): Promise<boolean> {
        this.modalState.closeModal();
        return this.router.navigate([{ outlets: { modal: null } }]);
    }

    navigateToFile(uuid: string): Promise<boolean> {
        return this.router.navigate([`/file/${uuid}`])
    }
}