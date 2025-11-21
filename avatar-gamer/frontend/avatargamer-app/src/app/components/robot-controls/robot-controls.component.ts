import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RobotControlService } from '../../services/robot-control.service';

@Component({
  selector: 'app-robot-controls',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './robot-controls.component.html',
  styleUrls: ['./robot-controls.component.scss']
})
export class RobotControlsComponent {
  @Input() robotId = 1;

  constructor(private robotControl: RobotControlService) {}

  startPress(cmd: number) {
    this.robotControl.setRobotId(this.robotId);
    this.robotControl.sendCommand(cmd);
  }

  endPress() {
    // Command 6 se usa como alto/parada en la app original
    this.robotControl.sendCommand(6);
  }
}
