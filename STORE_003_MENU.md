# Store 003 — 竹香小馆 / Bamboo Kitchen

完整菜单内容 (中英对照 + Description + Quick Tags + Dietary + Options + 推荐标记 + 图片文件名).

代码已应用于 `server/src/seed.ts`, 此文件供 review / 复制用.

---

## 店铺信息 / Store Info

| 字段 | 中文 | English |
|---|---|---|
| ID | `store-demo-003` | `store-demo-003` |
| 名称 | 竹香小馆 | Bamboo Kitchen |
| 描述 | 地道川粤美食 · 现做现送 | Authentic Sichuan & Cantonese cuisine · Made to order |
| 营业时间 | 11:00–22:00 | 11:00–22:00 |

---

## 分类 / Categories (4)

| # | 中文 | English | sortOrder |
|---|---|---|---|
| 1 | 主食 | Rice & Noodles | 1 |
| 2 | 招牌热菜 | Signature Entrees | 2 |
| 3 | 小吃 | Appetizers | 3 |
| 4 | 饮品 | Drinks | 4 |

---

## 桌台 / Tables (4)

`1号桌 / Table 1`, `2号桌 / Table 2`, `3号桌 / Table 3`, `4号桌 / Table 4`

---

## 菜单 / Menu Items (40 道)

### 标记说明
- ⭐ = `isRecommended: true` (DishCardHighlight 大卡片显示)
- 🌶️ spicy / 🥬 vegetarian / 🌱 vegan / 🥜 contains-nuts / 🌾 gluten-free / 🥛 dairy-free
- **图片文件名** = 你上传到 `pic/demo003/` 时使用的精确文件名

---

### 一、主食 / Rice & Noodles (10 道)

#### 1. 宫保鸡丁盖饭 / Kung Pao Chicken over Rice
- **价格 / Price**: $13.99
- **图片 / Image**: `kung-pao-chicken-rice.jpg`
- **描述 (中)**: 经典川味宫保鸡丁配香米饭，花生碎点缀，酸甜微辣
- **Description (EN)**: Classic Sichuan kung pao chicken over jasmine rice, topped with crushed peanuts
- **快速备注 / Quick Tags**: 少辣 · 多葱花 · 不要花生
- **Dietary**: 🌶️ spicy, 🥜 contains-nuts
- **选项 / Options**: 辣度 / Spice Level (必选): 微辣 · 中辣 · 特辣

#### 2. 黑椒牛肉盖饭 / Black Pepper Beef over Rice
- **价格 / Price**: $14.99
- **图片 / Image**: `black-pepper-beef-rice.jpg`
- **描述 (中)**: 嫩滑牛肉佐黑椒汁，配青椒洋葱炒制，米饭吸足酱汁
- **Description (EN)**: Tender beef strips in black pepper sauce with bell peppers and onions, served over rice
- **快速备注 / Quick Tags**: 多酱料 · 少油 · 不要洋葱
- **选项 / Options**: 份量 / Size (必选): 小份 · 大份 (+$3.00)

#### 3. 麻婆豆腐盖饭 / Mapo Tofu over Rice
- **价格 / Price**: $12.99
- **图片 / Image**: `mapo-tofu-rice.jpg`
- **描述 (中)**: 麻辣鲜香的麻婆豆腐淋在白米饭上，花椒香气扑鼻
- **Description (EN)**: Spicy and numbing mapo tofu ladled over steamed rice, fragrant with Sichuan peppercorn
- **快速备注 / Quick Tags**: 少辣 · 不要花椒 · 少油
- **Dietary**: 🌶️ spicy
- **选项 / Options**: 辣度 / Spice Level (必选): 微辣 · 中辣 · 特辣

#### 4. ⭐ 招牌牛肉炒面 / House Special Beef Chow Mein
- **价格 / Price**: $14.99
- **图片 / Image**: `beef-chow-mein.jpg`
- **描述 (中)**: 本店招牌！手工拉面与嫩牛肉同炒，葱姜蒜爆香，色泽金黄
- **Description (EN)**: Our signature dish! Hand-pulled noodles wok-fired with tender beef, scallions, and garlic
- **快速备注 / Quick Tags**: 多葱花 · 少油 · 加蛋
- **选项 / Options**: 份量 / Size (必选): 小份 · 大份 (+$3.00)

#### 5. 鸡肉炒河粉 / Chicken Stir-Fried Rice Noodles
- **价格 / Price**: $13.99
- **图片 / Image**: `chicken-chow-fun.webp`
- **描述 (中)**: 宽河粉佐鸡肉、豆芽、韭黄大火爆炒，粤式风味
- **Description (EN)**: Wide rice noodles stir-fried with chicken, bean sprouts, and yellow chives in Cantonese style
- **快速备注 / Quick Tags**: 少酱 · 多豆芽 · 不要韭黄
- **选项 / Options**: 份量 / Size (必选): 小份 · 大份 (+$3.00)

#### 6. 扬州炒饭 / Yangzhou Fried Rice
- **价格 / Price**: $13.99
- **图片 / Image**: `yangzhou-fried-rice.jpg`
- **描述 (中)**: 虾仁、火腿、青豆、玉米、鸡蛋丁同炒，色香味俱全
- **Description (EN)**: Fried rice with shrimp, ham, peas, corn, and egg — a colorful classic
- **快速备注 / Quick Tags**: 多葱花 · 加蛋 · 不要虾仁
- **选项 / Options**: 份量 / Size (必选): 小份 · 大份 (+$3.00)

#### 7. ⭐ 红烧牛肉面 / Braised Beef Noodle Soup
- **价格 / Price**: $15.99
- **图片 / Image**: `braised-beef-noodle-soup.jpg`
- **描述 (中)**: 台式红烧牛肉面，浓郁汤底慢炖三小时，肉质软烂入味
- **Description (EN)**: Taiwanese braised beef noodle soup with rich broth slow-simmered for 3 hours
- **快速备注 / Quick Tags**: 多汤 · 加蛋 · 面要硬 · 不要香菜
- **选项 / Options**: 份量 / Size (必选): 小份 · 大份 (+$4.00)

#### 8. 担担面 / Dan Dan Noodles
- **价格 / Price**: $12.99
- **图片 / Image**: `dan-dan-noodles.jpg`
- **描述 (中)**: 四川经典面食，麻酱花生酱混合芝麻油，碎肉与榨菜增香
- **Description (EN)**: Sichuan classic — sesame and peanut sauce noodles topped with minced pork and pickled mustard
- **快速备注 / Quick Tags**: 少辣 · 多花生 · 不要榨菜
- **Dietary**: 🌶️ spicy, 🥜 contains-nuts
- **选项 / Options**: 辣度 / Spice Level (必选): 微辣 · 中辣 · 特辣

#### 9. 卤肉饭 / Taiwanese Braised Pork Rice
- **价格 / Price**: $11.99
- **图片 / Image**: `braised-pork-rice.jpg`
- **描述 (中)**: 台式经典卤肉饭，肥瘦相间猪肉慢炖，配卤蛋与酸菜
- **Description (EN)**: Taiwanese braised pork rice with slow-stewed pork belly, marinated egg, and pickled greens
- **快速备注 / Quick Tags**: 加卤蛋 · 多酸菜 · 少肥肉

#### 10. 海南鸡饭 / Hainanese Chicken Rice
- **价格 / Price**: $13.99
- **图片 / Image**: `hainanese-chicken-rice.jpg`
- **描述 (中)**: 嫩白鸡肉配香米饭，姜蓉与酱油为佐，清淡养生
- **Description (EN)**: Poached chicken over fragrant rice cooked in chicken stock, served with ginger paste and soy
- **快速备注 / Quick Tags**: 多姜蓉 · 不要鸡皮 · 加汤

---

### 二、招牌热菜 / Signature Entrees (12 道)

#### 1. ⭐ 左宗鸡 / General Tso's Chicken
- **价格 / Price**: $15.99
- **图片 / Image**: `general-tsos-chicken.jpg`
- **描述 (中)**: 酥脆鸡块裹酸甜辣酱汁，西方人最爱的中餐之一
- **Description (EN)**: Crispy chicken bites tossed in sweet, tangy, and slightly spicy sauce — an American-Chinese classic
- **快速备注 / Quick Tags**: 少辣 · 多酱 · 不要花椒
- **Dietary**: 🌶️ spicy
- **选项 / Options**: 辣度 / Spice Level (必选): 微辣 · 中辣 · 特辣

#### 2. 陈皮鸡 / Orange Chicken
- **价格 / Price**: $15.99
- **图片 / Image**: `orange-chicken.jpg`
- **描述 (中)**: 陈皮酱汁裹鸡丁，酸甜清香，色泽金黄
- **Description (EN)**: Crispy chicken in tangy orange peel sauce, sweet and aromatic
- **快速备注 / Quick Tags**: 多酱 · 少糖 · 加辣

#### 3. 宫保鸡丁 / Kung Pao Chicken
- **价格 / Price**: $15.49
- **图片 / Image**: `kung-pao-chicken.jpg`
- **描述 (中)**: 经典川菜，鸡丁、花生、干辣椒同炒，麻辣酸甜
- **Description (EN)**: Classic Sichuan dish — diced chicken, peanuts, and dried chilies in a tangy-spicy sauce
- **快速备注 / Quick Tags**: 少辣 · 多花生 · 不要花椒
- **Dietary**: 🌶️ spicy, 🥜 contains-nuts
- **选项 / Options**: 辣度 / Spice Level (必选): 微辣 · 中辣 · 特辣

#### 4. 西兰花牛肉 / Beef with Broccoli
- **价格 / Price**: $16.99
- **图片 / Image**: `beef-with-broccoli.jpg`
- **描述 (中)**: 嫩牛肉片与翠绿西兰花同炒，蚝油勾芡
- **Description (EN)**: Tender beef slices stir-fried with crisp broccoli in oyster sauce
- **快速备注 / Quick Tags**: 少油 · 多西兰花 · 不要蒜

#### 5. 鱼香肉丝 / Shredded Pork with Garlic Sauce
- **价格 / Price**: $15.49
- **图片 / Image**: `shredded-pork-garlic.avif`
- **描述 (中)**: 川菜代表，肉丝、木耳、笋丝、胡萝卜丝同炒，鱼香酱汁酸甜微辣
- **Description (EN)**: Sichuan classic — shredded pork with wood ear, bamboo shoots, and carrots in tangy garlic sauce
- **快速备注 / Quick Tags**: 少辣 · 多木耳 · 不要笋
- **Dietary**: 🌶️ spicy
- **选项 / Options**: 辣度 / Spice Level (必选): 微辣 · 中辣 · 特辣

#### 6. 麻婆豆腐 / Mapo Tofu
- **价格 / Price**: $13.99
- **图片 / Image**: `mapo-tofu.avif`
- **描述 (中)**: 川菜经典，嫩豆腐与肉末同烧，麻辣鲜香
- **Description (EN)**: Sichuan classic — silken tofu with minced pork in fiery numbing sauce
- **快速备注 / Quick Tags**: 少辣 · 不要花椒 · 不要肉末
- **Dietary**: 🌶️ spicy
- **选项 / Options**: 辣度 / Spice Level (必选): 微辣 · 中辣 · 特辣

#### 7. 干煸四季豆 / Dry-Fried Green Beans
- **价格 / Price**: $13.49
- **图片 / Image**: `dry-fried-green-beans.jpg`
- **描述 (中)**: 四季豆煸炒至外皮微皱，配蒜末与肉末，咸香下饭
- **Description (EN)**: Green beans dry-fried until blistered, tossed with garlic and minced pork
- **快速备注 / Quick Tags**: 不要肉末 · 少油 · 多蒜

#### 8. 番茄炒蛋 / Tomato & Egg Stir-Fry
- **价格 / Price**: $12.99
- **图片 / Image**: `tomato-egg-stir-fry.avif`
- **描述 (中)**: 家常菜代表，鲜嫩鸡蛋与酸甜番茄同炒，老少皆宜
- **Description (EN)**: Home-style favorite — fluffy scrambled eggs stir-fried with tangy sweet tomatoes
- **快速备注 / Quick Tags**: 多葱花 · 少糖 · 加饭
- **Dietary**: 🥬 vegetarian

#### 9. ⭐ 北京烤鸭 / Peking Duck
- **价格 / Price**: $28.99 ~~$32.99~~ (折扣 / discount, 半只价 / half-duck base)
- **图片 / Image**: `peking-duck.jpg`
- **描述 (中)**: 果木烤制，皮脆肉嫩，配荷叶饼、葱丝、黄瓜条与甜面酱
- **Description (EN)**: Wood-roasted duck with crispy skin, served with thin pancakes, scallions, cucumber, and hoisin sauce
- **快速备注 / Quick Tags**: 饼皮多份 · 酱料多 · 葱丝多
- **选项 / Options**: 份量 / Portion (必选): 半只 / Half Duck · 整只 / Whole Duck (+$15.00, 整只 = $43.99)

#### 10. 糖醋排骨 / Sweet & Sour Spare Ribs
- **价格 / Price**: $16.99
- **图片 / Image**: `sweet-sour-ribs.jpg`
- **描述 (中)**: 小排炸至金黄，淋糖醋汁，酸甜开胃
- **Description (EN)**: Crispy fried pork ribs glazed in sweet and sour sauce
- **快速备注 / Quick Tags**: 少糖 · 多酱 · 不要芝麻

#### 11. 京酱肉丝 / Beijing-Style Pork Strips
- **价格 / Price**: $15.49
- **图片 / Image**: `beijing-pork-strips.jpg`
- **描述 (中)**: 京酱肉丝佐豆皮与葱丝，咸甜适中
- **Description (EN)**: Shredded pork in sweet bean sauce served with tofu skin wraps and scallion strips
- **快速备注 / Quick Tags**: 多豆皮 · 少甜 · 葱丝多

#### 12. 回锅肉 / Twice-Cooked Pork
- **价格 / Price**: $15.99
- **图片 / Image**: `twice-cooked-pork.jpg`
- **描述 (中)**: 川菜经典，五花肉先煮后炒，配青蒜与豆瓣酱，香辣下饭
- **Description (EN)**: Sichuan classic — pork belly boiled then stir-fried with leek and chili bean paste
- **快速备注 / Quick Tags**: 少辣 · 多青蒜 · 少油
- **Dietary**: 🌶️ spicy
- **选项 / Options**: 辣度 / Spice Level (必选): 微辣 · 中辣 · 特辣

---

### 三、小吃 / Appetizers (8 道)

#### 1. 春卷 (2个) / Spring Rolls (2 pcs)
- **价格 / Price**: $4.99
- **图片 / Image**: `spring-rolls.avif`
- **描述 (中)**: 酥脆春卷，包卷新鲜蔬菜，配酸甜酱蘸食
- **Description (EN)**: Crispy spring rolls stuffed with fresh vegetables, served with sweet & sour dipping sauce
- **快速备注 / Quick Tags**: 多酱 · 不要香菜
- **Dietary**: 🥬 vegetarian

#### 2. ⭐ 锅贴 (6个) / Pan-Fried Dumplings (6 pcs)
- **价格 / Price**: $8.99
- **图片 / Image**: `pan-fried-dumplings.jpg`
- **描述 (中)**: 猪肉白菜馅锅贴，底部煎至金黄酥脆，搭配陈醋蘸食
- **Description (EN)**: Pork and cabbage dumplings pan-fried until golden crispy on the bottom, served with black vinegar
- **快速备注 / Quick Tags**: 醋多 · 不要醋 · 加辣油

#### 3. 炸蟹角 (6个) / Crab Rangoon (6 pcs)
- **价格 / Price**: $7.99
- **图片 / Image**: `crab-rangoon.jpg`
- **描述 (中)**: 蟹肉奶油芝士馅，馄饨皮包裹油炸，外酥内滑
- **Description (EN)**: Crispy wonton wrappers stuffed with crab and cream cheese
- **快速备注 / Quick Tags**: 多酱 · 不要芥末

#### 4. 盐酥鸡 / Crispy Popcorn Chicken
- **价格 / Price**: $8.99
- **图片 / Image**: `popcorn-chicken.jpg`
- **描述 (中)**: 台式盐酥鸡，鸡腿肉切丁裹粉炸至金黄，撒白胡椒粉与九层塔
- **Description (EN)**: Taiwanese popcorn chicken — battered chicken thigh bites with white pepper and basil
- **快速备注 / Quick Tags**: 多胡椒 · 加辣 · 不要九层塔

#### 5. 葱油饼 / Scallion Pancake
- **价格 / Price**: $5.99
- **图片 / Image**: `scallion-pancake.jpg`
- **描述 (中)**: 层层酥脆，葱花与油盐相间，热腾腾上桌
- **Description (EN)**: Flaky layered pancake with scallions, served hot off the griddle
- **快速备注 / Quick Tags**: 多葱 · 少油 · 加辣酱
- **Dietary**: 🥬 vegetarian

#### 6. ⭐ 小笼包 (6个) / Soup Dumplings (6 pcs)
- **价格 / Price**: $9.99
- **图片 / Image**: `soup-dumplings.jpg`
- **描述 (中)**: 上海经典小笼包，薄皮包鲜汤汁，配姜丝陈醋
- **Description (EN)**: Shanghai-style soup dumplings with thin skin and rich broth, served with ginger and vinegar
- **快速备注 / Quick Tags**: 多姜丝 · 醋多 · 小心烫

#### 7. 烧麦 (6个) / Shumai (6 pcs)
- **价格 / Price**: $8.49
- **图片 / Image**: `shumai.jpg`
- **描述 (中)**: 糯米与猪肉香菇蒸制，开口造型独特
- **Description (EN)**: Open-top steamed dumplings filled with sticky rice, pork, and shiitake mushrooms
- **快速备注 / Quick Tags**: 多酱油 · 不要香菇

#### 8. 韭菜煎饺 (8个) / Pan-Fried Chive Dumplings (8 pcs)
- **价格 / Price**: $8.99
- **图片 / Image**: `chive-dumplings.jpg`
- **描述 (中)**: 韭菜鸡蛋虾仁馅，煎至两面金黄
- **Description (EN)**: Pan-fried dumplings stuffed with chives, egg, and shrimp
- **快速备注 / Quick Tags**: 醋多 · 不要虾仁 · 加辣油

---

### 四、饮品 / Drinks (10 道)

#### 1. 冰红茶 / Iced Black Tea
- **价格 / Price**: $3.50
- **图片 / Image**: `iced-black-tea.jpg`
- **描述 (中)**: 现泡红茶冷却加冰，清爽解腻
- **Description (EN)**: Freshly-brewed black tea served chilled over ice
- **快速备注 / Quick Tags**: 少冰 · 多冰 · 加柠檬
- **选项 / Options**: 甜度 / Sweetness (可选): 正常糖 · 少糖 · 半糖 · 无糖

#### 2. 蜜桃气泡饮 / Peach Sparkling Drink
- **价格 / Price**: $4.50
- **图片 / Image**: `peach-sparkling.png`
- **描述 (中)**: 蜜桃果汁加苏打气泡，水蜜桃果肉点缀
- **Description (EN)**: Peach juice with sparkling water and chunks of fresh peach
- **快速备注 / Quick Tags**: 少冰 · 多桃肉 · 少糖
- **选项 / Options**: 甜度 / Sweetness (可选): 正常糖 · 少糖 · 半糖 · 无糖

#### 3. 珍珠奶茶 / Bubble Milk Tea
- **价格 / Price**: $5.50
- **图片 / Image**: `bubble-milk-tea.jpg`
- **描述 (中)**: 台式经典珍珠奶茶，Q弹黑糖珍珠配香浓奶茶
- **Description (EN)**: Taiwanese classic — chewy brown sugar tapioca pearls in creamy milk tea
- **快速备注 / Quick Tags**: 少冰 · 少糖 · 多珍珠 · 加椰果
- **选项 / Options**: 甜度 / Sweetness (可选): 正常糖 · 少糖 · 半糖 · 无糖

#### 4. ⭐ 杨枝甘露 / Mango Pomelo Sago
- **价格 / Price**: $6.99
- **图片 / Image**: `mango-pomelo-sago.jpg`
- **描述 (中)**: 港式甜品饮品，新鲜芒果、西米、柚子粒与椰汁同盛
- **Description (EN)**: Hong Kong dessert drink — fresh mango, sago pearls, pomelo, and coconut milk
- **快速备注 / Quick Tags**: 少冰 · 多芒果 · 少糖

#### 5. 玫瑰荔枝茶 / Rose Lychee Tea
- **价格 / Price**: $5.50
- **图片 / Image**: `rose-lychee-tea.jpg`
- **描述 (中)**: 玫瑰花茶底加荔枝果肉，淡雅花香
- **Description (EN)**: Rose tea with juicy lychee chunks — delicately floral and refreshing
- **快速备注 / Quick Tags**: 少冰 · 少糖 · 多荔枝
- **选项 / Options**: 甜度 / Sweetness (可选): 正常糖 · 少糖 · 半糖 · 无糖

#### 6. 鲜榨橙汁 / Fresh Orange Juice
- **价格 / Price**: $4.99
- **图片 / Image**: `fresh-orange-juice.jpg`
- **描述 (中)**: 现榨橙汁，无添加糖与防腐剂
- **Description (EN)**: Freshly squeezed orange juice — no added sugar or preservatives
- **快速备注 / Quick Tags**: 少冰 · 多冰 · 加柠檬
- **Dietary**: 🌱 vegan, 🌾 gluten-free

#### 7. 酸梅汤 / Sweet Plum Drink
- **价格 / Price**: $4.50
- **图片 / Image**: `plum-drink.jpg`
- **描述 (中)**: 传统酸梅汤，乌梅、山楂、陈皮慢煮，解暑生津
- **Description (EN)**: Traditional plum drink slow-brewed with smoked plum, hawthorn, and dried tangerine peel
- **快速备注 / Quick Tags**: 少冰 · 多冰 · 少糖
- **Dietary**: 🌱 vegan
- **选项 / Options**: 温度 / Temperature (必选): 冰 · 常温 · 热

#### 8. 豆浆 / Soy Milk
- **价格 / Price**: $3.50
- **图片 / Image**: `soy-milk.jpg`
- **描述 (中)**: 现磨黄豆现煮豆浆，香浓不加糖
- **Description (EN)**: Freshly ground and brewed soy milk — rich and unsweetened
- **快速备注 / Quick Tags**: 加糖 · 不加糖 · 加燕麦
- **Dietary**: 🌱 vegan, 🥛 dairy-free
- **选项 / Options**: 温度 / Temperature (必选): 冰 · 常温 · 热

#### 9. 茉莉花茶 / Jasmine Tea
- **价格 / Price**: $3.00
- **图片 / Image**: `jasmine-tea.jpg`
- **描述 (中)**: 上等茉莉花茶，香气清雅
- **Description (EN)**: Premium jasmine tea — fragrant and floral
- **快速备注 / Quick Tags**: 少冰 · 加柠檬
- **Dietary**: 🌱 vegan, 🌾 gluten-free
- **选项 / Options**: 温度 / Temperature (必选): 冰 · 常温 · 热

#### 10. 蜂蜜柠檬 / Honey Lemonade
- **价格 / Price**: $4.99
- **图片 / Image**: `honey-lemonade.jpg`
- **描述 (中)**: 蜂蜜与现榨柠檬汁，酸甜清爽
- **Description (EN)**: Fresh-squeezed lemonade sweetened with honey
- **快速备注 / Quick Tags**: 少冰 · 少糖 · 多柠檬
- **Dietary**: 🌾 gluten-free
- **选项 / Options**:
  - 甜度 / Sweetness (可选): 正常糖 · 少糖 · 半糖 · 无糖
  - 温度 / Temperature (必选): 冰 · 常温 · 热

---

## 图片清单 / Image Filename List

把所有图片放到 `pic/demo003/` 目录，文件名必须**精确匹配**下列 (大小写敏感):

### 已存在的图片 (旧 20 道)
```
kung-pao-chicken-rice.jpg
black-pepper-beef-rice.jpg
mapo-tofu-rice.jpg
beef-chow-mein.jpg
chicken-chow-fun.webp
yangzhou-fried-rice.jpg
general-tsos-chicken.jpg
orange-chicken.jpg
kung-pao-chicken.jpg
beef-with-broccoli.jpg
shredded-pork-garlic.avif
mapo-tofu.avif
dry-fried-green-beans.jpg
tomato-egg-stir-fry.avif
spring-rolls.avif
pan-fried-dumplings.jpg
crab-rangoon.jpg
popcorn-chicken.jpg
iced-black-tea.jpg
peach-sparkling.png
```

### 需要找的新图片 (20 张)
```
braised-beef-noodle-soup.jpg     # 红烧牛肉面
dan-dan-noodles.jpg              # 担担面
braised-pork-rice.jpg            # 卤肉饭
hainanese-chicken-rice.jpg       # 海南鸡饭
peking-duck.jpg                  # 北京烤鸭
sweet-sour-ribs.jpg              # 糖醋排骨
beijing-pork-strips.jpg          # 京酱肉丝
twice-cooked-pork.jpg            # 回锅肉
scallion-pancake.jpg             # 葱油饼
soup-dumplings.jpg               # 小笼包
shumai.jpg                       # 烧麦
chive-dumplings.jpg              # 韭菜煎饺
bubble-milk-tea.jpg              # 珍珠奶茶
mango-pomelo-sago.jpg            # 杨枝甘露
rose-lychee-tea.jpg              # 玫瑰荔枝茶
fresh-orange-juice.jpg           # 鲜榨橙汁
plum-drink.jpg                   # 酸梅汤
soy-milk.jpg                     # 豆浆
jasmine-tea.jpg                  # 茉莉花茶
honey-lemonade.jpg               # 蜂蜜柠檬
```

---

## 上传图片 / Upload Images

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code/server
pnpm tsx src/scripts/upload-menu-images.ts ../pic/demo003
```

URL 自动 match seed.ts 的 `https://qr-restaurant-images.s3.us-east-1.amazonaws.com/menu-images/demo-003/<filename>`.

---

## Recommended 列表 (7 道)

| Category | 菜名 | 理由 |
|---|---|---|
| 主食 | 招牌牛肉炒面 | 本店招牌 |
| 主食 | 红烧牛肉面 | 台式经典 |
| 招牌热菜 | 左宗鸡 | 美式中餐人气王 |
| 招牌热菜 | 北京烤鸭 | 高端 signature, 含 originalPrice 折扣 |
| 小吃 | 锅贴 (6个) | 经典点单 |
| 小吃 | 小笼包 (6个) | 上海代表 |
| 饮品 | 杨枝甘露 | 港式甜品 |

---

## Dietary 统计

| Tag | 道数 | 菜名 |
|---|---|---|
| 🌶️ spicy | 7 | 宫保鸡丁盖饭, 麻婆豆腐盖饭, 担担面, 左宗鸡, 宫保鸡丁, 鱼香肉丝, 麻婆豆腐, 回锅肉 |
| 🥜 contains-nuts | 3 | 宫保鸡丁盖饭, 担担面, 宫保鸡丁 |
| 🥬 vegetarian | 3 | 番茄炒蛋, 春卷, 葱油饼 |
| 🌱 vegan | 4 | 鲜榨橙汁, 酸梅汤, 豆浆, 茉莉花茶 |
| 🌾 gluten-free | 3 | 鲜榨橙汁, 茉莉花茶, 蜂蜜柠檬 |
| 🥛 dairy-free | 1 | 豆浆 |

---

## 两个 Seed Scripts

| Script | 作用 | 用法 |
|---|---|---|
| `server/src/seed.ts` | 老 seed, 完整 reset 全部 3 个 stores (会清空所有 demo 数据) | `cd server && pnpm tsx src/seed.ts` |
| `server/src/scripts/seed-store-003.ts` | **新 seed, 只 update store-003**, 不动 stores 001/002 + orders/sessions/payments | `cd server && pnpm tsx src/scripts/seed-store-003.ts` |

两个 script 共用 `server/src/seeds/store-003.ts` 模块 (single source of truth) — 改菜单内容只改这一个文件, 两个 seed 都自动 pick up.

---

## 提示

- 修改 `seeds/store-003.ts` 不会自动更新 `server/data/*.json` — 跑上面任一 seed 命令重写
- 价格单位 cents (整数), `1399` = $13.99 — `store-003.ts` 内是 cents, 此 MD 显示美元
- 改 MD 文档不会改代码 — 编辑 MD 后告诉我同步
