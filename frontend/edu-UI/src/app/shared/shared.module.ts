import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeadingComponent } from './components/heading/heading.component';
import { UnauthorizedComponent } from './components/unauthorized/unauthorized.component';
import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';
import { LoaderComponent } from './components/loader/loader.component';
import { NavbarMainComponent } from './components/navbar-main/navbar-main.component';
import { SideNavComponent } from './components/side-nav/side-nav.component';
import { TopStickyComponent } from './components/top-sticky/top-sticky.component';
import { RouterModule } from '@angular/router';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { HttpClient, HttpClientModule, HttpParams } from '@angular/common/http';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { Router } from '@angular/router';
import { DirectivesModule } from './directives/directives.module';
import { PermissionGuard } from './guards/permission.guard';

@NgModule({
  imports: [
    CommonModule, HttpClientModule, RouterModule, MatChipsModule, MatIconModule, MatSnackBarModule, MatDialogModule, MatPaginatorModule, HeadingComponent, LoaderComponent, NavbarMainComponent, SideNavComponent, TopStickyComponent, MatFormFieldModule, MatInputModule, MatButtonModule, MatTableModule, MatSelectModule, MatSlideToggleModule, MatSortModule, HttpClientModule, FormsModule, DirectivesModule
  ],
  exports: [
    MatChipsModule, MatIconModule, MatSnackBarModule, MatDialogModule, HttpClientModule, MatPaginatorModule, HeadingComponent, LoaderComponent, NavbarMainComponent, SideNavComponent, TopStickyComponent, MatFormFieldModule, MatInputModule, MatButtonModule, MatTableModule, MatSelectModule, MatSlideToggleModule, MatSortModule, HttpClientModule, FormsModule, DirectivesModule, UnauthorizedComponent
  ],
  declarations: [UnauthorizedComponent, ConfirmDialogComponent],
  providers: [PermissionGuard]
})
export class SharedModule { }
