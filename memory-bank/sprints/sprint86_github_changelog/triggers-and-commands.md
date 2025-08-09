# Triggers & Commands

## Events to subscribe to
- issue_comment: primary trigger (apps aren’t truly mentionable; parse comment body for command)
- pull_request: context (open/synchronize/closed/merged) and optional auto-run on merge
- Optional: pull_request_review_comment if you want code-line comment triggers

## Why issue_comment
- GitHub Apps don’t receive a dedicated @mention event. Parse comments for @bazaar-bot or a slash command like `/bazaar`.
- Gate triggers by author association (OWNER|MEMBER|COLLABORATOR) to avoid drive-by abuse.

## Command grammar (suggested)
- Basic: `@bazaar-bot video`
- With options: `@bazaar-bot video duration=8s emphasis=audio style=apple voiceover=off`
- Slash form: `/bazaar video [duration=8s] [emphasis=<feature>] [style=<template>] [voiceover=on|off]`

## Labels alternative
- Support label-based trigger: adding `create-changelog-video` on a PR queues a job.
- Good fallback for repos who dislike comment commands.

## Config file defaults
- `.bazaar.yml` (repo root) defines defaults: brand, video, rules. See branding-config.md.

## Trust & authorization
- Only accept triggers from trusted roles by default (OWNER|MEMBER|COLLABORATOR). Make this configurable.
- For forks, default-deny unless configured.
