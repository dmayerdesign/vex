import { NgZone } from '@angular/core'
import { get } from 'lodash'
import { empty, merge, of, BehaviorSubject, Observable, Subject } from 'rxjs'
import { map, mergeScan, scan, switchMap, switchMapTo, withLatestFrom } from 'rxjs/operators'
import { subs, DevtoolsOptions, NgZoneLike } from './akita-devtools'
import { Action, ActionResult, AuditableAction, Vex, VexOptions } from './vex'

/** Singleton. */
let devTools: any
const globalSyncOnlyVex = new Vex({}, { allowConcurrency: false })
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
  devtoolsOptions: DevtoolsOptions,
  ngZone: NgZoneLike = { run: (cb: () => any) => cb() },
): void {
  if (devTools) {
    throw new Error('Attempted to call `setUpDevtools` more than once.')
  }
  const defaultOptions: Partial<DevtoolsOptions> & { name: string } = { name: 'Vex', shallow: true }
  const mergedOptions = Object.assign({}, defaultOptions, devtoolsOptions)
  devTools = (window as any).__REDUX_DEVTOOLS_EXTENSION__.connect(mergedOptions)

  $$dispatch$.subscribe(({ type }) => globalSyncOnlyVex.dispatch({
    type: '[DISPATCHED] ' + type,
    resolve: (globalState) => globalState
  }))
  $$resolution$.subscribe(({ featureKey, actionType, state, error }) => globalSyncOnlyVex.dispatch({
    type: (error ? '[RESOLVED (with error)] ' : '[RESOLVED] ') + actionType,
    resolve: (globalState) => mapFeatureStateToGlobal(featureKey, globalState, state)
  }))

  merge(
    $$dispatch$.pipe(map(({ type, featureKey }) => [ type, featureKey ])),
    $$resolution$.pipe(map(({ actionType, featureKey }) => [ actionType, featureKey ]))
    )
    .pipe(withLatestFrom(globalSyncOnlyVex.state$))
    .subscribe(([ [ type, featureKey ], state ]) => {
      const message = { type: `[${featureKey || 'APP_ROOT'}] ${type}` }
      devTools.send(message, state)
      if (devtoolsOptions.logTrace) {
        console.group(JSON.stringify(message))
        // tslint:disable-next-line
        console.trace();
        console.groupEnd()
      }
    })

  if (!window) return
  if (!(window as any).__REDUX_DEVTOOLS_EXTENSION__) {
    return
  }

  if (subs.length) {
    subs.forEach(s => {
      if (s.unsubscribe) {
        s.unsubscribe()
      } else if (typeof s === 'function') {
        s()
      }
    })
  }

  // subs.push(
  //   $$deleteStore.subscribe(storeName => {
  //     delete appState[storeName];
  //     devTools.send({ type: `[${storeName}] - Delete Store` }, appState);
  //   })
  // );

  devTools.subscribe((message) => {
    if (message.type === 'DISPATCH') {
      const payloadType = message.payload.type

      if (payloadType === 'COMMIT') {
        globalSyncOnlyVex.state$.subscribe((appState) => {
          devTools.init(appState)
        })
        return
      }

      if (message.state) {
        const rootState = JSON.parse(message.state)
        for (let i = 0, keys = Object.keys(rootState); i < keys.length; i++) {
          const storeName = keys[i]
          if (__stores__[storeName]) {
            ngZone.run(() => {
              __stores__[storeName]._setState(() => rootState[storeName], false)
            })
          }
        }
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
  featureKey: string,
  dispatch$: Observable<Action<StateType, ResultType>>,
  resolution$: Observable<ActionResult<StateType>>,
): void {
  globalSyncOnlyVex.state$.subscribe((appState) => {
    devTools.send({ type: `[${featureKey || 'APP_ROOT'}] @@INIT` }, appState)
    $$dispatch$$.next(dispatch$ as Observable<AuditableAction<StateType, ResultType>>)
    $$resolution$$.next(resolution$ as Observable<ActionResult<StateType>>)
  })
}
