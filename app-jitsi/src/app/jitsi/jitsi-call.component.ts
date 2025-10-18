import { Component, Input, OnInit, ElementRef, OnDestroy } from '@angular/core';
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

  private api: any;

  constructor(private el: ElementRef) {}

  ngOnInit() {
    this.startMeeting();
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
        disableModeratorIndicator: true, // 🚀 evita el mensaje de “waiting for moderator”
        enableLobby: false,               // 🚀 desactiva la sala de espera
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

    // 🔹 Maneja cierre de la llamada
    this.api.addEventListener('readyToClose', () => {
      console.log('Meeting ended');
    });
  }

  ngOnDestroy() {
    if (this.api) {
      this.api.dispose();
    }
  }
}
