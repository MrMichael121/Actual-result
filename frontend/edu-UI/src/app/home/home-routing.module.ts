import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LandingComponent } from './pages/landing/landing.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
// userrole pages (foldered by role)
import { InstituteRegisterComponent } from '../userrole/super-admin/institute/institute-register/institute-register.component';
import { SuperDashboardComponent } from '../userrole/super-admin/dashboard/dashboard.component';
import { ViewInstitutesComponent } from '../userrole/super-admin/institute/view-institutes/view-institutes.component';
import { AdminUserRegisterComponent } from '../userrole/admin/user/user-register/user-register.component';
import { AdminQuestionsComponent } from '../userrole/admin/questions/questions.component';
import { AdminScheduleTestComponent } from '../userrole/admin/schedule-test/schedule-test.component';
import { ViewScheduleExamComponent } from '../userrole/admin/schedule-test/view-schedule-exam.component';
import { CreateExamComponent } from '../userrole/admin/exams/create-exam.component';
import { AdminExamsComponent } from '../userrole/admin/exams/exams.component';
import { AdminResultsComponent } from '../userrole/admin/results/results.component';
import { ViewUsersComponent } from '../userrole/admin/user/view-users/view-users.component';
import { ViewQuestionsComponent } from '../userrole/admin/questions/view-questions/view-questions.component';
import { CategoryComponent } from '../userrole/admin/category/category.component';
import { CategoryCreateComponent } from '../userrole/admin/category/create/category-create.component';
import { UserExamComponent } from '../userrole/user/exam/exam.component';
import { UserTestResultComponent } from '../userrole/user/test-result/test-result.component';
import { UserExamRunnerComponent } from '../userrole/user/user-exam/user-exam.component';
import { UnauthorizedComponent } from '../shared/components/unauthorized/unauthorized.component';
import { PermissionGuard } from '../shared/guards/permission.guard';
import { UserDashboardComponent } from '../userrole/user/dashboard/user-dashboard.component';

const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent }
  , { path: 'institute-register', component: InstituteRegisterComponent, canActivate: [PermissionGuard], data: { requiredRole: ['super_admin','superadmin','super-admin'] } }
  , { path: 'view-institutes', component: ViewInstitutesComponent, canActivate: [PermissionGuard], data: { requiredRole: ['super_admin','superadmin','super-admin'] } }
  , { path: 'super-admin-dashboard', component: SuperDashboardComponent, canActivate: [PermissionGuard], data: { requiredRole: ['super_admin','superadmin','super-admin'] } }
  , { path: 'user-register', component: AdminUserRegisterComponent, canActivate: [PermissionGuard], data: { pageName: 'Users', action: 'add' } }
  , { path: 'questions', component: AdminQuestionsComponent, canActivate: [PermissionGuard], data: { pageName: 'Questions', action: 'add' } }
  , { path: 'schedule-exam', component: AdminScheduleTestComponent, canActivate: [PermissionGuard], data: { pageName: 'Schedule Exam', action: 'add' } }
  , { path: 'view-schedule-exam', component: ViewScheduleExamComponent, canActivate: [PermissionGuard], data: { pageName: 'Schedule Exam', action: 'view' } }
  , { path: 'exams', component: AdminExamsComponent, canActivate: [PermissionGuard], data: { pageName: 'Exams', action: 'view' } }
  , { path: 'create-exam', component: CreateExamComponent, canActivate: [PermissionGuard], data: { pageName: 'Exams', action: 'add' } }
  , { path: 'view-users', component: ViewUsersComponent, canActivate: [PermissionGuard], data: { pageName: 'Users', action: 'view' } }
  , { path: 'unauthorized', component: UnauthorizedComponent }
  , { path: 'view-questions', component: ViewQuestionsComponent, canActivate: [PermissionGuard], data: { pageName: 'Questions', action: 'view' } }
  , { path: 'category', component: CategoryComponent, canActivate: [PermissionGuard], data: { pageName: 'Categories', action: 'view' } }
  , { path: 'category/create', component: CategoryCreateComponent, canActivate: [PermissionGuard], data: { pageName: 'Categories', action: 'add' } }
  , { path: 'admin-dashboard', component: AdminResultsComponent, canActivate: [PermissionGuard], data: { requiredRole: ['admin','super_admin'] } }
  , { path: 'user/exam', component: UserExamComponent, canActivate: [PermissionGuard], data: { requiredRole: ['user','super_admin'] } }
  , { path: 'user-dashboard', component: UserDashboardComponent, canActivate: [PermissionGuard], data: { requiredRole: ['user','super_admin'] } }
  , { path: 'user/test-result', component: UserTestResultComponent, canActivate: [PermissionGuard], data: { requiredRole: ['user','super_admin'] } }
  , { path: 'user-exam', component: UserExamRunnerComponent, canActivate: [PermissionGuard], data: { requiredRole: ['user','super_admin'] } }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HomeRoutingModule { }
