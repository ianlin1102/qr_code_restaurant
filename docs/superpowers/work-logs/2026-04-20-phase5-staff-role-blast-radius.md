# Phase 5 — Staff.role blast radius handoff to Phase E Task 27-29 / Phase G Task 34

Phase B Task 7 Step 1.7 切换 StoreUser/JwtPayload/AuthUser `role: string → RoleDefinition`
(β 决议 5, 锚 b9baa7e4 §4 发现 2)。以下 server/client 站点有 `.role` 引用或依赖,
必须在 Phase E/G 实施时更新为 `role.name` 或 `role: RoleDefinition` 消费模式。

**Action for downstream tasks**:
- Phase E Task 27-29: server routes/middleware/services 全量扫 .role 引用
- Phase G Task 34: client session-cart + auth store 状态改造

## Server-side sites found

server/src/middleware/permission.middleware.ts:20:        req.user.role
server/src/middleware/auth.middleware.ts:48:    if (!req.user || !roles.includes(req.user.role)) {
server/src/scripts/migrate-permissions.ts:23:    roleStore.upsert(role.id, { ...role, permissions: newPerms as any })
server/src/controllers/auth.service.ts:33:  const permissions = resolvePermissions(user.storeId, userRoleId, user.role)
server/src/controllers/auth.service.ts:38:    role: user.role as string, // keep for backward compat
server/src/controllers/auth.service.ts:45:  logger.info({ storeId, username, role: user.role }, 'login successful')
server/src/controllers/auth.service.ts:53:        role: user.role,
server/src/controllers/staff.service.ts:22:    id: u.id, username: u.username, role: u.role,
server/src/controllers/staff.service.ts:109:  const owners = all.filter(u => u.role === 'owner')
server/src/controllers/staff.service.ts:110:  if (target.role === 'owner' && owners.length <= 1) {
server/src/controllers/analytics.service.ts:111:    role: s.role,

## Client-side sites (Phase G Task 34 scope)

client/src/stores/auth-store.ts:23:      isOwner: () => get().user?.role === 'owner',
client/src/components/layout/AdminLayout.tsx:30:    if (user?.role === 'owner') return true
client/src/components/layout/AdminLayout.tsx:139:                      {user.role === 'owner' ? t.nav.owner : t.nav.staffRole}
client/src/components/layout/AdminLayout.tsx:195:                    {user.role === 'owner' ? t.nav.owner : t.nav.staffRole}
client/src/hooks/usePermission.ts:8:    if (user?.role === 'owner') return true
client/src/hooks/usePermission.ts:9:    if (user?.role === 'manager') {
client/src/hooks/usePermission.ts:23:    if (user?.role === 'staff' || user?.role === 'waiter') {
client/src/pages/admin/AnalyticsPage.tsx:300:                    <td className="py-2 pr-4"><RoleBadge role={s.role} /></td>
client/src/pages/admin/StaffManagePage.tsx:112:      await api.createStaff(storeId, { username: form.username.trim(), password: form.password, role: form.role })
client/src/pages/admin/StaffManagePage.tsx:168:  const ownerCount = staff.filter(s => s.role === 'owner').length
client/src/pages/admin/StaffManagePage.tsx:169:  const canDelete = (u: AuthUser) => u.id !== currentUserId && !(u.role === 'owner' && ownerCount <= 1)
client/src/pages/admin/StaffManagePage.tsx:206:              const role = roleByName(m.role)
client/src/pages/admin/StaffManagePage.tsx:220:                        {role ? `${role.nameEn || role.name} — ${role.permissions.length} permissions` : m.role}
client/src/pages/admin/StaffManagePage.tsx:237:                        <Select value={m.role} onValueChange={v => handleRoleChange(m.id, v)}>
client/src/pages/admin/StaffManagePage.tsx:329:              <label className="text-sm font-medium">{t.staff.role}</label>
client/src/pages/admin/StaffManagePage.tsx:330:              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
client/src/pages/admin/StaffManagePage.tsx:344:              {form.role && (() => {
client/src/pages/admin/StaffManagePage.tsx:345:                const role = roleByName(form.role)
