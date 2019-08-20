# Vex

Vex is a simple, lightweight, asynchronous state manager for Angular.

`npm install @dannymayer/vex`

## "To-do" App

**app.model.ts**
```ts
export interface AppState {
    todos: string[]
}

export enum AppAction {
    CREATE_TODO = 'CREATE_TODO'
    DELETE_TODO = 'DELETE_TODO'
}

export const initialState: AppState = {
    todos: []
}
```

**app.service.ts**
```ts
import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { Vex } from '@dannymayer/vex'
import { Observable } from 'rxjs'
import { first, switchMap } from 'rxjs/operators'
import { AppAction, AppState } from './app.model'

@Injectable()
export class AppService {
    constructor(
        private _httpClient: HttpClient,
        private _manager: Vex<AppState>,
    ) { }

    // Asynchronous actions include `resolve` and `mapToState` functions.
    // `resolve` accepts the current state as an argument and returns whatever you want.
    // `mapToState` takes the result of `resolve` and maps it to your Vex's state.
    public createTodo(todo: string): Observable<AppState> {
        this._manager.dispatch({
            type: AppAction.CREATE_TODO,
            resolve: (state) => this._httpClient.post('/api/todo', { todo }),
            mapToState: (state, { todoMessage }) => ({
                todos: [ ...state.todos, todoMessage ]
            }),
        })
        return this._manager.resultOf(AppAction.CREATE_TODO)
    }

    // Synchronous actions simply return a `Partial<AppState>` from `resolve`, and leave
    // `mapToState` undefined.
    public deleteTodo(todoIndex: number): Observable<AppState> {
        this._manager.dispatch({
            type: AppAction.DELETE_TODO,
            resolve: (state) => ({
                todos: [
                    ...state.todos.slice(0, todoIndex),
                    ...state.todos.slice(todoIndex + 1),
                ]
            })
        })
        return this._httpClient.delete(`/api/todo/${todoIndex}`).pipe(
            switchMap(() => this._manager.state$),
            first()
        )
    }
}
```

**app.module.ts**
```ts
import { HttpClientModule } from '@angular/common/http'
import { NgModule } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { VexModule } from '@dannymayer/vex'
import { AppComponent } from './app.component'
import { initialState } from './app.model'
import { AppService } from './app.service'

@NgModule({
    imports: [
        BrowserModule,
        HttpClientModule,
        VexModule.forRoot(initialState)
    ],
    declarations: [ AppComponent ],
    providers: [ AppService ],
    bootstrap: [ AppComponent ],
})
export class AppModule { }
```

## Background

Vex arose out of a desire for a state manager that is simple, practical, and integrates
with my app's architecture. Having used Flux-style state management, I was frustrated with
the amount of boilerplate and with the fact that asynchrony felt like a second-class
citizen. I knew I wanted to keep the functional-reactive style of [Ngrx](https://ngrx.io/)
along with the event-sourcing feel it inherits from [Flux](https://facebook.github.io/flux/),
and I loved the ergonomic, low-boilerplate implementation that
[Akita](https://github.com/datorama/akita) offers. Vex is my attempt to combine my
favorite state management features into one tiny, convenient interface.

## The Vex API

### Action<StateType, ResultType>

**type**: string

> (*required*) A unique identifier for the Action.

**resolve(** *state*: StateType **):** 
Partial\<StateType\>
\
&nbsp;&nbsp;&nbsp;&nbsp;
    | Promise<ResultType>
\
&nbsp;&nbsp;&nbsp;&nbsp;
    | Observable<ResultType>

> (*required*) The business logic associated with the Action. For a synchronous action,
  the return value is merged into the current state via `Object.assign`. If `mapToState`
  is present, `resolve` is assumed to be asynchronous; once it resolves, the result is
  passed to `mapToState` and merged into the current state via `Object.assign`.

**mapToState(** *state*: StateType, *result*?: ResultType **):** Partial<StateType>

> (*optional*) Present only if `resolve` returns an Observable or Promise. Maps the result
  of the Promise or the first value emitted by the Observable to the Vex's state.

### Vex<StateType>

**dispatch(** *action*: Action **)**: void
> Dispatches an Action.

**dispatchOf(** *actionType*: string **)**: Observable<ActionResult<StateType>>
> Returns an Observable that emits each time an action of the given `actionType` is 
  dispatched, and before it resolves.

**resultOf(** *actionType*: string **)**: Observable<ActionResult<StateType>>
> Returns an Observable that emits each time an action of the given `actionType` is
  resolved.
