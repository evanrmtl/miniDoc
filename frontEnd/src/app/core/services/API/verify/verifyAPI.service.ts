import { inject, Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { catchError, map, Observable, tap } from "rxjs";
import { UserState } from "../../../state/userState.service";
import { verifyErrorHandlerService } from "./errorhandler/VerifyErrorHandler.service";
import { NavigateService } from "../../../navigation/navigation.service";
import { WebSocketService } from "../../websocket/websocket.service";


@Injectable({
    providedIn : 'root'
})
export class VerifyServiceAPI{

    readonly urlServer: string = 'http://localhost:3000';
    readonly userState: UserState = inject(UserState)
    readonly errorHandler: verifyErrorHandlerService = inject(verifyErrorHandlerService)
    readonly navigator: NavigateService = inject(NavigateService)
    readonly websocketService: WebSocketService = inject(WebSocketService)
    
    constructor(private http: HttpClient) {}

    verifyUsername(username: string, file_uuid: string): Observable<boolean>{
        let token = this.userState.getToken()
        if (!token){
            this.userState.logout()
        }
        console.log("in Verify")
        const retryWithSameUuid = () => this.verifyUsername(username, file_uuid);
        return this.http.get(`${this.urlServer}/v1/verify/username`, { 
            headers: new HttpHeaders().set("Authorization", `Bearer ${token}`), 
            params: { username: username, file_uuid: file_uuid}
        })
            .pipe(
                map(() => true),
                catchError(error => {
                    return this.errorHandler.handleError(error, retryWithSameUuid)
                })
            );
    }
}