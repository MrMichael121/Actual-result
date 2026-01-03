import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HasAccessDirective } from './has-access.directive';

@NgModule({
  declarations: [HasAccessDirective],
  imports: [CommonModule],
  exports: [HasAccessDirective]
})
export class DirectivesModule { }