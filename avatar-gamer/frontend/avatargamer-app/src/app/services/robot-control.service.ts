import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RobotControlService {
  // Base del backend de comandos (ajusta si se despliega en otra URL)
  private baseUrl = 'https://www.triskeledu.cl/MisterRoboto/apirest';
  private robotId = 1;

  private eventsSubject = new Subject<any>();
  public events$: Observable<any> = this.eventsSubject.asObservable();

  constructor(private http: HttpClient) {}

  setRobotId(id: number) {
    this.robotId = id;
  }

  sendCommand(command: number) {
    const url = `${this.baseUrl}/send_command/${this.robotId}/${command}`;
    const timestamp = new Date().toISOString();

    this.eventsSubject.next({ type: 'sent', command, url, timestamp });

    this.http.get(url).subscribe({
      next: (res) => {
        this.eventsSubject.next({ type: 'response', command, res, timestamp: new Date().toISOString() });
      },
      error: (err) => {
        this.eventsSubject.next({ type: 'error', command, err, timestamp: new Date().toISOString() });
      }
    });
  }
}
