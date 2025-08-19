import { Component, inject, OnInit } from '@angular/core';
import { UserState } from '../../../core/state/userState.service';
import { NavigateService } from '../../../core/navigation/navigation.service';
import { FileService } from '../../../core/services/API/file/fileAPI.service';
import { v4 as uuidv4 } from 'uuid';
import { NotificationService } from '../../../core/services/notification/notification.service';

interface file{
  fileUUID: string,
  fileName: string,
  fileUpdatedAt: number
}
@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  readonly userState = inject(UserState);
  readonly navigator = inject(NavigateService)
  private readonly fileService: FileService = inject(FileService) 
  readonly notification: NotificationService = inject(NotificationService)
  

  ngOnInit(): void {
    this.userState.isLoggedIn().subscribe((isLoggedIn) => {
      if (isLoggedIn){
        this.loadUserData;
        this.files()
      } else {
        this.navigator.openModal('login')
      }
    })
  }

  private loadUserData(): void {
    console.log('Chargement des données utilisateur...');
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

  files(): file[]{
    let res = this.fileService.getFiles()
    console.log(res)
    return []
  }
}