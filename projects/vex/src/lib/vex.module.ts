import { InjectionToken, ModuleWithProviders, NgModule } from '@angular/core'
import { createVex, Vex, VexOptions } from './vex'

export const INITIAL_STATE = new InjectionToken<any>('INITIAL_STATE')
export const OPTIONS = new InjectionToken<any>('OPTIONS')

@NgModule()
export class VexModule {
  public static forRoot<StateType = unknown>(
    initialState: StateType,
    options: VexOptions = {},
  ): ModuleWithProviders {
    return {
      ngModule: VexModule,
      providers: [
        {
          provide: INITIAL_STATE,
          useValue: initialState
        },
        {
          provide: OPTIONS,
          useValue: options
        },
        {
          provide: Vex,
          useFactory: createVex,
          deps: [ INITIAL_STATE, OPTIONS ]
        }
      ]
    }
  }
}
