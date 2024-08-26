import { InjectionToken, FactoryProvider } from '@angular/core';

export const WINDOW = new InjectionToken<Window>('window');

export const WindowProvider: FactoryProvider = {
  provide: WINDOW,
  useFactory: () => window
};
