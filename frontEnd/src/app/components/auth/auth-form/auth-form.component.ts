import { Component, EventEmitter, Input, Output, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-auth-form',
  imports: [FormsModule],
  templateUrl: './auth-form.component.html',
  styleUrl: './auth-form.component.scss'
})
export class AuthFormComponent {
  @Input() buttonName!: string;

  @Output() formData = new EventEmitter<{username : string, password : string}>();

  username!: string;
  password!: string;
  
  onSubmit() {
    this.formData.emit({username : this.username, password : this.password});
  }  
}
