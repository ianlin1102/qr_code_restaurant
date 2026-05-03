/**
 * Store 003 (竹香小馆 / Bamboo Kitchen) seed data — single source of truth.
 *
 * Imported by:
 *   - server/src/seed.ts                    — full reset (writes all 3 stores)
 *   - server/src/scripts/seed-store-003.ts  — partial update (only store-003)
 *
 * Edit dish content here; both seed scripts pick it up.
 *
 * IDs are generated with uuid() at module evaluation time, so within a single
 * process invocation all references are stable. Across separate seed runs the
 * ids will differ (expected — JSON store is ephemeral demo data).
 */
import { v4 as uuid } from 'uuid'

const IMG_BASE = 'https://qr-restaurant-images.s3.us-east-1.amazonaws.com/menu-images'

export const store3Id = 'store-demo-003'
const IMG3 = `${IMG_BASE}/demo-003`

// === Reusable option factories — call to mint fresh ids per dish ===

const spiceLevelOption = () => ({
  id: uuid(), name: '辣度', nameEn: 'Spice Level', required: true,
  choices: [
    { id: uuid(), name: '微辣', nameEn: 'Mild', priceAdjust: 0 },
    { id: uuid(), name: '中辣', nameEn: 'Medium', priceAdjust: 0 },
    { id: uuid(), name: '特辣', nameEn: 'Extra Spicy', priceAdjust: 0 },
  ],
})

const sizeOption = (largeAdjust = 300) => ({
  id: uuid(), name: '份量', nameEn: 'Size', required: true,
  choices: [
    { id: uuid(), name: '小份', nameEn: 'Small', priceAdjust: 0 },
    { id: uuid(), name: '大份', nameEn: 'Large', priceAdjust: largeAdjust },
  ],
})

const sweetnessOption = () => ({
  id: uuid(), name: '甜度', nameEn: 'Sweetness', required: false,
  choices: [
    { id: uuid(), name: '正常糖', nameEn: 'Normal', priceAdjust: 0 },
    { id: uuid(), name: '少糖', nameEn: 'Less Sugar', priceAdjust: 0 },
    { id: uuid(), name: '半糖', nameEn: 'Half Sugar', priceAdjust: 0 },
    { id: uuid(), name: '无糖', nameEn: 'No Sugar', priceAdjust: 0 },
  ],
})

const tempOption = () => ({
  id: uuid(), name: '温度', nameEn: 'Temperature', required: true,
  choices: [
    { id: uuid(), name: '冰', nameEn: 'Iced', priceAdjust: 0 },
    { id: uuid(), name: '常温', nameEn: 'Room Temp', priceAdjust: 0 },
    { id: uuid(), name: '热', nameEn: 'Hot', priceAdjust: 0 },
  ],
})

// Peking duck portion option — half is the listed base price ($28.99); whole +$15.
const duckPortionOption = () => ({
  id: uuid(), name: '份量', nameEn: 'Portion', required: true,
  choices: [
    { id: uuid(), name: '半只', nameEn: 'Half Duck', priceAdjust: 0 },
    { id: uuid(), name: '整只', nameEn: 'Whole Duck', priceAdjust: 1500 },
  ],
})

// === Store entry ===

export const store3StoreEntry = {
  id: store3Id,
  name: '竹香小馆',
  nameEn: 'Bamboo Kitchen',
  description: '地道川粤美食 · 现做现送',
  descriptionEn: 'Authentic Sichuan & Cantonese cuisine · Made to order',
  openingHours: '11:00-22:00',
  createdAt: new Date().toISOString(),
}

// === Categories ===

export const store3Categories = [
  { id: uuid(), storeId: store3Id, name: '主食', nameEn: 'Rice & Noodles', sortOrder: 1 },
  { id: uuid(), storeId: store3Id, name: '招牌热菜', nameEn: 'Signature Entrees', sortOrder: 2 },
  { id: uuid(), storeId: store3Id, name: '小吃', nameEn: 'Appetizers', sortOrder: 3 },
  { id: uuid(), storeId: store3Id, name: '饮品', nameEn: 'Drinks', sortOrder: 4 },
]

// === Menu items (40) ===

export const store3MenuItems = [
  // --- 主食 (cat 0) — 10 items ---
  {
    id: uuid(), storeId: store3Id, categoryId: store3Categories[0].id,
    name: '宫保鸡丁盖饭', nameEn: 'Kung Pao Chicken over Rice',
    description: '经典川味宫保鸡丁配香米饭，花生碎点缀，酸甜微辣',
    descriptionEn: 'Classic Sichuan kung pao chicken over jasmine rice, topped with crushed peanuts',
    price: 1399, available: true, sortOrder: 1, image: `${IMG3}/kung-pao-chicken-rice.jpg`,
    quickTags: ['少辣', '多葱花', '不要花生'],
    dietary: ['spicy', 'contains-nuts'] as const,
    options: [spiceLevelOption()],
  },
  {
    id: uuid(), storeId: store3Id, categoryId: store3Categories[0].id,
    name: '黑椒牛肉盖饭', nameEn: 'Black Pepper Beef over Rice',
    description: '嫩滑牛肉佐黑椒汁，配青椒洋葱炒制，米饭吸足酱汁',
    descriptionEn: 'Tender beef strips in black pepper sauce with bell peppers and onions, served over rice',
    price: 1499, available: true, sortOrder: 2, image: `${IMG3}/black-pepper-beef-rice.jpg`,
    quickTags: ['多酱料', '少油', '不要洋葱'],
    options: [sizeOption(300)],
  },
  {
    id: uuid(), storeId: store3Id, categoryId: store3Categories[0].id,
    name: '麻婆豆腐盖饭', nameEn: 'Mapo Tofu over Rice',
    description: '麻辣鲜香的麻婆豆腐淋在白米饭上，花椒香气扑鼻',
    descriptionEn: 'Spicy and numbing mapo tofu ladled over steamed rice, fragrant with Sichuan peppercorn',
    price: 1299, available: true, sortOrder: 3, image: `${IMG3}/mapo-tofu-rice.jpg`,
    quickTags: ['少辣', '不要花椒', '少油'],
    dietary: ['spicy'] as const,
    options: [spiceLevelOption()],
  },
  {
    id: uuid(), storeId: store3Id, categoryId: store3Categories[0].id,
    name: '招牌牛肉炒面', nameEn: 'House Special Beef Chow Mein',
    description: '本店招牌！手工拉面与嫩牛肉同炒，葱姜蒜爆香，色泽金黄',
    descriptionEn: 'Our signature dish! Hand-pulled noodles wok-fired with tender beef, scallions, and garlic',
    price: 1499, available: true, sortOrder: 4, image: `${IMG3}/beef-chow-mein.jpg`,
    quickTags: ['多葱花', '少油', '加蛋'],
    isRecommended: true,
    options: [sizeOption(300)],
  },
  {
    id: uuid(), storeId: store3Id, categoryId: store3Categories[0].id,
    name: '鸡肉炒河粉', nameEn: 'Chicken Stir-Fried Rice Noodles',
    description: '宽河粉佐鸡肉、豆芽、韭黄大火爆炒，粤式风味',
    descriptionEn: 'Wide rice noodles stir-fried with chicken, bean sprouts, and yellow chives in Cantonese style',
    price: 1399, available: true, sortOrder: 5, image: `${IMG3}/chicken-chow-fun.webp`,
    quickTags: ['少酱', '多豆芽', '不要韭黄'],
    options: [sizeOption(300)],
  },
  {
    id: uuid(), storeId: store3Id, categoryId: store3Categories[0].id,
    name: '扬州炒饭', nameEn: 'Yangzhou Fried Rice',
    description: '虾仁、火腿、青豆、玉米、鸡蛋丁同炒，色香味俱全',
    descriptionEn: 'Fried rice with shrimp, ham, peas, corn, and egg — a colorful classic',
    price: 1399, available: true, sortOrder: 6, image: `${IMG3}/yangzhou-fried-rice.jpg`,
    quickTags: ['多葱花', '加蛋', '不要虾仁'],
    options: [sizeOption(300)],
  },
  {
    id: uuid(), storeId: store3Id, categoryId: store3Categories[0].id,
    name: '红烧牛肉面', nameEn: 'Braised Beef Noodle Soup',
    description: '台式红烧牛肉面，浓郁汤底慢炖三小时，肉质软烂入味',
    descriptionEn: 'Taiwanese braised beef noodle soup with rich broth slow-simmered for 3 hours',
    price: 1599, available: true, sortOrder: 7, image: `${IMG3}/红烧牛肉面.avif`,
    quickTags: ['多汤', '加蛋', '面要硬', '不要香菜'],
    isRecommended: true,
    options: [sizeOption(400)],
  },
  {
    id: uuid(), storeId: store3Id, categoryId: store3Categories[0].id,
    name: '担担面', nameEn: 'Dan Dan Noodles',
    description: '四川经典面食，麻酱花生酱混合芝麻油，碎肉与榨菜增香',
    descriptionEn: 'Sichuan classic — sesame and peanut sauce noodles topped with minced pork and pickled mustard',
    price: 1299, available: true, sortOrder: 8, image: `${IMG3}/担担面.jpg`,
    quickTags: ['少辣', '多花生', '不要榨菜'],
    dietary: ['spicy', 'contains-nuts'] as const,
    options: [spiceLevelOption()],
  },
  {
    id: uuid(), storeId: store3Id, categoryId: store3Categories[0].id,
    name: '卤肉饭', nameEn: 'Taiwanese Braised Pork Rice',
    description: '台式经典卤肉饭，肥瘦相间猪肉慢炖，配卤蛋与酸菜',
    descriptionEn: 'Taiwanese braised pork rice with slow-stewed pork belly, marinated egg, and pickled greens',
    price: 1199, available: true, sortOrder: 9, image: `${IMG3}/卤肉饭.jpeg`,
    quickTags: ['加卤蛋', '多酸菜', '少肥肉'],
  },
  {
    id: uuid(), storeId: store3Id, categoryId: store3Categories[0].id,
    name: '海南鸡饭', nameEn: 'Hainanese Chicken Rice',
    description: '嫩白鸡肉配香米饭，姜蓉与酱油为佐，清淡养生',
    descriptionEn: 'Poached chicken over fragrant rice cooked in chicken stock, served with ginger paste and soy',
    price: 1399, available: true, sortOrder: 10, image: `${IMG3}/海南鸡饭.jpg`,
    quickTags: ['多姜蓉', '不要鸡皮', '加汤'],
  },

  // --- 招牌热菜 (cat 1) — 12 items ---
  {
    id: uuid(), storeId: store3Id, categoryId: store3Categories[1].id,
    name: '左宗鸡', nameEn: "General Tso's Chicken",
    description: '酥脆鸡块裹酸甜辣酱汁，西方人最爱的中餐之一',
    descriptionEn: 'Crispy chicken bites tossed in sweet, tangy, and slightly spicy sauce — an American-Chinese classic',
    price: 1599, available: true, sortOrder: 1, image: `${IMG3}/general-tsos-chicken.jpg`,
    quickTags: ['少辣', '多酱', '不要花椒'],
    dietary: ['spicy'] as const,
    isRecommended: true,
    options: [spiceLevelOption()],
  },
  {
    id: uuid(), storeId: store3Id, categoryId: store3Categories[1].id,
    name: '陈皮鸡', nameEn: 'Orange Chicken',
    description: '陈皮酱汁裹鸡丁，酸甜清香，色泽金黄',
    descriptionEn: 'Crispy chicken in tangy orange peel sauce, sweet and aromatic',
    price: 1599, available: true, sortOrder: 2, image: `${IMG3}/orange-chicken.jpg`,
    quickTags: ['多酱', '少糖', '加辣'],
  },
  {
    id: uuid(), storeId: store3Id, categoryId: store3Categories[1].id,
    name: '宫保鸡丁', nameEn: 'Kung Pao Chicken',
    description: '经典川菜，鸡丁、花生、干辣椒同炒，麻辣酸甜',
    descriptionEn: 'Classic Sichuan dish — diced chicken, peanuts, and dried chilies in a tangy-spicy sauce',
    price: 1549, available: true, sortOrder: 3, image: `${IMG3}/kung-pao-chicken.jpg`,
    quickTags: ['少辣', '多花生', '不要花椒'],
    dietary: ['spicy', 'contains-nuts'] as const,
    options: [spiceLevelOption()],
  },
  {
    id: uuid(), storeId: store3Id, categoryId: store3Categories[1].id,
    name: '西兰花牛肉', nameEn: 'Beef with Broccoli',
    description: '嫩牛肉片与翠绿西兰花同炒，蚝油勾芡',
    descriptionEn: 'Tender beef slices stir-fried with crisp broccoli in oyster sauce',
    price: 1699, available: true, sortOrder: 4, image: `${IMG3}/beef-with-broccoli.jpg`,
    quickTags: ['少油', '多西兰花', '不要蒜'],
  },
  {
    id: uuid(), storeId: store3Id, categoryId: store3Categories[1].id,
    name: '鱼香肉丝', nameEn: 'Shredded Pork with Garlic Sauce',
    description: '川菜代表，肉丝、木耳、笋丝、胡萝卜丝同炒，鱼香酱汁酸甜微辣',
    descriptionEn: 'Sichuan classic — shredded pork with wood ear, bamboo shoots, and carrots in tangy garlic sauce',
    price: 1549, available: true, sortOrder: 5, image: `${IMG3}/shredded-pork-garlic.avif`,
    quickTags: ['少辣', '多木耳', '不要笋'],
    dietary: ['spicy'] as const,
    options: [spiceLevelOption()],
  },
  {
    id: uuid(), storeId: store3Id, categoryId: store3Categories[1].id,
    name: '麻婆豆腐', nameEn: 'Mapo Tofu',
    description: '川菜经典，嫩豆腐与肉末同烧，麻辣鲜香',
    descriptionEn: 'Sichuan classic — silken tofu with minced pork in fiery numbing sauce',
    price: 1399, available: true, sortOrder: 6, image: `${IMG3}/mapo-tofu.avif`,
    quickTags: ['少辣', '不要花椒', '不要肉末'],
    dietary: ['spicy'] as const,
    options: [spiceLevelOption()],
  },
  {
    id: uuid(), storeId: store3Id, categoryId: store3Categories[1].id,
    name: '干煸四季豆', nameEn: 'Dry-Fried Green Beans',
    description: '四季豆煸炒至外皮微皱，配蒜末与肉末，咸香下饭',
    descriptionEn: 'Green beans dry-fried until blistered, tossed with garlic and minced pork',
    price: 1349, available: true, sortOrder: 7, image: `${IMG3}/dry-fried-green-beans.jpg`,
    quickTags: ['不要肉末', '少油', '多蒜'],
  },
  {
    id: uuid(), storeId: store3Id, categoryId: store3Categories[1].id,
    name: '番茄炒蛋', nameEn: 'Tomato & Egg Stir-Fry',
    description: '家常菜代表，鲜嫩鸡蛋与酸甜番茄同炒，老少皆宜',
    descriptionEn: 'Home-style favorite — fluffy scrambled eggs stir-fried with tangy sweet tomatoes',
    price: 1299, available: true, sortOrder: 8, image: `${IMG3}/tomato-egg-stir-fry.avif`,
    quickTags: ['多葱花', '少糖', '加饭'],
    dietary: ['vegetarian'] as const,
  },
  {
    id: uuid(), storeId: store3Id, categoryId: store3Categories[1].id,
    name: '北京烤鸭', nameEn: 'Peking Duck',
    description: '果木烤制，皮脆肉嫩，配荷叶饼、葱丝、黄瓜条与甜面酱',
    descriptionEn: 'Wood-roasted duck with crispy skin, served with thin pancakes, scallions, cucumber, and hoisin sauce',
    price: 2899, originalPrice: 3299, available: true, sortOrder: 9, image: `${IMG3}/北京烤鸭.jpeg`,
    quickTags: ['饼皮多份', '酱料多', '葱丝多'],
    isRecommended: true,
    options: [duckPortionOption()],
  },
  {
    id: uuid(), storeId: store3Id, categoryId: store3Categories[1].id,
    name: '糖醋排骨', nameEn: 'Sweet & Sour Spare Ribs',
    description: '小排炸至金黄，淋糖醋汁，酸甜开胃',
    descriptionEn: 'Crispy fried pork ribs glazed in sweet and sour sauce',
    price: 1699, available: true, sortOrder: 10, image: `${IMG3}/糖醋排骨.jpg`,
    quickTags: ['少糖', '多酱', '不要芝麻'],
  },
  {
    id: uuid(), storeId: store3Id, categoryId: store3Categories[1].id,
    name: '京酱肉丝', nameEn: 'Beijing-Style Pork Strips',
    description: '京酱肉丝佐豆皮与葱丝，咸甜适中',
    descriptionEn: 'Shredded pork in sweet bean sauce served with tofu skin wraps and scallion strips',
    price: 1549, available: true, sortOrder: 11, image: `${IMG3}/京酱肉丝.webp`,
    quickTags: ['多豆皮', '少甜', '葱丝多'],
  },
  {
    id: uuid(), storeId: store3Id, categoryId: store3Categories[1].id,
    name: '回锅肉', nameEn: 'Twice-Cooked Pork',
    description: '川菜经典，五花肉先煮后炒，配青蒜与豆瓣酱，香辣下饭',
    descriptionEn: 'Sichuan classic — pork belly boiled then stir-fried with leek and chili bean paste',
    price: 1599, available: true, sortOrder: 12, image: `${IMG3}/回锅肉.jpeg`,
    quickTags: ['少辣', '多青蒜', '少油'],
    dietary: ['spicy'] as const,
    options: [spiceLevelOption()],
  },

  // --- 小吃 (cat 2) — 8 items ---
  {
    id: uuid(), storeId: store3Id, categoryId: store3Categories[2].id,
    name: '春卷(2个)', nameEn: 'Spring Rolls (2 pcs)',
    description: '酥脆春卷，包卷新鲜蔬菜，配酸甜酱蘸食',
    descriptionEn: 'Crispy spring rolls stuffed with fresh vegetables, served with sweet & sour dipping sauce',
    price: 499, available: true, sortOrder: 1, image: `${IMG3}/spring-rolls.avif`,
    quickTags: ['多酱', '不要香菜'],
    dietary: ['vegetarian'] as const,
  },
  {
    id: uuid(), storeId: store3Id, categoryId: store3Categories[2].id,
    name: '锅贴(6个)', nameEn: 'Pan-Fried Dumplings (6 pcs)',
    description: '猪肉白菜馅锅贴，底部煎至金黄酥脆，搭配陈醋蘸食',
    descriptionEn: 'Pork and cabbage dumplings pan-fried until golden crispy on the bottom, served with black vinegar',
    price: 899, available: true, sortOrder: 2, image: `${IMG3}/pan-fried-dumplings.jpg`,
    quickTags: ['醋多', '不要醋', '加辣油'],
    isRecommended: true,
  },
  {
    id: uuid(), storeId: store3Id, categoryId: store3Categories[2].id,
    name: '炸蟹角(6个)', nameEn: 'Crab Rangoon (6 pcs)',
    description: '蟹肉奶油芝士馅，馄饨皮包裹油炸，外酥内滑',
    descriptionEn: 'Crispy wonton wrappers stuffed with crab and cream cheese',
    price: 799, available: true, sortOrder: 3, image: `${IMG3}/crab-rangoon.jpg`,
    quickTags: ['多酱', '不要芥末'],
  },
  {
    id: uuid(), storeId: store3Id, categoryId: store3Categories[2].id,
    name: '盐酥鸡', nameEn: 'Crispy Popcorn Chicken',
    description: '台式盐酥鸡，鸡腿肉切丁裹粉炸至金黄，撒白胡椒粉与九层塔',
    descriptionEn: 'Taiwanese popcorn chicken — battered chicken thigh bites with white pepper and basil',
    price: 899, available: true, sortOrder: 4, image: `${IMG3}/popcorn-chicken.jpg`,
    quickTags: ['多胡椒', '加辣', '不要九层塔'],
  },
  {
    id: uuid(), storeId: store3Id, categoryId: store3Categories[2].id,
    name: '葱油饼', nameEn: 'Scallion Pancake',
    description: '层层酥脆，葱花与油盐相间，热腾腾上桌',
    descriptionEn: 'Flaky layered pancake with scallions, served hot off the griddle',
    price: 599, available: true, sortOrder: 5, image: `${IMG3}/葱油饼.avif`,
    quickTags: ['多葱', '少油', '加辣酱'],
    dietary: ['vegetarian'] as const,
  },
  {
    id: uuid(), storeId: store3Id, categoryId: store3Categories[2].id,
    name: '小笼包(6个)', nameEn: 'Soup Dumplings (6 pcs)',
    description: '上海经典小笼包，薄皮包鲜汤汁，配姜丝陈醋',
    descriptionEn: 'Shanghai-style soup dumplings with thin skin and rich broth, served with ginger and vinegar',
    price: 999, available: true, sortOrder: 6, image: `${IMG3}/小笼包.jpg`,
    quickTags: ['多姜丝', '醋多', '小心烫'],
    isRecommended: true,
  },
  {
    id: uuid(), storeId: store3Id, categoryId: store3Categories[2].id,
    name: '烧麦(6个)', nameEn: 'Shumai (6 pcs)',
    description: '糯米与猪肉香菇蒸制，开口造型独特',
    descriptionEn: 'Open-top steamed dumplings filled with sticky rice, pork, and shiitake mushrooms',
    price: 849, available: true, sortOrder: 7, image: `${IMG3}/烧麦.jpeg`,
    quickTags: ['多酱油', '不要香菇'],
  },
  {
    id: uuid(), storeId: store3Id, categoryId: store3Categories[2].id,
    name: '韭菜煎饺(8个)', nameEn: 'Pan-Fried Chive Dumplings (8 pcs)',
    description: '韭菜鸡蛋虾仁馅，煎至两面金黄',
    descriptionEn: 'Pan-fried dumplings stuffed with chives, egg, and shrimp',
    price: 899, available: true, sortOrder: 8, image: `${IMG3}/韭菜煎饺.jpeg`,
    quickTags: ['醋多', '不要虾仁', '加辣油'],
  },

  // --- 饮品 (cat 3) — 10 items ---
  {
    id: uuid(), storeId: store3Id, categoryId: store3Categories[3].id,
    name: '冰红茶', nameEn: 'Iced Black Tea',
    description: '现泡红茶冷却加冰，清爽解腻',
    descriptionEn: 'Freshly-brewed black tea served chilled over ice',
    price: 350, available: true, sortOrder: 1, image: `${IMG3}/iced-black-tea.jpg`,
    quickTags: ['少冰', '多冰', '加柠檬'],
    options: [sweetnessOption()],
  },
  {
    id: uuid(), storeId: store3Id, categoryId: store3Categories[3].id,
    name: '蜜桃气泡饮', nameEn: 'Peach Sparkling Drink',
    description: '蜜桃果汁加苏打气泡，水蜜桃果肉点缀',
    descriptionEn: 'Peach juice with sparkling water and chunks of fresh peach',
    price: 450, available: true, sortOrder: 2, image: `${IMG3}/peach-sparkling.png`,
    quickTags: ['少冰', '多桃肉', '少糖'],
    options: [sweetnessOption()],
  },
  {
    id: uuid(), storeId: store3Id, categoryId: store3Categories[3].id,
    name: '珍珠奶茶', nameEn: 'Bubble Milk Tea',
    description: '台式经典珍珠奶茶，Q弹黑糖珍珠配香浓奶茶',
    descriptionEn: 'Taiwanese classic — chewy brown sugar tapioca pearls in creamy milk tea',
    price: 550, available: true, sortOrder: 3, image: `${IMG3}/珍珠奶茶.webp`,
    quickTags: ['少冰', '少糖', '多珍珠', '加椰果'],
    options: [sweetnessOption()],
  },
  {
    id: uuid(), storeId: store3Id, categoryId: store3Categories[3].id,
    name: '杨枝甘露', nameEn: 'Mango Pomelo Sago',
    description: '港式甜品饮品，新鲜芒果、西米、柚子粒与椰汁同盛',
    descriptionEn: 'Hong Kong dessert drink — fresh mango, sago pearls, pomelo, and coconut milk',
    price: 699, available: true, sortOrder: 4, image: `${IMG3}/杨枝甘露.jpeg`,
    quickTags: ['少冰', '多芒果', '少糖'],
    isRecommended: true,
  },
  {
    id: uuid(), storeId: store3Id, categoryId: store3Categories[3].id,
    name: '玫瑰荔枝茶', nameEn: 'Rose Lychee Tea',
    description: '玫瑰花茶底加荔枝果肉，淡雅花香',
    descriptionEn: 'Rose tea with juicy lychee chunks — delicately floral and refreshing',
    price: 550, available: true, sortOrder: 5, image: `${IMG3}/玫瑰荔枝茶.jpg`,
    quickTags: ['少冰', '少糖', '多荔枝'],
    options: [sweetnessOption()],
  },
  {
    id: uuid(), storeId: store3Id, categoryId: store3Categories[3].id,
    name: '鲜榨橙汁', nameEn: 'Fresh Orange Juice',
    description: '现榨橙汁，无添加糖与防腐剂',
    descriptionEn: 'Freshly squeezed orange juice — no added sugar or preservatives',
    price: 499, available: true, sortOrder: 6, image: `${IMG3}/鲜榨橙汁.jpg`,
    quickTags: ['少冰', '多冰', '加柠檬'],
    dietary: ['vegan', 'gluten-free'] as const,
  },
  {
    id: uuid(), storeId: store3Id, categoryId: store3Categories[3].id,
    name: '酸梅汤', nameEn: 'Sweet Plum Drink',
    description: '传统酸梅汤，乌梅、山楂、陈皮慢煮，解暑生津',
    descriptionEn: 'Traditional plum drink slow-brewed with smoked plum, hawthorn, and dried tangerine peel',
    price: 450, available: true, sortOrder: 7, image: `${IMG3}/酸梅汤.png`,
    quickTags: ['少冰', '多冰', '少糖'],
    dietary: ['vegan'] as const,
    options: [tempOption()],
  },
  {
    id: uuid(), storeId: store3Id, categoryId: store3Categories[3].id,
    name: '豆浆', nameEn: 'Soy Milk',
    description: '现磨黄豆现煮豆浆，香浓不加糖',
    descriptionEn: 'Freshly ground and brewed soy milk — rich and unsweetened',
    price: 350, available: true, sortOrder: 8, image: `${IMG3}/豆浆.jpg`,
    quickTags: ['加糖', '不加糖', '加燕麦'],
    dietary: ['vegan', 'dairy-free'] as const,
    options: [tempOption()],
  },
  {
    id: uuid(), storeId: store3Id, categoryId: store3Categories[3].id,
    name: '茉莉花茶', nameEn: 'Jasmine Tea',
    description: '上等茉莉花茶，香气清雅',
    descriptionEn: 'Premium jasmine tea — fragrant and floral',
    price: 300, available: true, sortOrder: 9, image: `${IMG3}/茉莉花茶.jpeg`,
    quickTags: ['少冰', '加柠檬'],
    dietary: ['vegan', 'gluten-free'] as const,
    options: [tempOption()],
  },
  {
    id: uuid(), storeId: store3Id, categoryId: store3Categories[3].id,
    name: '蜂蜜柠檬', nameEn: 'Honey Lemonade',
    description: '蜂蜜与现榨柠檬汁，酸甜清爽',
    descriptionEn: 'Fresh-squeezed lemonade sweetened with honey',
    price: 499, available: true, sortOrder: 10, image: `${IMG3}/蜂蜜柠檬.webp`,
    quickTags: ['少冰', '少糖', '多柠檬'],
    dietary: ['gluten-free'] as const,
    options: [sweetnessOption(), tempOption()],
  },
]

// === Tables ===

export const store3Tables = [
  { id: uuid(), storeId: store3Id, name: '1号桌', nameEn: 'Table 1', status: 'idle' as const },
  { id: uuid(), storeId: store3Id, name: '2号桌', nameEn: 'Table 2', status: 'idle' as const },
  { id: uuid(), storeId: store3Id, name: '3号桌', nameEn: 'Table 3', status: 'idle' as const },
  { id: uuid(), storeId: store3Id, name: '4号桌', nameEn: 'Table 4', status: 'idle' as const },
]
