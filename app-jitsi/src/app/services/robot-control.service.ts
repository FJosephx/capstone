// src/app/services/robot-control.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RobotControlService {

  // Cambia esto si tu backend está en otra URL
  private baseUrl = 'https://www.triskeledu.cl/MisterRoboto/apirest';
  // private baseUrl = 'http://TU-IP:3000/apirest'; // ejemplo local

  private robotId = 1;

  // Subject público para que la UI pueda suscribirse y mostrar la "consola"
  private eventsSubject = new Subject<any>();
  public events$: Observable<any> = this.eventsSubject.asObservable();

  constructor(private http: HttpClient) {}

  setRobotId(id: number) {
    this.robotId = id;
  }

  /** Enviar comando al robot vía API */
  sendCommand(command: number) {
    const url = `${this.baseUrl}/send_command/${this.robotId}/${command}`;
    const timestamp = new Date().toISOString();
    // Emitir evento de comando enviado
    this.eventsSubject.next({ type: 'sent', command, url, timestamp });

    this.http.get(url).subscribe({
      next: (res) => {
        console.log('[RobotControl] OK', res);
        this.eventsSubject.next({ type: 'response', command, res, timestamp: new Date().toISOString() });
      },
      error: (err) => {
        console.error('[RobotControl] Error', err);
        this.eventsSubject.next({ type: 'error', command, err, timestamp: new Date().toISOString() });
      }
    });
  }
}
