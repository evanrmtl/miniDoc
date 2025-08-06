import { inject, Injectable } from "@angular/core";
import { NotificationService } from "../notification/notification.service";
import { Observable, throwError } from "rxjs";
import { UserState } from "../../state/userState.service";
import { HttpErrorResponse } from "@angular/common/http";

@Injectable({
    providedIn: 'root'
})
export class ErrorHandlerService {
    private readonly notification = inject(NotificationService);
    private readonly userState = inject(UserState);

    handleError(error: HttpErrorResponse): Observable<never> {
        const message = error.error?.message || 'Erreur serveur';
        
        if (error.status === 401) {
            this.userState.logout();
            return throwError(() => error);
        }
        this.notification.show(message, 'error');
        return throwError(() => error);
    }
}
