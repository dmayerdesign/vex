import { defer, from, merge, of, zip, BehaviorSubject, Observable, Subject } from 'rxjs'
import { catchError, concatMap, filter, first, map, mergeScan, scan, share, shareReplay, skip, startWith, switchMap, tap, withLatestFrom } from 'rxjs/operators'

/**
 * `Action` is the unit of work in a vex state manager.
 */
export interface Action<StateType> {
  type: string
  reduce?(state: StateType): StateType,
  resolve?(
    state: Observable<StateType>
  ): Observable<StateType> | Promise<StateType>
}

export interface ActionResult<StateType> {
  actionType: string
  state: StateType
  error?: Error
}

export interface GlobalActionResult extends ActionResult<any> {
  lookupKey: string
}

export interface UniqueActionResult<StateType> extends ActionResult<StateType> {
  action: Action<StateType>
}

export interface Manager<StateType> {
  state$: Observable<StateType>
  getLookupKey(): string
  dispatch(
    action: Action<StateType>
  ): void
  once(
    action: Action<StateType>
  ): Observable<ActionResult<StateType>>
  dispatches(actionType?: string): Observable<ActionResult<StateType>>
  results(actionType?: string): Observable<ActionResult<StateType>>
  /** @internal - Not part of the public API and subject to change. Use at your own risk. */
  _jumpToState(state: StateType): void
}

export interface VexManagerOptions {
  allowConcurrency?: boolean
}

/**
 * Adapted from https://github.com/datorama/akita/blob/master/akita/src/devTools.ts.
*/
export interface DevToolsOptions {
  /** instance name visible in devTools */
  name?: string
  /**  maximum allowed actions to be stored in the history tree */
  maxAge?: number
  latency?: number
  actionsBlacklist?: string[]
  actionsWhitelist?: string[]
  shouldCatchErrors?: boolean
  logTrace?: boolean
  predicate?: (state: any, action: any) => boolean
  shallow?: boolean
}

// Globals.
const VEX_ROOT = '__ROOT__'
const DEFAULT_MAX_AGE = 25
const DEFAULT_MANAGER_OPTIONS = {
  allowConcurrency: true,
}
const DEFAULT_DEVTOOLS_OPTIONS: DevToolsOptions = {
  name: 'Vex',
  maxAge: DEFAULT_MAX_AGE,
}
const getDevToolsExtension = () => window ? (window as any).__REDUX_DEVTOOLS_EXTENSION__ : undefined
let devTools: any

const vex_managers$ = new BehaviorSubject<Manager<any>[]>([])
const vex_result$: Observable<GlobalActionResult> = vex_managers$.pipe(
  switchMap((managers) => {
    const result$List = managers.map(
      ({ results, getLookupKey }) => results().pipe(
        map((result) => ({ ...result, lookupKey: getLookupKey() }))
      )
    )
    return merge(...result$List)
  }),
)
const vex_dispatch$: Observable<{ actionType: string, lookupKey: string }> = vex_managers$.pipe(
  switchMap((managers) => {
    const dispatch$List = managers.map(
      ({ dispatches, getLookupKey }) => dispatches().pipe(
        map(({ actionType }) => ({ actionType, lookupKey: getLookupKey() }))
      )
    )
    return merge(...dispatch$List)
  }),
)
const vex_state$ = vex_managers$.pipe(
  switchMap((managers) => {
    const stateAndLookupKey$List = managers.map(
      ({ state$, getLookupKey }) => state$.pipe(
        map((state) => ({ state, lookupKey: getLookupKey() }))
      )
    )
    return zip(...stateAndLookupKey$List).pipe(
      map((stateAndLookupKeyList) => {
        return stateAndLookupKeyList.reduce((globalState, { state, lookupKey }) => {
          if (lookupKey === VEX_ROOT) {
            return {
              ...globalState,
              ...state,
            }
          } else {
            return mapNestedStateToGlobal(lookupKey, globalState, state)
          }
        }, {} as ActionResult<any> & { [lookupKey: string]: ActionResult<any> })
      })
    )
  }),
)

export function addManager<StateType>(
  manager: Manager<StateType>,
): void {
  vex_managers$.next([
    ...vex_managers$.getValue(),
    manager,
  ])
}

export class Manager<StateType> {
  constructor(
    initialState: StateType,
    options: VexManagerOptions = {
      allowConcurrency: true,
    },
    lookupKey = VEX_ROOT
  ) {
    return createManager(initialState, options, lookupKey)
  }
}

export function createManager<StateType>(
  initialState: StateType,
  options: VexManagerOptions = {},
  lookupKey = VEX_ROOT
): Manager<StateType> {
  const _dispatchß = new Subject<Action<StateType>>()
  const _actionß = new Subject<Action<StateType>>()
  const _stateOverrideß = new Subject<StateType>()
  const getLookupKey = () => lookupKey
  const _jumpToState = (state: StateType) => _stateOverrideß.next(state)
  let state$: Observable<StateType>

  let _resolution$: Observable<ActionResult<StateType>>

  options = Object.assign(DEFAULT_MANAGER_OPTIONS, options)

  const initialResult: ActionResult<StateType> = {
    state: initialState,
    actionType: 'INITIALIZE_STATE'
  }

  function dispatch<ActionType extends Action<StateType>>(
    action: ActionType
  ): void {
    _dispatchß.next(action)
    return _actionß.next(action)
  }

  function once<ActionType extends Action<StateType>>(
    action: ActionType
  ): Observable<ActionResult<StateType>> {
    dispatch(action)
    return results(action.type).pipe(
      filter<UniqueActionResult<StateType>>(({ action: _action }) => action === _action),
      first(),
    )
  }

  function dispatches(actionType?: string): Observable<ActionResult<StateType>> {
    return _dispatchß.pipe(
      filter((action) => !actionType ? true : action.type === actionType),
      // For some reason `switchMap` works, but the terser `withLatestFrom, map` does not.
      switchMap((action) => state$.pipe(
        first(),
        map((state) => ({
          actionType: action.type,
          state,
        }))
      )),
      share(),
    )
  }

  function results(actionType?: string): Observable<ActionResult<StateType>> {
    return _resolution$.pipe(
      filter((result) => !actionType ? true : result.actionType === actionType),
      share(),
    )
  }

  function _resolve(
    state: StateType,
    action: Action<StateType>
  ): Observable<ActionResult<StateType>> {
    if (action.reduce && action.resolve) {
      throw new Error('[vex] An action may include either a `reduce` or `resolve` function, not both.')
    }
    else if (action.reduce) {
      // Handle synchronous success or error.
      try {
        const newState = action.reduce(state)
        return of({
          actionType: action.type,
          state: Object.assign(state, newState),
        })
      } catch (error) {
        return of({
          actionType: action.type,
          state,
          error,
        })
      }
    }
    else if (action.resolve) {
      // Handle asynchronous success or error.
      return from(action.resolve(state$)).pipe(
        first(),
        map(
          (newState) => ({
            action,
            actionType: action.type,
            state: newState,
          })
        ),
        catchError((error) => state$.pipe(
          first(),
          map((_state) => ({
            action,
            actionType: action.type,
            state: _state,
            error,
          })),
        )),
        share(),
      )
    }
    throw new Error('[vex] An action must include either a `reduce` or `resolve` function.')
  }

  if (!options.allowConcurrency) {
    _resolution$ = _actionß.pipe(
      withLatestFrom(defer(() => state$)),
      concatMap(([ action, state ]) => _resolve(state, action)),
      scan(
        (_, result) => result,
        initialResult,
      ),
      startWith(initialResult),
      shareReplay(1),
    )
  }
  else {
    _resolution$ = _actionß.pipe(
      mergeScan<Action<StateType>, ActionResult<StateType>>(
        ({ state } = initialResult, action) => _resolve(state, action),
        initialResult,
      ),
      startWith(initialResult),
      shareReplay(1),
    )
  }
  state$ = merge(
    _stateOverrideß,
    _resolution$.pipe(
      map(({ state }) => state)
    ),
  )

  state$.subscribe()

  if (!!devTools) {
    devTools.subscribe(({ type, state }) => {
      if (!!state) {
        const globalState = JSON.parse(state)
        if (type === 'DISPATCH') {
          vex_managers$.pipe(first()).subscribe((managers) => {
            const topLevelState = managers.reduce((newGlobalState, manager) => {
              const _newGlobalState = { ...newGlobalState }
              if (lookupKey !== VEX_ROOT) {
                if (lookupKey.indexOf('.') > 0 && lookupKey.indexOf('.') !== lookupKey.length - 1 ) {
                  delete _newGlobalState[lookupKey]
                }
                else {
                  const parentObject = mapGlobalStateToNested(
                    lookupKey.substring(0, lookupKey.lastIndexOf('.')),
                    _newGlobalState
                  )
                  delete parentObject[lookupKey.substring(lookupKey.lastIndexOf('.') + 1)]
                }
              }
              return _newGlobalState
            }, globalState)
            managers.forEach((manager) => {
              if (lookupKey === VEX_ROOT) {
                manager._jumpToState(topLevelState)
              }
              else {
                manager._jumpToState(mapGlobalStateToNested(lookupKey, globalState))
              }
            })
          })
        }
      }
    })
  }

  return {
    state$,
    getLookupKey,
    _jumpToState,
    dispatch,
    once,
    dispatches,
    results,
  }
}

export function createManagerForRoot(
  initialState: any,
  options: VexManagerOptions = {},
): Manager<any> {
  const manager = createManager(initialState, options)
  addManager(manager)
  return manager
}

export function createManagerForFeature(
  lookupKey: string,
  initialState: any,
  options: VexManagerOptions = {},
): Manager<any> {
  const manager = createManager(initialState, options, lookupKey)
  addManager(manager)
  return manager
}

export function setUpDevTools(
  devToolsOptions = {} as DevToolsOptions,
): void {
  if (!getDevToolsExtension()) {
    return
  }
  if (devTools) {
    return
  }

  const mergedOptions = Object.assign({}, DEFAULT_DEVTOOLS_OPTIONS, devToolsOptions)
  devTools = getDevToolsExtension().connect({}, mergedOptions)
  const sendToDevTools = (message: { type: string }, globalState: any) => {
    devTools.send(message, globalState)

    if (devToolsOptions && devToolsOptions.logTrace) {
      console.group(JSON.stringify(message))
      // tslint:disable-next-line
      console.trace();
      console.groupEnd()
    }
  }

  vex_result$
    .pipe(
      withLatestFrom(vex_state$),
      filter(() => !!devTools),
    )
    .subscribe(([ result, globalState ]) => {
      const type = (result.error ? '[RESOLVED (with error)] ' : '[RESOLVED] ') +
        `[${result.lookupKey || VEX_ROOT}] ${result.actionType}`
      const message = { type }
      sendToDevTools(message, globalState)
    })

  vex_dispatch$
    .pipe(filter(() => !!devTools), withLatestFrom(vex_state$))
    .subscribe(([{ actionType, lookupKey }, globalState]) => {
      const type = `[DISPATCHED] [${lookupKey || VEX_ROOT}] ${actionType}`
      const message = { type }
      sendToDevTools(message, globalState)
    })
}

function mapNestedStateToGlobal(_lookupKey: string | undefined, globalState: any, nestedState: any): any {
  const lookupKey = _lookupKey || ''
  const lookups = lookupKey.split('.')

  if (lookups.length === 1 && lookups[0] === '') {
    // Is root.
    return nestedState
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
  parentObject[lastLookup] = nestedState

  return newGlobalState
}

function mapGlobalStateToNested(lookupKey = '', globalState: any): any {
  const lookups = lookupKey.split('.')

  if (lookups.length === 1 && lookups[0] === '') {
    // Is root.
    return globalState
  }

  let parentObject = globalState
  const allButLastLookup = lookups.slice(0, lookups.length - 1)
  const lastLookup = lookups[lookups.length - 1]
  allButLastLookup.forEach((lookup) => {
    if (!parentObject[lookup]) {
      parentObject[lookup] = {}
    }
    parentObject = parentObject[lookup]
  })
  return parentObject[lastLookup]
}
