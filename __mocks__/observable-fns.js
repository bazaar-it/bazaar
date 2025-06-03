// __mocks__/observable-fns.js

/**
 * Mock Observable class for testing
 * @template T
 */
class Observable {
  /**
   * @param {(observer: {next?: (value: T) => void, error?: (err: any) => void, complete?: () => void}) => (() => void) | void} subscriber - Subscriber function that is called with an observer
   */
  constructor(subscriber) {
    /** @type {Function} */
    this.subscriber = subscriber;
  }

  /**
   * @param {Function|{next?: Function, error?: Function, complete?: Function}} observer - Observer function or object with next/error/complete methods
   * @returns {{unsubscribe: Function, closed: boolean}} - Subscription object
   */
  subscribe(observer) {
    const subscription = {
      unsubscribe: jest.fn(),
      closed: false
    };
    
    // Ensure observer is an object with potential methods
    /** @type {{next?: Function, error?: Function, complete?: Function}} */
    const actualObserver = typeof observer === 'function' 
      ? { next: observer, error: undefined, complete: undefined } 
      : observer;
    
    try {
      // Call the subscriber function with the observer
      // Use a timeout to simulate async behavior of real Observables
      setTimeout(() => {
        if (this.subscriber) {
            this.subscriber(actualObserver);
        }
      }, 0);
    } catch (e) {
      // Handle error
      if (actualObserver && actualObserver.error) {
        actualObserver.error(e);
      }
    }
    
    return subscription;
  }

  /**
   * Simplified mock of the pipe method.
   * @param {...Function} operations - Operators to pipe (ignored in mock)
   * @returns {Observable<T>} - This observable for chaining
   */
  pipe(...operations) {
    return this; // Just return this for simple mocking
  }
}

// Define operator functions with JSDoc for typing
/**
 * @template T, R
 * @param {(value: T, index: number) => R} mapper - Mapping function
 * @returns {(source: Observable<T>) => Observable<R>}
 */
const map = (mapper) => (source) => source; // Simplified mock: returns source observable

/**
 * @template T
 * @param {(value: T, index: number) => boolean} predicate - Filter predicate
 * @returns {(source: Observable<T>) => Observable<T>}
 */
const filter = (predicate) => (source) => source; // Simplified mock: returns source observable

/**
 * @template T
 * @param {{next?: (value: T) => void, error?: (err: any) => void, complete?: () => void}|((value: T) => void)} observer - Observer
 * @returns {(source: Observable<T>) => Observable<T>}
 */
const tap = (observer) => (source) => source; // Simplified mock: returns source observable

/**
 * @template T, O
 * @param {(error: any, caught: Observable<O>) => Observable<T | O>} selector - Error handler
 * @returns {(source: Observable<T>) => Observable<T | O>}
 */
const catchError = (selector) => (source) => source; // Simplified mock: returns source observable

/**
 * @template T, R
 * @param {(value: T, index: number) => Observable<R>} project - Project function
 * @returns {(source: Observable<T>) => Observable<R>}
 */
const mergeMap = (project) => (source) => source; // Simplified mock: returns source observable

/**
 * @template T, R
 * @param {(value: T, index: number) => Observable<R>} project - Project function
 * @returns {(source: Observable<T>) => Observable<R>}
 */
const switchMap = (project) => (source) => source; // Simplified mock: returns source observable

/**
 * @template T
 * @param {number} count - Number of items to take
 * @returns {(source: Observable<T>) => Observable<T>}
 */
const take = (count) => (source) => source; // Simplified mock: returns source observable

/**
 * @template T
 * @param {Observable<any>} notifier - Notifier observable
 * @returns {(source: Observable<T>) => Observable<T>}
 */
const takeUntil = (notifier) => (source) => source; // Simplified mock: returns source observable

// Define creation functions with JSDoc for typing
/**
 * @template T
 * @param {...T} args - Values to emit
 * @returns {Observable<T>} - An observable of the values
 */
const of = (...args) => {
  return new Observable(/** @type {{next?: Function, error?: Function, complete?: Function}} */ (observer) => {
    setTimeout(() => {
      args.forEach(value => observer.next && observer.next(value));
      observer.complete && observer.complete();
    }, 0);
    return () => {}; // unsubscribe function
  });
};

/**
 * @template T
 * @param {Promise<T>} promise - Promise to convert to observable
 * @returns {Observable<T>} - An observable of the promise result
 */
const fromPromise = (promise) => {
  return new Observable(/** @type {{next?: Function, error?: Function, complete?: Function}} */ (observer) => {
    promise
      .then(value => {
        observer.next && observer.next(value);
        observer.complete && observer.complete();
      })
      .catch(err => {
        observer.error && observer.error(err);
      });
    return () => {}; // unsubscribe function
  });
};

// Create an exports object containing all intended exports
const observableFnsExports = {
  Observable,
  map,
  filter,
  tap,
  catchError,
  mergeMap,
  switchMap,
  take,
  takeUntil,
  of,
  fromPromise,
};

// Export for ESM compatibility
export {
  Observable,
  map,
  filter,
  tap,
  catchError,
  mergeMap,
  switchMap,
  take,
  takeUntil,
  of,
  fromPromise,
};

// CommonJS compatibility
if (typeof module !== 'undefined') {
  module.exports = observableFnsExports;
} 