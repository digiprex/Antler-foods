# Database Structure for Navbar Configuration

## Table Structure

```sql
CREATE TABLE navbar_config (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  config JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Field Descriptions

- **name**: Identifier for the navbar configuration (e.g., "Main Navbar", "Restaurant Navbar")
- **category**: Category/type of configuration (e.g., "navbar", "header", "navigation")
- **config**: JSONB field containing all navbar settings

## Sample Data

### Insert Statement

```sql
INSERT INTO navbar_config (name, category, config) VALUES (
  'Main Navbar',
  'navbar',
  '{
    "restaurantName": "Antler Foods",
    "logoUrl": null,
    "layout": "bordered-centered",
    "position": "absolute",
    "bgColor": "#ffffff",
    "textColor": "#000000",
    "buttonBgColor": "#000000",
    "buttonTextColor": "#ffffff",
    "borderColor": "#000000",
    "borderWidth": "2px",
    "leftNavItems": [
      {"label": "Menu", "href": "/menu", "order": 1},
      {"label": "About", "href": "/about", "order": 2},
      {"label": "Locations", "href": "/locations", "order": 3},
      {"label": "Contact", "href": "/contact", "order": 4}
    ],
    "rightNavItems": [],
    "ctaButton": {
      "label": "Order Online",
      "href": "/order"
    }
  }'::jsonb
);
```

## Config JSONB Structure

```json
{
  "restaurantName": "string",
  "logoUrl": "string | null",
  "layout": "default | centered | logo-center | bordered-centered | stacked | split",
  "position": "absolute | fixed | sticky | relative | static",
  "bgColor": "string (hex color)",
  "textColor": "string (hex color)",
  "buttonBgColor": "string (hex color)",
  "buttonTextColor": "string (hex color)",
  "borderColor": "string (hex color)",
  "borderWidth": "string (e.g., '2px')",
  "leftNavItems": [
    {
      "label": "string",
      "href": "string",
      "order": "number"
    }
  ],
  "rightNavItems": [],
  "ctaButton": {
    "label": "string",
    "href": "string"
  } | null
}
```

## Query Examples

### Get Navbar Config

```sql
SELECT * FROM navbar_config WHERE category = 'navbar' LIMIT 1;
```

### Update Navbar Config

```sql
UPDATE navbar_config 
SET config = '{
  "restaurantName": "New Restaurant Name",
  "logoUrl": "/logo.png",
  "layout": "centered",
  "position": "fixed",
  "bgColor": "#000000",
  "textColor": "#ffffff",
  "leftNavItems": [
    {"label": "Home", "href": "/", "order": 1},
    {"label": "Menu", "href": "/menu", "order": 2}
  ],
  "ctaButton": {
    "label": "Book Now",
    "href": "/reservations"
  }
}'::jsonb,
updated_at = CURRENT_TIMESTAMP
WHERE name = 'Main Navbar';
```

### Query Specific Config Field

```sql
-- Get restaurant name
SELECT config->>'restaurantName' as restaurant_name 
FROM navbar_config 
WHERE name = 'Main Navbar';

-- Get all menu items
SELECT config->'leftNavItems' as menu_items 
FROM navbar_config 
WHERE name = 'Main Navbar';

-- Get CTA button
SELECT config->'ctaButton' as cta_button 
FROM navbar_config 
WHERE name = 'Main Navbar';
```

## API Integration Example

```typescript
// Fetch navbar config
export async function GET() {
  const result = await db.query(
    'SELECT config FROM navbar_config WHERE category = $1 LIMIT 1',
    ['navbar']
  );
  
  return Response.json({
    success: true,
    data: result.rows[0]?.config || DEFAULT_CONFIG
  });
}

// Update navbar config
export async function POST(request: Request) {
  const body = await request.json();
  
  await db.query(
    `UPDATE navbar_config 
     SET config = $1, updated_at = CURRENT_TIMESTAMP 
     WHERE category = $2`,
    [JSON.stringify(body), 'navbar']
  );
  
  return Response.json({ success: true });
}
```

## Prisma Schema (Alternative)

```prisma
model NavbarConfig {
  id        Int      @id @default(autoincrement())
  name      String
  category  String
  config    Json
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("navbar_config")
}
```

## MongoDB Schema (Alternative)

```javascript
const navbarConfigSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  config: {
    restaurantName: String,
    logoUrl: String,
    layout: String,
    position: String,
    bgColor: String,
    textColor: String,
    buttonBgColor: String,
    buttonTextColor: String,
    borderColor: String,
    borderWidth: String,
    leftNavItems: [{
      label: String,
      href: String,
      order: Number
    }],
    rightNavItems: Array,
    ctaButton: {
      label: String,
      href: String
    }
  }
}, { timestamps: true });
```

## Benefits of JSONB Approach

1. **Flexible**: Easy to add new fields without schema migration
2. **Queryable**: Can query specific fields within JSONB
3. **Indexable**: Can create indexes on JSONB fields
4. **Simple**: Single row per configuration
5. **Version Control**: Easy to store multiple versions

## Migration Script

```sql
-- Create table
CREATE TABLE navbar_config (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  config JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on category for faster queries
CREATE INDEX idx_navbar_config_category ON navbar_config(category);

-- Create index on JSONB config for faster queries
CREATE INDEX idx_navbar_config_jsonb ON navbar_config USING GIN (config);

-- Insert default configuration
INSERT INTO navbar_config (name, category, config) VALUES (
  'Main Navbar',
  'navbar',
  '{
    "restaurantName": "Antler Foods",
    "logoUrl": null,
    "layout": "bordered-centered",
    "position": "absolute",
    "bgColor": "#ffffff",
    "textColor": "#000000",
    "buttonBgColor": "#000000",
    "buttonTextColor": "#ffffff",
    "leftNavItems": [
      {"label": "Menu", "href": "/menu", "order": 1},
      {"label": "About", "href": "/about", "order": 2},
      {"label": "Contact", "href": "/contact", "order": 3}
    ],
    "rightNavItems": [],
    "ctaButton": {
      "label": "Order Online",
      "href": "/order"
    }
  }'::jsonb
);
```
