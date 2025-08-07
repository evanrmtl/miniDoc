import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { NotificationService } from '../../notification/notification.service';
import { UserState } from '../../../state/userState.service'

export interface AppError {
    message: string;
    code?: string;
    statusCode?: number;
}

@Injectable({
    providedIn: 'root'
})
export class AuthErrorHandlerService {

    private readonly notification = inject(NotificationService);
    private readonly userState = inject(UserState);

    handleError(error: HttpErrorResponse): Observable<never> {
        const appError = this.parseError(error);

        if(appError.statusCode === 401){
            this.userState.logout()
        }

        this.userState.setError(appError.message)
        return throwError(() => appError);
    }
    
    private parseError(error: HttpErrorResponse): AppError {
        const message = error.error?.error 
        || error.error?.message 
        || error.message 
        || 'An unexpected error occurred';

        return {
                message,
                statusCode: error.status,
                code: error.error?.code
        };
    }
}