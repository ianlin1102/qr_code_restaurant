/**
 * Printer entity repository.
 *
 * Store ↔ Printer is 1:1 by app convention. Schema only has @@index(storeId)
 * (NOT @@unique) — app layer enforces single config per store via findFirst
 * + create/update flow. Future migration may add @@unique for hard guarantee
 * (optional, schema-migration-avoiding per D89 self-application).
 *
 * Scope: CRUD on config row. Actual print dispatch (printOrder / reprintOrder)
 * stays in service layer — it's hardware protocol, not data access.
 */

import type { Printer, Prisma } from '@prisma/client'
import { prisma, type Db } from './prisma-client.js'

export const printerRepo = {
  findByStoreId: (storeId: string, db: Db = prisma): Promise<Printer | null> =>
    db.printer.findFirst({ where: { storeId } }),

  /**
   * Upsert by storeId — multi-step atomic (findFirst + update OR create).
   * Schema only @@index(storeId) NOT @@unique, so Prisma upsert by storeId
   * is unavailable. D89 self-application schema-migration-avoiding path.
   * D55: multi-step tx requires `tx: Prisma.TransactionClient` signature
   * (caller must wrap `prisma.$transaction(async tx => ...)`).
   * Collapses legacy 3-step get/check/create (see printer.service.ts:14-34).
   */
  upsertConfig: async (
    storeId: string,
    config: {
      name?: string
      type: string
      host?: string | null
      port?: number | null
      isEnabled?: boolean
    },
    tx: Prisma.TransactionClient
  ): Promise<Printer> => {
    const existing = await tx.printer.findFirst({ where: { storeId } })
    if (existing) {
      return tx.printer.update({
        where: { id: existing.id },
        data: {
          type: config.type,
          ...(config.name !== undefined && { name: config.name }),
          ...(config.host !== undefined && { host: config.host }),
          ...(config.port !== undefined && { port: config.port }),
          ...(config.isEnabled !== undefined && { isEnabled: config.isEnabled }),
        },
      })
    }
    return tx.printer.create({
      data: {
        storeId,
        type: config.type,
        name: config.name ?? 'Default Printer',
        host: config.host ?? null,
        port: config.port ?? null,
        isEnabled: config.isEnabled ?? true,
      },
    })
  },
}
