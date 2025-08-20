import { Component, inject, OnInit } from '@angular/core';
import { UserState } from '../../../core/state/userState.service';
import { NavigateService } from '../../../core/navigation/navigation.service';
import { FileServiceAPI } from '../../../core/services/API/file/fileAPI.service';
import { v4 as uuidv4 } from 'uuid';
import { NotificationService } from '../../../core/services/notification/notification.service';
import { File } from "../../../core/services/API/file/fileAPI.service"
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { map } from 'rxjs';
import { ModalState } from '../../../core/state/modalState.service';

@Component({
  selector: 'app-home',
  imports: [DatePipe, FormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'] 
})
export class HomeComponent implements OnInit {
  readonly userState = inject(UserState);
  readonly navigator = inject(NavigateService)
  private readonly fileService: FileServiceAPI = inject(FileServiceAPI) 
  readonly notification: NotificationService = inject(NotificationService)
  protected userfiles: File[] | undefined
  protected filteredFiles: File[] | undefined;
  protected modalState: ModalState = inject(ModalState)

  protected searchQuery: string = ""

  ngOnInit(): void {
    this.userState.isLoggedIn().subscribe((isLoggedIn) => {
      if (isLoggedIn){
        this.loadUserData();
      } else {
        this.navigator.openModal('login')
      }
    })
  }

  private loadUserData(): void {
    this.files();
  }

  createFile() {
    let fileUUID = uuidv4()
    this.fileService.create(fileUUID).subscribe({
      next: () => {
        this.navigator.navigateToFile(fileUUID)
        this.files()
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
    console.log(this.userfiles?.length);
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

  clearClass(): void {
    this.userfiles = []
    this.filteredFiles = []
    this.searchQuery = ""
  }

}

  