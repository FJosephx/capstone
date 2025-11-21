import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RobotControlService } from '../../services/robot-control.service';
import { BluetoothControlService, BluetoothGattConfig, BluetoothConnectionStatus } from '../../services/bluetooth-control.service';

@Component({
  selector: 'app-robot-controls',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
  templateUrl: './robot-controls.component.html',
  styleUrls: ['./robot-controls.component.scss']
})
export class RobotControlsComponent {
  @Input() robotId = 1;

  controlMode: 'api' | 'bluetooth' = 'api';
  bluetoothStatus$ = this.bluetoothControl.status$;
  bluetoothErrors$ = this.bluetoothControl.errors$;
  bluetoothBusy = false;
  lastCommandError: string | null = null;
  statusLabels: Record<BluetoothConnectionStatus, string> = {
    unsupported: 'No soportado',
    disconnected: 'Desconectado',
    connecting: 'Conectando',
    connected: 'Conectado'
  };

  // UUIDs comunes de módulos HM-10; reemplazar si el Arduino expone otros servicios
  private readonly gattConfig: BluetoothGattConfig = {
    serviceUuid: '0000ffe0-0000-1000-8000-00805f9b34fb',
    characteristicUuid: '0000ffe1-0000-1000-8000-00805f9b34fb'
  };

  constructor(
    private robotControl: RobotControlService,
    private bluetoothControl: BluetoothControlService
  ) {}

  async startPress(cmd: number) {
    if (this.controlMode === 'bluetooth') {
      await this.sendBluetoothCmd(cmd);
      return;
    }

    this.sendApiCommand(cmd);
  }

  async endPress() {
    // Command 6 se usa como alto/parada en la app original
    if (this.controlMode === 'bluetooth') {
      await this.sendBluetoothCmd(6);
      return;
    }

    this.sendApiCommand(6);
  }

  async connectBluetooth() {
    if (this.bluetoothBusy || this.bluetoothControl.isConnected) {
      return;
    }

    this.bluetoothBusy = true;
    this.lastCommandError = null;

    try {
      await this.bluetoothControl.connect(this.gattConfig);
    } catch (error) {
      this.lastCommandError = (error as Error)?.message ?? 'No se pudo conectar por Bluetooth';
    } finally {
      this.bluetoothBusy = false;
    }
  }

  disconnectBluetooth() {
    this.bluetoothControl.disconnect();
  }

  private sendApiCommand(cmd: number) {
    this.robotControl.setRobotId(this.robotId);
    this.robotControl.sendCommand(cmd);
  }

  private async sendBluetoothCmd(cmd: number) {
    this.lastCommandError = null;

    try {
      await this.bluetoothControl.sendCommand(cmd);
    } catch (error) {
      this.lastCommandError = (error as Error)?.message ?? 'No se pudo enviar el comando';
    }
  }

  statusColor(status: BluetoothConnectionStatus | null): string {
    switch (status) {
      case 'connected':
        return 'success';
      case 'connecting':
        return 'warning';
      case 'unsupported':
        return 'medium';
      default:
        return 'danger';
    }
  }
}
