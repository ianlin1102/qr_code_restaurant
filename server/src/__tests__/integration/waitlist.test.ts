import { describe, it, expect } from 'vitest'
import { testDb, withTestTenant, withTestPlatform } from './setup.js'
import { seedMinimalStore } from './fixtures.js'
import { waitlistRepo } from '../../repositories/waitlist.js'

describe('waitlist repository — integration', () => {
  // ============================================================
  // §1 CRUD round-trip
  // ============================================================
  describe('§1 CRUD round-trip', () => {
    it('add → findById round-trip: status="waiting" hardcoded + notifiedAt=null + createdAt populated', async () => {
      const store = await withTestPlatform((tx) => seedMinimalStore(tx))
      const created = await withTestTenant(store.id, (tx) =>
        waitlistRepo.add({
          storeId: store.id,
          name: 'Alice',
          partySize: 3,
          phone: '555-0101',
        }, tx)
      )
      const fetched = await withTestTenant(store.id, (tx) =>
        waitlistRepo.findById(created.id, tx)
      )
      expect(fetched).not.toBeNull()
      expect(fetched!.id).toBe(created.id)
      expect(fetched!.storeId).toBe(store.id)
      expect(fetched!.name).toBe('Alice')
      expect(fetched!.partySize).toBe(3)
      expect(fetched!.phone).toBe('555-0101')
      expect(fetched!.status).toBe('waiting')   // hardcoded by add()
      expect(fetched!.notifiedAt).toBeNull()    // not touched by repo (Phase E/F field)
      expect(fetched!.createdAt).toBeInstanceOf(Date)
    })

    it('listAll: 3 entries → returns 3 sorted createdAt DESC', async () => {
      const store = await withTestPlatform((tx) => seedMinimalStore(tx))
      await withTestTenant(store.id, async (tx) => {
        await waitlistRepo.add({ storeId: store.id, name: 'First', partySize: 1, phone: '555-0001' }, tx)
        await new Promise((r) => setTimeout(r, 10))
        await waitlistRepo.add({ storeId: store.id, name: 'Second', partySize: 2, phone: '555-0002' }, tx)
        await new Promise((r) => setTimeout(r, 10))
        await waitlistRepo.add({ storeId: store.id, name: 'Third', partySize: 3, phone: '555-0003' }, tx)
      })
      const list = await withTestTenant(store.id, (tx) =>
        waitlistRepo.listAll(store.id, tx)
      )
      expect(list).toHaveLength(3)
      // listAll orderBy createdAt desc → most recent first
      expect(list[0].name).toBe('Third')
      expect(list[1].name).toBe('Second')
      expect(list[2].name).toBe('First')
    })

    it('updateEntry partial: change one field, others preserved', async () => {
      // Observable behavior: omitted patch keys leave existing fields unchanged.
      const store = await withTestPlatform((tx) => seedMinimalStore(tx))
      const created = await withTestTenant(store.id, (tx) =>
        waitlistRepo.add({
          storeId: store.id,
          name: 'Original',
          partySize: 2,
          phone: '555-0100',
        }, tx)
      )
      await withTestTenant(store.id, (tx) =>
        waitlistRepo.updateEntry(created.id, { name: 'Renamed' }, tx)
      )
      const fetched = await withTestTenant(store.id, (tx) =>
        waitlistRepo.findById(created.id, tx)
      )
      expect(fetched!.name).toBe('Renamed')
      // Other fields preserved
      expect(fetched!.partySize).toBe(2)
      expect(fetched!.phone).toBe('555-0100')
      expect(fetched!.status).toBe('waiting')
    })

    it('remove → findById returns null', async () => {
      const store = await withTestPlatform((tx) => seedMinimalStore(tx))
      const created = await withTestTenant(store.id, (tx) =>
        waitlistRepo.add({
          storeId: store.id,
          name: 'DeleteMe',
          partySize: 1,
          phone: '555-0666',
        }, tx)
      )
      await withTestTenant(store.id, (tx) => waitlistRepo.remove(created.id, tx))
      const fetched = await withTestTenant(store.id, (tx) =>
        waitlistRepo.findById(created.id, tx)
      )
      expect(fetched).toBeNull()
    })
  })

  // ============================================================
  // §2 listWaiting query semantics (Oracle 独立于 plan — business intent)
  // ============================================================
  describe('§2 listWaiting query semantics', () => {
    it('listWaiting returns only status="waiting" entries (excludes seated)', async () => {
      const store = await withTestPlatform((tx) => seedMinimalStore(tx))
      await withTestTenant(store.id, async (tx) => {
        await waitlistRepo.add({ storeId: store.id, name: 'Waiting1', partySize: 1, phone: '555-1001' }, tx)
        await waitlistRepo.add({ storeId: store.id, name: 'Waiting2', partySize: 2, phone: '555-1002' }, tx)
        const seatedOne = await waitlistRepo.add({ storeId: store.id, name: 'Seated1', partySize: 3, phone: '555-1003' }, tx)
        await waitlistRepo.markSeated(seatedOne.id, tx)
      })
      const waiting = await withTestTenant(store.id, (tx) =>
        waitlistRepo.listWaiting(store.id, tx)
      )
      expect(waiting).toHaveLength(2)
      expect(waiting.every((e) => e.status === 'waiting')).toBe(true)
      const names = waiting.map((e) => e.name).sort()
      expect(names).toEqual(['Waiting1', 'Waiting2'])
    })

    it('listWaiting FIFO: orderBy createdAt ASC (oldest first)', async () => {
      // Oracle independent of plan: business intent = "waitlist is FIFO" (first come first served).
      // If impl ever writes orderBy desc (regression), this test fails.
      const store = await withTestPlatform((tx) => seedMinimalStore(tx))
      await withTestTenant(store.id, async (tx) => {
        await waitlistRepo.add({ storeId: store.id, name: 'EarliestA', partySize: 1, phone: '555-2001' }, tx)
        await new Promise((r) => setTimeout(r, 10))
        await waitlistRepo.add({ storeId: store.id, name: 'MiddleB', partySize: 2, phone: '555-2002' }, tx)
        await new Promise((r) => setTimeout(r, 10))
        await waitlistRepo.add({ storeId: store.id, name: 'LatestC', partySize: 3, phone: '555-2003' }, tx)
      })
      const queue = await withTestTenant(store.id, (tx) =>
        waitlistRepo.listWaiting(store.id, tx)
      )
      expect(queue).toHaveLength(3)
      // FIFO: oldest at front
      expect(queue[0].name).toBe('EarliestA')
      expect(queue[1].name).toBe('MiddleB')
      expect(queue[2].name).toBe('LatestC')
    })

    it('listWaiting excludes both "seated" and "cancelled" statuses', async () => {
      const store = await withTestPlatform((tx) => seedMinimalStore(tx))
      await withTestTenant(store.id, async (tx) => {
        await waitlistRepo.add({ storeId: store.id, name: 'StillWaiting', partySize: 1, phone: '555-3001' }, tx)
        const willSeat = await waitlistRepo.add({ storeId: store.id, name: 'BecameSeated', partySize: 2, phone: '555-3002' }, tx)
        const willCancel = await waitlistRepo.add({ storeId: store.id, name: 'WasCancelled', partySize: 3, phone: '555-3003' }, tx)
        await waitlistRepo.markSeated(willSeat.id, tx)
        await waitlistRepo.updateEntry(willCancel.id, { status: 'cancelled' }, tx)
      })
      const waiting = await withTestTenant(store.id, (tx) =>
        waitlistRepo.listWaiting(store.id, tx)
      )
      expect(waiting).toHaveLength(1)
      expect(waiting[0].name).toBe('StillWaiting')
    })

    it('listWaiting vs listAll: 3 entries + markSeated 1 → listWaiting=2 listAll=3', async () => {
      const store = await withTestPlatform((tx) => seedMinimalStore(tx))
      await withTestTenant(store.id, async (tx) => {
        await waitlistRepo.add({ storeId: store.id, name: 'A', partySize: 1, phone: '555-4001' }, tx)
        await waitlistRepo.add({ storeId: store.id, name: 'B', partySize: 2, phone: '555-4002' }, tx)
        const c = await waitlistRepo.add({ storeId: store.id, name: 'C', partySize: 3, phone: '555-4003' }, tx)
        await waitlistRepo.markSeated(c.id, tx)
      })
      const waiting = await withTestTenant(store.id, (tx) =>
        waitlistRepo.listWaiting(store.id, tx)
      )
      const all = await withTestTenant(store.id, (tx) =>
        waitlistRepo.listAll(store.id, tx)
      )
      expect(waiting).toHaveLength(2)
      expect(all).toHaveLength(3)
    })
  })

  // ============================================================
  // §3 status transitions: repo layer NO state machine enforcement
  // ============================================================
  describe('§3 status transitions: repo NO enforcement', () => {
    it('markSeated: status transitions "waiting" → "seated"', async () => {
      const store = await withTestPlatform((tx) => seedMinimalStore(tx))
      const created = await withTestTenant(store.id, (tx) =>
        waitlistRepo.add({ storeId: store.id, name: 'Seater', partySize: 2, phone: '555-5001' }, tx)
      )
      expect(created.status).toBe('waiting')
      const updated = await withTestTenant(store.id, (tx) =>
        waitlistRepo.markSeated(created.id, tx)
      )
      expect(updated.status).toBe('seated')
    })

    it('markSeated + listWaiting integration: seated entry no longer appears in listWaiting', async () => {
      const store = await withTestPlatform((tx) => seedMinimalStore(tx))
      const created = await withTestTenant(store.id, (tx) =>
        waitlistRepo.add({ storeId: store.id, name: 'Transitioning', partySize: 2, phone: '555-5002' }, tx)
      )
      // Before markSeated: appears in listWaiting
      const before = await withTestTenant(store.id, (tx) =>
        waitlistRepo.listWaiting(store.id, tx)
      )
      expect(before.find((e) => e.id === created.id)).toBeDefined()
      // After markSeated: gone from listWaiting
      await withTestTenant(store.id, (tx) => waitlistRepo.markSeated(created.id, tx))
      const after = await withTestTenant(store.id, (tx) =>
        waitlistRepo.listWaiting(store.id, tx)
      )
      expect(after.find((e) => e.id === created.id)).toBeUndefined()
    })

    it('updateEntry can set status="cancelled" directly (repo NO state machine — caller enforces)', async () => {
      // Oracle: business state machine (e.g. "only waiting → seated allowed") in service layer NOT repo.
      // repo updateEntry writes status directly. Same precedent: Task 24 coupons.incrementUses past maxUses (repo NO cap).
      const store = await withTestPlatform((tx) => seedMinimalStore(tx))
      const created = await withTestTenant(store.id, (tx) =>
        waitlistRepo.add({ storeId: store.id, name: 'WillCancel', partySize: 2, phone: '555-5003' }, tx)
      )
      const updated = await withTestTenant(store.id, (tx) =>
        waitlistRepo.updateEntry(created.id, { status: 'cancelled' }, tx)
      )
      expect(updated.status).toBe('cancelled')
    })
  })

  // ============================================================
  // §4 multi-tenant isolation (RLS) — safety critical
  // ============================================================
  describe('§4 multi-tenant isolation (RLS)', () => {
    it('store A entry → store B context listWaiting/listAll returns []', async () => {
      const { storeA, storeB } = await withTestPlatform(async (tx) => ({
        storeA: await seedMinimalStore(tx, { name: 'Store A' }),
        storeB: await seedMinimalStore(tx, { name: 'Store B' }),
      }))
      // Seed entry in store A via BYPASSRLS (avoid tenant context mismatch on insert)
      await withTestPlatform(async (tx) => {
        await tx.waitlistEntry.create({
          data: {
            storeId: storeA.id,
            name: 'A_only',
            partySize: 2,
            phone: '555-AAA',
            status: 'waiting',
          },
        })
      })
      // From store B's tenant context, query store A's entries → RLS filters
      const listWaitingFromB = await withTestTenant(storeB.id, (tx) =>
        waitlistRepo.listWaiting(storeA.id, tx)
      )
      const listAllFromB = await withTestTenant(storeB.id, (tx) =>
        waitlistRepo.listAll(storeA.id, tx)
      )
      expect(listWaitingFromB).toEqual([])
      expect(listAllFromB).toEqual([])
    })

    it('store A entry id → store B context findById returns null', async () => {
      const { storeA, storeB } = await withTestPlatform(async (tx) => ({
        storeA: await seedMinimalStore(tx, { name: 'A' }),
        storeB: await seedMinimalStore(tx, { name: 'B' }),
      }))
      const entry = await withTestPlatform((tx) =>
        tx.waitlistEntry.create({
          data: {
            storeId: storeA.id,
            name: 'A_entry',
            partySize: 2,
            phone: '555-AAA',
            status: 'waiting',
          },
        })
      )
      const fromB = await withTestTenant(storeB.id, (tx) =>
        waitlistRepo.findById(entry.id, tx)
      )
      expect(fromB).toBeNull()
    })

    it('store B context updateEntry/remove on store A entry → throws (RLS filter)', async () => {
      const { storeA, storeB } = await withTestPlatform(async (tx) => ({
        storeA: await seedMinimalStore(tx, { name: 'A' }),
        storeB: await seedMinimalStore(tx, { name: 'B' }),
      }))
      const entry = await withTestPlatform((tx) =>
        tx.waitlistEntry.create({
          data: {
            storeId: storeA.id,
            name: 'A_entry',
            partySize: 2,
            phone: '555-AAA',
            status: 'waiting',
          },
        })
      )
      // Prisma update with mismatched RLS context → Record not found / RLS violation
      await expect(
        withTestTenant(storeB.id, (tx) =>
          waitlistRepo.updateEntry(entry.id, { name: 'hack' }, tx)
        )
      ).rejects.toThrow()
      // Same for delete
      await expect(
        withTestTenant(storeB.id, (tx) => waitlistRepo.remove(entry.id, tx))
      ).rejects.toThrow()
    })
  })

  // ============================================================
  // §5 boundary data + no @@unique
  // ============================================================
  describe('§5 boundary data + no @@unique', () => {
    it('partySize=1 accepted + large partySize accepted', async () => {
      const store = await withTestPlatform((tx) => seedMinimalStore(tx))
      const small = await withTestTenant(store.id, (tx) =>
        waitlistRepo.add({ storeId: store.id, name: 'Solo', partySize: 1, phone: '555-7001' }, tx)
      )
      expect(small.partySize).toBe(1)
      const large = await withTestTenant(store.id, (tx) =>
        waitlistRepo.add({ storeId: store.id, name: 'BigParty', partySize: 50, phone: '555-7002' }, tx)
      )
      expect(large.partySize).toBe(50)
    })

    it('no @@unique: same store + identical name+phone → both succeed (contrast Task 24 coupons @@unique)', async () => {
      // Oracle: schema declares NO @@unique on WaitlistEntry → identical (name, phone) entries allowed.
      // Contrast precedent: Task 24 coupons @@unique([storeId, code]) → duplicate code throws.
      const store = await withTestPlatform((tx) => seedMinimalStore(tx))
      const first = await withTestTenant(store.id, (tx) =>
        waitlistRepo.add({ storeId: store.id, name: 'Duplicate', partySize: 2, phone: '555-9999' }, tx)
      )
      const second = await withTestTenant(store.id, (tx) =>
        waitlistRepo.add({ storeId: store.id, name: 'Duplicate', partySize: 2, phone: '555-9999' }, tx)
      )
      expect(first.id).not.toBe(second.id)
      expect(first.name).toBe(second.name)
      expect(first.phone).toBe(second.phone)
    })
  })
})
