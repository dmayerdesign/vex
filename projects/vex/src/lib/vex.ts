import { from, of, Observable, Subject } from 'rxjs'
import { catchError, filter, first, map, mergeScan, share, shareReplay, startWith, tap, withLatestFrom } from 'rxjs/operators'

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

export interface ActionResult<StateType, ResultType = never> {
  state: StateType
  result?: ResultType
  actionType?: string
  error?: Error
}

export class Vex<StateType> {
  private _actionß = new Subject<Action<StateType, any>>()
  private _actionAuditß = new Subject<Action<StateType, any>>()
  private _resolution$: Observable<ActionResult<StateType, any>>
  public dispatch$: Observable<Action<StateType, any>>
  public dispatchAudit$: Observable<Action<StateType, any>>
  public state$: Observable<StateType>

  constructor(
    private _initialState: StateType,
  ) {
    this._resolution$ = this._actionß.pipe(
      tap((action) => this._actionAuditß.next(action)),
      mergeScan(
        ({ state = this._initialState }, action) => {
          let unresolvedResult: Partial<StateType> | Promise<any> | Observable<any>

          // Handle synchronous error.
          try {
            unresolvedResult = action.resolve(state)
          } catch (error) {
            return of({
              actionType: action.type,
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
              map(([result, currentState = this._initialState]) => ({
                actionType: action.type,
                state: Object.assign(
                  currentState,
                  (action as AsyncAction<StateType, any>).mapToState(
                    currentState,
                    result,
                  ),
                ),
              })),
              catchError((error) => of({
                actionType: action.type,
                error,
              })),
            )
          }

          // Handle synchronous success.
          return of({
            actionType: action.type,
            state: Object.assign(state, unresolvedResult)
          })
        },
        { state: this._initialState }
      ),
      startWith({ state: this._initialState }),
      shareReplay(1),
    )
    this.state$ = this._resolution$.pipe(
      map(({ state }) => state),
      shareReplay(1),
    )
    this.dispatch$ = this._actionß.asObservable()
    this.dispatchAudit$ = this._actionAuditß.asObservable()
    this.state$.subscribe()
    this.dispatch$.subscribe()
    this.dispatchAudit$.subscribe()
  }

  public dispatch<ActionType extends Action<StateType, any> = Action<StateType, any>>(
    action: ActionType
  ): void {
    return this._actionß.next(action)
  }

  public dispatchOf(
    ...actionTypes: string[]
  ): Observable<ActionResult<StateType>> {
    return this.dispatchAudit$.pipe(
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
  ): Observable<ActionResult<StateType, any>> {
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
