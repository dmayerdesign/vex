# Vex

Vex is a simple, lightweight, asynchronous state manager for JavaScript user interfaces.


## Installation

`npm install @dannymayer/vex`


## API Overview

### Manager\<StateType>

> **state$: Observable\<StateType>** <br>
  An Observable of the `Vex`'s state. Will emit at least one value to any subscriber.

> **dispatch( *action:* Action ): void** <br>
  Dispatches an Action.

> **once( *action:* Action ): Observable\<ActionResult\<StateType>>** <br>
  Dispatches an Action and returns an Observable of the result.

> **dispatches( *actionType?:* string ): Observable\<ActionResult\<StateType>>** <br>
  Returns an Observable that emits each time an action is dispatched, and before it
  resolves. If an `actionType` is provided, filters the returned Observable to only emit
  dispatches of that `actionType`.

> **results( *actionType?:* string ): Observable\<ActionResult\<StateType>>** <br>
  Returns an Observable that emits each time an action is resolved. If an `actionType` is
  provided, filters the returned Observable to only emit results of that `actionType`.

### createManager\<StateType>

> *parameter* ***initialState:* StateType** <br>
  (*required*) Each manager must be initialized with an `initialState`.

> *parameter* ***options?:* VexManagerOptions**

### VexManagerOptions

> **allowConcurrency: boolean** <br>
  (*optional*) `allowConcurrency` defaults to `true`; if set to `false`, an Action dispatched before
  the previous Action has resolved will be queued and executed immediately when the
  previous Action resolves (using RxJS's `concatMap`).

### Action\<StateType>

> **type: string** <br>
  (*required*) A string representing the category of the action.
  
> **resolve( *state$:* Observable\<StateType> ): (** <br>
  &nbsp;&nbsp;&nbsp;&nbsp;**Promise\<StateType>** <br>
  &nbsp;&nbsp;&nbsp;&nbsp;**| Observable\<StateType>** <br>
  **)** <br>
  (*required*) The business logic associated with the Action. Analagous to a reducer
  function in Redux.

### ActionResult\<StateType>

> **state: StateType** <br>
  (*required*) A snapshot of the state at the time the `ActionResult` was created.

> **actionType: string** (*required*)

> **error?: any** (*optional*)


## Configuring Redux DevTools

Vex integrates with Redux DevTools to allow you to visualize your app's state over time,
including the ability to time-travel through your app's history.

To configure DevTools, simply call `setUpDevTools` with an optional `DevtoolsOptions`
as the only argument.

In Angular, `setUpDevTools` must be invoked inside of an `NgZone#run` callback, like so:

```ts
import { Component, NgZone } from '@angular/core'
import { setUpDevTools } from 'projects/vex/src/lib/vex'

@Component({
  /* ... */
})
export class AppComponent {
  constructor(ngZone: NgZone) {
    ngZone.run(() => setUpDevTools())
  }
}
```

### DevToolsOptions

> **name: string**

> **maxAge: number**

> **latency?: number**

> **actionsBlacklist?: string[]**

> **actionsWhitelist?: string[]**

> **shouldCatchErrors?: boolean**

> **logTrace?: boolean**

> **predicate?: (state: any, action: any) => boolean**

> **shallow?: boolean**


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
import { of, Observable } from 'rxjs'
import { first, map, switchMap, withLatestFrom } from 'rxjs/operators'
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
                resolve: (state$) => this._httpClient.post('/api/todo', { todo }).pipe(
                    withLatestFrom(state$),
                    map(([state, { todoMessage }]) => ({
                        todos: [ ...state.todos, todoMessage ]
                    })),
                ),
            })
            .pipe(map(({ state }) => state))
    }

    // This method dispatches a synchronous action, and performs its asynchronous logic
    // outside of Vex.
    public deleteTodo(todoIndex: number): Observable<AppState> {
        this._manager.dispatch({
            type: AppAction.DELETE_TODO,
            resolve: (state$) => of({
                todos: [
                    ...state.todos.slice(0, todoIndex),
                    ...state.todos.slice(todoIndex + 1),
                ]
            }),
        })
        return this._httpClient.delete(`/api/todo/${todoIndex}`).pipe(
            switchMap(() => this._manager.state$),
            first(),
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
