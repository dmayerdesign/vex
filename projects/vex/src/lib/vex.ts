import { from, of, Observable, Subject } from 'rxjs'
import { catchError, concatMap, filter, first, map, mergeScan, scan, share, shareReplay, startWith, tap, withLatestFrom } from 'rxjs/operators'

export interface VexOptions {
  allowConcurrency?: boolean
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

export interface ActionResult<StateType> {
  state: StateType
  actionType: string
  error?: Error
}

export interface UniqueAction<StateType, ResultType = any> extends AsyncAction<StateType, ResultType> {
  _id?: Symbol
}

export interface UniqueActionResult<StateType> extends ActionResult<StateType> {
  _actionId?: Symbol
}

export class Vex<StateType> {
  private _actionß = new Subject<Action<StateType, any>>()
  private _actionAuditß = new Subject<Action<StateType, any>>()
  private _resolution$: Observable<ActionResult<StateType>>
  private _dispatchAudit$: Observable<Action<StateType, any>>
  public state$: Observable<StateType>

  constructor(
    private _initialState: StateType,
    { allowConcurrency = true }: VexOptions
  ) {
    const initialResult: ActionResult<StateType> = {
      state: this._initialState,
      actionType: 'INITIALIZE_STATE'
    }

    if (!allowConcurrency) {
      this._resolution$ = this._actionß.pipe(
        tap((action) => this._actionAuditß.next(action)),
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
        tap((action) => this._actionAuditß.next(action)),
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

export function createVex(initialState: any, options: VexOptions): Vex<any> {
  return new Vex(initialState, options)
}
