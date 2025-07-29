import { Component } from '@angular/core';
import { AuthFormComponent } from '../auth-form/auth-form.component';
import { Router } from '@angular/router';
import { registerRequest } from '../../../services/API/authAPI.service';

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

  constructor(private router : Router){}

  handleFormData(data : {username : string, password : string}){
    this.formUsername = data.username;
    this.formPassword = data.password;
    registerRequest(this.formUsername, this.formPassword)
  }

  onLoginClick(){
    this.router.navigate([{outlets : { modal : ['login']} } ]);
  }
}
