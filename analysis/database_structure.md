# Database Structure Analysis

*Generated on 2025-05-13T09:01:58.829Z*

## Tables

| # | Table Name | Row Count |
|---|------------|----------:|
| 1 | bazaar-vid_account | 4 |
| 2 | bazaar-vid_animation_design_brief | 72 |
| 3 | bazaar-vid_component_error | 0 |
| 4 | bazaar-vid_custom_component_job | 206 |
| 5 | bazaar-vid_message | 277 |
| 6 | bazaar-vid_metric | 337 |
| 7 | bazaar-vid_patch | 117 |
| 8 | bazaar-vid_project | 90 |
| 9 | bazaar-vid_scene_plan | 43 |
| 10 | bazaar-vid_user | 4 |
| 11 | bazaar-vid_verificationToken | 0 |

## Component-Related Tables

Found 2 component-related tables:

### bazaar-vid_component_error

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | No | gen_random_uuid() |
| jobId | uuid | No | - |
| errorType | character varying | No | - |
| details | text | No | - |
| createdAt | timestamp with time zone | No | CURRENT_TIMESTAMP |

#### Sample Data

No sample data available


### bazaar-vid_custom_component_job

| Column | Type | Nullable | Default |
|--------|------|----------|--------|
| id | uuid | No | gen_random_uuid() |
| projectId | uuid | No | - |
| effect | text | No | - |
| tsxCode | text | Yes | - |
| status | character varying | No | 'pending'::character varying |
| outputUrl | text | Yes | - |
| errorMessage | text | Yes | - |
| retryCount | integer | No | 0 |
| createdAt | timestamp with time zone | No | CURRENT_TIMESTAMP |
| updatedAt | timestamp with time zone | Yes | CURRENT_TIMESTAMP |
| metadata | jsonb | Yes | - |
| statusMessageId | uuid | Yes | - |

#### Sample Data

| id | projectId | effect | tsxCode | status | outputUrl | errorMessage | retryCount | createdAt | updatedAt | metadata | statusMessageId |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| d4077499-a97a-41f1-ad9e-365c95 | b12633a2-6d90-45a3-95ef-91d9ba | CreateARealisticScene | "use client";

// src/remotion | building | - | TSX code is missing for this j | 1 | "2025-05-10T05:13:41.041Z"... | "2025-05-10T05:14:06.323Z"... | {"fps":30,"width":1920,"height... | 695657de-1078-4b33-892d-339d7d |
| 21ed6225-0f3e-421f-83cb-9cf133 | 22965772-ed6f-4cf3-b468-39e545 | Test Fade Animation | 
function FadeInText({ text =  | success | https://bazaar-vid-components. | - | 0 | "2025-05-04T12:05:25.381Z"... | "2025-05-04T12:05:28.735Z"... | - | - |
| a23536e9-9dee-493a-8e87-0170df | 236b1935-0453-4904-8ac9-7ad941 | FireworksAnimationOverlayScene | "use client";

// src/remotion | building | - | TSX code is missing for this j | 1 | "2025-05-10T05:35:46.165Z"... | "2025-05-10T05:36:22.578Z"... | {"fps":30,"width":1920,"height... | 78e2aa91-5a6b-4d6a-a6e7-2644ea |

## Custom Component Job Table Analysis

### Status Breakdown

| Status | Count |
|--------|------:|
| error | 131 |
| complete | 31 |
| success | 25 |
| building | 19 |

### Recent Components by Status

#### error Components (Recent 5)

| ID | Effect | Created At | Error |
|----|--------|------------|-------|
| e6ed348b-c7f2-4d26-9de4-6e03c9cd283a | HighenergyVerticalJumpScene | Tue May 13 2025 13:44:31 GMT+0700 (Indochina Time) | Build error: Build failed with 6 errors:
<stdin>:2... |
| 22a33b5b-cd53-453c-8545-559fe731bf2e | UiDashboardWalkthroughScene | Tue May 13 2025 13:24:45 GMT+0700 (Indochina Time) | Build error: Build failed with 6 errors:
<stdin>:2... |
| f6e6c8b6-f667-40ea-8b33-0e6341310f02 | AnimatedDancingBuddhaScene | Tue May 13 2025 13:23:40 GMT+0700 (Indochina Time) | Build error: Build failed with 6 errors:
<stdin>:2... |
| 8444922e-9aa7-4471-aa03-4bb8a653f1aa | DancingBuddhaAnimationScene | Tue May 13 2025 13:22:25 GMT+0700 (Indochina Time) | Build error: Build failed with 6 errors:
<stdin>:2... |
| 7fb81654-8967-48be-a5fa-72293f583f01 | AnimateThetestScene | Tue May 13 2025 09:18:00 GMT+0700 (Indochina Time) | Build error: Build failed with 9 errors:
<stdin>:3... |

#### complete Components (Recent 5)

| ID | Effect | Created At | Error |
|----|--------|------------|-------|
| 50d8b936-9b5f-4988-b5ad-4be515268e61 | TheRedBubbleScene | Mon May 12 2025 20:50:23 GMT+0700 (Indochina Time) | - |
| 31ba948d-4aef-4f7e-8d82-17e872dcabfa | ASmallRedScene | Mon May 12 2025 20:49:47 GMT+0700 (Indochina Time) | - |
| 63cea45c-4018-407c-a82b-80a5bcb3dd76 | DisplayACleanScene | Mon May 12 2025 20:25:36 GMT+0700 (Indochina Time) | - |
| 11905696-f0ac-4f00-969f-77e36c57d348 | BluePlanetCirclingScene | Mon May 12 2025 12:57:48 GMT+0700 (Indochina Time) | - |
| 7bff90dd-a813-455e-9622-c2d7eb7fa36f | ASingleOrangeScene | Mon May 12 2025 12:22:39 GMT+0700 (Indochina Time) | - |

#### success Components (Recent 5)

| ID | Effect | Created At | Error |
|----|--------|------------|-------|
| 7ed548bb-7f5a-453c-b323-8d262e340f3b | Create a vibrant fireworks display animation that ... | Fri May 09 2025 09:54:06 GMT+0700 (Indochina Time) | - |
| 2ae4084c-93be-4823-bee9-fb5429e8439b | Create a dramatic firework animation over a black ... | Fri May 09 2025 07:29:09 GMT+0700 (Indochina Time) | - |
| fea60422-4225-4f19-96c3-28c87c8702f2 | Create an animated component of a floating house t... | Thu May 08 2025 11:26:43 GMT+0700 (Indochina Time) | - |
| 75a0ef7d-0aeb-43c1-b42b-a88baa2d7cea | A vibrant fireworks display that fills the screen ... | Thu May 08 2025 09:36:31 GMT+0700 (Indochina Time) | - |
| f14ba153-c105-480d-ade7-3a81ef5392bc | Create a visually stunning fireworks display effec... | Thu May 08 2025 08:01:15 GMT+0700 (Indochina Time) | - |

#### building Components (Recent 5)

| ID | Effect | Created At | Error |
|----|--------|------------|-------|
| a23536e9-9dee-493a-8e87-0170dfae432e | FireworksAnimationOverlayScene | Sat May 10 2025 12:35:46 GMT+0700 (Indochina Time) | TSX code is missing for this job |
| d4077499-a97a-41f1-ad9e-365c9587efee | CreateARealisticScene | Sat May 10 2025 12:13:41 GMT+0700 (Indochina Time) | TSX code is missing for this job |
| 12559deb-5500-4fd6-b489-ef3d3dc41584 | SwipeupCalltoactionAnimatedScene | Sat May 10 2025 11:39:43 GMT+0700 (Indochina Time) | TSX code is missing for this job |
| ca16ab14-e057-4977-9ca7-1f1552cebaee | FeatureListBurstsScene | Sat May 10 2025 11:38:50 GMT+0700 (Indochina Time) | TSX code is missing for this job |
| 5a8942ea-16d0-4df6-9362-c6b313a26bdf | SlowmotionPlatetophoneMorphScene | Sat May 10 2025 11:38:19 GMT+0700 (Indochina Time) | TSX code is missing for this job |

