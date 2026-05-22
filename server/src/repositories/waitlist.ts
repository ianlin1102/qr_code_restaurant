/**
 * WaitlistEntry repository.
 *
 * Scope:
 *   - CRUD + FIFO lookup of waiting entries
 *   - Status transitions (via updateEntry or markSeated)
 *
 * NOT in scope:
 *   - estimatedWait calculation (service layer — queue length × per-party minutes)
 *   - SSE emit — repo never emits (rule 2). Legacy controllers/waitlist.service.ts
 *     emitted on every mutation; Phase F caller moves emit to service layer
 *     AFTER tx commit.
 *   - Status machine validation (e.g. "only waiting → seated allowed") —
 *     caller enforces (mirror controllers/waitlist.service.ts:75).
 *   - notifiedAt field — schema-defined but unused at Task 25; Phase E/F integration.
 */

import type { WaitlistEntry } from '@prisma/client'
import { prisma, type Db } from './prisma-client.js'

export const waitlistRepo = {
  /**
   * FIFO list of entries currently waiting. This is the "active queue".
   */
  listWaiting: (storeId: string, db: Db = prisma): Promise<WaitlistEntry[]> =>
    db.waitlistEntry.findMany({
      where: { storeId, status: 'waiting' },
      orderBy: { createdAt: 'asc' },
    }),

  /**
   * Full history including seated + cancelled entries.
   */
  listAll: (storeId: string, db: Db = prisma): Promise<WaitlistEntry[]> =>
    db.waitlistEntry.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
    }),

  findById: (id: string, db: Db = prisma): Promise<WaitlistEntry | null> =>
    db.waitlistEntry.findUnique({ where: { id } }),

  /**
   * Create a new waiting entry. Sets status = 'waiting'.
   */
  add: (
    data: {
      storeId: string
      name: string
      partySize: number
      phone: string
    },
    db: Db
  ): Promise<WaitlistEntry> =>
    db.waitlistEntry.create({
      data: {
        storeId: data.storeId,
        name: data.name,
        partySize: data.partySize,
        phone: data.phone,
        status: 'waiting',
      },
    }),

  updateEntry: (
    id: string,
    patch: {
      name?: string
      partySize?: number
      phone?: string
      status?: 'waiting' | 'seated' | 'cancelled'
    },
    db: Db
  ): Promise<WaitlistEntry> =>
    db.waitlistEntry.update({ where: { id }, data: patch }),

  remove: (id: string, db: Db): Promise<WaitlistEntry> =>
    db.waitlistEntry.delete({ where: { id } }),

  /**
   * Shortcut for the seat action. Caller checks current status is 'waiting'
   * (see controllers/waitlist.service.ts:75 for legacy semantics).
   */
  markSeated: (id: string, db: Db): Promise<WaitlistEntry> =>
    db.waitlistEntry.update({
      where: { id },
      data: { status: 'seated' },
    }),
}
