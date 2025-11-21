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
import {
  RobotControlService,
  RobotEvent
} from '../services/robot-control.service';
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
  public logs: RobotEvent[] = [];
  private eventsSub: Subscription | null = null;
  public showConsole = true;

  constructor(private el: ElementRef, private robotSvc: RobotControlService) {}

  ngOnInit() {
    this.enterFullscreen();
    this.startMeeting();
    // Suscribirse a eventos de comandos para mostrar en la consola
    this.eventsSub = this.robotSvc.events$.subscribe((event: RobotEvent) => {
      // Mantener sólo los últimos 200 eventos para no crecer indefinidamente
      this.logs.push(event);
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

    this.api.addEventListener('readyToClose', () => {
      console.log('Meeting ended');
    });
  }

  private enterFullscreen(): void {
    if (typeof document === 'undefined') return;

    const doc = this.el.nativeElement?.ownerDocument ?? document;
    const target: FullscreenCapableElement =
      doc.documentElement || this.el.nativeElement;

    if (doc.fullscreenElement) return;

    const requestFullscreen =
      target.requestFullscreen ||
      target.webkitRequestFullscreen ||
      target.mozRequestFullScreen ||
      target.msRequestFullscreen;

    if (!requestFullscreen) {
      console.warn('Fullscreen API no disponible en este navegador');
      return;
    }

    try {
      const maybePromise = requestFullscreen.call(target);
      if (maybePromise && typeof (maybePromise as Promise<void>).catch === 'function') {
        (maybePromise as Promise<void>).catch((err) =>
          console.warn('No fue posible activar fullscreen', err)
        );
      }
    } catch (err) {
      console.warn('No fue posible activar fullscreen', err);
    }
  }

  ngOnDestroy() {
    if (this.api) {
      this.api.dispose();
    }
    if (this.eventsSub) this.eventsSub.unsubscribe();
  }
}

type FullscreenCapableElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
  mozRequestFullScreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
};
