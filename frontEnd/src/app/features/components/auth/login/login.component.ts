import { Component, inject } from '@angular/core';
import { AuthService } from '../../../../core/services/API/auth/authAPI.service';
import { NotificationService } from '../../../../core/services/notification/notification.service';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NavigateService } from '../../../../core/navigation/navigation.service';
import { UserState } from '../../../../core/state/userState.service';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {

  private readonly fb: FormBuilder = inject(FormBuilder)
  private readonly authService: AuthService = inject(AuthService) 
  private readonly navigator: NavigateService = inject(NavigateService)
  private readonly notification: NotificationService = inject(NotificationService)

  readonly userState = inject(UserState)

  readonly loginForm: FormGroup = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  })

  onSubmit(): void{
    if(this.loginForm.invalid){
      this.markAllFiledAsTouched();
      return;
    }
    
    const { username, password } = this.loginForm.value;

    this.authService.login(username, password).subscribe({
      next: () => {
        this.notification.show('Connected !', 'success');
        this.navigator.closeModal().then(() => {
          this.navigator.navigateToHome();
        });
      },
      error: () => {}
    });
  }

  switchToRegister(): void {
    this.navigator.openModal('register')
  }

  closeModal(): void {
    this.navigator.closeModal()
  }

  isFieldInvalid(filedName: string): boolean{
    const field = this.loginForm.get(filedName);
    return !!(field && field.invalid && field.touched)
  }

  private markAllFiledAsTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      this.loginForm.get(key)?.markAllAsTouched();
    })
  }

  get getStatusMessage() {
    return {
      message: this.userState.error() || '',
      type: 'error'
    };
  }
}
