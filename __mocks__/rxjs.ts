// __mocks__/rxjs.js

/**
 * Basic mock implementation of rxjs Subject
 */
class Subject {
  observers: Array<{next?: (value: any) => void, error?: (err: any) => void, complete?: () => void}> = [];
  /**
   * @constructor
   */
  constructor() {
    // this.observers = []; // Now initialized at class level
  }

  /**
   * Subscribe to this Subject
   * @param {Function|{next?: Function, error?: Function, complete?: Function}} observer
   * @returns {{unsubscribe: Function, closed: boolean}}
   */
  subscribe(observer: ((value: any) => void) | { next?: (value: any) => void; error?: (err: any) => void; complete?: () => void; }) {
    const actualObserver = typeof observer === 'function' 
      ? { next: observer } 
      : observer;
    
    this.observers.push(actualObserver);
    
    return {
      unsubscribe: () => {
        this.observers = this.observers.filter(obs => obs !== actualObserver);
      },
      closed: false
    };
  }

  /**
   * Emit a value to all observers
   * @param {*} value 
   */
  next(value: any) {
    this.observers.forEach(observer => {
      if (observer.next) {
        observer.next(value);
      }
    });
  }

  /**
   * Emit an error to all observers
   * @param {*} err 
   */
  error(err: any) {
    this.observers.forEach(observer => {
      if (observer.error) {
        observer.error(err);
      }
    });
    this.observers = [];
  }

  /**
   * Complete all observers
   */
  complete() {
    this.observers.forEach(observer => {
      if (observer.complete) {
        observer.complete();
      }
    });
    this.observers = [];
  }
}

/**
 * BehaviorSubject implementation
 * @extends Subject
 */
class BehaviorSubject extends Subject {
  value: any;
  /**
   * @param {*} initialValue 
   */
  constructor(initialValue: any) {
    super();
    this.value = initialValue;
  }

  /**
   * Get the current value
   * @returns {*}
   */
  getValue() {
    return this.value;
  }

  /**
   * @param {*} value 
   */
  next(value: any) {
    this.value = value;
    super.next(value);
  }

  /**
   * @param {Function|{next?: Function, error?: Function, complete?: Function}} observer 
   * @returns {{unsubscribe: Function, closed: boolean}}
   */
  subscribe(observer: ((value: any) => void) | { next?: (value: any) => void; error?: (err: any) => void; complete?: () => void; }) {
    const subscription = super.subscribe(observer);
    const actualObserver = typeof observer === 'function' 
      ? { next: observer } 
      : observer;
    
    if (actualObserver.next) {
      actualObserver.next(this.value);
    }
    
    return subscription;
  }
}

/**
 * Map operator
 * @param {Function} fn - Mapping function
 * @returns {Function} - Operator function
 */
const map = (fn: (value: any) => any) => (source: any) => {
  const result = new Subject();
  source.subscribe({
    next: (value: any) => result.next(fn(value)),
    error: (err: any) => result.error(err),
    complete: () => result.complete()
  });
  return result;
};

/**
 * Filter operator
 * @param {Function} predicate - Filter function
 * @returns {Function} - Operator function
 */
const filter = (predicate: (value: any) => boolean) => (source: any) => {
  const result = new Subject();
  source.subscribe({
    next: (value: any) => {
      if (predicate(value)) {
        result.next(value);
      }
    },
    error: (err: any) => result.error(err),
    complete: () => result.complete()
  });
  return result;
};

/**
 * Creates an Observable that emits the provided values
 * @param {...*} args - Values to emit
 * @returns {Subject}
 */
const of = (...args: any[]) => {
  const subject = new Subject();
  setTimeout(() => {
    args.forEach(arg => subject.next(arg));
    subject.complete();
  }, 0);
  return subject;
};

/**
 * Creates an Observable from an array or promise
 * @param {Array|Promise} input - Input to convert to Observable
 * @returns {Subject}
 */
const from = (input: Array<any> | Promise<any>) => {
  const subject = new Subject();
  setTimeout(() => {
    if (Array.isArray(input)) {
      input.forEach(item => subject.next(item));
      subject.complete();
    } else if (input && typeof input.then === 'function') {
      input.then(
        value => {
          subject.next(value);
          subject.complete();
        },
        err => subject.error(err)
      );
    }
  }, 0);
  return subject;
};

// All exports for rxjs mock
const rxjsExports = {
  Subject,
  BehaviorSubject,
  map, 
  filter,
  of,
  from,
  // Add more operators as needed
  operators: {
    map,
    filter
  }
};

// CommonJS compatibility
if (typeof module !== 'undefined') {
  module.exports = rxjsExports;
} 