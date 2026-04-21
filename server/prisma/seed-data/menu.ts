// Demo menu data for the seeded store.
// Prices in cents. Update here when changing default seed menu.

export const DEMO_CATEGORIES = [
  { id: '00000000-0000-0000-0000-000000000c01', name: 'Drinks',     sortOrder: 0 },
  { id: '00000000-0000-0000-0000-000000000c02', name: 'Appetizers', sortOrder: 1 },
  { id: '00000000-0000-0000-0000-000000000c03', name: 'Mains',      sortOrder: 2 },
  { id: '00000000-0000-0000-0000-000000000c04', name: 'Desserts',   sortOrder: 3 },
] as const

export const DEMO_MENU_ITEMS = [
  // Drinks
  { id: '00000000-0000-0000-0000-000000000m01', categoryId: '00000000-0000-0000-0000-000000000c01', name: 'Coke',         price: 300,  sortOrder: 0 },
  { id: '00000000-0000-0000-0000-000000000m02', categoryId: '00000000-0000-0000-0000-000000000c01', name: 'Sprite',       price: 300,  sortOrder: 1 },
  { id: '00000000-0000-0000-0000-000000000m03', categoryId: '00000000-0000-0000-0000-000000000c01', name: 'Iced Tea',     price: 350,  sortOrder: 2 },
  // Appetizers
  { id: '00000000-0000-0000-0000-000000000m04', categoryId: '00000000-0000-0000-0000-000000000c02', name: 'Spring Rolls', price: 650,  sortOrder: 0 },
  { id: '00000000-0000-0000-0000-000000000m05', categoryId: '00000000-0000-0000-0000-000000000c02', name: 'Edamame',      price: 500,  sortOrder: 1 },
  // Mains
  { id: '00000000-0000-0000-0000-000000000m06', categoryId: '00000000-0000-0000-0000-000000000c03', name: 'Kung Pao Chicken', price: 1580, sortOrder: 0 },
  { id: '00000000-0000-0000-0000-000000000m07', categoryId: '00000000-0000-0000-0000-000000000c03', name: 'Beef Noodles',     price: 1480, sortOrder: 1 },
  { id: '00000000-0000-0000-0000-000000000m08', categoryId: '00000000-0000-0000-0000-000000000c03', name: 'Veggie Fried Rice', price: 1080, sortOrder: 2 },
  // Desserts
  { id: '00000000-0000-0000-0000-000000000m09', categoryId: '00000000-0000-0000-0000-000000000c04', name: 'Mango Pudding', price: 650, sortOrder: 0 },
] as const

export const DEMO_MENU_OPTIONS = [
  // Coke: ice / no ice
  { id: '00000000-0000-0000-0000-000000000o01', menuItemId: '00000000-0000-0000-0000-000000000m01', groupName: 'Ice',  name: 'Regular ice', priceAdjust: 0, isDefault: true,  sortOrder: 0 },
  { id: '00000000-0000-0000-0000-000000000o02', menuItemId: '00000000-0000-0000-0000-000000000m01', groupName: 'Ice',  name: 'No ice',      priceAdjust: 0, isDefault: false, sortOrder: 1 },
  // Kung Pao: spice
  { id: '00000000-0000-0000-0000-000000000o03', menuItemId: '00000000-0000-0000-0000-000000000m06', groupName: 'Spice', name: 'Mild',   priceAdjust: 0,   isDefault: true,  sortOrder: 0 },
  { id: '00000000-0000-0000-0000-000000000o04', menuItemId: '00000000-0000-0000-0000-000000000m06', groupName: 'Spice', name: 'Medium', priceAdjust: 0,   isDefault: false, sortOrder: 1 },
  { id: '00000000-0000-0000-0000-000000000o05', menuItemId: '00000000-0000-0000-0000-000000000m06', groupName: 'Spice', name: 'Hot',    priceAdjust: 0,   isDefault: false, sortOrder: 2 },
  { id: '00000000-0000-0000-0000-000000000o06', menuItemId: '00000000-0000-0000-0000-000000000m06', groupName: 'Extra', name: 'Extra peanuts', priceAdjust: 100, isDefault: false, sortOrder: 3 },
] as const
