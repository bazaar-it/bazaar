# Database Structure Analysis

*Generated on 2025-05-15T16:04:54.265Z*

## Tables

| # | Table Name | Row Count |
|---|------------|----------:|
| 1 | bazaar-vid_account | 4 |
| 2 | bazaar-vid_animation_design_brief | 102 |
| 3 | bazaar-vid_component_error | 0 |
| 4 | bazaar-vid_custom_component_job | 71 |
| 5 | bazaar-vid_message | 310 |
| 6 | bazaar-vid_metric | 387 |
| 7 | bazaar-vid_patch | 260 |
| 8 | bazaar-vid_project | 104 |
| 9 | bazaar-vid_scene_plan | 55 |
| 10 | bazaar-vid_user | 6 |
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
| original_tsx_code | text | Yes | - |
| last_fix_attempt | timestamp with time zone | Yes | - |
| fix_issues | text | Yes | - |
| originalTsxCode | text | Yes | - |
| lastFixAttempt | timestamp with time zone | Yes | - |
| fixIssues | text | Yes | - |

#### Sample Data

| id | projectId | effect | tsxCode | status | outputUrl | errorMessage | retryCount | createdAt | updatedAt | metadata | statusMessageId | original_tsx_code | last_fix_attempt | fix_issues | originalTsxCode | lastFixAttempt | fixIssues |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 82af8899-5e5f-488d-940b-0db519 | 00000000-0000-0000-0000-000000 | {"type":"fadeIn","duration":10 | 
import { AbsoluteFill, useCur | error | - | Build error: Build failed with | 0 | "2025-05-13T14:02:52.221Z"... | "2025-05-13T14:02:53.187Z"... | - | - | - | - | - | - | - | - |
| 270d79bf-2697-49eb-9ed4-5aacce | 00000000-0000-0000-0000-000000 | {"type":"fadeIn","duration":10 | 
// import { AbsoluteFill, use | complete | https://pub-80969e2c6b73496db9 | - | 0 | "2025-05-14T03:14:34.559Z"... | "2025-05-14T03:14:38.568Z"... | - | - | - | - | - | - | - | - |
| 8d57a2f9-47cd-4e7e-abd7-c7cf96 | 00000000-0000-0000-0000-000000 | {"type":"fadeIn","duration":10 | 
import { AbsoluteFill, useCur | error | - | Build error: Build failed with | 0 | "2025-05-13T14:07:06.246Z"... | "2025-05-13T14:07:07.163Z"... | - | - | - | - | - | - | - | - |

## Custom Component Job Table Analysis

### Status Breakdown

| Status | Count |
|--------|------:|
| complete | 28 |
| error | 22 |
| success | 10 |
| failed | 9 |
| building | 2 |

### Recent Components by Status

#### complete Components (Recent 5)

| ID | Effect | Created At | Error |
|----|--------|------------|-------|
| f390ee24-03b8-4c12-9a59-b71ae0c35b37 | {"type":"fadeIn","duration":1000,"target":"element... | Wed May 14 2025 11:26:43 GMT+0700 (Indochina Time) | - |
| 5339d891-afd2-4266-8405-a15d74e7568c | CanaryTest_1747196027510 | Wed May 14 2025 11:13:49 GMT+0700 (Indochina Time) | - |
| 0f520073-5716-4edc-8755-e6927f6d97a9 | CanaryTest_1747193899458 | Wed May 14 2025 10:38:21 GMT+0700 (Indochina Time) | - |
| a45af025-c839-40a6-b806-822ba5566ecc | CanaryTest_1747193843357 | Wed May 14 2025 10:37:25 GMT+0700 (Indochina Time) | - |
| 95902727-2bc2-49bf-a86e-8e56a60c3c45 | CanaryTest_1747193759885 | Wed May 14 2025 10:36:01 GMT+0700 (Indochina Time) | - |

#### error Components (Recent 5)

| ID | Effect | Created At | Error |
|----|--------|------------|-------|
| fdd0a1e2-fe9b-4f60-bafb-cad7da7d501d | AMinimalistCanvasScene | Thu May 15 2025 21:49:06 GMT+0700 (Indochina Time) | TSX code is missing for this job |
| fa309597-d7f3-409c-9e7e-ee1aae6cca92 | FullscreenRetroSnakeScene | Thu May 15 2025 16:43:15 GMT+0700 (Indochina Time) | TSX code is missing for this job |
| f2738a99-3576-4297-9233-cea63fe1e353 | TheBallBouncesScene | Thu May 15 2025 16:30:56 GMT+0700 (Indochina Time) | TSX code is missing for this job |
| 7f8e1297-c5be-45d5-b1a5-20ccc7885544 | TheShoeKicksScene | Thu May 15 2025 16:30:33 GMT+0700 (Indochina Time) | TSX code is missing for this job |
| 55c9be9b-5b21-42b1-8df1-63d079a377c7 | ACloseupOfScene | Thu May 15 2025 16:30:11 GMT+0700 (Indochina Time) | TSX code is missing for this job |

#### success Components (Recent 5)

| ID | Effect | Created At | Error |
|----|--------|------------|-------|
| 35bfb3bc-bad3-4e7b-a856-157b69b0abdf | Test 3: Function Component Style with Props Destru... | Wed May 14 2025 23:05:22 GMT+0700 (Indochina Time) | - |
| 2489eaf2-68e0-49e6-a583-960ee995aed7 | Test 2: Simplified Format with default export only | Wed May 14 2025 23:05:22 GMT+0700 (Indochina Time) | - |
| ffb2ae8c-a5cc-4a5d-a96b-f728ed65c231 | Test 1: Standard Format with React.FC and explicit... | Wed May 14 2025 23:05:21 GMT+0700 (Indochina Time) | - |
| af8b9fdd-aa0d-4f7f-b370-99649d56796f | Test 3: Function Component Style with Props Destru... | Wed May 14 2025 22:54:49 GMT+0700 (Indochina Time) | - |
| 731bc18a-bfdf-4781-ad75-06cfde9a5890 | Test 2: Simplified Format with default export only | Wed May 14 2025 22:54:48 GMT+0700 (Indochina Time) | - |

#### failed Components (Recent 5)

| ID | Effect | Created At | Error |
|----|--------|------------|-------|
| dda49115-3318-4074-a087-a436a7f91f27 | ADynamicFireworksScene | Wed May 14 2025 08:24:09 GMT+0700 (Indochina Time) | Generated component has syntax errors: Identifier ... |
| 1a0c7f8e-cd45-4eee-8bf1-75a14cfbee65 | ShowcaseADynamicScene | Wed May 14 2025 08:09:53 GMT+0700 (Indochina Time) | Generated component has syntax errors: Unexpected ... |
| a472b2ac-b0b0-4e88-881f-bc05359aeedf | BlueFireworksSceneScene | Wed May 14 2025 07:58:02 GMT+0700 (Indochina Time) | Generated component has syntax errors: Unexpected ... |
| 023648f4-609b-4431-ad60-e2c01e43990d | CloseupCustomShotScene | Wed May 14 2025 07:54:32 GMT+0700 (Indochina Time) | Generated component has syntax errors: Identifier ... |
| 8e6c6f61-c73b-47c2-8031-6e5629f2ab47 | AnAnimatedFlyingScene | Wed May 14 2025 07:54:09 GMT+0700 (Indochina Time) | Generated component has syntax errors: Unexpected ... |

#### building Components (Recent 5)

| ID | Effect | Created At | Error |
|----|--------|------------|-------|
| 46a6e2c8-8e1f-408a-b4a8-a131ec82e48a | OnceARowScene | Thu May 15 2025 22:12:47 GMT+0700 (Indochina Time) | esbuild compilation failed: Build failed with 1 er... |
| 69ecccb5-862c-43a7-b5a5-ddd7cf7776f3 | AnimateVariousTetrominoScene | Thu May 15 2025 22:12:17 GMT+0700 (Indochina Time) | esbuild compilation failed: Build failed with 1 er... |

