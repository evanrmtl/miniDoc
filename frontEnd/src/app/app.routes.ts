import { Routes } from '@angular/router';
import { AuthGuard } from './navigation/guards/authGuard.service';
import { GuestGuard } from './navigation/guards/guestGuard.service';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/auth/login/login.component';
import { RegisterComponent } from './components/auth/register/register.component';

export const routes: Routes = [
    { 
        path : '',
        redirectTo: '/home', 
        pathMatch : 'full'
    },
    { 
        path: 'home', 
        component: HomeComponent,
    },
    { 
        path: 'login', 
        component: LoginComponent, 
        outlet: 'modal',
        canActivate: [GuestGuard]
    },
    { 
        path: 'register', 
        component: RegisterComponent, 
        outlet: 'modal',
        canActivate: [GuestGuard] 
    },
];