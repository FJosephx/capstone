import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { JitsiCallComponent } from '../jitsi/jitsi-call.component';

@Component({
  selector: 'app-robot',
  standalone: true,
  imports: [IonicModule, CommonModule, JitsiCallComponent],
  templateUrl: './robot.page.html',
  styleUrls: ['./robot.page.scss'],
})
export class RobotPage {
  roomName = `avatar-gamer-${Date.now()}`;
}
