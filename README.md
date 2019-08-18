# ngVex

ngVex is a simple, lightweight, asynchronous state manager for Angular.

## Quick Example

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
import { Vex } from 'ngvex'
import { first, map } from 'rxjs/operators'
import { AppAction, AppState } from './app.model'

@Injectable()
export class AppService {
    constructor(
        private _httpClient: HttpClient,
        private _manager: Vex<AppState>
    ) { }

    public createTodo(todo: string): Promise<any> {
        this._manager.dispatch({
            type: AppAction.CREATE_TODO,
            resolve: (state) => this._httpClient.post('/api/todo', { todo })
                .pipe(map(({ todo }) => ({ todos: [ ...state.todos, todo ] })))
        })
        return this._manager.resultOf(AppAction.CREATE_TODO)
            .pipe(first())
            .toPromise()
    }
}
```

**app.module.ts**
```ts
import { HttpClientModule } from '@angular/common/http'
import { NgModule } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { VexModule } from 'ngvex'
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

### Action<StateType>

**type**: string
> A unique identifier for the Action.

**resolve(** *state*: StateType **):** 
Partial\<StateType\>
\
&nbsp;&nbsp;&nbsp;&nbsp;
    | Promise<Partial\<StateType\>>
\
&nbsp;&nbsp;&nbsp;&nbsp;
    | Observable<Partial\<StateType\>>

> The business logic associated with the Action. The resolved return value is merged into
  the current state via `Object.assign`.

### Vex<StateType>

**dispatch(** *action*: Action **)**: void
> Dispatches an Action.

**dispatchOf(** *actionType*: string **)**: Observable<ActionResult<StateType>>
> Returns an Observable that emits each time an action of the given `actionType` is 
  dispatched, and before it resolves.

**resultOf(** *actionType*: string **)**: Observable<ActionResult<StateType>>
> Returns an Observable that emits each time an action of the given `actionType` is
  resolved.

### Note on concurrency

The only way Vex is able to resolve state mutations asynchronously is by forcing Actions
to resolve one at a time (specifically, using RxJS's `mergeScan` with the `concurrency`
param set to `1`). If you need concurrent asynchronous behavior, you'll need to dispatch a
synchronous Action (one which returns a state partial, not a Promise or Observable) when
your asynchronous code resolves (e.g. instead of your HTTP request happening inside of
`resolve`, it would happen outside of Vex entirely; you'd then dispatch an Action when
the HTTP request got a response).
