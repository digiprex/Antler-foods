# GraphQL API Integration (Hasura)

The navbar configuration API now uses GraphQL with Hasura instead of mock data.

## Configuration

**GraphQL Endpoint**: `https://pycfacumenjefxtblime.hasura.us-east-1.nhost.run/v1/graphql`

**Admin Secret**: Configured in [`src/app/api/navbar-config/route.ts`](src/app/api/navbar-config/route.ts:10)

## Database Table Required

You need to create this table in your Hasura database:

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

## GraphQL Queries Used

### Fetch Configuration

```graphql
query GetNavbarConfig {
  navbar_config(where: {category: {_eq: "navbar"}}, limit: 1) {
    id
    name
    category
    config
    created_at
    updated_at
  }
}
```

### Update Configuration

```graphql
mutation UpdateNavbarConfig($id: Int!, $config: jsonb!) {
  update_navbar_config_by_pk(
    pk_columns: {id: $id},
    _set: {config: $config, updated_at: "now()"}
  ) {
    id
    config
    updated_at
  }
}
```

### Insert Configuration

```graphql
mutation InsertNavbarConfig($name: String!, $category: String!, $config: jsonb!) {
  insert_navbar_config_one(
    object: {name: $name, category: $category, config: $config}
  ) {
    id
    name
    category
    config
    created_at
    updated_at
  }
}
```

## How It Works

### GET Request
1. Queries Hasura for navbar config where `category = "navbar"`
2. Returns the `config` JSONB field
3. Falls back to default config if none exists

### POST Request
1. Checks if config exists
2. If exists: Updates the existing config
3. If not: Inserts new config with name "Main Navbar"
4. Returns the updated/inserted config

## Insert Initial Data

Run this in Hasura console or your database:

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

## Testing the API

### Test GET Request

```bash
curl http://localhost:3000/api/navbar-config
```

### Test POST Request

```bash
curl -X POST http://localhost:3000/api/navbar-config \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantName": "Updated Name",
    "layout": "centered",
    "position": "fixed",
    "bgColor": "#000000",
    "textColor": "#ffffff",
    "leftNavItems": [
      {"label": "Home", "href": "/", "order": 1}
    ],
    "ctaButton": {
      "label": "Book Now",
      "href": "/book"
    }
  }'
```

## Hasura Console

You can also test queries directly in Hasura console:

1. Go to: `https://pycfacumenjefxtblime.hasura.us-east-1.nhost.run/console`
2. Navigate to "API" tab
3. Run the GraphQL queries above

## Security Notes

⚠️ **IMPORTANT**: The admin secret is currently hardcoded in the API route. For production:

1. Move the secret to environment variables:
   ```
   HASURA_GRAPHQL_URL=https://pycfacumenjefxtblime.hasura.us-east-1.nhost.run/v1/graphql
   HASURA_ADMIN_SECRET=your-secret-here
   ```

2. Update the code:
   ```typescript
   const HASURA_URL = process.env.HASURA_GRAPHQL_URL!;
   const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET!;
   ```

3. Add to `.env.local`:
   ```
   HASURA_GRAPHQL_URL=https://pycfacumenjefxtblime.hasura.us-east-1.nhost.run/v1/graphql
   HASURA_ADMIN_SECRET=i;8zmVF8SvnMiX5gao@F'a6,uJ%WphsD
   ```

4. Add `.env.local` to `.gitignore`

## Error Handling

The API includes comprehensive error handling:

- GraphQL request failures
- Missing configuration (returns defaults)
- Invalid data (returns error response)
- Network errors (returns 500 status)

## Next Steps

1. Create the `navbar_config` table in Hasura
2. Insert initial data
3. Test the API endpoints
4. Use the settings page at `/admin/navbar-settings`
5. Save changes and see them reflected on the website

The navbar is now fully integrated with your Hasura GraphQL database!
