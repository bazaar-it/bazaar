# Pipeline & UX — Community Templates

## Publish to Community (Any User)
- Entry: Project page → Community Panel → “Publish to Community”.
- Scene selection: choose 1..n scenes (or all scenes) with thumbnails.
- Metadata: title, description, tags, formats; auto‑generated thumbnail.
- Save: server duplicates selected scenes into `community_*` tables.
- Result: public template appears immediately (status=active, visibility=public).

## Browse (In‑App Community Panel)
- Tabs: All, Favorites, My Templates.
- Filters: tags, formats; sort by Trending (views+favorites+uses), New.
- Card: thumbnail, title, owner, counts (views/favs/uses), actions: Favorite, Use, Open.

## Browse (community.bazaar.it)
- Home: grid feed; search; tags.
- Detail page: larger preview, scenes list, metadata, counts, owner, actions.
- Favorite: writes to `community_favorites` when logged in.
- Use: deep link back to main app with `importTemplate` param.

## Import (“Use”)
- In‑app: chooses current project by default; or select target project.
- Importer:
  - Fetches template scenes (tsx snapshots) from `community_template_scenes`.
  - Uniquifies component names, updates imports if needed.
  - Adds scenes via existing create‑scene code path.
  - Emits `use` event on success.

## Admin/Moderation (MVP)
- Soft disable: set `status=disabled` to hide abusive content.
- Optional: auto‑flag on rapid spam uploads.

## Renaming
- “Templates Panel” → “Community Panel” (code may keep legacy name internally initially to reduce churn).

