import { Component, Input, OnInit, ElementRef, OnDestroy, Output, EventEmitter} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-jitsi-call',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './jitsi-call.component.html',
  styleUrls: ['./jitsi-call.component.scss']
})
export class JitsiCallComponent implements OnInit, OnDestroy {
  @Input() roomName!: string;
  @Input() displayName!: string;
  @Input() showControls: boolean = true;

  @Output() callEnded = new EventEmitter<void>();

  private api: any;
  public logs: Array<any> = [];
  public showConsole = true;
  private windowListener = (e: any) => {
    // escuchar eventos personalizados "robot-command" si existen
    if (e && e.detail) {
      this.addLog({ type: 'external', payload: e.detail, timestamp: new Date().toISOString() });
    }
  };

  constructor(private el: ElementRef) {}

  ngOnInit() {
    this.startMeeting();
    // escuchar eventos personalizados desde la ventana (por ejemplo: comandos del robot)
    window.addEventListener('robot-command', this.windowListener as EventListener);
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
        disableModeratorIndicator: true, // 🚀 evita el mensaje de “waiting for moderator”
        enableLobby: false,               // 🚀 desactiva la sala de espera
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

    // 🔹 Maneja cierre de la llamada
    this.api.addEventListener('readyToClose', () => {
      console.log('Meeting ended');
      this.callEnded.emit(); // 🟢 Notifica al padre que la llamada terminó
      // No es necesario el dispose() aquí, lo hará el ngOnDestroy
    });
  }

  ngOnDestroy() {
    if (this.api) {
      this.api.dispose();
      this.api = null; // 🟢 Limpia la referencia
    }
    window.removeEventListener('robot-command', this.windowListener as EventListener);
  }

  private addLog(entry: any) {
    this.logs.push(entry);
    if (this.logs.length > 200) this.logs.shift();
  }
}
