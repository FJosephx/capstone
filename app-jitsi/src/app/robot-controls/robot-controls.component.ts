import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';      // 👈 IMPORTANTE
import { RobotControlService } from '../services/robot-control.service';

@Component({
  selector: 'app-robot-controls',
  standalone: true,
  imports: [CommonModule, IonicModule],            // 👈 AQUÍ TAMBIÉN
  templateUrl: './robot-controls.component.html',
  styleUrls: ['./robot-controls.component.scss'],
})
export class RobotControlsComponent {
  @Input() robotId = 1;

  constructor(private robotControl: RobotControlService) {}

  startPress(cmd: number) {
    this.robotControl.sendCommand(cmd);
  }

  endPress() {
    this.robotControl.sendCommand(6);
  }
}
