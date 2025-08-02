import { Component } from '@angular/core';
import { AuthFormComponent } from '../auth-form/auth-form.component';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth/authService.service';
import { NotificationService } from '../../../services/notification/notification.service';
import { HomeComponent } from '../../home/home.component';
import { RefreshService } from '../../../services/refresh/refreash.service';

@Component({
  selector: 'app-register',
  imports: [AuthFormComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  registerLabel : string = 'Register';

  formUsername! : string;
  formPassword! : string;

  private statusMessage = { message: '', type: '' };


  constructor(private refresh : RefreshService, private router : Router, private authService : AuthService, private notification : NotificationService){}

  handleFormData(data : {username : string, password : string}){
    this.formUsername = data.username;
    this.formPassword = data.password;
     this.authService.registerRequest(this.formUsername, this.formPassword).subscribe({
      next: () => {
        this.statusMessage = { message: '', type: ''};
        this.notification.show('Connected', 'success');
        this.refresh.triggerRefresh();
        this.router.navigate(['home']);
      },
      error: (error) => {
        this.statusMessage = { message: error.error?.error || 'Unknown error', type: 'error' };
        throw error;
      },
      complete: () => {}
    });
  }

  get getStatusMessage() {
    return this.statusMessage;
  }

  onLoginClick(){
    this.router.navigate([{outlets : { modal : ['login']} } ]);
  }
}
