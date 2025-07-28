import { Component } from '@angular/core';
import { AuthFormComponent } from '../auth-form/auth-form.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [AuthFormComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  loginLabel : string = 'Login';

  formUsername! : string;
  formPassword! : string;
  
  constructor(private router: Router) {}

  handleFormData(data : {username : string, password : string}){
    this.formUsername = data.username;
    this.formPassword = data.password;
  }

  onRegisterClick(){
    this.router.navigate(['/register']);
  }
}
