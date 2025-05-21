<!-- path: memory-bank/remotion/custom-components-guide.md -->
# Creating Custom Components for Bazaar-vid Remotion Player

This guide has been updated for the ESM-based loading approach introduced in Sprint 25.

## Common Issues

- **Syntax Errors**: Ensure JSX tags are properly closed and nested.
- **Missing Default Export**: The Player expects the component to be the module's default export.
- **Runtime Errors**: Check the browser console and server logs if the component fails to load.

## Working Component Template

```tsx
import { AbsoluteFill } from 'remotion';
import React from 'react';

export interface MyComponentProps {
  color?: string;
  size?: number;
  text?: string;
}

const MyComponent: React.FC<MyComponentProps> = ({
  color = '#ff0000',
  size = 200,
  text = 'Remotion Circle',
}) => (
  <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          color: 'white',
          fontWeight: 'bold',
        }}
      >
        {text}
      </div>
    </div>
  </AbsoluteFill>
);

export default MyComponent;
```

## How Components Are Processed

1. The component code is stored in the database as TSX.
2. During build the code is compiled with esbuild to an ESM file and uploaded to R2 storage.
3. When added to a video, `React.lazy` dynamically imports the module from the stored URL and renders the default export.

## Troubleshooting

1. **Check the Console Logs** – browser and server logs usually explain loading failures.
2. **Use the Fix Script** – `npx tsx src/scripts/fix-component-syntax.ts <component-id>` can resolve common syntax problems.
3. **Start from the Template** – if issues persist, copy the template above and adjust it incrementally.

Follow these guidelines and your custom components should work properly in the Bazaar-vid Remotion player.
