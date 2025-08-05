import { HttpClient } from "@angular/common/http";
import { CreateComputedOptions, Injectable } from "@angular/core";
import { catchError, Observable, tap } from "rxjs";
import { WebSocketService } from "../websocket/websocket.service";

@Injectable({
    providedIn : 'root'
})
export class AuthService {

    readonly urlServer: string = 'http://localhost:3000';

    constructor(private http: HttpClient, private socket: WebSocketService) {}

    isLoggedIn(): boolean {
        return !!localStorage.getItem("JWT");
    }

    loginRequest(username: string, password: string): Observable<any> {
        return this.http.post(`${this.urlServer}/login`, {username: username, password: password})
            .pipe(
                tap((res: any) => {
                    if(res.JWT) { 
                        this.setToken(res.JWT);
                        const jwt = localStorage.getItem('JWT');
                        if (jwt) {
                        this.socket.connect();
                        }
                    }
                }),
                catchError(this.handleError)
            );
    }

    registerRequest(username: string, password: string): Observable<any> {
        return this.http.post(`${this.urlServer}/register`, {username: username, password: password})
            .pipe(
                tap((res: any) => {
                    if(res.JWT) { 
                        this.setToken(res.JWT); 
                        const jwt = localStorage.getItem('JWT');
                        if (jwt) {
                            this.socket.connect();
                        }
                    }
                }),
                catchError(this.handleError)
            );
    }

    private setToken(token: string): void {
        localStorage.setItem("JWT", token);
    }

    private handleError(error: any): Observable<never> {
        throw error;
    }
}
