import { InjectionToken, ModuleWithProviders, NgModule } from '@angular/core'
import { createManagerForFeature, createManagerForRoot, Manager, ManagerOptions } from './vex'

export const INITIAL_STATE = new InjectionToken<any>('INITIAL_STATE')
export const OPTIONS = new InjectionToken<ManagerOptions>('OPTIONS')
export const FEATURE_KEY = new InjectionToken<string>('FEATURE_KEY')

@NgModule()
export class VexModule {
  public static forRoot<StateType = unknown>(
    initialState: StateType,
    options: ManagerOptions = {},
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
          provide: Manager,
          useFactory: createManagerForRoot,
          deps: [ INITIAL_STATE, OPTIONS ]
        }
      ]
    }
  }

  public static forFeature<StateType = unknown>(
    featureKey: string,
    initialState: StateType,
    options: ManagerOptions = {},
  ): ModuleWithProviders {
    return {
      ngModule: VexModule,
      providers: [
        {
          provide: INITIAL_STATE,
          useValue: initialState,
        },
        {
          provide: OPTIONS,
          useValue: options,
        },
        {
          provide: FEATURE_KEY,
          useValue: featureKey,
        },
        {
          provide: Manager,
          useFactory: createManagerForFeature,
          deps: [ FEATURE_KEY, INITIAL_STATE, OPTIONS ],
        },
      ],
    }
  }
}
