import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { RobotControlService } from '../../services/robot-control.service';
import { RobotControlsComponent } from '../robot-controls/robot-controls.component';
import { BluetoothSerialService } from '../../services/bluetooth-serial.service';
import { Capacitor } from '@capacitor/core';
import { BluetoothControlService, BluetoothGattConfig } from '../../services/bluetooth-control.service';

@Component({
  selector: 'app-jitsi-call',
  standalone: true,
  imports: [CommonModule, IonicModule, RobotControlsComponent],
  templateUrl: './jitsi-call.component.html',
  styleUrls: ['./jitsi-call.component.scss']
})
export class JitsiCallComponent implements OnInit, OnDestroy {
  @Input() roomName!: string;
  @Input() displayName!: string;
  @Input() showControls: boolean = true;
  @Input() robotId: number = 1;
  @Input() isOperator: boolean = false;

  @Output() callEnded = new EventEmitter<void>();

  private api: any;
  public logs: Array<any> = [];
  public showConsole = true;
  public showRobotControls = false;
  private eventsSub?: Subscription;
  isConnectingBt = false;
  private readonly isNativePlatform = Capacitor.isNativePlatform();
  private readonly webGattConfig: BluetoothGattConfig = {
    serviceUuid: '0000ffe0-0000-1000-8000-00805f9b34fb',
    characteristicUuid: '0000ffe1-0000-1000-8000-00805f9b34fb'
  };

  constructor(
    private el: ElementRef,
    private robotSvc: RobotControlService,
    private btSvc: BluetoothSerialService,
    private webBluetooth: BluetoothControlService,
    private toast: ToastController
  ) {}

  ngOnInit() {
    this.robotSvc.setRobotId(this.robotId);
    this.startMeeting();
    if (this.isOperator) {
      this.eventsSub = this.robotSvc.events$.subscribe((e) => {
        this.logs.push(e);
        if (this.logs.length > 200) this.logs.shift();
      });
    }
  }

  startMeeting() {
    const domain = '8x8.vc';
    const appID = 'vpaas-magic-cookie-a6104b026e124ba5a58440c74ad2c21b';
    const parentNode = this.el.nativeElement.querySelector('#jaas-container');

    const options = {
      roomName: `${appID}/${this.roomName}`,
      width: '100%',
      height: '100%',
      parentNode,
      configOverwrite: {
        defaultLanguage: 'es',
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        disableDeepLinking: true,
        disableModeratorIndicator: true,
        enableLobby: false,
        requireDisplayName: false,
        toolbarButtons: this.showControls
          ? ['microphone', 'camera', 'hangup', 'tileview', 'chat', 'desktop']
          : ['microphone', 'camera', 'hangup']
      },
      interfaceConfigOverwrite: {
        DEFAULT_LANGUAGE: 'es',
        TOOLBAR_BUTTONS: this.showControls
          ? ['microphone', 'camera', 'hangup', 'tileview', 'chat', 'desktop']
          : ['microphone', 'camera', 'hangup'],
        SHOW_JITSI_WATERMARK: false,
        SHOW_BRAND_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        SHOW_CHROME_EXTENSION_BANNER: false,
        MOBILE_APP_PROMO: false
      },
      userInfo: {
        displayName: this.displayName || 'Guest'
      }
    };

    this.api = new (window as any).JitsiMeetExternalAPI(domain, options);

    this.api.addEventListener('readyToClose', () => {
      this.callEnded.emit();
    });
  }

  async connectBluetooth() {
    this.isConnectingBt = true;
    try {
      if (!this.isNativePlatform) {
        if (!this.webBluetooth.isSupported) {
          await this.presentToast('Este navegador no soporta Web Bluetooth. Usa Chrome/Edge en HTTPS o un dispositivo Android.', 'danger');
          return;
        }

        await this.webBluetooth.connect(this.webGattConfig);
        await this.presentToast('Conexión Bluetooth del navegador lista', 'success');
        return;
      }

      const devices = await this.btSvc.listDevices();
      const selected = devices?.[0];
      let address = selected?.address || selected?.id;

      if (!address) {
        const manual = prompt('Ingresa la direcci\u00f3n MAC del Arduino (ej: 00:11:22:33:44:55)');
        if (!manual) {
          return;
        }
        address = manual;
      }

      await this.btSvc.connect(address);
      await this.presentToast('Bluetooth (Android) conectado con el Arduino', 'success');
    } catch (err: any) {
      await this.presentToast(`No se pudo conectar: ${err?.message || err}`, 'danger');
      console.error('Bluetooth connect error', err);
    } finally {
      this.isConnectingBt = false;
    }
  }

  private async presentToast(message: string, color: 'success' | 'danger' | 'medium' = 'medium') {
    const t = await this.toast.create({
      message,
      duration: 2500,
      color,
      position: 'top'
    });
    await t.present();
  }

  ngOnDestroy() {
    if (this.api) {
      this.api.dispose();
      this.api = null;
    }
    this.eventsSub?.unsubscribe();
  }
}
