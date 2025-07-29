import { ChangeDetectorRef, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UiService } from './services/UI/UiService.service';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'miniDoc';

  constructor(private cdRef: ChangeDetectorRef, private uiService: UiService){}

  ngAfterViewInit() {
    this.cdRef.detectChanges();
  }

  get isModalOpen(): boolean {
    return this.uiService.isModalOpen;
  }
}