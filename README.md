# vex

`vex` is a simple, practical, lightweight event bus-style state manager.

## The vex pattern

The `vex` pattern consists of a few simple concepts.

### Action

An **Action** is to `vex` as an Event is to an event bus. It carries the data of how and
why your application's state is about to change. Actions have a simple lifecycle:
- **dispatch**: 
- **resolution**: An action is **resolved** when its `resolve` function returns, resolves,
  or emits a single value.

A **dispatch** is 

