import { empty, from, merge, of, Observable, Subject } from 'rxjs'
import { catchError, concatMap, filter, first, map, mergeScan, scan, share, shareReplay, startWith, switchMap, tap, withLatestFrom } from 'rxjs/operators'
import { DevtoolsOptions } from './akita-devtools'

let globalSyncOnlyVex: Vex<any>

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

export class Vex<StateType> {
  private _actionß = new Subject<Action<StateType, any>>()
  private _actionAuditß = new Subject<AuditableAction<StateType, any>>()
  private _resolution$: Observable<ActionResult<StateType>>
  private _dispatchAudit$: Observable<Action<StateType, any>>
  public state$: Observable<StateType>

  constructor(
    private _initialState: StateType,
    { allowConcurrency }: VexOptions = { allowConcurrency: true },
    featureKey?: string,
  ) {
    const initialResult: ActionResult<StateType> = {
      state: this._initialState,
      actionType: 'INITIALIZE_STATE'
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
      first()
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

globalSyncOnlyVex = new Vex({}, { allowConcurrency: false })

export function createVex(
  initialState: any,
  options: VexOptions,
): Vex<any> {
  setUpDevtools(options.devtoolsOptions)
  const vex = new Vex(initialState, options)
  return vex
}

export function createVexForFeature(
  featureKey: string,
  initialState: any,
  options: VexOptions,
): Vex<any> {
  return new Vex(initialState, options, featureKey)
}







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

  const defaultOptions: Partial<DevtoolsOptions> & { name: string } = { name: 'Vex', shallow: true }
  const mergedOptions = Object.assign({}, defaultOptions, devtoolsOptions)
  devTools = (window as any).__REDUX_DEVTOOLS_EXTENSION__.connect(mergedOptions)

  const devtoolsDispatch$ = $$dispatch$.pipe(
    switchMap(({ type }) => {
      return globalSyncOnlyVex.once({
        type: '[DISPATCHED] ' + type,
        resolve: async () => undefined,
        mapToState: (globalState) => globalState
      })
    }),
    map(({ actionType, featureKey }) => [ actionType, featureKey ])
  )

  const devtoolsResult$ = $$resolution$.pipe(
    switchMap(({ actionType, featureKey, state, error }) => {
      return globalSyncOnlyVex.once({
        type: (error ? '[RESOLVED (with error)] ' : '[RESOLVED] ') + actionType,
        resolve: async () => undefined,
        mapToState: (globalState) => mapFeatureStateToGlobal(featureKey, globalState, state),
      })
    }),
    map(({ actionType, featureKey }) => [ actionType, featureKey ])
  )

  merge(devtoolsDispatch$, devtoolsResult$)
    .pipe(withLatestFrom(globalSyncOnlyVex.state$))
    .subscribe(([ [ type, featureKey ], state ]) => {
      const message = { type: `[${featureKey || 'APP_ROOT'}] ${type}` }
      devTools.send(message, state)
      if (devtoolsOptions && devtoolsOptions.logTrace) {
        console.group(JSON.stringify(message))
        // tslint:disable-next-line
        console.trace();
        console.groupEnd()
      }
    })

  // if (subs.length) {
  //   subs.forEach(s => {
  //     if (s.unsubscribe) {
  //       s.unsubscribe()
  //     } else if (typeof s === 'function') {
  //       s()
  //     }
  //   })
  // }

  // subs.push(
  //   $$deleteStore.subscribe(storeName => {
  //     delete appState[storeName];
  //     devTools.send({ type: `[${storeName}] - Delete Store` }, appState);
  //   })
  // );

  devTools.subscribe((message) => {
    // if (message.type === 'ACTION') {
    //   const [storeName] = message.payload.split('.')

    //   if(__stores__[storeName]) {
    //     (ngZoneOrOptions as NgZoneLike).run(() => {
    //       const funcCall = message.payload.replace(storeName, `this['${storeName}']`);
    //       try {
    //         new Function(`${funcCall}`).call(__stores__);
    //       } catch(e) {
    //         console.warn('Unknown Method ☹️');
    //       }
    //     });
    //   }
    // }

    if (message.type === 'DISPATCH') {
      const payloadType = message.payload.type

      if (payloadType === 'COMMIT') {
        globalSyncOnlyVex.state$.pipe(first()).subscribe((appState) => {
          devTools.init(appState)
        })
        return
      }

      if (message.state) {
        globalSyncOnlyVex.dispatch({ type: '[devtools] ' + message.type, resolve: () => message.state })
      }
    }
  })
}

function mapFeatureStateToGlobal(_featureKey: string | undefined, globalState: any, featureState: any): any {
  const featureKey = _featureKey || ''
  const lookups = featureKey.split('.')

  if (lookups.length === 0 && lookups[0] === '') {
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
  if (globalSyncOnlyVex) {
    globalSyncOnlyVex.state$.pipe(first()).subscribe((appState) => {
      devTools.send({ type: `[${featureKey || 'APP_ROOT'}] @@INIT` }, appState)
      $$dispatch$$.next(dispatch$ as Observable<AuditableAction<StateType, ResultType>>)
      $$resolution$$.next(resolution$ as Observable<ActionResult<StateType>>)
    })
  }
}

