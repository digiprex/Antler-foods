# Hero Component Documentation

## Overview

The Hero component is a flexible, customizable hero section with multiple layout options. Similar to the Navbar and Footer components, it supports dynamic configuration and styling through props or database/API integration.

## Features

- **10 Layout Options**: Multiple pre-built layouts for different use cases
- **Dynamic Styling**: CSS variables for easy theming
- **Responsive Design**: Mobile-first approach with breakpoint optimizations
- **Media Support**: Images, videos, and background images
- **Feature Cards**: Optional feature/benefit cards below main content
- **Call-to-Action Buttons**: Primary and secondary button support
- **Scroll Indicator**: Optional animated scroll indicator
- **Type-Safe**: Full TypeScript support with comprehensive types

## Installation

```tsx
import Hero from '@/components/hero';
import type { HeroConfig } from '@/types/hero.types';
```

## Basic Usage

### Simple Hero

```tsx
<Hero
  headline="Welcome to Our Restaurant"
  subheadline="Experience culinary excellence"
  description="Discover exceptional dining with fresh ingredients"
  primaryButton={{
    label: 'View Menu',
    href: '#menu',
    variant: 'primary'
  }}
  layout="centered-large"
/>
```

### Hero with Image

```tsx
<Hero
  headline="Fine Dining Experience"
  description="Where every dish tells a story"
  image={{
    url: '/images/hero-image.jpg',
    alt: 'Restaurant interior'
  }}
  primaryButton={{ label: 'Reserve Now', href: '#reservations' }}
  secondaryButton={{ label: 'View Menu', href: '#menu' }}
  layout="split"
/>
```

### Hero with Video Background

```tsx
<Hero
  headline="Welcome to Our World"
  description="Experience the art of cooking"
  videoUrl="/videos/hero-background.mp4"
  primaryButton={{ label: 'Get Started', href: '#menu' }}
  layout="video-background"
  textColor="#ffffff"
  overlayOpacity={0.6}
/>
```

### Hero with Features

```tsx
<Hero
  headline="Why Choose Us"
  description="Experience the difference"
  features={[
    {
      icon: '🍽️',
      title: 'Fresh Ingredients',
      description: 'Locally sourced daily'
    },
    {
      icon: '👨‍🍳',
      title: 'Expert Chefs',
      description: 'Award-winning culinary team'
    },
    {
      icon: '🌟',
      title: 'Premium Service',
      description: 'Unforgettable dining experience'
    }
  ]}
  layout="with-features"
/>
```

## Layout Options

### 1. `default`
Standard centered content layout with optional background.

```tsx
<Hero layout="default" headline="Welcome" />
```

### 2. `centered-large`
Large centered hero with prominent headline (default layout).

```tsx
<Hero 
  layout="centered-large"
  headline="Your Adventure Begins Here"
  minHeight="700px"
/>
```

### 3. `split`
Text on left, image on right (50/50 split).

```tsx
<Hero 
  layout="split"
  image={{ url: '/image.jpg', alt: 'Hero' }}
/>
```

### 4. `split-reverse`
Image on left, text on right.

```tsx
<Hero 
  layout="split-reverse"
  image={{ url: '/image.jpg', alt: 'Hero' }}
/>
```

### 5. `minimal`
Minimalist centered text, no description.

```tsx
<Hero 
  layout="minimal"
  headline="Simple. Elegant."
/>
```

### 6. `video-background`
Full-screen video background with overlay.

```tsx
<Hero 
  layout="video-background"
  videoUrl="/video.mp4"
  overlayOpacity={0.5}
/>
```

### 7. `side-by-side`
Two equal columns layout.

```tsx
<Hero 
  layout="side-by-side"
  image={{ url: '/image.jpg', alt: 'Hero' }}
/>
```

### 8. `offset`
Offset text with overlapping image.

```tsx
<Hero 
  layout="offset"
  image={{ url: '/image.jpg', alt: 'Hero' }}
/>
```

### 9. `full-height`
Full viewport height hero section.

```tsx
<Hero 
  layout="full-height"
  minHeight="100vh"
  showScrollIndicator={true}
/>
```

### 10. `with-features`
Hero with feature cards below main content.

```tsx
<Hero 
  layout="with-features"
  features={[...]}
/>
```

## Props Reference

### HeroConfig Properties

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `headline` | `string` | `'Welcome to Our Restaurant'` | Main headline text |
| `subheadline` | `string` | - | Optional subheadline (appears above headline) |
| `description` | `string` | - | Supporting description text |
| `primaryButton` | `HeroButton` | - | Primary call-to-action button |
| `secondaryButton` | `HeroButton` | - | Secondary call-to-action button |
| `image` | `HeroImage` | - | Hero image configuration |
| `videoUrl` | `string` | - | URL for video background |
| `backgroundImage` | `string` | - | URL for background image |
| `features` | `HeroFeature[]` | `[]` | Feature cards array |
| `layout` | `Layout` | `'centered-large'` | Layout variant |
| `bgColor` | `string` | `'#ffffff'` | Background color |
| `textColor` | `string` | `'#000000'` | Text color |
| `overlayColor` | `string` | `'#000000'` | Overlay color (for video/image backgrounds) |
| `overlayOpacity` | `number` | `0.5` | Overlay opacity (0-1) |
| `textAlign` | `'left' \| 'center' \| 'right'` | `'center'` | Text alignment |
| `paddingTop` | `string` | `'6rem'` | Top padding |
| `paddingBottom` | `string` | `'6rem'` | Bottom padding |
| `minHeight` | `string` | `'600px'` | Minimum height |
| `showScrollIndicator` | `boolean` | `false` | Show animated scroll indicator |
| `contentMaxWidth` | `string` | `'1200px'` | Maximum content width |

### HeroButton Type

```typescript
interface HeroButton {
  label: string;
  href: string;
  variant?: 'primary' | 'secondary' | 'outline';
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
}
```

### HeroImage Type

```typescript
interface HeroImage {
  url: string;
  alt: string;
  position?: 'left' | 'right' | 'center' | 'background';
}
```

### HeroFeature Type

```typescript
interface HeroFeature {
  icon?: string;
  title: string;
  description?: string;
}
```

## Styling & Theming

The Hero component uses CSS variables for dynamic styling:

```tsx
<Hero
  headline="Custom Styled Hero"
  bgColor="#1a1a1a"
  textColor="#ffffff"
  primaryButton={{
    label: 'Get Started',
    href: '#start',
    bgColor: '#ff6b6b',
    textColor: '#ffffff'
  }}
/>
```

### CSS Variables

The component sets these CSS variables automatically:

- `--hero-bg-color`: Background color
- `--hero-text-color`: Text color
- `--hero-overlay-color`: Overlay color
- `--hero-overlay-opacity`: Overlay opacity
- `--hero-padding-top`: Top padding
- `--hero-padding-bottom`: Bottom padding
- `--hero-min-height`: Minimum height
- `--hero-content-max-width`: Content max width
- `--hero-text-align`: Text alignment

## Advanced Examples

### Restaurant Landing Hero

```tsx
<Hero
  subheadline="Est. 2024"
  headline="Maison de Cuisine"
  description="Where tradition meets innovation in every dish"
  primaryButton={{
    label: 'Reserve Table',
    href: '#reservations',
    variant: 'primary',
    bgColor: '#d4af37',
    textColor: '#000000'
  }}
  secondaryButton={{
    label: 'View Menu',
    href: '#menu',
    variant: 'outline'
  }}
  backgroundImage="/images/restaurant-bg.jpg"
  layout="centered-large"
  textColor="#ffffff"
  overlayColor="#000000"
  overlayOpacity={0.5}
  minHeight="100vh"
  showScrollIndicator={true}
/>
```

### Split Layout with Features

```tsx
<Hero
  headline="Exceptional Dining"
  description="Experience the finest in culinary artistry"
  image={{
    url: '/images/chef-cooking.jpg',
    alt: 'Chef preparing meal'
  }}
  primaryButton={{
    label: 'Book Now',
    href: '#book'
  }}
  features={[
    {
      icon: '⭐',
      title: 'Michelin Star',
      description: '3-star rated'
    },
    {
      icon: '🍷',
      title: 'Wine Selection',
      description: '500+ premium wines'
    },
    {
      icon: '🎵',
      title: 'Live Music',
      description: 'Every weekend'
    }
  ]}
  layout="with-features"
  bgColor="#f8f9fa"
/>
```

### Video Background Hero

```tsx
<Hero
  headline="Culinary Excellence"
  description="Watch our chefs create magic"
  videoUrl="/videos/kitchen.mp4"
  primaryButton={{
    label: 'Explore Menu',
    href: '#menu',
    variant: 'primary'
  }}
  secondaryButton={{
    label: 'Our Story',
    href: '#about',
    variant: 'outline'
  }}
  layout="video-background"
  textColor="#ffffff"
  overlayColor="#000000"
  overlayOpacity={0.4}
/>
```

## Database Integration

Like the Navbar and Footer components, the Hero can be configured from a database:

```typescript
// Example API route
export async function GET(request: Request) {
  const heroConfig = await fetchHeroConfig(restaurantId);
  return Response.json({ success: true, data: heroConfig });
}
```

### Dynamic Hero Component

```tsx
'use client';

import { useEffect, useState } from 'react';
import Hero from '@/components/hero';
import type { HeroConfig } from '@/types/hero.types';

export default function DynamicHero({ restaurantId }: { restaurantId: string }) {
  const [config, setConfig] = useState<HeroConfig | null>(null);

  useEffect(() => {
    fetch(`/api/hero-config?restaurantId=${restaurantId}`)
      .then(res => res.json())
      .then(data => setConfig(data.data));
  }, [restaurantId]);

  if (!config) return <div>Loading...</div>;

  return <Hero {...config} />;
}
```

## Responsive Behavior

- **Desktop (> 968px)**: Full layout as configured
- **Tablet (768px - 968px)**: Split layouts become stacked
- **Mobile (< 768px)**: All layouts optimize for mobile
  - Single column layouts
  - Stacked buttons
  - Reduced font sizes
  - Adjusted spacing

## Accessibility

The component includes:
- Semantic HTML structure
- ARIA labels on interactive elements
- Keyboard navigation support
- Screen reader friendly content
- Alt text requirements for images

## Performance Considerations

1. **Images**: Use optimized images (WebP format recommended)
2. **Videos**: 
   - Compress video files
   - Use `playsInline` for mobile compatibility
   - Provide fallback background image
3. **Lazy Loading**: Consider lazy loading images for below-fold heroes
4. **CSS**: Styles are modular and tree-shakeable

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Related Components

- [`Navbar`](src/components/navbar.tsx) - Navigation bar component
- [`Footer`](src/components/footer.tsx) - Footer component
- [`DynamicHero`](src/components/dynamic-hero.tsx) - Database-driven hero (to be created)

## Examples

See [`/example-hero`](src/app/example-hero/page.tsx) for live examples of all layouts.

## License

Part of the Antler Foods Restaurant Management System.
