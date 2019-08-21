# Vex

Vex is a simple, lightweight, asynchronous state manager for JavaScript and TypeScript.


## Installation

`npm install @dannymayer/vex`


## API Overview

### Vex\<StateType>

> **constructor(** <br>
  &nbsp;&nbsp;&nbsp;&nbsp;***initialState:* StateType,** <br>
  &nbsp;&nbsp;&nbsp;&nbsp;***options?:* { allowConcurrency: boolean }** <br>
  **)** <br>
  Each `Vex` instance must be initialized with an `initialState`. <br>
  `allowConcurrency` defaults to `true`; if set to `false`, an Action dispatched before
  the previous Action has resolved will be queued and executed immediately when the
  previous Action resolves (using RxJS's `concatMap`).

> **state$: Observable\<StateType>** <br>
  An Observable of the `Vex`'s state. Will emit at least one value to any subscriber.

> **dispatch( *action:* Action ): void** <br>
  Dispatches an Action.

> **once( *action:* Action ): ActionResult\<StateType>** <br>
  Dispatches an Action Meant for use with asynchronous Actions.

> **dispatches( *actionType*: string ): Observable\<ActionResult\<StateType>>** <br>
  Returns an Observable that emits each time an action of the given `actionType` is
  dispatched, and before it resolves.

> **results( *actionType*: string ): Observable\<ActionResult\<StateType>>** <br>
  Returns an Observable that emits each time an action of the given `actionType` is
  resolved.

### Action\<StateType, ResultType>

> **type: string** <br>
  (*required*) A unique identifier for the Action.
  
> **resolve( *state:* StateType ): (** <br>
  &nbsp;&nbsp;&nbsp;&nbsp;**Partial\<StateType>** <br>
  &nbsp;&nbsp;&nbsp;&nbsp;**| Promise\<ResultType>** <br>
  &nbsp;&nbsp;&nbsp;&nbsp;**| Observable\<ResultType>** <br>
  **)** <br>
  (*required*) The business logic associated with the Action. For a synchronous action,
  the return value is merged into the current state via `Object.assign`. If `mapToState`
  is present, `resolve` is assumed to be asynchronous; once it resolves, the result is
  passed to `mapToState` and merged into the current state via `Object.assign`.

> **mapToState(** <br>
  &nbsp;&nbsp;&nbsp;&nbsp;***state:* StateType,** <br>
  &nbsp;&nbsp;&nbsp;&nbsp;***result?:* ResultType** <br>
  **): Partial\<StateType>** <br>
  (*optional*) Present only if `resolve` returns an Observable or Promise. Maps the result
  of the Promise or the first value emitted by the Observable to the Vex's state.

### ActionResult\<StateType>

> **state: StateType** <br>
  (*required*) A snapshot of the state at the time the `ActionResult` was created.

> **actionType: string** (*required*)

> **error?: any** (*optional*)


## Background

Why Vex? The short answer: it's async by default!

The functional-reactive style enabled by RxJS has changed the way we approach asynchrony
in our code, and many state management frameworks have been built that use Observables to
model application state changing over time. Functional-reactive programming is also great
for doing asynchronous things like HTTP requests, but I haven't seen a state management
framework that embraces this at its core; support for "side-effects" always feels like an
add-on.

*Well, I'm vexed.*

I wanted my state manager to be simple and practical, and not too prescriptive; I want my
state management to feel like part of my app's architecture, rather than like something I
have to build my app around. I was frustrated with the amount of boilerplate in Flux-style
state management and with the fact that asynchrony felt like a second-class citizen. I
knew I wanted to keep the functional-reactive style of [NgRx](https://ngrx.io/) along with
the event-sourcing feel it inherits from [Flux](https://facebook.github.io/flux/), and I
loved the ergonomic, low-boilerplate implementation that [Akita](https://github.com/datorama/akita)
offers. Vex aims to check all of those boxes in one tiny, convenient interface.


## "To Do" App

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
import { first, map, switchMap } from 'rxjs/operators'
import { AppAction, AppState } from './app.model'

@Injectable()
export class AppService {
    constructor(
        private _httpClient: HttpClient,
        private _manager: Vex<AppState>,
    ) { }

    // This method dispatches an asynchronous action.
    // `.dispatch()`, which returns `void`, can be used in place of `.once()`.
    public createTodo(todo: string): Observable<AppState> {
        return this._manager
            .once({
                type: AppAction.CREATE_TODO,
                resolve: (state) => this._httpClient.post('/api/todo', { todo }),
                mapToState: (state, { todoMessage }) => ({
                    todos: [ ...state.todos, todoMessage ]
                }),
            })
            .pipe(map(({ state }) => state))
    }

    // This method dispatches a synchronous action, and performs its asynchronous logic
    // outside of Vex.
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
