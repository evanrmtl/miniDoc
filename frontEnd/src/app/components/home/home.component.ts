import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {

  constructor(private router: Router, private route: ActivatedRoute) {}

  openLoginModal() {
    this.router.navigate([{ outlets: { modal: ['popup'] } }], { relativeTo: this.route });
  }
  
  closeModal() {
    this.router.navigate([{ outlets: { modal: null } }], { relativeTo: this.route });
  }
}
