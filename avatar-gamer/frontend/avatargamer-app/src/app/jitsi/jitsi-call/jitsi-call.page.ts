import { Component, ElementRef, ViewChild, OnDestroy, AfterViewInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

declare global { interface Window { JitsiMeetExternalAPI?: any } }

@Component({
  selector: 'app-jitsi-call',
  templateUrl: './jitsi-call.page.html',
  styleUrls: ['./jitsi-call.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class JitsiCallPage implements AfterViewInit, OnDestroy {
  @ViewChild('jitsiContainer', { static: true }) container!: ElementRef<HTMLDivElement>;
  roomName: string = 'avatar-gamer-demo';
  displayName = 'Invitado';
  domain = 'meet.jit.si';

  private api?: any;

  constructor(private route: ActivatedRoute) {
    // Obtener el nombre de la sala de los parámetros de ruta
    this.route.paramMap.subscribe(params => {
      const roomParam = params.get('roomName');
      if (roomParam) {
        this.roomName = roomParam;
      }
    });
  }

  async ngAfterViewInit() {
    // 1) Cargar el script si hace falta
    if (!window.JitsiMeetExternalAPI) {
      await new Promise<void>((res, rej) => {
        const s = document.createElement('script');
        s.src = `https://${this.domain}/external_api.js`;
        s.async = true;
        s.onload = () => res();
        s.onerror = () => rej(new Error('No se pudo cargar external_api.js'));
        document.body.appendChild(s);
      });
    }

    // 2) Crear la sala
    this.api = new window.JitsiMeetExternalAPI(this.domain, {
      roomName: this.roomName,
      parentNode: this.container.nativeElement,
      userInfo: { displayName: this.displayName },
      configOverwrite: { prejoinPageEnabled: true },
      interfaceConfigOverwrite: {
        TOOLBAR_BUTTONS: ['microphone','camera','chat','hangup']
      }
    });

    // 3) (Opcional) eventos
    this.api.addEventListener('videoConferenceJoined', () => console.log('joined', this.roomName));
    this.api.addEventListener('readyToClose', () => console.log('call ended'));
  }

  ngOnDestroy() {
    if (this.api) { this.api.dispose(); this.api = undefined; }
  }
}