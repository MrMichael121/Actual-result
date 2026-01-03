import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface ConfirmDialogData {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

@Component({
     selector: 'app-confirm-dialog',
     template: `
     <h2 mat-dialog-title>{{data.title || 'Confirm'}}</h2>
     <mat-dialog-content>
          <p>{{data.message}}</p>
     </mat-dialog-content>
     <mat-dialog-actions align="end">
          <button mat-button mat-dialog-close>{{data.cancelText || 'Cancel'}}</button>
          <button mat-flat-button [mat-dialog-close]="true" class="confirm-btn">{{data.confirmText || 'Confirm'}}</button>
     </mat-dialog-actions>
     `,
     styles: [`
          .confirm-btn {
               background-color: var(--button-1);
               color: white;
          }
     `]
})
export class ConfirmDialogComponent {
     constructor(public dialogRef: MatDialogRef<ConfirmDialogComponent>, @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData) {}
}
