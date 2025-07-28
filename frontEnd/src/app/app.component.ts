import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RichTextEditorComponent } from './components/rich-text-editor/rich-text-editor.component';
import { LoginComponent } from './components/auth/login/login.component';
import { RegisterComponent } from './components/auth/register/register.component';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RichTextEditorComponent, LoginComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'miniDoc';
}