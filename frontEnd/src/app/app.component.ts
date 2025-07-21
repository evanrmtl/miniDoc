import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RichTextEditorComponent } from './services/rich-text-editor/rich-text-editor.component';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RichTextEditorComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'front';
}