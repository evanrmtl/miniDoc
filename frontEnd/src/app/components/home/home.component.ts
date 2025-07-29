import { ChangeDetectorRef, Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth/authService.service';
import { UiService } from '../../services/UI/UiService.service';

@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {


  constructor(private uiService : UiService ,private router: Router, private auth: AuthService) {}

  ngOnInit(){
    if(!this.auth.isLoggedIn()){
      this.uiService.openLoginModal();
    }  
  }

}