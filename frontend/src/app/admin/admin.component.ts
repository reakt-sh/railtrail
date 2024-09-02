import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MyMaterialModule } from '../shared/my-material.module';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [RouterLink, MyMaterialModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent {

}
