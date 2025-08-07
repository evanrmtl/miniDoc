import { Component, inject, OnInit } from '@angular/core';
import { UserState } from '../../../core/state/userState.service';
import { NavigateService } from '../../../core/navigation/navigation.service';

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
    this.userState.isLoggedIn().subscribe((isLoggedIn) => {
      if (isLoggedIn){
        this.loadUserData;
      } else {
        this.navigator.openModal('login')
      }
    })
  }

  private loadUserData(): void {
    console.log('Chargement des données utilisateur...');
  }
}
