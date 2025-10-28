import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { RouterTestingModule } from '@angular/router/testing';
import { ChatPage } from './chat.page';
import { ChatService } from '../services/chat.service';
import { BehaviorSubject } from 'rxjs';

describe('ChatPage', () => {
  let component: ChatPage;
  let fixture: ComponentFixture<ChatPage>;
  let chatServiceSpy: jasmine.SpyObj<ChatService>;

  beforeEach(waitForAsync(() => {
    const spy = jasmine.createSpyObj('ChatService', ['sendMessage', 'simulateOperatorResponse']);
    spy.messages$ = new BehaviorSubject([]).asObservable();

    TestBed.configureTestingModule({
      declarations: [ ChatPage ],
      imports: [IonicModule.forRoot(), RouterTestingModule],
      providers: [
        { provide: ChatService, useValue: spy }
      ]
    }).compileComponents();

    chatServiceSpy = TestBed.inject(ChatService) as jasmine.SpyObj<ChatService>;
    fixture = TestBed.createComponent(ChatPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});