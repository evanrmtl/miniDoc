import { inject, Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { catchError, map, Observable, tap } from "rxjs";
import { UserState } from "../../../state/userState.service";
import { FileErrorHandlerService } from "./errorHandler/FileErrorHandler.service";
import { NavigateService } from "../../../navigation/navigation.service";

export interface File{
  fileUUID: string,
  fileName: string,
  fileUpdatedAt: Date
}

@Injectable({
    providedIn : 'root'
})
export class FileServiceAPI {

    readonly urlServer: string = 'http://localhost:3000';
    readonly userState: UserState = inject(UserState)
    readonly errorHandler: FileErrorHandlerService = inject(FileErrorHandlerService)
    readonly navigator: NavigateService = inject(NavigateService)

    constructor(private http: HttpClient) {}

    create(fileUUID: string): Observable<void> {
        let token = this.userState.getToken()
        if (!token){
            this.userState.logout()
        }
        const retryWithSameUuid = () => this.create(fileUUID);
        return this.http.get(`${this.urlServer}/v1/file/create`, { 
            headers: new HttpHeaders().set("Authorization", `Bearer ${token}`), 
            params: { uuid: fileUUID }
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
        return this.http.get(`${this.urlServer}/v1/file/delete`, { 
            headers: new HttpHeaders().set("Authorization", `Bearer ${token}`), 
            params: { uuid: fileUUID }
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
}
