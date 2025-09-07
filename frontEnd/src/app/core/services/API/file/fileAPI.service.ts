import { inject, Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { catchError, map, Observable, tap } from "rxjs";
import { UserState } from "../../../state/userState.service";
import { FileErrorHandlerService } from "./errorHandler/FileErrorHandler.service";
import { NavigateService } from "../../../navigation/navigation.service";
import { WebSocketService } from "../../websocket/websocket.service";
import { WebSocketState } from "../../../state/websocketState.service";

export interface File{
  fileUUID: string,
  fileName: string,
  fileUpdatedAt: Date
}

export interface SharedUser{
    username: string,
    role: string
}

@Injectable({
    providedIn : 'root'
})
export class FileServiceAPI {

    readonly urlServer: string = 'http://localhost:3000';
    readonly userState: UserState = inject(UserState)
    readonly errorHandler: FileErrorHandlerService = inject(FileErrorHandlerService)
    readonly navigator: NavigateService = inject(NavigateService)
    readonly websocketService: WebSocketService = inject(WebSocketService)
    readonly websocketState: WebSocketState = inject(WebSocketState)

    constructor(private http: HttpClient) {}

    create(fileUUID: string): Observable<void> {
        let token = this.userState.getToken()
        if (!token){
            this.userState.logout()
        }
        const retryWithSameUuid = () => this.create(fileUUID);
        return this.http.post(`${this.urlServer}/v1/file/create`, 
            { file_uuid: fileUUID, session_uuid: this.websocketState.sessionUUID() }, 
            { headers: new HttpHeaders().set("Authorization", `Bearer ${token}`)
        })
            .pipe(
                tap((res: any) => {
                    this.navigator.navigateToFile(fileUUID)
                }),
                catchError(error => {
                    return this.errorHandler.handleError(error, retryWithSameUuid)
                })
            );
    }

    delete(fileUUID: string): Observable<void> {
        let token = this.userState.getToken()
        if (!token){
            this.userState.logout()
        }
        const retryWithSameUuid = () => this.delete(fileUUID);
        return this.http.delete(`${this.urlServer}/v1/file/delete`, { 
            headers: new HttpHeaders().set("Authorization", `Bearer ${token}`), 
            params: { file_uuid: fileUUID, session_uuid: this.websocketState.sessionUUID() }
        })
            .pipe(
                catchError(error => {
                    return this.errorHandler.handleError(error, retryWithSameUuid)
                })
            );
    }

    shareFile(fileUUID: string, usernames: string[]): Observable<void> {
        let token = this.userState.getToken()
        if (!token){
            this.userState.logout()
        }
        const retryWithSameUuid = () => this.shareFile(fileUUID, usernames);
        return this.http.post(`${this.urlServer}/v1/file/share`, 
            { file_uuid: fileUUID, usernames: usernames},
            { headers: new HttpHeaders().set("Authorization", `Bearer ${token}`)
        })
            .pipe(
                catchError(error => {
                    return this.errorHandler.handleError(error, retryWithSameUuid)
                })
            );
    }

    

    getFiles(): Observable<File[]> {
        let token = this.userState.getToken()
        if (!token){
            this.userState.logout()
        }
        const retryGetFile = () => this.getFiles();
        return this.http.get<any[]>(`${this.urlServer}/v1/file/get`, { 
            headers: new HttpHeaders().set("Authorization", `Bearer ${token}`)
        })
            .pipe(
                map(res => res.map(item => ({
                    fileUUID: item.file_uuid,
                    fileName: item.file_name,
                    fileUpdatedAt: new Date(item.file_updated_at * 1000)
                }))),
                catchError(error => {
                    return this.errorHandler.handleError(error, retryGetFile)
                })
            );
    }

    getAlreadySharedUser(fileUUID: string): Observable<SharedUser[]> {
        let token = this.userState.getToken()
        if (!token){
            this.userState.logout()
        }
        const retryGgetAlreadySharedUser = () => this.getAlreadySharedUser(fileUUID);
        return this.http.get<any[]>(`${this.urlServer}/v1/file/getSharedUser`, { 
            headers: new HttpHeaders().set("Authorization", `Bearer ${token}`),
            params: { file_uuid: fileUUID }
        })
            .pipe(
                map((res: any[]) => {
                    if (!Array.isArray(res)) {
                        console.warn('Expected array but got:', res);
                        return [];
                    }
                    return res.map(user => ({
                        username: user.username,
                        role: user.role
                    }));
                }),
                catchError(error => {
                    return this.errorHandler.handleError(error, retryGgetAlreadySharedUser)
                })
            );
    }

    removeAccess(fileUUID: string, username: string): Observable<void> {
        let token = this.userState.getToken()
        if (!token){
            this.userState.logout()
        }
        const retryRemoveAccess = () => this.removeAccess(fileUUID, username);
         return this.http.delete(`${this.urlServer}/v1/file/removeUser`, { 
            headers: new HttpHeaders().set("Authorization", `Bearer ${token}`),
            params: { file_uuid: fileUUID, username: username }
        })
            .pipe(
                catchError(error => {
                    return this.errorHandler.handleError(error, retryRemoveAccess)
                })
            );
    }
}
