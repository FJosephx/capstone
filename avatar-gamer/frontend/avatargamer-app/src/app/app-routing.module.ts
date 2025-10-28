import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth-guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadChildren: () => import('./login/login.module').then(m => m.LoginPageModule)
  },
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.module').then(m => m.AdminPageModule),
    canActivate: [AuthGuard],
    data: { requiredRole: 'admin' }
  },
  {
    path: 'operator',
    loadComponent: () => import('./operator/operator.page').then(m => m.OperatorPage),
    canActivate: [AuthGuard],
    data: { requiredRole: 'operator' }
  },
  {
    path: 'user',
    loadComponent: () => import('./user/user.page').then(m => m.UserPage),
    canActivate: [AuthGuard],
    data: { requiredRole: 'user' }
  },
  {
    path: 'chat',
    loadChildren: () => import('./chat/chat.module').then(m => m.ChatModule)
  },
  {
    path: 'ai-chat',
    loadComponent: () => import('./ai-chat-page/ai-chat-page.page').then(m => m.AIChatPagePage)
  },
];
@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
