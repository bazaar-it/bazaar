// Video Types - Single Source of Truth
export * from './timeline';

// Export everything except Transition from input-props
export {
  inputPropsSchema,
  type InputProps,
  type Scene,
  type Transition as InputPropsTransition
} from './input-props';

// Export everything from remotion-constants (including its Transition)
export * from './remotion-constants';
