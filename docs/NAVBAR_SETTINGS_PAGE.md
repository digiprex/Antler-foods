# Navbar Settings Page - Quick Reference

## 📍 Access the Settings Page

Visit: **`/admin/navbar-settings`**

## 🎨 Available Settings

The simplified settings form allows you to configure:

### 1. **Type (Layout)**
Choose from 6 different navbar layouts:
- **Option 1 - Default**: Logo left, items right
- **Option 2 - Centered**: Logo left, items center, button right
- **Option 3 - Logo Center**: Items left, logo center, button right
- **Option 4 - Bordered Centered**: Logo left, items center, button right with border *(recommended)*
- **Option 5 - Stacked**: Logo top center, items and button below
- **Option 6 - Split**: Items left, logo center, text and button right

### 2. **Position**
Control how the navbar is positioned:
- **Absolute**: Positioned absolutely (overlays content)
- **Fixed**: Fixed to top of viewport (stays visible when scrolling)
- **Sticky**: Sticks to top when scrolling
- **Relative**: Normal document flow
- **Static**: Default positioning

### 3. **Background Color**
- Color picker for navbar background
- Click ✕ button to reset to white (#ffffff)

### 4. **Text Color**
- Color picker for text and links
- Click ✕ button to reset to black (#000000)

### 5. **Online Ordering Button**
- **Toggle ON/OFF**: Show or hide the order button
- **Button Text**: Customize the button label (e.g., "Order Online", "Book Now", "Reserve")
- When toggled OFF, the button will not appear in the navbar

## 🎯 Features

- ✅ **Live Preview**: See changes in real-time at the top of the page
- ✅ **Simple Interface**: Clean, easy-to-use form
- ✅ **Color Pickers**: Visual color selection
- ✅ **Toggle Switch**: Easy on/off for order button
- ✅ **Save Button**: Saves all settings to database via API

## 🚀 How to Use

1. **Visit** `/admin/navbar-settings`
2. **Adjust** the settings using the form controls
3. **Preview** changes in the live preview section at the top
4. **Click Save** to apply changes
5. **Done!** Changes are immediately reflected on your site

## 📸 Form Layout

```
┌─────────────────────────────────────┐
│         Live Preview                │
│  (Shows navbar with current settings)│
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Navigation Bar                  ✕  │
├─────────────────────────────────────┤
│                                     │
│  Type:           [Option 4      ▼] │
│                                     │
│  Position:       [Absolute      ▼] │
│                                     │
│  Background Color: [⬜] ✕           │
│                                     │
│  Text Color:       [⬛] ✕           │
│                                     │
│  Online Ordering Button: [🟢 ON]   │
│                                     │
│  Order Online Button:              │
│  [Order Online                   ] │
│                                     │
│  ┌──────────┐                      │
│  │   Save   │                      │
│  └──────────┘                      │
└─────────────────────────────────────┘
```

## 🔧 Technical Details

### Files
- **Component**: [`src/components/admin/navbar-settings-form.tsx`](src/components/admin/navbar-settings-form.tsx)
- **Styles**: [`src/components/admin/navbar-settings-form.module.css`](src/components/admin/navbar-settings-form.module.css)
- **Page Route**: [`src/app/admin/navbar-settings/page.tsx`](src/app/admin/navbar-settings/page.tsx)

### API Endpoint
- **GET**: Fetches current settings from `/api/navbar-config`
- **POST**: Saves new settings to `/api/navbar-config`

### Data Saved
When you click Save, the following data is sent to the API:
```json
{
  "layout": "bordered-centered",
  "position": "absolute",
  "bgColor": "#ffffff",
  "textColor": "#000000",
  "ctaButton": {
    "label": "Order Online",
    "href": "/order"
  }
}
```

If the order button toggle is OFF, `ctaButton` will be `undefined` and the button won't display.

## 🎨 Customization Tips

### Popular Configurations

**1. Clean & Minimal**
- Type: Option 4 - Bordered Centered
- Position: Absolute
- Background: White (#ffffff)
- Text: Black (#000000)
- Order Button: ON

**2. Dark Mode**
- Type: Option 2 - Centered
- Position: Fixed
- Background: Black (#000000)
- Text: White (#ffffff)
- Order Button: ON

**3. Transparent Overlay**
- Type: Option 3 - Logo Center
- Position: Absolute
- Background: Transparent (rgba)
- Text: White (#ffffff)
- Order Button: ON

**4. Simple Navigation (No CTA)**
- Type: Option 1 - Default
- Position: Sticky
- Background: White (#ffffff)
- Text: Black (#000000)
- Order Button: **OFF**

## 🔒 Security Note

**IMPORTANT**: Before deploying to production, add authentication to this admin page to prevent unauthorized access.

Example:
```typescript
// In src/app/admin/navbar-settings/page.tsx
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

export default async function NavbarSettingsPage() {
  const session = await getServerSession();
  
  if (!session || session.user.role !== 'admin') {
    redirect('/unauthorized');
  }
  
  return <NavbarSettingsForm />;
}
```

## 📚 Related Pages

- **Full Admin Panel**: `/admin/navbar-config` (includes menu items management)
- **Example Page**: `/example-dynamic-navbar` (see navbar in action)
- **Documentation**: [`docs/DYNAMIC_NAVBAR.md`](docs/DYNAMIC_NAVBAR.md)

## 💡 Tips

1. **Test Before Saving**: Use the live preview to see how changes look
2. **Color Contrast**: Ensure text color contrasts well with background
3. **Mobile Testing**: Check how it looks on mobile devices
4. **Button Text**: Keep it short and clear (2-3 words max)
5. **Position Choice**: 
   - Use **Absolute** for hero sections
   - Use **Fixed** for always-visible navigation
   - Use **Sticky** for best of both worlds

## 🆘 Troubleshooting

**Changes not saving?**
- Check browser console for errors
- Ensure API endpoint is running
- Verify database connection

**Preview not updating?**
- Changes in preview are instant (no save needed)
- Only click Save when you want to persist changes

**Button not showing?**
- Check if toggle is ON
- Verify button text is not empty
- Check if layout supports CTA button

---

**Ready to customize your navbar!** Visit `/admin/navbar-settings` to get started.
