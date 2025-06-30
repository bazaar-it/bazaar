# 🎭 Bazaar-Vid Avatar System

A simple avatar system with 5 diverse professional headshots for AI-generated video scenes.

## 📁 Directory Structure

```
public/avatars/
├── asian-woman.png           # Asian woman
├── black-man.png            # Black man  
├── hispanic-man.png         # Hispanic man
├── middle-eastern-man.png   # Middle Eastern man
└── white-woman.png          # White woman

src/lib/avatars/
├── avatarRegistry.ts        # Avatar metadata and functions
└── README.md               # This documentation
```

## 🎯 Available Avatars

- **asian-woman**: Professional Asian woman with warm smile
- **black-man**: Friendly Black man with casual style
- **hispanic-man**: Professional Hispanic man with confident expression  
- **middle-eastern-man**: Professional Middle Eastern man with business style
- **white-woman**: Friendly white woman with bright smile

## 💻 Usage in AI-Generated Scenes

The avatar system is globally available via `window.BazaarAvatars` in all AI-generated Remotion components.

### Basic Avatar Image

```typescript
<window.BazaarAvatars.AvatarImage 
  id="asian-woman" 
  size={120}
  style={{
    borderRadius: "50%",
    position: "absolute",
    top: 100,
    left: 200
  }}
/>
```

### Avatar Profile Card

```typescript
<window.BazaarAvatars.AvatarCard
  id="black-man"
  size={100}
  showName={true}
  showTitle={true}
  title="Product Manager"
  style={{
    position: "absolute",
    top: 200,
    left: 300
  }}
/>
```

### Get All Avatars

```typescript
const allAvatars = window.BazaarAvatars.getAll();
const randomAvatar = window.BazaarAvatars.getRandom();
const specificAvatar = window.BazaarAvatars.getById("hispanic-man");
```

## 🔧 API Reference

```typescript
// Get avatar by ID
window.BazaarAvatars.getById(id: string): AvatarAsset | undefined

// Get all avatars
window.BazaarAvatars.getAll(): AvatarAsset[]

// Get random avatar
window.BazaarAvatars.getRandom(): AvatarAsset

// Avatar Image Component
window.BazaarAvatars.AvatarImage: React.ComponentType<{
  id: string;
  size?: number;
  style?: React.CSSProperties;
  className?: string;
}>

// Avatar Card Component  
window.BazaarAvatars.AvatarCard: React.ComponentType<{
  id: string;
  size?: number;
  showName?: boolean;
  showTitle?: boolean;
  title?: string;
  style?: React.CSSProperties;
}>
```

### Avatar Asset Interface

```typescript
interface AvatarAsset {
  id: string;
  name: string;
  url: string;
  description: string;
}
``` 