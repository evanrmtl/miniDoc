import { Injectable } from "@angular/core";
import { Subject } from "rxjs";

@Injectable({
    providedIn : 'root'
})
export class NotificationService {
    private notificationSubject = new Subject<{ message: string, type: string }>();
    notification = this.notificationSubject.asObservable();

    show(message: string, type: 'success' | 'error' | 'info' = 'success'): void {
        this.notificationSubject.next({ message, type });
    }
}