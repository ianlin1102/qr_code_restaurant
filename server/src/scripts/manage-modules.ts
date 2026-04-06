import { moduleLicenseStore } from '../repositories/stores'
import { MODULE_REGISTRY } from '@qr-order/shared/modules'
import type { ModuleId } from '@qr-order/shared/modules'

const VALID_MODULES = Object.keys(MODULE_REGISTRY) as ModuleId[]

function usage() {
  console.log(`Usage:
  npx tsx src/scripts/manage-modules.ts list <storeId>
  npx tsx src/scripts/manage-modules.ts list-all
  npx tsx src/scripts/manage-modules.ts grant <storeId> <module1> [module2...]
  npx tsx src/scripts/manage-modules.ts revoke <storeId> <module1> [module2...]

Available modules: ${VALID_MODULES.join(', ')}`)
  process.exit(1)
}

const [,, command, storeId, ...moduleArgs] = process.argv

if (!command) usage()

function validateModules(ids: string[]): ModuleId[] {
  for (const id of ids) {
    if (!VALID_MODULES.includes(id as ModuleId)) {
      console.error(`Unknown module: "${id}". Valid modules: ${VALID_MODULES.join(', ')}`)
      process.exit(1)
    }
    if (id === 'core') {
      console.error('Cannot grant/revoke "core" — it is always included.')
      process.exit(1)
    }
  }
  return ids as ModuleId[]
}

switch (command) {
  case 'list': {
    if (!storeId) usage()
    const license = moduleLicenseStore.getById(storeId)
    if (!license) {
      console.log(`Store ${storeId}: no record (all modules by default)`)
    } else {
      console.log(`Store ${storeId}:`)
      console.log(`  Modules: ${license.modules.join(', ')}`)
      console.log(`  Granted: ${license.grantedAt}`)
      if (license.note) console.log(`  Note: ${license.note}`)
    }
    break
  }

  case 'list-all': {
    const all = moduleLicenseStore.getAll()
    if (all.length === 0) {
      console.log('No module licenses configured. All stores have full access (backward compat).')
    } else {
      for (const entry of all) {
        console.log(`${entry.id}: ${(entry as any).modules?.join(', ') ?? 'unknown'}`)
      }
    }
    break
  }

  case 'grant': {
    if (!storeId || moduleArgs.length === 0) usage()
    const modules = validateModules(moduleArgs)
    const existing = moduleLicenseStore.getById(storeId)
    const currentModules = existing?.modules ?? ['core']
    const newModules = [...new Set([...currentModules, ...modules])]
    if (!newModules.includes('core')) newModules.unshift('core')

    moduleLicenseStore.upsert(storeId, {
      modules: newModules,
      grantedAt: new Date().toISOString(),
      note: existing?.note,
    })
    console.log(`Granted [${modules.join(', ')}] to store ${storeId}`)
    console.log(`Current modules: ${newModules.join(', ')}`)
    break
  }

  case 'revoke': {
    if (!storeId || moduleArgs.length === 0) usage()
    const modules = validateModules(moduleArgs)
    const existing = moduleLicenseStore.getById(storeId)
    if (!existing) {
      console.error(`Store ${storeId} has no license record. Create one first with 'grant'.`)
      process.exit(1)
    }
    const newModules = existing.modules.filter(m => !modules.includes(m))
    if (!newModules.includes('core')) newModules.unshift('core')

    moduleLicenseStore.upsert(storeId, {
      modules: newModules,
      grantedAt: new Date().toISOString(),
      note: existing.note,
    })
    console.log(`Revoked [${modules.join(', ')}] from store ${storeId}`)
    console.log(`Remaining modules: ${newModules.join(', ')}`)
    break
  }

  default:
    console.error(`Unknown command: ${command}`)
    usage()
}
