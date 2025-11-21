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
    this.enterFullscreen();
    this.startMeeting();
  }

  private enterFullscreen() {
    // Intentar entrar en modo pantalla completa del navegador
    const element = this.el.nativeElement;
    
    if (element.requestFullscreen) {
      element.requestFullscreen().catch((err: any) => {
        console.log('No se pudo entrar en pantalla completa:', err);
      });
    } else if ((element as any).webkitRequestFullscreen) {
      (element as any).webkitRequestFullscreen();
    } else if ((element as any).mozRequestFullScreen) {
      (element as any).mozRequestFullScreen();
    } else if ((element as any).msRequestFullscreen) {
      (element as any).msRequestFullscreen();
    }

    // Ocultar la barra de direcciones en móviles
    if (window.innerHeight < window.innerWidth) {
      window.scrollTo(0, 1);
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
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        disableDeepLinking: true,
        disableModeratorIndicator: true, // 🚀 evita el mensaje de "waiting for moderator"
        enableLobby: false,               // 🚀 desactiva la sala de espera
        requireDisplayName: false,
        prejoinPageEnabled: false,        // 🚀 desactiva la página de pre-ingreso
        enableWelcomePage: false,         // 🚀 desactiva la página de bienvenida
        startScreenSharing: false,        // 🚀 desactiva compartir pantalla por defecto
        enableLayerSuspension: true,      // 🚀 optimiza rendimiento en móviles
        disableResponsiveTiles: false,    // 🚀 permite tiles responsive
        channelLastN: 4,                  // 🚀 limita cantidad de videos simultáneos para mejor rendimiento
        constraints: {
          video: {
            height: { ideal: 720, max: 1080, min: 360 }
          }
        },
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
        MOBILE_APP_PROMO: false,
        FILM_STRIP_MAX_HEIGHT: 90,        // 🚀 ajusta la altura del film strip para mejor visibilidad
        VERTICAL_FILMSTRIP: false,        // 🚀 usa filmstrip horizontal en móviles
        TILE_VIEW_MAX_COLUMNS: 2,         // 🚀 máximo 2 columnas en vista de cuadrícula
        DISABLE_FOCUS_INDICATOR: false,   // 🚀 mantiene indicador de enfoque
        DISABLE_DOMINANT_SPEAKER_INDICATOR: false, // 🚀 mantiene indicador de hablante principal
        DEFAULT_BACKGROUND: '#000000'     // 🚀 fondo negro
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
    
    // Salir de pantalla completa al destruir el componente
    if (document.fullscreenElement) {
      document.exitFullscreen().catch((err: any) => {
        console.log('Error al salir de pantalla completa:', err);
      });
    } else if ((document as any).webkitExitFullscreen) {
      (document as any).webkitExitFullscreen();
    } else if ((document as any).mozCancelFullScreen) {
      (document as any).mozCancelFullScreen();
    } else if ((document as any).msExitFullscreen) {
      (document as any).msExitFullscreen();
    }
  }
}
