# Sample Database Row for Navbar Configuration

## Complete Row Example

| id | name | category | config | created_at | updated_at |
|----|------|----------|--------|------------|------------|
| 1 | Main Navbar | navbar | (see JSON below) | 2026-02-23 10:00:00 | 2026-02-23 10:00:00 |

## Config JSONB Value

```json
{
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
    {
      "label": "Menu",
      "href": "/menu",
      "order": 1
    },
    {
      "label": "About",
      "href": "/about",
      "order": 2
    },
    {
      "label": "Locations",
      "href": "/locations",
      "order": 3
    },
    {
      "label": "Contact",
      "href": "/contact",
      "order": 4
    }
  ],
  "rightNavItems": [],
  "ctaButton": {
    "label": "Order Online",
    "href": "/order"
  }
}
```

## SQL INSERT Statement

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

## More Sample Rows

### Example 2: Dark Theme Navbar

```sql
INSERT INTO navbar_config (name, category, config) VALUES (
  'Dark Navbar',
  'navbar',
  '{
    "restaurantName": "Night Kitchen",
    "logoUrl": "/logo-white.png",
    "layout": "centered",
    "position": "fixed",
    "bgColor": "#000000",
    "textColor": "#ffffff",
    "buttonBgColor": "#ffffff",
    "buttonTextColor": "#000000",
    "borderColor": "#ffffff",
    "borderWidth": "1px",
    "leftNavItems": [
      {"label": "Home", "href": "/", "order": 1},
      {"label": "Menu", "href": "/menu", "order": 2},
      {"label": "Reservations", "href": "/reservations", "order": 3}
    ],
    "rightNavItems": [],
    "ctaButton": {
      "label": "Book Now",
      "href": "/book"
    }
  }'::jsonb
);
```

### Example 3: Minimal Navbar (No Button)

```sql
INSERT INTO navbar_config (name, category, config) VALUES (
  'Minimal Navbar',
  'navbar',
  '{
    "restaurantName": "Simple Eats",
    "logoUrl": null,
    "layout": "default",
    "position": "absolute",
    "bgColor": "#f9fafb",
    "textColor": "#374151",
    "buttonBgColor": "#000000",
    "buttonTextColor": "#ffffff",
    "borderColor": "#e5e7eb",
    "borderWidth": "1px",
    "leftNavItems": [
      {"label": "Home", "href": "/", "order": 1},
      {"label": "About", "href": "/about", "order": 2}
    ],
    "rightNavItems": [],
    "ctaButton": null
  }'::jsonb
);
```

### Example 4: Full Featured Navbar

```sql
INSERT INTO navbar_config (name, category, config) VALUES (
  'Full Featured Navbar',
  'navbar',
  '{
    "restaurantName": "Gourmet Palace",
    "logoUrl": "https://example.com/logo.png",
    "layout": "logo-center",
    "position": "sticky",
    "bgColor": "#ffffff",
    "textColor": "#1f2937",
    "buttonBgColor": "#ef4444",
    "buttonTextColor": "#ffffff",
    "borderColor": "#d1d5db",
    "borderWidth": "2px",
    "leftNavItems": [
      {"label": "Home", "href": "/", "order": 1},
      {"label": "Menu", "href": "/menu", "order": 2},
      {"label": "About Us", "href": "/about", "order": 3}
    ],
    "rightNavItems": [
      {"label": "Gallery", "href": "/gallery", "order": 1},
      {"label": "Contact", "href": "/contact", "order": 2}
    ],
    "ctaButton": {
      "label": "Reserve Table",
      "href": "https://reservations.example.com"
    }
  }'::jsonb
);
```

## Field-by-Field Breakdown

| Field | Type | Example Value | Description |
|-------|------|---------------|-------------|
| id | INTEGER | 1 | Auto-increment primary key |
| name | TEXT | "Main Navbar" | Human-readable name |
| category | TEXT | "navbar" | Configuration category |
| config | JSONB | (see JSON above) | All navbar settings |
| created_at | TIMESTAMP | 2026-02-23 10:00:00 | Creation timestamp |
| updated_at | TIMESTAMP | 2026-02-23 10:00:00 | Last update timestamp |

## Config Field Descriptions

| Config Key | Type | Example | Description |
|------------|------|---------|-------------|
| restaurantName | string | "Antler Foods" | Restaurant/brand name |
| logoUrl | string\|null | null or "/logo.png" | Logo image URL |
| layout | string | "bordered-centered" | Navbar layout type |
| position | string | "absolute" | CSS position |
| bgColor | string | "#ffffff" | Background color (hex) |
| textColor | string | "#000000" | Text color (hex) |
| buttonBgColor | string | "#000000" | Button background (hex) |
| buttonTextColor | string | "#ffffff" | Button text (hex) |
| borderColor | string | "#000000" | Border color (hex) |
| borderWidth | string | "2px" | Border width |
| leftNavItems | array | [...] | Left menu items |
| rightNavItems | array | [] | Right menu items |
| ctaButton | object\|null | {...} or null | Call-to-action button |

## Query to View Row

```sql
SELECT 
  id,
  name,
  category,
  jsonb_pretty(config) as config,
  created_at,
  updated_at
FROM navbar_config
WHERE id = 1;
```

This will display the row in a readable format with pretty-printed JSON.
