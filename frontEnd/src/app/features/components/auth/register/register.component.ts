import { Component, inject } from '@angular/core';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { NotificationService } from '../../../../core/services/notification/notification.service';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserState } from '../../../../core/state/userState.service';
import { NavigateService } from '../../../../core/navigation/navigation.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {

  private readonly fb: FormBuilder = inject(FormBuilder)
  private readonly authService: AuthService = inject(AuthService) 
  private readonly navigator: NavigateService = inject(NavigateService)
  private readonly notification: NotificationService = inject(NotificationService)

  readonly userState = inject(UserState)

  readonly registerForm: FormGroup =  this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  })

  onSubmit(): void {
    if(this.registerForm.invalid){
      this.markAllFiledAsTouched()
      return;
    }
    const {username, password} = this.registerForm.value;

    this.authService.register(username, password).subscribe({
      next: () => {
        this.notification.show('Connected !', 'success');
        this.navigator.closeModal().then(() =>{
          this.navigator.navigateToHome();
        });
      },
      error: () => {}
    });
  }

  switchToLogin(): void {
    this.navigator.openModal('login');
  }

  closeModal(): void {
    this.navigator.closeModal()
  }

  isFieldInvalid(filedName: string): boolean{
    const field = this.registerForm.get(filedName);
    return !!(field && field.invalid && field.touched)
  }

  private markAllFiledAsTouched(): void {
    Object.keys(this.registerForm.controls).forEach(key => {
      this.registerForm.get(key)?.markAllAsTouched();
    })
  }

  get getStatusMessage() {
    return {
      message: this.userState.error() || '',
      type: this.userState.error() ? 'error' : ''
    };
  }
  
}
