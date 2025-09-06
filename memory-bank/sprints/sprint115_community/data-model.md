# Community Data Model (Additive, Safe)

This schema introduces new additive tables (no changes to existing tables). All user IDs remain varchar(255) aligned with NextAuth.

## Tables

### community_templates
- id: uuid, PK, defaultRandom
- slug: varchar(255), unique (for SEO/links)
- title: varchar(255), not null
- description: text
- ownerUserId: varchar(255) references users.id
- visibility: enum('public','unlisted') default 'public'
- status: enum('active','disabled') default 'active'
- sourceProjectId: uuid references projects.id
- thumbnailUrl: text
- formats: json string[] default ['landscape','portrait','square']
- tags: json string[] default []
- viewsCount: bigint default 0
- favoritesCount: bigint default 0
- usesCount: bigint default 0
- createdAt: timestamptz default now
- updatedAt: timestamptz default now

Indexes:
- unique(slug)
- index(ownerUserId)
- index(status, visibility)

### community_template_scenes
- id: uuid, PK, defaultRandom
- templateId: uuid FK → community_templates.id (cascade delete)
- sceneIndex: int not null
- title: varchar(255)
- tsxCode: text not null (snapshot)
- duration: int not null
- previewFrame: int default 15
- codeHash: text (for dedupe/audit)
- createdAt: timestamptz default now

Indexes:
- index(templateId)
- unique(templateId, sceneIndex)

### community_favorites
- userId: varchar(255) references users.id
- templateId: uuid references community_templates.id
- createdAt: timestamptz default now

PK:
- primary(userId, templateId)

Indexes:
- index(templateId)

### community_events (raw)
- id: uuid, PK, defaultRandom
- templateId: uuid references community_templates.id
- userId: varchar(255) nullable
- eventType: enum('view','favorite','unfavorite','use','mix','prompt','click')
- source: enum('in_app_panel','community_site')
- projectId: uuid nullable
- sceneCount: int nullable
- referrer: text nullable
- userAgent: text nullable
- createdAt: timestamptz default now

Indexes:
- index(templateId, createdAt)
- index(eventType, createdAt)

### community_metrics_daily (aggregate)
- templateId: uuid references community_templates.id
- day: date not null
- eventType: enum('view','favorite','use')
- count: bigint not null default 0

PK:
- primary(templateId, day, eventType)

## Drizzle Sketch
```ts
export const communityTemplates = d.table('community_templates', {
  id: d.uuid().primaryKey().defaultRandom(),
  slug: d.varchar({ length: 255 }).notNull().unique(),
  title: d.varchar({ length: 255 }).notNull(),
  description: d.text(),
  ownerUserId: d.varchar({ length: 255 }).references(() => users.id),
  visibility: d.pgEnum('community_visibility', ['public','unlisted']).default('public'),
  status: d.pgEnum('community_status', ['active','disabled']).default('active'),
  sourceProjectId: d.uuid().references(() => projects.id),
  thumbnailUrl: d.text(),
  formats: d.json().$type<Array<'landscape'|'portrait'|'square'>>().default(['landscape','portrait','square']),
  tags: d.json().$type<string[]>().default([]),
  viewsCount: d.bigint({ mode: 'number' }).default(0),
  favoritesCount: d.bigint({ mode: 'number' }).default(0),
  usesCount: d.bigint({ mode: 'number' }).default(0),
  createdAt: d.timestamp({ withTimezone: true }).defaultNow(),
  updatedAt: d.timestamp({ withTimezone: true }).defaultNow(),
});
```

## Notes
- Snapshot code lives in `community_template_scenes.tsxCode`, enabling immutable public references while allowing users to import into their projects safely.
- Counters are cached; truth comes from raw events + daily aggregates.
- All migrations are additive (CREATE TABLE/INDEX/ENUM only) per migration guidelines.

