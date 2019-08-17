import { from, of, Observable, Subject } from 'rxjs'
import { catchError, filter, map, mergeScan, share, shareReplay, startWith, withLatestFrom } from 'rxjs/operators'

export interface Action<StateType> {
  type: string
  resolve: (state: StateType) => (
    Promise<Partial<StateType>>
    | Observable<Partial<StateType>>
    | Partial<StateType>
  )
}

export interface ActionResult<StateType> {
  state: StateType
  actionType?: string
  error?: Error
}

export class Vex<StateType> {
  private _actionß = new Subject<Action<StateType>>()
  public dispatch$ = this._actionß.asObservable()
  private _resolution$: Observable<ActionResult<StateType>> = this._actionß.pipe(
    mergeScan(
      ({ state }, action) => {
        const unresolvedNewStatePartial = action.resolve(state)

        if (
          typeof (unresolvedNewStatePartial as Promise<Partial<StateType>>).then === 'function'
          || typeof (unresolvedNewStatePartial as Observable<Partial<StateType>>).subscribe === 'function'
        ) {
          const asyncNewStatePartial = unresolvedNewStatePartial as Promise<Partial<StateType>> | Observable<Partial<StateType>>
          return from(asyncNewStatePartial).pipe(
            map((partial) => ({
              actionType: action.type,
              state: Object.assign(state, partial)
            })),
            catchError((error) => of({
              actionType: action.type,
              error
            }))
          )
        }

        return of({
          action,
          state: Object.assign(state, unresolvedNewStatePartial)
        })
      },
      { state: this._initialState },
    ),
    startWith({ state: this._initialState }),
    shareReplay(1)
  )
  public state$ = this._resolution$.pipe(
    map(({ state }) => state),
    shareReplay(1)
  )

  constructor(
    private _initialState: StateType,
  ) {
    this.state$.subscribe()
    this.dispatch$.subscribe()
  }

  public dispatch(action: Action<StateType>): void {
    return this._actionß.next(action)
  }

  public dispatchOf(
    ...actionTypes: string[]
  ): Observable<ActionResult<StateType>> {
    return this.dispatch$.pipe(
      filter((action) => actionTypes.some(
        (actionType) => action.type === actionType
      )),
      withLatestFrom(this.state$),
      map(([ action, state ]) => ({ actionType: action.type, state })),
      share(),
    )
  }

  public resultOf(
    ...actionTypes: string[]
  ): Observable<ActionResult<StateType>> {
    return this._resolution$.pipe(
      filter((result) => actionTypes.some(
        (actionType) => result.actionType === actionType
      )),
      share(),
    )
  }
}

export function createVex(initialState: any): Vex<any> {
  return new Vex(initialState)
}
