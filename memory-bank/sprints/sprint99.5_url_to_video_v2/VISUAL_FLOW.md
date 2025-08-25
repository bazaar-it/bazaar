# URL to Video V2 - Visual Flow Documentation

## Important Note
This pipeline enhances existing Sprint 99 components and outputs TSX scenes to PreviewPanelG for live preview, not rendered video files.

## Complete Pipeline Flow

```mermaid
graph TB
    subgraph "User Input"
        URL[fa:fa-link URL]
    end
    
    subgraph "Stage 1: Web Extraction"
        URL --> WE[Web Extractor]
        WE --> HTML[HTML Capture]
        WE --> SS[Screenshots]
        WE --> CS[Computed Styles]
        
        SS --> SSF[Full Page]
        SS --> SSS[Sections]
        SS --> SSE[Elements]
    end
    
    subgraph "Stage 2: Brand Analysis"
        HTML --> BA[Brand Analyzer LLM]
        SSF --> BA
        SSS --> BA
        SSE --> BA
        CS --> BA
        
        BA --> BJ[BrandJSON]
        
        BJ --> SEC[Sections]
        BJ --> COMP[Components]
        BJ --> PAL[Palette]
        BJ --> FONT[Fonts]
    end
    
    subgraph "Stage 3: Story Composition"
        BJ --> SC[Scene Composer]
        SC --> SP1[Scene 1: Hook]
        SC --> SP2[Scene 2: Problem]
        SC --> SP3[Scene 3: Solution]
        SC --> SP4[Scene 4: Features]
        SC --> SP5[Scene 5: Proof]
        SC --> SP6[Scene 6: CTA]
    end
    
    subgraph "Stage 4: Template Matching"
        SP1 --> TM1[Template Matcher]
        SP2 --> TM2[Template Matcher]
        SP3 --> TM3[Template Matcher]
        SP4 --> TM4[Template Matcher]
        SP5 --> TM5[Template Matcher]
        SP6 --> TM6[Template Matcher]
        
        TM1 --> EI1[Edit Instructions]
        TM2 --> EI2[Edit Instructions]
        TM3 --> EI3[Edit Instructions]
        TM4 --> EI4[Edit Instructions]
        TM5 --> EI5[Edit Instructions]
        TM6 --> EI6[Edit Instructions]
    end
    
    subgraph "Stage 5: Edit Tool & Preview"
        EI1 --> ET[Edit Tool]
        EI2 --> ET
        EI3 --> ET
        EI4 --> ET
        EI5 --> ET
        EI6 --> ET
        
        ET --> TSX1[TSX Scene 1]
        ET --> TSX2[TSX Scene 2]
        ET --> TSX3[TSX Scene 3]
        ET --> TSX4[TSX Scene 4]
        ET --> TSX5[TSX Scene 5]
        ET --> TSX6[TSX Scene 6]
        
        TSX1 --> PP[PreviewPanelG]
        TSX2 --> PP
        TSX3 --> PP
        TSX4 --> PP
        TSX5 --> PP
        TSX6 --> PP
        
        PP --> PREVIEW[Live Preview in Remotion Player]
    end
    
    style URL fill:#e1f5fe
    style BJ fill:#fff3e0
    style PREVIEW fill:#c8e6c9
```

## Detailed Data Flow

```mermaid
sequenceDiagram
    autonumber
    participant User
    participant API
    participant Extractor
    participant Analyzer
    participant Composer
    participant Matcher
    participant EditTool
    participant PreviewPanel
    participant Storage
    
    User->>API: POST /url-to-video { url }
    API->>Extractor: Extract(url)
    
    Note over Extractor: Launch Playwright
    Extractor->>Extractor: Navigate to URL
    Extractor->>Extractor: Wait for idle
    Extractor->>Extractor: Hide overlays
    Extractor->>Extractor: Capture screenshots
    Extractor->>Storage: Save screenshots
    Extractor-->>API: ExtractionPayload
    
    API->>Analyzer: Analyze(extraction)
    Note over Analyzer: Multi-pass analysis
    Analyzer->>Analyzer: Detect sections
    Analyzer->>Analyzer: Extract components
    Analyzer->>Analyzer: Identify styles
    Analyzer->>Analyzer: Validate evidence
    Analyzer-->>API: BrandJSON
    
    API->>Composer: Compose(brandJson)
    Note over Composer: Story planning
    Composer->>Composer: Select content
    Composer->>Composer: Allocate duration
    Composer->>Composer: Plan scenes
    Composer-->>API: ScenePlan[]
    
    loop For each scene
        API->>Matcher: Match(scene)
        Matcher->>Matcher: Filter by metadata
        Matcher->>Matcher: Score candidates
        Matcher->>Matcher: Prepare context
        Matcher-->>API: TemplateContext
    end
    
    loop For each scene
        API->>EditTool: Edit(template, context)
        Note over EditTool: Brand-aware modification
        EditTool->>EditTool: Apply brand styles
        EditTool->>EditTool: Insert content
        EditTool-->>API: TSX Code
    end
    
    API->>PreviewPanel: Update scenes
    Note over PreviewPanel: Compilation & display
    PreviewPanel->>PreviewPanel: Compile TSX
    PreviewPanel->>PreviewPanel: Display in player
    PreviewPanel->>Storage: Save to project
    PreviewPanel-->>API: Scene IDs
    
    API-->>User: { projectId, sceneIds }
```

## Screenshot Strategy

```mermaid
graph TD
    subgraph "Page Capture Strategy"
        P[Page Load] --> W[Wait 3s]
        W --> H[Hide Overlays]
        
        H --> F[Full Page]
        F --> F1[Viewport 0-1600px]
        F --> F2[Viewport 1600-3200px]
        F --> F3[Continue until bottom]
        
        H --> S[Section Crops]
        S --> S1[Hero Section]
        S --> S2[Features Section]
        S --> S3[Testimonials Section]
        S --> S4[Pricing Section]
        S --> S5[Footer Section]
        
        H --> E[Element Crops]
        E --> E1[Primary CTA]
        E --> E2[Logo]
        E --> E3[Feature Cards]
        E --> E4[Testimonial Cards]
        E --> E5[Pricing Cards]
    end
    
    style P fill:#e3f2fd
    style F fill:#fff9c4
    style S fill:#f3e5f5
    style E fill:#e8f5e9
```

## BrandJSON Structure

```mermaid
graph LR
    subgraph "BrandJSON"
        BJ[BrandJSON Root]
        
        BJ --> B[Brand]
        B --> BN[Name]
        B --> BV[Voice]
        B --> BA[Archetype]
        
        BJ --> D[Design]
        D --> DC[Colors]
        D --> DF[Fonts]
        D --> DS[Spacing]
        
        BJ --> S[Sections]
        S --> S1[Hero]
        S --> S2[Features]
        S --> S3[Testimonials]
        
        S1 --> S1C[Content]
        S1 --> S1U[UI Components]
        S1 --> S1E[Evidence]
        
        S1U --> C1[Hero Banner]
        S1U --> C2[CTA Button]
        S1U --> C3[Nav Bar]
    end
    
    style BJ fill:#fff3e0
    style S1E fill:#ffebee
```

## Scene Planning Logic

```mermaid
graph TD
    subgraph "Scene Planning"
        BJ[BrandJSON] --> A{Analyze Content}
        
        A --> H{Has Hero?}
        H -->|Yes| SH[Create Hook Scene]
        H -->|No| FH[Fallback Hook]
        
        A --> P{Has Problems?}
        P -->|Yes| SP[Create Problem Scene]
        P -->|No| SKIP1[Skip]
        
        A --> F{Has Features?}
        F -->|Yes| SF[Create Feature Scene]
        F -->|No| SKIP2[Skip]
        
        A --> T{Has Testimonials?}
        T -->|Yes| ST[Create Proof Scene]
        T -->|No| SKIP3[Skip]
        
        A --> C{Has CTA?}
        C -->|Yes| SC[Create CTA Scene]
        C -->|No| FC[Fallback CTA]
        
        SH --> PLAN[Scene Plan]
        SP --> PLAN
        SF --> PLAN
        ST --> PLAN
        SC --> PLAN
    end
    
    style BJ fill:#fff3e0
    style PLAN fill:#c8e6c9
```

## Template Matching Process (Metadata-Driven)

```mermaid
graph TD
    subgraph "Template Matching"
        S[Scene] --> R{Check Requirements}
        
        R --> META[Check Metadata]
        META --> T1[Template A]
        META --> T2[Template B]
        META --> T3[Template C]
        META --> T4[Template D]
        
        T1 --> S1[Industry: +30, Archetype: +25 = 85]
        T2 --> S2[Industry: +0, Archetype: +20 = 60]
        T3 --> S3[Industry: +30, Data: +15, Visual: +10 = 92]
        T4 --> S4[Industry: +0, Visual: +5 = 45]
        
        S1 --> SORT[Sort by Score]
        S2 --> SORT
        S3 --> SORT
        S4 --> SORT
        
        SORT --> SEL[Select Top]
        SEL --> T3S[Template C Selected]
        
        T3S --> CTX[Prepare Context]
        CTX --> ET[Edit Tool]
        ET --> TSX[TSX Code]
        TSX --> PP[PreviewPanelG]
    end
    
    style S fill:#e3f2fd
    style T3S fill:#c8e6c9
    style PP fill:#c8e6c9
    style TSX fill:#fff3e0
```

## Evidence Tracking

```mermaid
graph LR
    subgraph "Evidence Chain"
        SS[Screenshot] --> |references| SEC[Section]
        SEC --> |contains| COMP[Component]
        COMP --> |has| TEXT[Text Content]
        
        TEXT --> |used in| SCENE[Scene]
        SCENE --> |bound to| TEMP[Template]
        TEMP --> |renders| VIDEO[Video Frame]
        
        VIDEO -.->|traceable to| SS
    end
    
    style SS fill:#e3f2fd
    style VIDEO fill:#c8e6c9
```

## Quality Gates

```mermaid
graph TD
    subgraph "Quality Validation"
        I[Input] --> Q1{Extraction Valid?}
        Q1 -->|No| FAIL1[Retry/Fail]
        Q1 -->|Yes| Q2{BrandJSON Complete?}
        
        Q2 -->|No| FAIL2[Add Defaults]
        Q2 -->|Yes| Q3{Scenes Valid?}
        
        Q3 -->|No| FAIL3[Regenerate]
        Q3 -->|Yes| Q4{Templates Match?}
        
        Q4 -->|No| FAIL4[Use Fallback]
        Q4 -->|Yes| Q5{Contrast OK?}
        
        Q5 -->|No| FAIL5[Adjust Colors]
        Q5 -->|Yes| Q6{Duration OK?}
        
        Q6 -->|No| FAIL6[Adjust Timing]
        Q6 -->|Yes| PASS[Send to PreviewPanelG]
    end
    
    style PASS fill:#c8e6c9
    style FAIL1 fill:#ffebee
    style FAIL2 fill:#ffebee
    style FAIL3 fill:#ffebee
    style FAIL4 fill:#ffebee
    style FAIL5 fill:#ffebee
    style FAIL6 fill:#ffebee
```

## Example: Fintech Homepage

```mermaid
graph TD
    subgraph "Example Flow"
        URL[ramp.com] --> EX[Extract]
        
        EX --> SC1[Screenshot: Hero]
        EX --> SC2[Screenshot: Features]
        EX --> SC3[Screenshot: Logos]
        
        SC1 --> B1[Brand: Professional]
        SC2 --> B2[Features: 4 cards]
        SC3 --> B3[Proof: 6 logos]
        
        B1 --> S1[Scene 1: Hook - 4s]
        B2 --> S2[Scene 2: Features - 5s]
        B3 --> S3[Scene 3: Proof - 3s]
        
        S1 --> T1[HeroReveal Template]
        S2 --> T2[FeatureCards Template]
        S3 --> T3[LogoMarquee Template]
        
        T1 --> ET[Edit Tool]
        T2 --> ET
        T3 --> ET
        
        ET --> TSX[TSX Scenes]
        TSX --> PP[PreviewPanelG]
        PP --> V[Live Preview: 12s total]
    end
    
    style URL fill:#e3f2fd
    style V fill:#c8e6c9
```

## Performance Optimization

```mermaid
graph LR
    subgraph "Parallel Processing"
        EX[Extraction] --> |parallel| SS1[Screenshot 1]
        EX --> |parallel| SS2[Screenshot 2]
        EX --> |parallel| SS3[Screenshot 3]
        
        AN[Analysis] --> |batch| LLM[LLM Call]
        
        GEN[Generation] --> |parallel| G1[Edit Scene 1]
        GEN --> |parallel| G2[Edit Scene 2]
        GEN --> |parallel| G3[Edit Scene 3]
        
        G1 --> COMP[Compile in PreviewPanelG]
        G2 --> COMP
        G3 --> COMP
    end
    
    style EX fill:#e3f2fd
    style COMP fill:#c8e6c9
```

## Error Recovery Flow

```mermaid
graph TD
    subgraph "Error Handling"
        E[Error Detected] --> T{Error Type}
        
        T -->|Screenshot| RS[Retry Screenshot]
        RS --> |3x| RSF{Success?}
        RSF -->|No| DEFAULT1[Use Placeholder]
        RSF -->|Yes| CONTINUE1[Continue]
        
        T -->|Analysis| RA[Retry Analysis]
        RA --> |2x| RAF{Success?}
        RAF -->|No| SIMPLE[Use Simple Analysis]
        RAF -->|Yes| CONTINUE2[Continue]
        
        T -->|Template| RT[Find Alternative]
        RT --> FALLBACK[Use Generic Template]
        
        T -->|Compilation| RC[Retry Compile]
        RC --> |3x| RCF{Success?}
        RCF -->|No| AUTOFIX[Try Auto-Fix]
        RCF -->|Yes| CONTINUE3[Continue]
        
        AUTOFIX --> |Success| CONTINUE4[Continue]
        AUTOFIX --> |Fail| FAIL[Mark Failed]
    end
    
    style E fill:#ffebee
    style CONTINUE1 fill:#c8e6c9
    style CONTINUE2 fill:#c8e6c9
    style CONTINUE3 fill:#c8e6c9
    style CONTINUE4 fill:#c8e6c9
```