import { Routes } from '@angular/router';
import { AuthGuard } from './core/navigation/guards/authGuard.service';
import { GuestGuard } from './core/navigation/guards/guestGuard.service';
import { HomeComponent } from './features/components/home/home.component';
import { LoginComponent } from './features/components/auth/login/login.component';
import { RegisterComponent } from './features/components/auth/register/register.component';
import { RichTextEditorComponent } from './features/components/rich-text-editor/rich-text-editor.component';

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
    { 
        path : 'file/:uuid',
        component: RichTextEditorComponent,
        canActivate: [AuthGuard]
    },
];