import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type BluetoothConnectionStatus = 'unsupported' | 'disconnected' | 'connecting' | 'connected';

export interface BluetoothGattConfig {
  serviceUuid: BluetoothServiceUUID;
  characteristicUuid: BluetoothCharacteristicUUID;
}

@Injectable({
  providedIn: 'root'
})
export class BluetoothControlService {
  private device?: BluetoothDevice;
  private characteristic?: BluetoothRemoteGATTCharacteristic;
  private config?: BluetoothGattConfig;

  private statusSubject = new BehaviorSubject<BluetoothConnectionStatus>(this.detectSupport());
  readonly status$: Observable<BluetoothConnectionStatus> = this.statusSubject.asObservable();

  private errorSubject = new BehaviorSubject<string | null>(null);
  readonly errors$: Observable<string | null> = this.errorSubject.asObservable();

  constructor(private zone: NgZone) {}

  private detectSupport(): BluetoothConnectionStatus {
    return typeof navigator !== 'undefined' && navigator.bluetooth ? 'disconnected' : 'unsupported';
  }

  get isSupported(): boolean {
    return this.statusSubject.value !== 'unsupported';
  }

  get isConnected(): boolean {
    return this.statusSubject.value === 'connected';
  }

  async connect(config: BluetoothGattConfig): Promise<void> {
    if (!this.isSupported || !navigator.bluetooth) {
      throw new Error('El navegador no soporta Web Bluetooth');
    }

    this.config = config;
    this.zone.run(() => {
      this.statusSubject.next('connecting');
      this.errorSubject.next(null);
    });

    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [config.serviceUuid] }]
      });

      const server = await device.gatt?.connect();
      if (!server) {
        throw new Error('No fue posible inicializar la sesión GATT');
      }

      const service = await server.getPrimaryService(config.serviceUuid);
      const characteristic = await service.getCharacteristic(config.characteristicUuid);

      device.addEventListener('gattserverdisconnected', () => {
        this.zone.run(() => {
          this.handleDisconnect();
        });
      });

      this.device = device;
      this.characteristic = characteristic;

      this.zone.run(() => {
        this.statusSubject.next('connected');
      });
    } catch (error) {
      this.zone.run(() => {
        this.statusSubject.next('disconnected');
        this.errorSubject.next((error as Error)?.message ?? 'Error al conectar por Bluetooth');
      });
      throw error;
    }
  }

  async sendCommand(command: number): Promise<void> {
    if (!this.characteristic || !this.isConnected) {
      throw new Error('El dispositivo Bluetooth no está conectado');
    }

    const payload = new Uint8Array([command]);
    await this.characteristic.writeValue(payload);
  }

  disconnect(): void {
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.handleDisconnect();
  }

  private handleDisconnect(): void {
    this.characteristic = undefined;
    this.device = undefined;
    this.zone.run(() => {
      if (this.statusSubject.value !== 'unsupported') {
        this.statusSubject.next('disconnected');
      }
    });
  }
}
