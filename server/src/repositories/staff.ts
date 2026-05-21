/**
 * Staff entity repository.
 *
 * Field name note: legacy JsonStore used `password`; Prisma schema uses
 * `passwordHash`. This repo surfaces the Prisma name — controller-layer
 * auth.service must assign bcrypt(password) to passwordHash, not password.
 *
 * RLS note: findByUsername doesn't need explicit storeId because the
 * tenant context (app.current_store_id) restricts rows at DB level.
 */

import type { Staff, Role, TimeEntry } from '@prisma/client'
import { prisma, type Db } from './prisma-client.js'

type StaffWithRole = Staff & { role: Role | null }
type TimeEntryWithDuration = TimeEntry & { duration: number | null }

export const staffRepo = {
  findById: (id: string, db: Db = prisma): Promise<StaffWithRole | null> =>
    db.staff.findUnique({
      where: { id },
      include: { role: true },
    }) as Promise<StaffWithRole | null>,

  findByUsername: (username: string, db: Db = prisma): Promise<StaffWithRole | null> =>
    db.staff.findFirst({
      where: { username },
      include: { role: true },
    }) as Promise<StaffWithRole | null>,

  listAll: (db: Db = prisma): Promise<StaffWithRole[]> =>
    db.staff.findMany({
      include: { role: true },
      orderBy: { createdAt: 'asc' },
    }) as Promise<StaffWithRole[]>,

  create: (
    data: {
      storeId: string
      username: string
      passwordHash: string
      roleId: string
      clockPin?: string
      displayName?: string
    },
    db: Db
  ): Promise<Staff> =>
    db.staff.create({
      data: {
        storeId: data.storeId,
        username: data.username,
        passwordHash: data.passwordHash,
        roleId: data.roleId,
        clockPin: data.clockPin ?? null,
        displayName: data.displayName ?? null,
      },
    }),

  updateRole: (staffId: string, roleId: string, db: Db): Promise<Staff> =>
    db.staff.update({ where: { id: staffId }, data: { roleId } }),

  setClockPin: (staffId: string, clockPin: string, db: Db): Promise<Staff> =>
    db.staff.update({ where: { id: staffId }, data: { clockPin } }),

  setPassword: (staffId: string, passwordHash: string, db: Db): Promise<Staff> =>
    db.staff.update({ where: { id: staffId }, data: { passwordHash } }),

  // ========== Phase E 段 3b 回填: delete + TimeEntry methods ==========

  delete: (id: string, db: Db): Promise<Staff> =>
    db.staff.delete({ where: { id } }),

  findActiveTimeEntry: (staffId: string, db: Db = prisma): Promise<TimeEntry | null> =>
    db.timeEntry.findFirst({
      where: { staffId, clockOutAt: null },
      orderBy: { clockInAt: 'desc' },
    }),

  createTimeEntry: (
    data: { staffId: string; storeId: string; clockInAt: Date },
    db: Db
  ): Promise<TimeEntry> =>
    db.timeEntry.create({
      data: {
        staffId: data.staffId,
        storeId: data.storeId,
        clockInAt: data.clockInAt,
        clockOutAt: null,
      },
    }),

  /**
   * Close an active TimeEntry. Decision point G (refresh): schema has no
   * duration column — duration is derived in the RETURN shape of
   * listTimeEntries (compute on-the-fly: clockOutAt - clockInAt in minutes).
   * Repo updates clockOutAt only. Caller passes only clockOutAt timestamp.
   * Throws if entry already closed (double-close guard).
   * Schema-migration-avoiding per D89 self-application — business invariant
   * still enforced in repo (mapper layer), NOT in persisted column.
   */
  closeTimeEntry: async (
    entryId: string,
    clockOutAt: Date,
    db: Db
  ): Promise<TimeEntry> => {
    const entry = await db.timeEntry.findUnique({ where: { id: entryId } })
    if (!entry) throw new Error(`TimeEntry ${entryId} not found`)
    if (entry.clockOutAt) throw new Error(`TimeEntry ${entryId} already closed`)
    return db.timeEntry.update({
      where: { id: entryId },
      data: { clockOutAt },
    })
  },

  listTimeEntries: (
    storeId: string,
    filter: { staffId?: string; from?: Date; to?: Date } = {},
    db: Db = prisma
  ): Promise<TimeEntryWithDuration[]> =>
    db.timeEntry.findMany({
      where: {
        storeId,
        ...(filter.staffId && { staffId: filter.staffId }),
        ...(filter.from && { clockInAt: { gte: filter.from } }),
        ...(filter.to && { clockInAt: { lte: filter.to } }),
      },
      orderBy: { clockInAt: 'desc' },
    }).then((rows) => rows.map((e) => ({
      ...e,
      duration: e.clockOutAt
        ? Math.floor((e.clockOutAt.getTime() - e.clockInAt.getTime()) / 60000)
        : null,
    }))),
}

export type { StaffWithRole, TimeEntryWithDuration }
