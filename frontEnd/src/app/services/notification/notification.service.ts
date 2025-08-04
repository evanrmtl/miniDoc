import { Injectable } from "@angular/core";
import { Subject } from "rxjs/internal/Subject";


@Injectable({
    providedIn : 'root'
})
export class NotificationService {
    private notificationSubject = new Subject<{ message: string, type: string }>();
    notification = this.notificationSubject.asObservable();

    show(message: string, type: string = 'success') {
        this.notificationSubject.next({ message, type });
    }
}