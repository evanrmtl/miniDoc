import { inject, Injectable } from "@angular/core";
import { UserState } from "../../../state/userState.service";
import { HttpClient } from "@angular/common/http";
import { catchError, Observable, tap } from "rxjs";
import { AuthErrorHandlerService } from "./errorHandler/AuthErrorHandler.Service";
import { ModalState } from "../../../state/modalState.service";
import { WebSocketService } from "../../websocket/websocket.service";

@Injectable({
    providedIn : 'root'
})
export class AuthService {

    readonly urlServer: string = 'http://localhost:3000';
    private readonly userState: UserState = inject(UserState)
    private readonly errorHandler: AuthErrorHandlerService = inject(AuthErrorHandlerService)
    private readonly modalState: ModalState = inject(ModalState)
    private readonly websocket: WebSocketService = inject(WebSocketService)

    constructor(private http: HttpClient) {}

    login(username: string, password: string): Observable<void> {
        return this.http.post(`${this.urlServer}/v1/login`, {username: username, password: password})
            .pipe(
                tap((res: any) => {
                    this.handleAuthResponse(res);
                    this.modalState.closeModal();
                }),
                catchError(error => {
                    return this.errorHandler.handleError(error)
                })
            );
    }

    register(username: string, password: string): Observable<void> {
        return this.http.post(`${this.urlServer}/v1/register`, {username: username, password: password})
            .pipe(
                tap((res: any) => {
                    this.handleAuthResponse(res);
                    this.modalState.closeModal();
                }),
                catchError(error => {
                    return this.errorHandler.handleError(error)
                })
            );
    }

    private handleAuthResponse(res: any){
        if(res.JWT) {
            this.userState.removeToken();
            this.userState.setToken(res.JWT);
        }
    }
}
