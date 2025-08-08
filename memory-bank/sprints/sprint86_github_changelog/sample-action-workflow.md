# Sample GitHub Action (zero‑install)

```yaml
name: Bazaar Video on PR Comment

on:
  issue_comment:
    types: [created]

permissions:
  contents: read
  issues: write
  pull-requests: read

jobs:
  bazaar-video:
    if: >
      contains(github.event.comment.body, '/bazaar') &&
      github.event.issue.pull_request
    runs-on: ubuntu-latest

    steps:
      - name: Hard-stop if commenter is not trusted (optional)
        id: authz
        run: |
          echo "assoc=${{ github.event.comment.author_association }}" >> $GITHUB_OUTPUT
          case "${{ github.event.comment.author_association }}" in
            OWNER|MEMBER|COLLABORATOR) echo "ok=true" >> $GITHUB_OUTPUT ;;
            *) echo "ok=false" >> $GITHUB_OUTPUT ;;
          esac

      - name: Exit if not trusted (optional)
        if: steps.authz.outputs.ok != 'true'
        run: |
          echo "Commenter not authorized to trigger Bazaar render."
          exit 0

      - name: Extract PR number
        id: pr
        run: echo "number=${{ github.event.issue.number }}" >> $GITHUB_OUTPUT

      - name: Call Bazaar Render API
        id: call
        env:
          BAZAAR_API_TOKEN: ${{ secrets.BAZAAR_API_TOKEN }}
          BAZAAR_API_URL: ${{ secrets.BAZAAR_API_URL }}
        run: |
          set -euo pipefail
          jq -n \
            --arg repo "${{ github.repository }}" \
            --arg pr "${{ steps.pr.outputs.number }}" \
            --arg comment "${{ github.event.comment.body }}" \
            --arg sender "${{ github.event.comment.user.login }}" \
            '{repo: $repo, pr: ($pr|tonumber), trigger_comment: $comment, sender: $sender}' > payload.json

          curl -fsS -X POST "$BAZAAR_API_URL" \
            -H "Authorization: Bearer $BAZAAR_API_TOKEN" \
            -H "Content-Type: application/json" \
            --data @payload.json > response.json

          echo "video_url=$(jq -r '.video_url' response.json)" >> $GITHUB_OUTPUT

      - name: Post reply comment with result
        uses: peter-evans/create-or-update-comment@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          issue-number: ${{ steps.pr.outputs.number }}
          body: |
            🎬 **Bazaar** is done rendering. Video: ${{ steps.call.outputs.video_url }}
```
