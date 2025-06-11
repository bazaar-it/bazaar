# Evaluation Comparison Report
Generated: 2025-06-10T13:46:33.451Z
Session ID: 2025-06-10T13-08-18-515Z

## Summary
- Model Packs Tested: optimal-pack, openai-pack
- Total Tests: 26
- Successful Tests: 24

## Detailed Comparisons

### Company Intro Creation
**Input**: generate an intro video for my company. its called Spinlio. we do cyber security. we have a new feature we want to showcase. its called cloud security with AI

| Model Pack | Tool Selected | Clarification | Latency | Cost | Success |
|------------|---------------|---------------|---------|------|---------|
| optimal-pack | addScene | ❌ | 115345ms | $0.0052 | ✅ |
| openai-pack | addScene | ❌ | 103252ms | $0.0065 | ✅ |

**Reasoning Comparison**:

**Generated Code Files**: company-intro_optimal-pack.tsx, company-intro_openai-pack.tsx

---

### Product Demo Creation
**Input**: create a product demo scene showing our new dashboard. use modern colors and smooth animations. the product is called DataViz Pro

| Model Pack | Tool Selected | Clarification | Latency | Cost | Success |
|------------|---------------|---------------|---------|------|---------|
| optimal-pack | addScene | ❌ | 215736ms | $0.0056 | ✅ |
| openai-pack | addScene | ❌ | 132891ms | $0.0053 | ✅ |

**Reasoning Comparison**:

**Generated Code Files**: product-demo_optimal-pack.tsx, product-demo_openai-pack.tsx

---

### Make Scene Faster
**Input**: make it faster

| Model Pack | Tool Selected | Clarification | Latency | Cost | Success |
|------------|---------------|---------------|---------|------|---------|
| optimal-pack | changeDuration | ❌ | 14090ms | $0.0032 | ✅ |
| openai-pack | changeDuration | ❌ | 6761ms | $0.0032 | ✅ |

**Reasoning Comparison**:

---

### Speed Up and Set Duration
**Input**: speed it up and make the scene 3 seconds

| Model Pack | Tool Selected | Clarification | Latency | Cost | Success |
|------------|---------------|---------------|---------|------|---------|
| optimal-pack | changeDuration | ❌ | 15971ms | $0.0032 | ✅ |
| openai-pack | changeDuration | ❌ | 6261ms | $0.0032 | ✅ |

**Reasoning Comparison**:

---

### Center Content
**Input**: make it centered

| Model Pack | Tool Selected | Clarification | Latency | Cost | Success |
|------------|---------------|---------------|---------|------|---------|
| optimal-pack | editScene | ❌ | 50648ms | $0.0024 | ✅ |
| openai-pack | editScene | ❌ | 67156ms | $0.0037 | ✅ |

**Reasoning Comparison**:

**Generated Code Files**: center-content_optimal-pack.tsx, center-content_openai-pack.tsx

---

### Animate Background Elements
**Input**: animate the background circles to move inward in a spiral pattern

| Model Pack | Tool Selected | Clarification | Latency | Cost | Success |
|------------|---------------|---------------|---------|------|---------|
| optimal-pack | editScene | ❌ | 85468ms | $0.0039 | ✅ |
| openai-pack | editScene | ❌ | 114416ms | $0.0033 | ✅ |

**Reasoning Comparison**:

**Generated Code Files**: animate-background_optimal-pack.tsx, animate-background_openai-pack.tsx

---

### Delete Scene
**Input**: delete the scene

| Model Pack | Tool Selected | Clarification | Latency | Cost | Success |
|------------|---------------|---------------|---------|------|---------|
| optimal-pack | none | ❌ | 9440ms | $0.0022 | ✅ |
| openai-pack | none | ❌ | 7841ms | $0.0020 | ✅ |

**Reasoning Comparison**:

---

### Add Button with Image Reference
**Input**: recreate this button with hover animations and glow effects

| Model Pack | Tool Selected | Clarification | Latency | Cost | Success |
|------------|---------------|---------------|---------|------|---------|
| optimal-pack | editSceneWithImage | ❌ | 94706ms | $0.0062 | ✅ |
| openai-pack | editSceneWithImage | ❌ | 111869ms | $0.0056 | ✅ |

**Reasoning Comparison**:

**Generated Code Files**: add-button-with-image_optimal-pack.tsx, add-button-with-image_openai-pack.tsx

---

### Create Scene from Image
**Input**: create this design with smooth motion graphics animations

| Model Pack | Tool Selected | Clarification | Latency | Cost | Success |
|------------|---------------|---------------|---------|------|---------|
| optimal-pack | createSceneFromImage | ❌ | 241130ms | $0.0045 | ✅ |
| openai-pack | createSceneFromImage | ❌ | 214771ms | $0.0048 | ✅ |

**Reasoning Comparison**:

**Generated Code Files**: create-scene-from-image_optimal-pack.tsx, create-scene-from-image_openai-pack.tsx

---

### Analyze Image Then Create
**Input**: analyze this design in detail and recreate it with particle effects

| Model Pack | Tool Selected | Clarification | Latency | Cost | Success |
|------------|---------------|---------------|---------|------|---------|
| optimal-pack | workflow_2_steps | ❌ | 216876ms | $0.0056 | ✅ |
| openai-pack | workflow_2_steps | ❌ | 190659ms | $0.0053 | ✅ |

**Reasoning Comparison**:

**Generated Code Files**: analyze-then-create_optimal-pack.tsx, analyze-then-create_openai-pack.tsx

---

### Context-Aware Scene Edit
**Input**: make the background more corporate and professional

| Model Pack | Tool Selected | Clarification | Latency | Cost | Success |
|------------|---------------|---------------|---------|------|---------|
| optimal-pack | editScene | ❌ | 66793ms | $0.0035 | ✅ |
| openai-pack | editScene | ❌ | 67150ms | $0.0045 | ✅ |

**Reasoning Comparison**:

**Generated Code Files**: context-aware-edit_optimal-pack.tsx, context-aware-edit_openai-pack.tsx

---

### Ambiguous Request Clarification
**Input**: make it better

| Model Pack | Tool Selected | Clarification | Latency | Cost | Success |
|------------|---------------|---------------|---------|------|---------|
| optimal-pack | editScene | ❌ | 104011ms | $0.0049 | ✅ |
| openai-pack | none | ❌ | 4962ms | $0.0025 | ✅ |

**Reasoning Comparison**:

**Generated Code Files**: ambiguous-request_optimal-pack.tsx

---

### Edit Without Scene Context
**Input**: change the text color to blue

| Model Pack | Tool Selected | Clarification | Latency | Cost | Success |
|------------|---------------|---------------|---------|------|---------|
| optimal-pack | none | ❌ | 4399ms | $0.0000 | ❌ |
| openai-pack | none | ❌ | 4930ms | $0.0000 | ❌ |

**Reasoning Comparison**:

---

