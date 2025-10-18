import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { JitsiCallComponent } from '../jitsi/jitsi-call.component';

@Component({
  selector: 'app-robot-controls',
  standalone: true,
  imports: [IonicModule, CommonModule, JitsiCallComponent],
  templateUrl: './robot-controls.component.html',
  styleUrls: ['./robot-controls.component.scss'],
})
export class RobotControlsComponent {
  roomName = 'avatar-gamer-demo';
}
