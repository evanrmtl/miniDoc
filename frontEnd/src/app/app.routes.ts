import { Routes } from '@angular/router';
import { RegisterComponent } from './components/auth/register/register.component';
import { LoginComponent } from './components/auth/login/login.component';
import { Component } from '@angular/core';
import { HomeComponent } from './components/home/home.component';

export const routes: Routes = [
    { path : '', redirectTo: 'login', pathMatch : 'full'},
    { path: 'register', component: HomeComponent, children :[
        {path: 'popup', component : RegisterComponent, outlet: 'modal'}
    ]},
    { path: 'login', component: HomeComponent, children :[
        {path: 'popup', component : LoginComponent, outlet: 'modal'}
    ]}
];