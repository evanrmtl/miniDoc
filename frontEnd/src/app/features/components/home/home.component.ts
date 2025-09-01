import { Component, inject, OnInit } from '@angular/core';
import { UserState } from '../../../core/state/userState.service';
import { NavigateService } from '../../../core/navigation/navigation.service';
import { FileServiceAPI } from '../../../core/services/API/file/fileAPI.service';
import { v4 as uuidv4 } from 'uuid';
import { NotificationService } from '../../../core/services/notification/notification.service';
import type { File } from "../../../core/services/API/file/fileAPI.service"
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { map } from 'rxjs';
import { ModalState } from '../../../core/state/modalState.service';
import { SharePopoverState } from '../../../core/state/sharePopoverState.service';
import { FileNotification, revokeFileData, SharedFileData, SharedUsers, WebSocketService } from '../../../core/services/websocket/websocket.service';

@Component({
  selector: 'app-home',
  imports: [DatePipe, FormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'] 
})
export class HomeComponent implements OnInit {
  readonly userState = inject(UserState);
  readonly navigator = inject(NavigateService);
  private readonly fileService: FileServiceAPI = inject(FileServiceAPI);
  readonly notification: NotificationService = inject(NotificationService);
  protected userfiles: File[] | undefined;
  protected filteredFiles: File[] | undefined;
  protected modalState: ModalState = inject(ModalState);
  protected sharePopoverState: SharePopoverState = inject(SharePopoverState);
  protected fileToShare: string | null = null;
  private readonly websocketService: WebSocketService = inject(WebSocketService);
  private notificationSubscription ?: any;

  protected searchQuery: string = ""

  ngOnInit(): void {
    this.userState.isLoggedIn().subscribe((isLoggedIn) => {
      if (isLoggedIn){
        this.loadUserData();
      } else {
        this.navigator.openModal('login')
      }
    })
    this.notificationSubscription = this.websocketService.getFileNotifications().subscribe((notification) => {
      if (notification){
        this.handleFileNotification(notification);
      }
    })
  }

  ngOnDestroy(): void {
    if (this.notificationSubscription) {
      this.notificationSubscription.unsubscribe();
    }
  }

  private loadUserData(): void {
    this.files();
  }

  createFile() {
    let fileUUID = uuidv4()
    this.fileService.create(fileUUID).subscribe({
      next: () => {
        this.navigator.navigateToFile(fileUUID)
      },
      error: () => {
         this.notification.show("Couldn't create file, try again", 'error');
      }
    })
  }

  editFile(fileUUID: string){
    this.navigator.navigateToFile(fileUUID)
  }

  deleteFile(file: File){
    this.fileService.delete(file.fileUUID).subscribe({
      next: () => {
        this.notification.show(`File "${file.fileName}" have been delete`, 'info')
        this.files()
      },
      error: () => {
        this.notification.show(`Error deleting the file "${file.fileName}"`, 'error')
      }
    })
  }

  shareFile(fileUUID: string): void {
    console.log(fileUUID)
  }

  openPopover(file: File){
    console.log('Button clicked, file:', file);
    this.sharePopoverState.openSharePopover(file)
    this.fileToShare = file.fileUUID
  }
  

  files(): File[] | undefined {
    this.fileService.getFiles().subscribe({
      next: (data: File[]) => {
        this.userfiles = data;
        this.filterFiles();
      },
      error: () => {
        this.notification.show("Couldn't load your file, try again", "error")
        this.userfiles = undefined;
      }
    })
    return this.userfiles;
  }

  onSearchChange(): void {
    this.filterFiles();
  }

  private filterFiles(): void {
    if (!this.searchQuery) {
      this.filteredFiles = this.userfiles;
    } else {
      this.filteredFiles = this.userfiles?.filter(file => 
        file.fileName.toLowerCase().startsWith(this.searchQuery.toLowerCase())
      );
    }
  }

  logout(): void {
    try {
      this.clearClass()
      this.notification.show('logged', 'info') 
      this.userState.logout();
    } catch (error) {
        console.error('Logout failed:', error);
    }
  }

  private handleFileNotification(notification: FileNotification): void {
    switch(notification.notificationType) {
      case 'file_shared':
        this.notification.show('📁 New file shared with you!', 'success');
        if (this.userfiles){
          const fileData = notification.data as SharedFileData;
          const fileToAdd: File = {
            fileName: fileData.fileName,
            fileUpdatedAt: new Date(fileData.updatedAt * 1000),
            fileUUID: fileData.fileUUID
          };
          let sharedUsers: SharedUsers[] = [];
          fileData.sharedUsers.forEach((user) => {
            let sharedUser: SharedUsers = {
              username: user.username,
              role: user.role
            }
            sharedUsers.push(sharedUser)
          })
          this.userfiles.unshift(fileToAdd)
          this.filterFiles()
        }        
        break;
      case 'file_revoke':
        console.log("notification revoke: ", notification)
        this.notification.show('⚠️ You have been revoke from a file!', 'info')
        const fileData = notification.data as revokeFileData;
        if (this.userfiles){
          this.userfiles = this.userfiles.filter((file) => {
            return file.fileUUID != fileData.fileUUID
          })
          this.filterFiles()
          break;
        }
    }
  }

  clearClass(): void {
    this.userfiles = []
    this.filteredFiles = []
    this.searchQuery = ""
  }

}

  