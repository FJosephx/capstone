import { Injectable } from '@angular/core';
import type { PluginListenerHandle } from '@capacitor/core';
import { BluetoothSerial, BluetoothDeviceInfo } from '../plugins/bluetooth-serial.plugin';

@Injectable({
  providedIn: 'root'
})
export class BluetoothSerialService {
  private lastAddress: string | null = null;
  private ensureAvailable() {
    const hasScan = typeof (BluetoothSerial as any).scan === 'function';
    if (!hasScan) {
      throw new Error('Bluetooth Serial no está disponible en esta plataforma');
    }
  }

  async enable(): Promise<void> {
    this.ensureAvailable();
    await BluetoothSerial.enable();
  }

  async listDevices(): Promise<BluetoothDeviceInfo[]> {
    this.ensureAvailable();
    const result = await BluetoothSerial.scan();
    if (result?.devices && Array.isArray(result.devices)) return result.devices;
    return result?.devices || [];
  }

  async connect(address: string) {
    this.ensureAvailable();
    await this.enable();
    this.lastAddress = address;
    return BluetoothSerial.connect({ address });
  }

  async disconnect() {
    this.ensureAvailable();
    if (!this.lastAddress) {
      throw new Error('No hay un dispositivo seleccionado para desconectar');
    }
    return BluetoothSerial.disconnect({ address: this.lastAddress });
  }

  addListener(eventName: string, listenerFunc: (event: any) => void): Promise<PluginListenerHandle> {
    return BluetoothSerial.addListener(eventName, listenerFunc);
  }
}
