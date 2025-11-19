import {
  Component,
  Input,
  OnInit,
  ElementRef,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';

// 👇 IMPORTA el componente de controles
import { RobotControlsComponent } from '../robot-controls/robot-controls.component';
import { RobotControlService } from '../services/robot-control.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-jitsi-call',
  standalone: true,
  // 👇 agrega RobotControlsComponent a imports
  imports: [CommonModule, RobotControlsComponent],
  templateUrl: './jitsi-call.component.html',
  styleUrls: ['./jitsi-call.component.scss']
})
export class JitsiCallComponent implements OnInit, OnDestroy {
  @Input() roomName!: string;
  @Input() displayName!: string;
  @Input() showControls: boolean = true;

  // 👇 id del robot (puedes hacerlo @Input si quieres cambiarlo desde afuera)
  @Input() robotId: number = 1;

  private api: any;
  public logs: Array<any> = [];
  private eventsSub: Subscription | null = null;
  public showConsole = true;

  constructor(private el: ElementRef, private robotSvc: RobotControlService) {}

  ngOnInit() {
    this.startMeeting();
    // Suscribirse a eventos de comandos para mostrar en la consola
    this.eventsSub = this.robotSvc.events$.subscribe((e) => {
      // Mantener sólo los últimos 200 eventos para no crecer indefinidamente
      this.logs.push(e);
      if (this.logs.length > 200) this.logs.shift();
    });
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
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        disableDeepLinking: true,
        disableModeratorIndicator: true,
        enableLobby: false,
        requireDisplayName: false,
        toolbarButtons: this.showControls
          ? ['microphone', 'camera', 'hangup', 'tileview', 'chat']
          : ['microphone', 'camera', 'hangup']
      },
      interfaceConfigOverwrite: {
        TOOLBAR_BUTTONS: this.showControls
          ? ['microphone', 'camera', 'hangup', 'tileview', 'chat']
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
      console.log('Meeting ended');
    });
  }

  ngOnDestroy() {
    if (this.api) {
      this.api.dispose();
    }
    if (this.eventsSub) this.eventsSub.unsubscribe();
  }
}
