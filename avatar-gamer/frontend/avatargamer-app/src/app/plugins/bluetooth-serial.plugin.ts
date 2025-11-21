import { WebPlugin, registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';

export interface BluetoothDeviceInfo {
  address?: string;
  id?: string;
  name?: string;
}

export interface BluetoothSerialPlugin {
  enable(): Promise<{ enabled: boolean }>;
  scan(): Promise<{ devices: BluetoothDeviceInfo[] }>;
  connect(options: { address: string }): Promise<void>;
  disconnect(options: { address: string }): Promise<void>;
  addListener(eventName: string, listenerFunc: (event: any) => void): Promise<PluginListenerHandle>;
}

class BluetoothSerialWeb extends WebPlugin implements BluetoothSerialPlugin {
  async enable(): Promise<{ enabled: boolean }> {
    // En navegadores devolvemos disabled para evitar romper la app
    return { enabled: false };
  }
  async scan(): Promise<{ devices: BluetoothDeviceInfo[] }> {
    return { devices: [] };
  }
  async connect(): Promise<void> {
    throw this.unavailable('Bluetooth Serial solo está disponible en Android');
  }
  async disconnect(): Promise<void> {
    return;
  }
  override addListener(eventName: string, listenerFunc: (event: any) => void): Promise<PluginListenerHandle> {
    void eventName;
    void listenerFunc;
    return Promise.resolve({
      remove: async () => {}
    });
  }
}

export const BluetoothSerial = registerPlugin<BluetoothSerialPlugin>('BluetoothSerial', {
  web: () => new BluetoothSerialWeb(),
});
