# Dynamic Navbar System - Quick Start Guide

This project now includes a fully dynamic navbar system where the logo, menu items, and "Order Online" button can be configured through a database/API.

## 🚀 Quick Start

### 1. Use the Dynamic Navbar

Replace your static navbar with:

```tsx
import DynamicNavbar from '@/components/dynamic-navbar';

export default function Page() {
  return (
    <div>
      <DynamicNavbar showLoadingSkeleton={true} />
      {/* Your content */}
    </div>
  );
}
```

### 2. Test It

Visit the example page to see it in action:
```
http://localhost:3000/example-dynamic-navbar
```

### 3. Configure Your Database

The system currently uses mock data. To connect to your database:

1. Choose a database schema from [`src/lib/database/navbar-schema-examples.ts`](src/lib/database/navbar-schema-examples.ts)
2. Update the API route at [`src/app/api/navbar-config/route.ts`](src/app/api/navbar-config/route.ts)
3. Replace mock data with actual database queries

## 📁 Files Created

| File | Purpose |
|------|---------|
| [`src/types/navbar.types.ts`](src/types/navbar.types.ts) | TypeScript types for navbar configuration |
| [`src/components/dynamic-navbar.tsx`](src/components/dynamic-navbar.tsx) | Main dynamic navbar component |
| [`src/app/api/navbar-config/route.ts`](src/app/api/navbar-config/route.ts) | API endpoint (currently returns mock data) |
| [`src/lib/database/navbar-schema-examples.ts`](src/lib/database/navbar-schema-examples.ts) | Database schemas (Prisma, MongoDB, SQL) |
| [`src/app/example-dynamic-navbar/page.tsx`](src/app/example-dynamic-navbar/page.tsx) | Example page demonstrating usage |
| [`docs/DYNAMIC_NAVBAR.md`](docs/DYNAMIC_NAVBAR.md) | Complete documentation |

## ✨ Features

- ✅ **Dynamic Logo**: URL or restaurant name initials
- ✅ **Dynamic Menu Items**: Left and right navigation
- ✅ **Dynamic CTA Button**: "Order Online" or custom text/link
- ✅ **All Styling Options**: Colors, layout, position, borders
- ✅ **Error Handling**: Automatic fallback to defaults
- ✅ **Loading States**: Optional skeleton loader
- ✅ **Type Safe**: Full TypeScript support

## 🎯 What's Configurable

Everything in the navbar can be controlled via API:

```typescript
{
  // Logo
  "logoUrl": "/logo.png",           // or null for initials
  "restaurantName": "Antler Foods",
  
  // Menu Items
  "leftNavItems": [
    { "label": "Menu", "href": "/menu" },
    { "label": "About", "href": "/about" }
  ],
  
  // Order Button
  "ctaButton": {
    "label": "Order Online",
    "href": "/order"
  },
  
  // Styling
  "layout": "bordered-centered",
  "bgColor": "#ffffff",
  "textColor": "#000000",
  // ... and more
}
```

## 🗄️ Database Setup

### Option 1: Prisma (Recommended)

```bash
# Add schema to prisma/schema.prisma
# Then run:
npx prisma migrate dev --name add_navbar_config
```

### Option 2: MongoDB

```bash
# Use the Mongoose schema from navbar-schema-examples.ts
```

### Option 3: Raw SQL

```bash
# Execute SQL from navbar-schema-examples.ts
```

## 📖 Examples

### Basic Usage
```tsx
<DynamicNavbar />
```

### With Loading Skeleton
```tsx
<DynamicNavbar showLoadingSkeleton={true} />
```

### With Static Override (No API Call)
```tsx
<DynamicNavbar 
  overrideConfig={{
    restaurantName: "My Restaurant",
    ctaButton: {
      label: "Book Now",
      href: "/reservations"
    }
  }}
/>
```

### Multiple Restaurants
```tsx
<DynamicNavbar 
  apiEndpoint={`/api/navbar-config?restaurantId=${id}`}
/>
```

## 🔧 API Endpoint

Current endpoint: `GET /api/navbar-config`

**Response Format:**
```json
{
  "success": true,
  "data": {
    "restaurantName": "Antler Foods",
    "logoUrl": null,
    "leftNavItems": [...],
    "ctaButton": {...},
    ...
  }
}
```

## 📚 Documentation

For complete documentation, see [`docs/DYNAMIC_NAVBAR.md`](docs/DYNAMIC_NAVBAR.md)

## 🔄 Migration from Static Navbar

1. Replace `<Navbar />` with `<DynamicNavbar />`
2. Remove hardcoded props
3. Set up database with initial data
4. Update API route to query database
5. Test and deploy!

## 🎨 Customization

All navbar styling can be controlled via the API:
- Colors (background, text, button)
- Layout (6 different layouts available)
- Position (fixed, sticky, absolute, etc.)
- Borders and spacing
- Z-index

## 🧪 Testing

Test the system before connecting to database:

```tsx
<DynamicNavbar 
  overrideConfig={{
    restaurantName: "Test Restaurant",
    leftNavItems: [
      { label: "Test 1", href: "#1" },
      { label: "Test 2", href: "#2" }
    ],
    ctaButton: {
      label: "Test Button",
      href: "#test"
    }
  }}
/>
```

## 🚦 Next Steps

1. **Test the example page**: Visit `/example-dynamic-navbar`
2. **Choose your database**: Pick a schema from `navbar-schema-examples.ts`
3. **Set up database**: Create tables/collections
4. **Update API route**: Connect to your database
5. **Add admin panel**: Create UI for editing navbar config
6. **Deploy**: Push to production

## 💡 Tips

- Use `overrideConfig` for static pages to avoid API calls
- Enable `showLoadingSkeleton` for better UX
- Cache API responses with Next.js `revalidate`
- Add authentication to POST endpoint for security

## 🆘 Support

- Check type definitions: [`navbar.types.ts`](src/types/navbar.types.ts)
- Review API route: [`route.ts`](src/app/api/navbar-config/route.ts)
- See examples: [`navbar-example-usage.tsx`](src/components/navbar-example-usage.tsx)
- Read full docs: [`DYNAMIC_NAVBAR.md`](docs/DYNAMIC_NAVBAR.md)

---

**Ready to use!** The system is fully functional with mock data. Connect your database to make it production-ready.
