import { inject, Injectable } from "@angular/core";
import { AuthEventBus } from "../../events/authEvent/authEvent.service";


export interface Token {
    username: string;
    userID: number;
    iat: number;
    expiresAt: number;
}

@Injectable({
    providedIn: 'root'
})
export class TokenService {

    private readonly eventBus: AuthEventBus = inject(AuthEventBus);

    getToken(): string | null {
        return localStorage.getItem("JWT");
    }

    getParsedToken(): Token | null {
        const token = this.getToken();
        if(token){
            const parsedToken = this.parseToken(token);
            return parsedToken;
        }
        return null;
    }

    setToken(token: string): void {
        try {
            const parsedToken = this.parseToken(token);
            localStorage.setItem("JWT", token);
            this.eventBus.emit('AUTHENTICATION_REQUEST', {
                username: parsedToken.username, 
                hasJWT: true
            });
            
        } catch (error) {
            this.removeToken();
            throw error;
        }
    }

    hasToken(): boolean {
        return this.getToken() ? true : false;
    }

    removeToken(){
        localStorage.removeItem("JWT");
        this.eventBus.emit('UNAUTHENTICATION_REQUEST');
    }

    replaceToken(token: string){
        this.removeToken();
        this.setToken(token);
    }

    isTokenExpired(): boolean {
        const jwt = this.getToken();
        if(jwt){
            const token = this.parseToken(jwt)
            if(token.expiresAt < Date.now() / 1000){
                return true;
            }
        }
        return false;
    }

    private getUsername(): string | void {
        const token = this.getToken();
        if (token){
            const parsedToken = this.parseToken(token);
            return parsedToken.username;
        }
    }

    parseToken(token: string): Token {
        try {
            const parts = token.split('.');
            if (parts.length !== 3){
                throw new Error('invalid JWT');
            }
            const payload = parts[1];
            const decodedPayload = atob(payload);
            const tokenData = JSON.parse(decodedPayload);
            return tokenData as Token;
        } catch (error) {
            throw new Error('JWT parsing is impossible');
        }
    }

}