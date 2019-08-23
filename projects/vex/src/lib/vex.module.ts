import { InjectionToken, ModuleWithProviders, NgModule } from '@angular/core'
import { createVexForFeature, createVexForRoot, Vex, VexOptions } from './vex'

export const INITIAL_STATE = new InjectionToken<any>('INITIAL_STATE')
export const OPTIONS = new InjectionToken<VexOptions>('OPTIONS')
export const FEATURE_KEY = new InjectionToken<string>('FEATURE_KEY')

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
          useFactory: createVexForRoot,
          deps: [ INITIAL_STATE, OPTIONS ]
        }
      ]
    }
  }

  public static forFeature<StateType = unknown>(
    featureKey: string,
    initialState: StateType,
    options: VexOptions = {},
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
          provide: Vex,
          useFactory: createVexForFeature,
          deps: [ INITIAL_STATE, OPTIONS, featureKey ],
        },
      ],
    }
  }
}
