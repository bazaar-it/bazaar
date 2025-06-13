# Quick Summary: Their Tools vs Our Services

## Structure Comparison

### Their `/src/tools/` (Restructure Brain)
✅ **Beautiful, clean structure**
✅ **Well-organized by operation** (add/edit/delete)
✅ **Has documentation** (ARCHITECTURE.md)
✅ **Unified types** across all tools

❌ **Wrong location** (should be in /server/services/)
❌ **"NEW" suffix everywhere** (ugly naming)
❌ **Tool execution in brain** (architectural mistake)
❌ **Returns `sceneCode`** instead of `tsxCode`

### Our `/src/server/services/scene/` (Mark-12)
✅ **Correct location** in services directory
✅ **Clean naming** (no "NEW" suffix)
✅ **Better abstraction** (repository pattern)
✅ **Service-oriented** architecture

❌ **Less obvious structure** (missing README)
❌ **Also maps fields** (`code` → `tsxCode`)
❌ **More complex** with multiple layers

## The Real Issue: We Have Both!

After the merge, we have:
- Their tools in `/src/tools/`
- Our services in `/src/server/services/scene/`
- PLUS: 2 sets of MCP tools
- PLUS: 3 orchestrators
- PLUS: 4 VideoStates

**Total: 3+ implementations of everything!**

## What Should We Do?

### Take the Best of Both:

**From Theirs:**
- ✅ Directory structure (add/, edit/, delete/)
- ✅ Documentation approach
- ✅ Unified type system

**From Ours:**
- ✅ Service location (/server/services/)
- ✅ Clean naming (no "NEW")
- ✅ Repository pattern
- ✅ Database abstraction

**Fix in Both:**
- 🔧 Use `tsxCode` everywhere (match database)
- 🔧 Move execution out of brain
- 🔧 Delete all duplicates

## Final Structure Should Be:

```
/src/server/services/scene/
├── README.md                    # Their documentation approach
├── scene.service.ts             # Our coordinator pattern
├── types.ts                     # Their unified types
├── add/                         # Their organization
│   ├── AddScene.service.ts      # Our service pattern
│   └── [helpers...]
├── edit/                        # Their organization
│   ├── EditScene.service.ts     # Our service pattern
│   └── [helpers...]
└── delete/                      # Their organization
    └── DeleteScene.service.ts   # Our service pattern
```

## Bottom Line

- **Their structure is better** for organization
- **Our patterns are better** for architecture
- **Both have field naming issues**
- **We need to pick ONE and delete the rest**

The real problem isn't their code vs our code - it's that we have **THREE versions of everything** after the merge!