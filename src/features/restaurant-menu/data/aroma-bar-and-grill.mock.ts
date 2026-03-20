import type {
  MenuCategory,
  MenuItem,
  RestaurantMenuData,
} from '@/features/restaurant-menu/types/restaurant-menu.types';

const imageLibrary = {
  restaurant:
    'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80',
  garlicNaan:
    'https://images.unsplash.com/photo-1619531038896-f2d1c1d8f4cf?auto=format&fit=crop&w=1200&q=80',
  plainNaan:
    'https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&w=1200&q=80',
  chickenTikkaMasala:
    'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=1200&q=80',
  samosa:
    'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1200&q=80',
  basmatiRice:
    'https://images.unsplash.com/photo-1516684732162-798a0062be99?auto=format&fit=crop&w=1200&q=80',
  palakPaneer:
    'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=1200&q=80',
  soup:
    'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=80',
  tandooriChicken:
    'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=1200&q=80',
  chickenVindaloo:
    'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=1200&q=80',
  lambCurry:
    'https://images.unsplash.com/photo-1604908176997-4315120ca6f8?auto=format&fit=crop&w=1200&q=80',
  shrimpMasala:
    'https://images.unsplash.com/photo-1562967916-eb82221dfb92?auto=format&fit=crop&w=1200&q=80',
  biryani:
    'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?auto=format&fit=crop&w=1200&q=80',
};

function createItem(item: MenuItem) {
  return item;
}

const categories: MenuCategory[] = [
  {
    id: 'soups',
    label: 'SOUPS (16 OZ)',
    description: 'Comforting broths and warming house favorites.',
    items: [
      createItem({
        id: 'chicken-soup',
        categoryId: 'soups',
        name: 'Chicken Soup',
        description:
          'A rich and comforting classic, served warm and full of flavor.',
        price: 7.95,
        image: imageLibrary.soup,
        likes: 2,
        points: 80,
        addOns: [
          {
            id: 'add-on-garlic-naan',
            name: 'Garlic Naan',
            price: 5.95,
            image: imageLibrary.garlicNaan,
          },
          {
            id: 'add-on-plain-naan',
            name: 'Plain Naan',
            price: 4.95,
            image: imageLibrary.plainNaan,
          },
        ],
      }),
      createItem({
        id: 'mulligatawny-soup',
        categoryId: 'soups',
        name: 'Mulligatawny Soup',
        description:
          'An international-style soup with assorted vegetables and a gentle touch of lemon.',
        price: 7.95,
        image: imageLibrary.soup,
        likes: 2,
        points: 80,
        addOns: [
          {
            id: 'add-on-basmati-rice',
            name: 'Basmati Rice',
            price: 4.95,
            image: imageLibrary.basmatiRice,
          },
        ],
      }),
    ],
  },
  {
    id: 'appetizers',
    label: 'APPETIZERS',
    description: 'Shareable starters with crisp edges and big flavor.',
    items: [
      createItem({
        id: 'vegetarian-samosa',
        categoryId: 'appetizers',
        name: 'Vegetarian Samosa (2)',
        description:
          'Golden pastry pockets stuffed with spiced potatoes and peas.',
        price: 8.95,
        image: imageLibrary.samosa,
        likes: 2,
        points: 90,
        badge: '#4 Most Liked',
      }),
      createItem({
        id: 'paneer-pakora',
        categoryId: 'appetizers',
        name: 'Paneer Pakora',
        description:
          'Fresh paneer dipped in chickpea batter and fried until crisp.',
        price: 10.95,
        image: imageLibrary.palakPaneer,
        likes: 5,
        points: 110,
      }),
      createItem({
        id: 'chicken-65',
        categoryId: 'appetizers',
        name: 'Chicken 65',
        description:
          'Fiery fried chicken bites tossed with curry leaves and chili.',
        price: 12.95,
        image: imageLibrary.chickenVindaloo,
        likes: 7,
        points: 130,
      }),
    ],
  },
  {
    id: 'tandoori-specials',
    label: 'TANDOORI SPECIALS',
    description: 'Charred, smoky specialties straight from the tandoor.',
    items: [
      createItem({
        id: 'chicken-tikka',
        categoryId: 'tandoori-specials',
        name: 'Chicken Tikka',
        description:
          'Boneless chicken marinated in yogurt and roasted to a smoky finish.',
        price: 18.95,
        image: imageLibrary.tandooriChicken,
        likes: 9,
        points: 190,
      }),
      createItem({
        id: 'seekh-kebab',
        categoryId: 'tandoori-specials',
        name: 'Seekh Kebab',
        description:
          'Minced lamb skewers seasoned with herbs and grilled over open heat.',
        price: 19.95,
        image: imageLibrary.lambCurry,
        likes: 6,
        points: 200,
      }),
      createItem({
        id: 'tandoori-chicken-half',
        categoryId: 'tandoori-specials',
        name: 'Tandoori Chicken Half',
        description:
          'A bone-in classic with a deep brick-red marinade and citrus finish.',
        price: 20.95,
        image: imageLibrary.tandooriChicken,
        likes: 8,
        points: 210,
      }),
    ],
  },
  {
    id: 'chicken-corner',
    label: 'CHICKEN CORNER',
    description: 'Signature curries with layered sauces and slow-cooked spice.',
    items: [
      createItem({
        id: 'chicken-tikka-masala',
        categoryId: 'chicken-corner',
        name: 'Chicken Tikka Masala',
        description:
          'Tender chicken simmered in our creamy tomato masala gravy.',
        price: 21.95,
        image: imageLibrary.chickenTikkaMasala,
        likes: 3,
        points: 220,
        badge: '#2 Most Liked',
        addOns: [
          {
            id: 'add-on-jeera-rice',
            name: 'Jeera Rice',
            price: 5.95,
            image: imageLibrary.basmatiRice,
          },
          {
            id: 'add-on-butter-naan',
            name: 'Butter Naan',
            price: 5.25,
            image: imageLibrary.garlicNaan,
          },
        ],
      }),
      createItem({
        id: 'butter-chicken',
        categoryId: 'chicken-corner',
        name: 'Butter Chicken',
        description:
          'A silky tomato-butter sauce balanced with warm fenugreek and spice.',
        price: 20.95,
        image: imageLibrary.chickenTikkaMasala,
        likes: 10,
        points: 210,
      }),
      createItem({
        id: 'chicken-vindaloo',
        categoryId: 'chicken-corner',
        name: 'Chicken Vindaloo',
        description:
          'A bold, tangy curry for guests who like a sharper chili kick.',
        price: 20.95,
        image: imageLibrary.chickenVindaloo,
        likes: 8,
        points: 210,
      }),
    ],
  },
  {
    id: 'lamb-lovers',
    label: 'LAMB LOVERS',
    description: 'Slow-simmered lamb dishes with deep spice and warmth.',
    items: [
      createItem({
        id: 'lamb-rogan-josh',
        categoryId: 'lamb-lovers',
        name: 'Lamb Rogan Josh',
        description:
          'A Kashmiri-style curry with aromatic spice and tender lamb pieces.',
        price: 23.95,
        image: imageLibrary.lambCurry,
        likes: 6,
        points: 240,
      }),
      createItem({
        id: 'lamb-korma',
        categoryId: 'lamb-lovers',
        name: 'Lamb Korma',
        description:
          'Rich cashew and cream sauce with a mellow, royal finish.',
        price: 23.95,
        image: imageLibrary.lambCurry,
        likes: 4,
        points: 240,
      }),
    ],
  },
  {
    id: 'goat',
    label: 'GOAT',
    description: 'House specialties for guests who want something hearty.',
    items: [
      createItem({
        id: 'goat-curry',
        categoryId: 'goat',
        name: 'Goat Curry',
        description:
          'Bone-in goat cooked low and slow in an onion-forward house curry.',
        price: 24.95,
        image: imageLibrary.lambCurry,
        likes: 5,
        points: 250,
      }),
      createItem({
        id: 'goat-vindaloo',
        categoryId: 'goat',
        name: 'Goat Vindaloo',
        description:
          'Tangy, peppery, and intense with a slow-building heat profile.',
        price: 24.95,
        image: imageLibrary.chickenVindaloo,
        likes: 4,
        points: 250,
      }),
    ],
  },
  {
    id: 'seafood-craze',
    label: 'SEAFOOD CRAZE',
    description: 'Coastal-inspired curries with bright spice and citrus.',
    items: [
      createItem({
        id: 'shrimp-masala',
        categoryId: 'seafood-craze',
        name: 'Shrimp Masala',
        description:
          'Shrimp tossed in a vivid masala sauce with bell pepper and onion.',
        price: 23.95,
        image: imageLibrary.shrimpMasala,
        likes: 7,
        points: 240,
      }),
      createItem({
        id: 'fish-curry',
        categoryId: 'seafood-craze',
        name: 'Fish Curry',
        description:
          'A delicate seafood curry with coconut, tamarind, and fresh herbs.',
        price: 22.95,
        image: imageLibrary.shrimpMasala,
        likes: 5,
        points: 230,
      }),
    ],
  },
  {
    id: 'aroma-masalas',
    label: 'AROMA MASALAS',
    description: 'Vegetarian house signatures with creamy and earthy sauces.',
    items: [
      createItem({
        id: 'palak-paneer',
        categoryId: 'aroma-masalas',
        name: 'Palak Paneer',
        description:
          'Fresh paneer cubes in a velvety spinach sauce with warm whole spices.',
        price: 19.95,
        image: imageLibrary.palakPaneer,
        likes: 3,
        points: 200,
        addOns: [
          {
            id: 'add-on-garlic-naan-side',
            name: 'Garlic Naan',
            price: 5.95,
            image: imageLibrary.garlicNaan,
          },
          {
            id: 'add-on-basmati-rice-side',
            name: 'Basmati Rice',
            price: 4.95,
            image: imageLibrary.basmatiRice,
          },
        ],
      }),
      createItem({
        id: 'paneer-butter-masala',
        categoryId: 'aroma-masalas',
        name: 'Paneer Butter Masala',
        description:
          'Paneer finished in a silky tomato-butter gravy with a touch of cream.',
        price: 19.95,
        image: imageLibrary.palakPaneer,
        likes: 6,
        points: 200,
      }),
      createItem({
        id: 'chana-masala',
        categoryId: 'aroma-masalas',
        name: 'Chana Masala',
        description:
          'Chickpeas simmered in a deeply spiced onion and tomato masala.',
        price: 17.95,
        image: imageLibrary.palakPaneer,
        likes: 4,
        points: 180,
      }),
    ],
  },
  {
    id: 'biryanis',
    label: 'BIRYANIS',
    description: 'Fragrant basmati layered with saffron, herbs, and spice.',
    items: [
      createItem({
        id: 'chicken-biryani',
        categoryId: 'biryanis',
        name: 'Chicken Biryani',
        description:
          'Long-grain basmati layered with masala chicken and caramelized onion.',
        price: 20.95,
        image: imageLibrary.biryani,
        likes: 9,
        points: 210,
      }),
      createItem({
        id: 'vegetable-biryani',
        categoryId: 'biryanis',
        name: 'Vegetable Biryani',
        description:
          'Seasonal vegetables and basmati rice scented with saffron and mint.',
        price: 18.95,
        image: imageLibrary.biryani,
        likes: 5,
        points: 190,
      }),
    ],
  },
  {
    id: 'rice',
    label: 'RICE',
    description: 'Classic sides made to anchor every curry and grill platter.',
    items: [
      createItem({
        id: 'basmati-rice',
        categoryId: 'rice',
        name: 'Basmati Rice',
        description:
          'A fluffy bowl of fragrant long-grain rice served steaming hot.',
        price: 4.95,
        image: imageLibrary.basmatiRice,
        likes: 2,
        points: 50,
      }),
      createItem({
        id: 'jeera-rice',
        categoryId: 'rice',
        name: 'Jeera Rice',
        description:
          'Basmati rice tempered with toasted cumin seeds and clarified butter.',
        price: 5.95,
        image: imageLibrary.basmatiRice,
        likes: 4,
        points: 60,
      }),
    ],
  },
  {
    id: 'breads',
    label: 'BREADS',
    description: 'Fresh tandoor breads made to tear, dip, and share.',
    items: [
      createItem({
        id: 'garlic-naan',
        categoryId: 'breads',
        name: 'Garlic Naan',
        description:
          'Leavened handmade bread with garlic, herbs, and spices baked in a tandoori oven.',
        price: 5.95,
        image: imageLibrary.garlicNaan,
        likes: 3,
        points: 60,
        badge: '#1 Most Liked',
      }),
      createItem({
        id: 'plain-naan',
        categoryId: 'breads',
        name: 'Plain Naan',
        description:
          'Soft tandoor bread with a blistered finish and light butter gloss.',
        price: 4.95,
        image: imageLibrary.plainNaan,
        likes: 6,
        points: 50,
        badge: '#3 Most Liked',
      }),
      createItem({
        id: 'butter-naan',
        categoryId: 'breads',
        name: 'Butter Naan',
        description:
          'Pillowy naan brushed with butter for an extra-rich finish.',
        price: 5.25,
        image: imageLibrary.garlicNaan,
        likes: 5,
        points: 55,
      }),
    ],
  },
];

export const aromaBarAndGrillMenuMock: RestaurantMenuData = {
  slug: 'aroma-bar-and-grill',
  announcement:
    "It's best to order directly from us: fast service and exclusive loyalty benefits",
  brand: {
    name: 'AROMA BAR & GRILL',
    subtitle: 'Authentic Flavors From All Parts of India',
    accentText: 'Aroma',
  },
  navigation: [
    { label: 'Home', href: '#top' },
    { label: 'Menu', href: '#menu-sections' },
    { label: 'Store Info', href: '#store-info' },
  ],
  restaurant: {
    name: 'Aroma Bar and Grill Menu',
    addressLine: '485 Main Street, Great Barrington 01230',
    heroImage: imageLibrary.restaurant,
    openingText: 'Opens Thursday 1:30 am',
    infoCardLabel: 'Pickup available in 20 to 30 min',
    hours: [
      { day: 'Monday', hours: '11:00 am - 9:30 pm' },
      { day: 'Tuesday', hours: '11:00 am - 9:30 pm' },
      { day: 'Wednesday', hours: '11:00 am - 9:30 pm' },
      { day: 'Thursday', hours: '11:00 am - 10:00 pm' },
      { day: 'Friday', hours: '11:00 am - 10:30 pm' },
      { day: 'Saturday', hours: '12:00 pm - 10:30 pm' },
      { day: 'Sunday', hours: '12:00 pm - 9:00 pm' },
    ],
    trustBanner: 'Over +1,000 customers have already ordered safely with us',
  },
  locations: [
    {
      id: 'great-barrington',
      label: 'Pickup at 485 Main Street, Great Barrington 01230',
      street: '485 Main Street',
      cityStateZip: 'Great Barrington 01230',
      fullAddress: '485 Main Street, Great Barrington 01230',
      openingText: 'Opens Thursday 1:30 am',
    },
  ],
  serviceOptions: [
    {
      mode: 'pickup',
      label: 'Pickup',
      helperText: 'Ready in 20 to 30 minutes',
    },
    {
      mode: 'delivery',
      label: 'Delivery',
      helperText: 'Enter your address to check availability',
    },
  ],
  rewards: {
    iconLabel: 'Rewards',
    message:
      'Join Aroma Bar and Grill Rewards! Get a $5.00 reward for every $50.00 spent.',
    ctaLabel: 'Sign In / Sign Up',
  },
  categories,
  popularItemIds: [
    'garlic-naan',
    'chicken-tikka-masala',
    'plain-naan',
    'vegetarian-samosa',
    'basmati-rice',
    'palak-paneer',
  ],
  scheduleDays: [
    {
      id: 'tomorrow',
      label: 'Tomorrow',
      dateLabel: 'Mar 19',
      slots: ['2:15 am', '2:25 am', '2:35 am', '2:45 am', '2:55 am', '3:05 am', '3:15 am'],
    },
    {
      id: 'fri',
      label: 'Fri',
      dateLabel: 'Mar 20',
      slots: ['11:15 am', '11:30 am', '11:45 am', '12:00 pm', '12:15 pm', '12:30 pm'],
    },
    {
      id: 'sat',
      label: 'Sat',
      dateLabel: 'Mar 21',
      slots: ['12:00 pm', '12:15 pm', '12:30 pm', '12:45 pm', '1:00 pm', '1:15 pm'],
    },
    {
      id: 'sun',
      label: 'Sun',
      dateLabel: 'Mar 22',
      slots: ['12:00 pm', '12:20 pm', '12:40 pm', '1:00 pm', '1:20 pm'],
    },
    {
      id: 'mon',
      label: 'Mon',
      dateLabel: 'Mar 23',
      slots: ['11:00 am', '11:20 am', '11:40 am', '12:00 pm'],
    },
  ],
  defaultScheduleLabel: 'Thu, Mar 19 02:25',
  defaultDeliveryAddress: '',
};

const menuMocksBySlug: Record<string, RestaurantMenuData> = {
  [aromaBarAndGrillMenuMock.slug]: aromaBarAndGrillMenuMock,
};

export function getRestaurantMenuBySlug(slug: string) {
  return menuMocksBySlug[slug];
}
