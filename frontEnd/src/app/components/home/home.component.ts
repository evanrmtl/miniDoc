import { Component, inject, OnInit } from '@angular/core';
import { UserState } from '../../state/userState.service';
import { NavigateService } from '../../navigation/navigation.service';

@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  readonly userState = inject(UserState);
  readonly navigator = inject(NavigateService)

  ngOnInit(): void {
    if (this.userState.isLoggedIn()) {
      this.loadUserData();
    } else {
      this.navigator.openModal('login');
    }
  }

  private loadUserData(): void {
    console.log('Chargement des données utilisateur...');
  }
}
