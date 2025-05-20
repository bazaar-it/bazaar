// src/utils/__tests__/retryWithBackoff.test.ts
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { retryWithBackoff } from '../retryWithBackoff';

// Type definition for the function being mocked
type RetryFn = (attempt: number) => Promise<string>;

describe('retryWithBackoff', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  it('resolves when fn succeeds on first try', async () => {
    const fn = jest.fn<RetryFn>().mockResolvedValue('ok');
    const retry = retryWithBackoff(fn, { maxRetries: 3, initialDelay: 10, maxDelay: 100 });
    const result = await retry(() => Promise.resolve('ok'));
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries when fn throws and eventually succeeds', async () => {
    const fn = jest.fn<RetryFn>()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok');
    const retry = retryWithBackoff(fn, { maxRetries: 3, initialDelay: 10, maxDelay: 100 });
    const promise = retry(() => Promise.resolve('ok'));
    jest.advanceTimersByTime(10);
    const result = await promise;
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws after exceeding maxRetries', async () => {
    const fn = jest.fn<RetryFn>().mockRejectedValue(new Error('fail'));
    const retry = retryWithBackoff(fn, { maxRetries: 2, initialDelay: 5, maxDelay: 20 });
    const promise = retry(() => Promise.resolve('never'));
    jest.advanceTimersByTime(5 + 10 + 20);
    await expect(promise).rejects.toThrow('fail');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('uses retryableErrors array to determine retry', async () => {
    const error = { status: 500 };
    const fn = jest.fn<RetryFn>().mockRejectedValueOnce(error).mockResolvedValue('ok');
    const retry = retryWithBackoff(fn, {
      maxRetries: 2,
      initialDelay: 1,
      maxDelay: 10,
      retryableErrors: [500],
    });
    const promise = retry(() => Promise.resolve('ok'));
    jest.advanceTimersByTime(1);
    const result = await promise;
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does not retry when error code not in retryableErrors', async () => {
    const error = { status: 404 };
    const fn = jest.fn<RetryFn>().mockRejectedValue(error);
    const retry = retryWithBackoff(fn, {
      maxRetries: 2,
      initialDelay: 1,
      maxDelay: 10,
      retryableErrors: [500],
    });
    const promise = retry(() => Promise.resolve('never'));
    await expect(promise).rejects.toEqual(error);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('uses retryableErrors function to control retries', async () => {
    const error = new Error('fail');
    const fn = jest.fn<RetryFn>().mockRejectedValueOnce(error).mockResolvedValue('ok');
    const retry = retryWithBackoff(fn, {
      maxRetries: 2,
      initialDelay: 1,
      maxDelay: 10,
      retryableErrors: (e) => e === error,
    });
    const promise = retry(() => Promise.resolve('ok'));
    jest.advanceTimersByTime(1);
    const result = await promise;
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('backs off exponentially up to maxDelay', async () => {
    const fn = jest.fn<RetryFn>()
      .mockRejectedValueOnce(new Error('1'))
      .mockRejectedValueOnce(new Error('2'))
      .mockResolvedValue('ok');
    const retry = retryWithBackoff(fn, { maxRetries: 3, initialDelay: 10, maxDelay: 50 });
    const promise = retry(() => Promise.resolve('ok'));
    jest.advanceTimersByTime(10 + 20);
    const result = await promise;
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('respects maxDelay cap', async () => {
    const fn = jest.fn<RetryFn>()
      .mockRejectedValueOnce(new Error('a'))
      .mockRejectedValueOnce(new Error('b'))
      .mockResolvedValue('ok');
    const retry = retryWithBackoff(fn, { maxRetries: 3, initialDelay: 50, maxDelay: 60 });
    const promise = retry(() => Promise.resolve('ok'));
    jest.advanceTimersByTime(50 + 60);
    await promise;
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('stops retrying when retryableErrors returns false', async () => {
    const error = new Error('fatal');
    const fn = jest.fn<RetryFn>().mockRejectedValue(error);
    const retry = retryWithBackoff(fn, {
      maxRetries: 5,
      initialDelay: 1,
      maxDelay: 10,
      retryableErrors: () => false,
    });
    await expect(retry(() => Promise.resolve('never'))).rejects.toEqual(error);
    expect(fn).toHaveBeenCalledTimes(1);
  });
  
  it('passes attempt count to fn', async () => {
    const fn = jest.fn<RetryFn>().mockImplementation((attempt) => Promise.resolve('ok'));
    const retry = retryWithBackoff(fn, { maxRetries: 1, initialDelay: 1, maxDelay: 1 });
    await retry(() => Promise.resolve('ok'));
    expect(fn).toHaveBeenCalledWith(0);
  });

  it('handles synchronous errors', async () => {
    const fn = jest.fn<RetryFn>().mockImplementation(() => {
      throw new Error('sync');
    });
    const retry = retryWithBackoff(fn, { maxRetries: 1, initialDelay: 5, maxDelay: 5 });
    const promise = retry(() => Promise.resolve('never'));
    jest.advanceTimersByTime(5);
    await expect(promise).rejects.toThrow('sync');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
