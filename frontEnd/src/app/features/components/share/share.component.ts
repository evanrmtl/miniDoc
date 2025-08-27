import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { File, SharedUser } from '../../../core/services/API/file/fileAPI.service';
import { FileServiceAPI } from '../../../core/services/API/file/fileAPI.service';
import { FormsModule } from '@angular/forms';
import { SharePopoverState } from '../../../core/state/sharePopoverState.service';
import { VerifyServiceAPI } from '../../../core/services/API/verify/verifyAPI.service';
import { UserState } from '../../../core/state/userState.service';

@Component({
  selector: 'app-share',
  imports: [FormsModule],
  templateUrl: './share.component.html',
  styleUrl: './share.component.scss'
})
export class ShareComponent {
  @Input() fileData: File | undefined;

  @Output() close = new EventEmitter<void>();

  readonly fileServiceAPI: FileServiceAPI = inject(FileServiceAPI)
  readonly verifyServiceAPI: VerifyServiceAPI = inject(VerifyServiceAPI)
  readonly sharePopoverState: SharePopoverState = inject(SharePopoverState)
  readonly userState: UserState = inject(UserState)

  protected currUsername = ""
  protected usernameList: string[] = [];
  protected alreadyAccess: SharedUser[] = [];


  ngOnInit() {
    if (this.fileData?.fileUUID) {
      this.fileServiceAPI.getAlreadySharedUser(this.fileData.fileUUID).subscribe({
        next: (res) => {
          this.alreadyAccess.push(...res)
          console.log(this.alreadyAccess)
        },
        error: (error) => {
            console.error('get already shared users:', error);
        }
      })
    }
  }


  addUser(){
    this.usernameList.push(this.currUsername);
  }

  verifyUsername(username: string) {
    if (!username.trim()) {
      this.sharePopoverState.setError('Please enter a username');
      return;
    }
    if (username === this.userState.username()){
      this.sharePopoverState.setError('You cannot share the file with yourself');
      return;
    }
    if (this.usernameList.includes(username)) {
      this.sharePopoverState.setError('This user is already in the list');
      return;
    }
    if (!this.fileData) {
      this.sharePopoverState.setError('Error with the file, please try again');
      return;
    }
    
    this.verifyServiceAPI.verifyUsername(username, this.fileData.fileUUID).subscribe({
        next: (isValid) => {
            if (isValid) {
              this.usernameList.push(username);
              this.currUsername = '';
              this.sharePopoverState.clearError();
            }
        },
        error: (error) => {
            console.error('Username validation error:', error);
        }
    });
  }

  clearUsername(username: string) {
    this.usernameList = this.usernameList.filter(u => u !== username);
  }

  closeSharePopover() {
    this.sharePopoverState.clearError();
    this.close.emit();
  }

  shareFile(){
    if (this.fileData){
      this.fileServiceAPI.shareFile(this.fileData.fileUUID, this.usernameList).subscribe({
        next: () => {
          this.closeSharePopover()
        },
        error: (error) => {
          console.log(error)
          this.sharePopoverState.setError("error while sharing, try again later")
        }
        
      })
    }
  }

  removeAccess(username: string){
    if (this.fileData){
      this.fileServiceAPI.removeAccess(this.fileData.fileUUID, username).subscribe({
        next: () => {
          this.alreadyAccess = this.alreadyAccess.filter(user => user.username !== username);
        },
        error: (error) => {
          console.log(error)
          this.sharePopoverState.setError("couldn't remove access")
        }
        
      })
    }
  }


  showError(): boolean {
    let error = this.sharePopoverState.getError()
    if (error != null){
      return true
    }
    return false;
  }
}
