import { Routes } from '@angular/router';
import { RegisterComponent } from './components/auth/register/register.component';
import { LoginComponent } from './components/auth/login/login.component';
import { HomeComponent } from './components/home/home.component';

export const routes: Routes = [
    { path : '', redirectTo: '/home', pathMatch : 'full'},
    { path: 'home', component: HomeComponent },
    { path: 'login', component: LoginComponent, outlet: 'modal' },
    { path: 'register', component: RegisterComponent, outlet: 'modal' },
];