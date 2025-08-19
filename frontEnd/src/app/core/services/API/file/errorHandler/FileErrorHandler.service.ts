import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { NotificationService } from '../../../notification/notification.service';
import { UserState } from '../../../../state/userState.service'
import { TokenService } from '../../../token/token.service';

interface TokenResponse {
  error: string;
  newJWT?: string;
}

export interface AppError {
    message: TokenResponse;
    code?: string;
    statusCode?: number;
}

@Injectable({
    providedIn: 'root'
})
export class FileErrorHandlerService {

    private readonly userState = inject(UserState);
    private readonly tokenService = inject(TokenService)

    handleError(error: HttpErrorResponse, retryRequest: () => Observable<any>): Observable<never | any> {
        const appError = this.parseError(error);

        if(appError.statusCode === 401){
            this.userState.logout()
        }
        else if (appError.statusCode === 409){
            let newToken = appError.message.newJWT
            if (newToken){
                this.tokenService.replaceToken(newToken)
                return retryRequest()
            } else {
                this.userState.logout()
            }
        }

        this.userState.setError(appError.message.error)
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