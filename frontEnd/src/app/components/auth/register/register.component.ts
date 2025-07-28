import { Component } from '@angular/core';
import { AuthFormComponent } from '../auth-form/auth-form.component';
import { Router } from '@angular/router';

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

  onLoginClick(){
    this.router.navigate(['/login']);
  }
}
