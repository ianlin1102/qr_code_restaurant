/**
 * Menu domain repository — bundles Category + MenuItem + MenuItemOption.
 *
 * Single file (not three) because these always query together: listMenu
 * returns Category[] with nested menuItems with nested options. Splitting
 * would force every caller to do 3 joins manually.
 *
 * Options model: when an admin edits an item's options, the whole set is
 * replaced (replaceItemOptions) — matching the cart replaceDraftItems
 * pattern. Keeps callers simple; tiny option arrays make the DELETE+INSERT
 * cost trivial.
 */

import { Prisma } from '@prisma/client'
import type { Category, MenuItem, MenuItemOption } from '@prisma/client'
import { prisma, type Db } from './prisma-client.js'

type MenuItemWithOptions = MenuItem & { options: MenuItemOption[] }
type CategoryWithItems = Category & { menuItems: MenuItemWithOptions[] }

export const menuRepo = {
  /**
   * Full menu for current tenant, ordered + nested.
   * Inactive categories hidden; unavailable items included (caller filters).
   */
  listMenu: (db: Db = prisma): Promise<CategoryWithItems[]> =>
    db.category.findMany({
      where: { isActive: true },
      include: {
        menuItems: {
          include: { options: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    }) as Promise<CategoryWithItems[]>,

  /** Phase E 段 3a 回填: flat categories (no nested items) for analytics/admin lists. */
  listCategories: (db: Db = prisma): Promise<Category[]> =>
    db.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    }),

  findCategory: (id: string, db: Db = prisma): Promise<Category | null> =>
    db.category.findUnique({ where: { id } }),

  findItem: (id: string, db: Db = prisma): Promise<MenuItemWithOptions | null> =>
    db.menuItem.findUnique({
      where: { id },
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    }) as Promise<MenuItemWithOptions | null>,

  upsertCategory: (data: Prisma.CategoryUncheckedCreateInput, db: Db): Promise<Category> =>
    db.category.upsert({
      where: { id: data.id ?? '' },
      create: data,
      update: {
        name: data.name,
        nameEn: data.nameEn,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
        quickTags: data.quickTags,
      },
    }),

  upsertItem: (data: Prisma.MenuItemUncheckedCreateInput, db: Db): Promise<MenuItem> =>
    db.menuItem.upsert({
      where: { id: data.id ?? '' },
      create: data,
      update: {
        categoryId: data.categoryId,
        name: data.name,
        nameEn: data.nameEn,
        description: data.description,
        descriptionEn: data.descriptionEn,
        imageUrl: data.imageUrl,
        price: data.price,
        originalPrice: data.originalPrice,
        isAvailable: data.isAvailable,
        isStaffOnly: data.isStaffOnly,
        sortOrder: data.sortOrder,
      },
    }),

  setItemAvailability: (id: string, isAvailable: boolean, db: Db): Promise<MenuItem> =>
    db.menuItem.update({ where: { id }, data: { isAvailable } }),

  /**
   * Whole-set replace for an item's options. Multi-step — TransactionClient
   * required. Matches replaceDraftItems pattern (wipe + re-insert).
   */
  replaceItemOptions: async (
    itemId: string,
    options: {
      groupName: string
      name: string
      nameEn?: string
      priceAdjust: number
      isDefault?: boolean
      sortOrder?: number
    }[],
    tx: Prisma.TransactionClient
  ): Promise<MenuItemWithOptions> => {
    const item = await tx.menuItem.findUnique({
      where: { id: itemId },
      select: { storeId: true },
    })
    if (!item) throw new Error(`MenuItem ${itemId} not found`)

    await tx.menuItemOption.deleteMany({ where: { menuItemId: itemId } })

    for (const opt of options) {
      await tx.menuItemOption.create({
        data: {
          storeId: item.storeId,
          menuItemId: itemId,
          groupName: opt.groupName,
          name: opt.name,
          nameEn: opt.nameEn,
          priceAdjust: opt.priceAdjust,
          isDefault: opt.isDefault ?? false,
          sortOrder: opt.sortOrder ?? 0,
        },
      })
    }

    const updated = await tx.menuItem.findUnique({
      where: { id: itemId },
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    })
    return updated as MenuItemWithOptions
  },
}

export type { CategoryWithItems, MenuItemWithOptions }
