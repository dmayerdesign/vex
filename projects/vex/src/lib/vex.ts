import { empty, from, merge, of, Observable, Subject } from 'rxjs'
import { catchError, concatMap, filter, first, map, mergeScan, scan, share, shareReplay, startWith, switchMap, tap, withLatestFrom } from 'rxjs/operators'

const DEFAULT_MAX_AGE = 25
const DEFAULT_DEVTOOLS_OPTIONS: Partial<DevtoolsOptions> = {
  name: 'Vex',
  maxAge: DEFAULT_MAX_AGE,
}
const APP_ROOT = 'APP_ROOT'

let globalVex: Vex<any>
const featureKeyVexMap = new Map<string, Vex<any>>()

export interface VexOptions {
  allowConcurrency?: boolean,
  devtoolsOptions?: DevtoolsOptions
}

export interface SyncAction<StateType> {
  type: string
  resolve: (state: StateType) => Partial<StateType>
}

export interface AsyncAction<StateType, ResultType> {
  type: string
  resolve: (state: StateType) => (
    Promise<ResultType> | Observable<ResultType>
  )
  mapToState: (state: StateType, result?: ResultType) => Partial<StateType>
}

export type Action<StateType, ResultType = never> = SyncAction<StateType> | AsyncAction<StateType, ResultType>

export type AuditableAction<StateType, ResultType = never> = Action<StateType, ResultType> & { featureKey: string }

export interface ActionResult<StateType> {
  state: StateType
  actionType: string
  error?: Error
  featureKey?: string
}

export interface UniqueAction<StateType, ResultType = any> extends AsyncAction<StateType, ResultType> {
  _id?: Symbol
}

export interface UniqueActionResult<StateType> extends ActionResult<StateType> {
  _actionId?: Symbol
}

export interface VexInterface<StateType> {
  history$: Observable<StateType[]>
  state$: Observable<StateType>

  dispatch<ActionType extends Action<StateType, any> = Action<StateType, any>>(
    action: ActionType
  ): void

  once<ActionType extends AsyncAction<StateType, any>>(
    action: ActionType
  ): Observable<ActionResult<StateType>>

  dispatches(actionType: string): Observable<ActionResult<StateType>>

  results(actionType: string): Observable<ActionResult<StateType>>
}

export class Vex<StateType> implements Vex<StateType> {
  private readonly _actionß = new Subject<Action<StateType, any>>()
  private readonly _actionAuditß = new Subject<AuditableAction<StateType, any>>()
  private readonly _resolution$: Observable<ActionResult<StateType>>
  private readonly _dispatchAudit$: Observable<Action<StateType, any>>
  private readonly _maxAge: number = DEFAULT_MAX_AGE
  public history$: Observable<StateType[]>
  public state$: Observable<StateType>

  constructor(
    private _initialState: StateType,
    { allowConcurrency, devtoolsOptions }: VexOptions = { allowConcurrency: true },
    featureKey?: string,
  ) {
    console.log('initializing Vex for', featureKey)
    const initialResult: ActionResult<StateType> = {
      state: this._initialState,
      actionType: 'INITIALIZE_STATE'
    }

    if (devtoolsOptions) {
      if (devtoolsOptions.maxAge) {
        this._maxAge = devtoolsOptions.maxAge
      }
    }
    if (!allowConcurrency) {
      this._resolution$ = this._actionß.pipe(
        tap((action) => this._actionAuditß.next(Object.assign({ ...action, featureKey }))),
        withLatestFrom(this.state$ || of(this._initialState)),
        concatMap(([action, state]) => this._resolve(state, action)),
        scan(
          (_ = initialResult, result) => result,
          initialResult,
        ),
        startWith(initialResult),
        shareReplay(1),
      )
    }
    else {
      this._resolution$ = this._actionß.pipe(
        tap((action) => this._actionAuditß.next(Object.assign({ ...action, featureKey }))),
        mergeScan<Action<StateType, any>, ActionResult<StateType>>(
          ({ state } = initialResult, action) => this._resolve(state, action),
          initialResult,
        ),
        startWith(initialResult),
        shareReplay(1),
      )
    }
    this.state$ = this._resolution$.pipe(
      map(({ state }) => state),
      shareReplay(1),
    )
    this.history$ = this.state$.pipe(
      scan((history: StateType[], state: StateType) => {
        if (history.length === this._maxAge) {
          history.shift()
        }
        history.push(state)
        return history
      }, [] as StateType[]),
      shareReplay(1),
    )
    this._dispatchAudit$ = this._actionAuditß.asObservable()
    this._dispatchAudit$.subscribe()
    this.state$.subscribe()

    configureDevtoolsForInstance(
      featureKey,
      this._dispatchAudit$,
      this._resolution$
    )
  }

  public dispatch<ActionType extends Action<StateType, any> = Action<StateType, any>>(
    action: ActionType
  ): void {
    return this._actionß.next(action)
  }

  public once<ActionType extends AsyncAction<StateType, any>>(
    action: ActionType
  ): Observable<ActionResult<StateType>> {
    const actionId = Symbol()
    const uniqueAction: UniqueAction<StateType, any> = {
      ...action,
      _id: actionId
    }
    this.dispatch(uniqueAction)
    return this.results(action.type).pipe(
      filter<UniqueActionResult<StateType>>(({ _actionId }) => _actionId === actionId),
      first(),
    )
  }

  public dispatches(actionType: string): Observable<ActionResult<StateType>> {
    return this._dispatchAudit$.pipe(
      filter((action) => action.type === actionType),
      withLatestFrom(this.state$),
      map(([ action, state ]) => ({ actionType: action.type, state })),
      share(),
    )
  }

  public results(actionType: string): Observable<ActionResult<StateType>> {
    return this._resolution$.pipe(
      filter((result) => result.actionType === actionType),
      share(),
    )
  }

  private _resolve<ResultType = any>(
    state: StateType,
    action: Action<StateType, ResultType>
  ): Observable<ActionResult<StateType>> {
    let unresolvedResult: Partial<StateType> | Promise<any> | Observable<any>

    // Handle synchronous error.
    try {
      unresolvedResult = action.resolve(state)
    } catch (error) {
      return of({
        actionType: action.type,
        state,
        error,
      })
    }

    // Handle asynchronous success or error.
    if (
      typeof (unresolvedResult as Promise<any>).then === 'function'
      || typeof (unresolvedResult as Observable<any>).subscribe === 'function'
    ) {
      return from(unresolvedResult as Promise<any> | Observable<any>).pipe(
        first(),
        withLatestFrom(this.state$),
        map<[any, StateType], UniqueActionResult<StateType>>(
          ([result, currentState = this._initialState]) => ({
            _actionId: (action as UniqueAction<StateType>)._id,
            actionType: action.type,
            state: Object.assign(
              currentState,
              (action as AsyncAction<StateType, any>).mapToState(
                currentState,
                result,
              ),
            ),
          })
        ),
        catchError((error) => this.state$.pipe(
          first(),
          map((_state) => ({
            _actionId: (action as UniqueAction<StateType>)._id,
            actionType: action.type,
            state: _state,
            error,
          })),
        )),
      )
    }

    // Handle synchronous success.
    return of({
      actionType: action.type,
      state: Object.assign(state, unresolvedResult)
    })
  }
}

class GlobalVex extends Vex<any> { }
globalVex = new GlobalVex({})

export function createVexForRoot(
  initialState: any,
  options: VexOptions,
): Vex<any> {
  setUpDevtools(options.devtoolsOptions)
  const vex = new Vex(initialState, options)
  featureKeyVexMap.set(APP_ROOT, vex)
  return vex
}

export function createVexForFeature(
  featureKey: string,
  initialState: any,
  options: VexOptions,
): Vex<any> {
  console.log('create vex for feature')
  const vex = new Vex(initialState, options, featureKey)
  featureKeyVexMap.set(featureKey, vex)
  return vex
}

/**
 * Adapted from https://github.com/datorama/akita/blob/master/akita/src/devtools.ts.
*/
export interface DevtoolsOptions {
  /** instance name visible in devtools */
  name: string
  /**  maximum allowed actions to be stored in the history tree */
  maxAge?: number
  // latency: number
  // actionsBlacklist: string[]
  // actionsWhitelist: string[]
  // shouldCatchErrors: boolean
  logTrace?: boolean
  // predicate: (state: any, action: any) => boolean
  // shallow: boolean
}

export interface NgZoneLike { run: any }

/** Singleton. */
let devTools: any
const $$dispatch$$ = new Subject<Observable<AuditableAction<any, any>>>()
const $$resolution$$ = new Subject<Observable<ActionResult<any>>>()
const $$dispatch$ = $$dispatch$$.pipe(
  mergeScan(
    (mergedDispatch$, dispatch$) => of([ ...mergedDispatch$, dispatch$ ]),
    [ empty() ] as Observable<AuditableAction<any, any>>[]
  ),
  switchMap((dispatch$List) => merge(...dispatch$List)),
)
const $$resolution$ = $$resolution$$.pipe(
  mergeScan(
    (mergedresolution$, resolution$) => of([ ...mergedresolution$, resolution$ ]),
    [ empty() ] as Observable<ActionResult<any>>[]
  ),
  switchMap((resolution$List) => merge(...resolution$List)),
)

export function setUpDevtools(
  devtoolsOptions?: DevtoolsOptions,
): void {
  if (!window) return
  if (!(window as any).__REDUX_DEVTOOLS_EXTENSION__) {
    return
  }
  if (devTools) {
    throw new Error('Attempted to call `setUpDevtools` more than once.')
  }

  const mergedOptions = Object.assign({}, DEFAULT_DEVTOOLS_OPTIONS, devtoolsOptions)
  devTools = (window as any).__REDUX_DEVTOOLS_EXTENSION__.connect(mergedOptions)

  const devtoolsDispatch$ = $$dispatch$.pipe(
    switchMap(({ type }) => {
      return globalVex.once({
        type: '[DISPATCHED] ' + type,
        resolve: (globalState) => of(globalState),
        mapToState: (globalState) => globalState
      })
    }),
    map(({ actionType, featureKey, state }) => [ actionType, featureKey, state ])
  )

  const devtoolsResolution$ = $$resolution$.pipe(
    switchMap(({ actionType, featureKey, state, error }) => {
      return globalVex.once({
        type: (error ? '[RESOLVED (with error)] ' : '[RESOLVED] ') + actionType,
        resolve: (globalState) => of(globalState),
        mapToState: (globalState) => mapFeatureStateToGlobal(featureKey, globalState, state),
      })
    }),
    map(({ actionType, featureKey, state }) => [ actionType, featureKey, state ])
  )

  merge(devtoolsDispatch$, devtoolsResolution$)
    .subscribe(([ type, featureKey, state ]) => {
      const message = { type: `[${featureKey || APP_ROOT}] ${type}` }
      devTools.send(message, state)
      if (devtoolsOptions && devtoolsOptions.logTrace) {
        console.group(JSON.stringify(message))
        // tslint:disable-next-line
        console.trace();
        console.groupEnd()
      }
    })

  devTools.subscribe((message) => {
    console.log(message)
  })
}

function mapFeatureStateToGlobal(_featureKey: string | undefined, globalState: any, featureState: any): any {
  const featureKey = _featureKey || ''
  const lookups = featureKey.split('.')

  if (lookups.length === 1 && lookups[0] === '') {
    // Is root.
    return featureState
  }

  const newGlobalState = { ...globalState }
  let parentObject = newGlobalState
  const allButLastLookup = lookups.slice(0, lookups.length - 1)
  const lastLookup = lookups[lookups.length - 1]
  allButLastLookup.forEach((lookup) => {
    if (!parentObject[lookup]) {
      parentObject[lookup] = {}
    }
    parentObject = parentObject[lookup]
  })
  parentObject[lastLookup] = featureState

  return newGlobalState
}

/** @internal */
export function configureDevtoolsForInstance<StateType, ResultType>(
  featureKey: string | undefined,
  dispatch$: Observable<Action<StateType, ResultType>>,
  resolution$: Observable<ActionResult<StateType>>,
): void {
  if (globalVex) {
    globalVex.state$.pipe(first()).subscribe((appState) => {
      devTools.send({ type: `[${featureKey || 'APP_ROOT'}] @@INIT` }, appState)
      $$dispatch$$.next(dispatch$ as Observable<AuditableAction<StateType, ResultType>>)
      $$resolution$$.next(resolution$ as Observable<ActionResult<StateType>>)
    })
  }
}
