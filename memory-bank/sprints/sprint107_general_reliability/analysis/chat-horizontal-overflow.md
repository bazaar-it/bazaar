# Chat Panel Horizontal Overflow - Analysis

Date: 2025-09-11
Sprint: 107 - General Reliability

## Summary
Occasionally the chat panel would show a horizontal scrollbar. This should never happen. Root cause was unwrapped long strings (e.g., long URLs, icon markers, or AI responses without whitespace) inside chat bubbles. The scrollable container also didn’t explicitly hide horizontal overflow, so any over-wide child triggered a panel-level horizontal scrollbar.

## Symptoms
- Intermittent horizontal scrollbar in ChatPanel area
- Most visible after messages containing long URLs or unbroken tokens
- Not tied to a specific project or user flow

## Probable Root Causes
1. Text wrapping: Message text container rendered raw text without `overflow-wrap`/`word-break` rules, so very long tokens didn’t wrap.
2. Container overflow: Scroll container used `overflow-y-auto` only; no `overflow-x-hidden` guard.
3. Minor contributors: Input area chips/toggles were already wrapped; images/videos used `w-full` and didn’t cause overflow in testing.

## Changes Implemented
- Chat container: Add `overflow-x-hidden` to the scrollable div.
- Message bubbles: Add `break-words` to bubble wrapper to allow breaking long tokens.
- Message text: Add `whitespace-pre-wrap break-words` to preserve newlines and wrap long words.

Files touched:
- `src/app/projects/[id]/generate/workspace/panels/ChatPanelG.tsx`
  - `overflow-x-hidden` on messages container
  - `break-words` on generating placeholder bubble
- `src/components/chat/ChatMessage.tsx`
  - `break-words` on bubble wrapper
  - `whitespace-pre-wrap break-words` on text content

## Validation Plan
- Manual: Send messages with extremely long URLs (200+ chars), base64-like strings, and continuous characters to confirm no horizontal scroll.
- Responsive: Narrow viewport to mobile widths; verify bubbles wrap correctly and container remains scrollable vertically only.
- Regression: Verify image/video grids remain within bubble widths and audio player doesn’t cause overflow.

## Next Steps (Optional)
- Add markdown rendering with code block handling (if needed later): ensure `<pre>` blocks are `overflow-x-auto` while panel remains `overflow-x-hidden`.
- Add unit-style visual tests (Storybook/Chromatic) for long-content messages to guard against regressions.

## Decision
Keep the fix minimal and general-purpose (wrapping + container guard). No hacky special-casing for specific messages.

