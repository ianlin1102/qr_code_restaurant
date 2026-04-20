# Phase B Task 4 L1 Verify — RLS migration 安全性 8 维度

**Date**: 2026-04-20  
**Scope**: phase-b-infrastructure.md Task 4 段 (line 822-908, 87 行 SQL)  
**Verify level**: L1 (细 verify, 贴 SQL 完整看)  
**Plan 锚点**: phase-b-infrastructure.md (初版,无 β refinement)  
**前置**: Task 3 完成 (commit c831d3b8 + pushed)  
**Author**: Claude chat (Opus 接手 Task 4 启动准备)

---

## 1. Verify 维度设计

类比 Task 3 99b43a08 8 维度 audit 模式,Task 4 8 维度覆盖 RLS migration 安全性核心:

1. DB Roles 创建完整性 (3 角色 + idempotent)
2. BYPASSRLS 角色配置
3. GRANT 完整性 (CONNECT/USAGE/DML/sequences/default privileges)
4. RLS Dynamic SQL 范围 (含 platform_audit_log 自动跳过验证)
5. RLS Policy 双向 (USING + WITH CHECK)
6. 严格模式 D33 (current_setting 无 fallback 参数)
7. Partial unique index `one_draft_per_device` 设计
8. Cross-phase 协调 + Idempotency

---

## 2. 逐维度 audit

### 维度 1: DB Roles 创建完整性

**Plan SQL**: line 840-850

**Verify**:
- `app_user` LOGIN, **无** BYPASSRLS (RLS-bound, 业务连接默认角色)
- `platform_admin` LOGIN + BYPASSRLS
- `system_worker` LOGIN + BYPASSRLS
- 3 角色全 idempotent (`DO $$ ... EXCEPTION WHEN duplicate_object`)

**隐含设计**: GRANT 在 RLS ENABLE 之前 (line 856 vs line 870)。GRANT 控制 table access (binary), RLS 控制 row-level filter, 两层独立。

**结论**: ✅ PASS

---

### 维度 2: BYPASSRLS 角色配置

**Plan SQL**: line 845, 849

**Verify**:
- platform_admin / system_worker 都带 BYPASSRLS ✅
- line 852: `GRANT platform_admin TO app_user` — app_user 可 `SET ROLE platform_admin` 临时切换 (Phase F impersonate 设计需求)

**Sub-risk 识别**: `GRANT platform_admin TO app_user` 是潜在 RLS bypass 路径 (app_user → SET ROLE → BYPASSRLS)。Phase F DP-PF-4 决议 A (BYPASSRLS + 醒目 banner) 处理审计可见性, 不在 Task 4 scope。

**结论**: ✅ PASS

---

### 维度 3: GRANT 完整性

**Plan SQL**: line 854-861

**Verify**:
- CONNECT ON DATABASE qr_order ✅
- USAGE ON SCHEMA public ✅
- SELECT/INSERT/UPDATE/DELETE ON ALL TABLES IN SCHEMA public ✅
- USAGE ON ALL SEQUENCES ✅
- DEFAULT PRIVILEGES (TABLES + SEQUENCES) ✅ — 未来新建表自动 GRANT (Task 5/H/I 增量 schema 不需重 GRANT)

**DB name verify**: `qr_order` 是项目 SSOT。Grep phase-b-infrastructure.md 全文:
- Task 3 临时容器: `POSTGRES_DB=qr_order` (line 699)
- Task 3 临时 DATABASE_URL: `localhost:15432/qr_order` (line 712)
- Task 9a/9b seed test 容器 + DATABASE_URL: 同名 (line 1658, 1667, 1716)
- Task 4 GRANT CONNECT: `qr_order` (line 854) ✅ 一致

**结论**: ✅ PASS

---

### 维度 4: RLS Dynamic SQL 范围

**Plan SQL**: line 864-877

**Verify**:
- 扫描 `column_name = 'store_id' AND table_schema = 'public'` 所有匹配表
- 每张匹配表执行 `ALTER TABLE %I ENABLE ROW LEVEL SECURITY`
- 每张匹配表创建 `tenant_isolation` policy (USING + WITH CHECK)
- dollar-quoted nested string (`$p$...$p$`) 正确处理 nested `$$` 语法 ✅

**PlatformAuditLog 自动跳过验证**:
- `PlatformAuditLog` schema (Task 2 plan line 149-165) 用字段 `targetStoreId @map("target_store_id")`
- DB 列名是 `target_store_id`, **不是** `store_id`
- Dynamic SQL `WHERE column_name = 'store_id'` 自动跳过 ✅
- **Functional 正确**

**🟡 GAP**: SQL 段无显式注释解释 platform_audit_log 是有意被排除的 (DP-PF-4 决议 A)。Task 2 plan line 33 已声明意图, 但 Task 4 SQL 自身缺 governance trace。未来 review 看 dynamic SQL 时不易察觉。

**Action**: CC 实施期在 RLS DO 块前加注释段 (~3 行) — 见 §4 注释 A

---

### 维度 5: RLS Policy 双向

**Plan SQL**: line 873-874

**Verify**:
- `USING (store_id = current_setting('app.current_store_id')::uuid)` 控制 SELECT/UPDATE/DELETE 读约束 ✅
- `WITH CHECK (store_id = current_setting('app.current_store_id')::uuid)` 控制 INSERT/UPDATE 写约束 ✅
- Plan §"关键点" line 888 明确解释为什么两个都加 ✅
- Plan §"⚠️ 此 task 的 WITH CHECK 是 plan 阶段引入的补强防御" line 891 标注 spec §4.5/§5.4 只提 USING, plan 升级补 WITH CHECK ✅

**结论**: ✅ PASS

---

### 维度 6: 严格模式 D33

**Plan SQL**: line 873-874

**Verify**:
- `current_setting('app.current_store_id')` **无** `, true` 第二参数 (D33 严格模式)
- 缺失 context 时 Postgres 抛 `unrecognized configuration parameter` error, 不返回 NULL
- Fail-loud 设计: helper 端 (Phase D Task 6) 配置错会立即 fail, 而非 silent leak

**Plan §"关键点" line 887 明示 D33** ✅

**跨 phase 协调 (info)**: Phase D Task 6 helper 必须 `set_config('app.current_store_id', storeId, true)` 第三参数 `is_local = true`, 否则 connection pool 复用泄漏 store_id 到下个 request。

**🟡 GAP (低)**: Task 4 plan 没在注释里 cross-ref Task 6 helper 约束。但严格模式 D33 兜底 fail-loud, 实际 silent leak 风险已消解。

**Action**: 可选, CC 实施期加 cross-ref 注释 — 见 §4 注释 D (非必需)

---

### 维度 7: Partial Unique Index

**Plan SQL**: line 880-882

**Verify**:
- `CREATE UNIQUE INDEX one_draft_per_device ON orders (session_id, device_id) WHERE status = 'draft'`
- 实现 Phase G B2 设计核心约束: 一个 device 在一个 session 同时只能有一个 draft order
- 依赖 Task 3 已加的 `OrderStatus` enum + `'draft'` 值 ✅ (Task 3 commit c831d3b8 已 land)

**🟡 Scope GAP**: 这是 schema-level index (非 RLS-related)。严格归类应在 Task 3 (extend_schema), 但 plan 放在 Task 4 (rls_and_roles)。

**Root cause 推断**: 
- 可能性 1 (作者意图): partial index 依赖 status enum, status enum 在 Task 3 加, 顺序合理
- 可能性 2 (作者疏忽): Task 3 修订 (f3db34e8 β) 时未把 index 顺手挪
- 实际状态: Task 3 已 c831d3b8 + pushed, 规则 1 增量铁律锁定, Task 4 加是唯一路径

**Functional**: ✅ OK, partial index 在 RLS migration 里加, Postgres 不 care。

**Action**: CC 实施期在 partial index 前加 1 行注释解释为什么这 schema 类 index 在 RLS migration 里 — 见 §4 注释 C

---

### 维度 8: Cross-phase 协调 + Idempotency

**Plan SQL**: 全段

**Verify**:

**8a. DP-PF-4 显式** → 已在维度 4 标 GAP, action 见 §4 注释 A

**8b. Phase H import 顺序约束** 🟡 GAP:
- Task 4 RLS migration 必须在 Phase H import-legacy-json.ts 之前 apply
- 否则 import 不带 RLS context, 数据可跨 tenant 错位
- Plan 缺顺序约束注释
- **Action**: CC 实施期加注释 — 见 §4 注释 B

**8c. RLS Policy idempotency** 🟡 GAP (低):
- `CREATE POLICY tenant_isolation` 无 `IF NOT EXISTS`
- Prisma migrate 默认不 rerun applied migrations, 不影响正常 dev/prod flow
- 仅 prod 手动 re-apply (e.g. disaster recovery 重建 DB) 会 fail
- **Trade-off**: 改成 `DROP POLICY IF EXISTS` + `CREATE POLICY` 两步增加 SQL 复杂度
- **Action**: 可选, 不强制

**8d. DB Roles idempotency**: ✅ DO + EXCEPTION duplicate_object 已 cover (line 840-850)

---

## 3. Findings 汇总

| 维度 | 状态 | Action |
|---|---|---|
| 1 DB Roles 创建 | ✅ PASS | — |
| 2 BYPASSRLS 角色 | ✅ PASS | — |
| 3 GRANT 完整性 | ✅ PASS | — |
| 4 RLS Dynamic SQL 范围 | 🟡 GAP (注释) | CC 加 ~3 行注释 (DP-PF-4 显式) — 注释 A |
| 5 RLS Policy 双向 | ✅ PASS | — |
| 6 严格模式 D33 | ✅ PASS (附跨 phase info) | 可选 cross-ref — 注释 D |
| 7 Partial Unique Index | 🟡 GAP (scope 注释) | CC 加 1 行注释 — 注释 C |
| 8a DP-PF-4 显式 | 🟡 同维度 4 | 同上 |
| 8b Phase H 顺序 | 🟡 GAP (注释) | CC 加 ~3 行注释 — 注释 B |
| 8c RLS Policy idempotent | 🟡 GAP (可选) | 可选, trade-off SQL 复杂度 |
| 8d DB Roles idempotent | ✅ PASS | — |

**总计**: 8 维度中 5 PASS, 3 实质 GAP (维度 4 / 7 / 8b) 全注释级, 2 可选优化 (维度 6 / 8c)。

**Functional bug**: 0  
**Will-fail-on-apply bug**: 0  
**β refinement plan commit 必要性**: 无 (注释级 finding 在实施期 CC 自加 SQL 注释处理, 无需修订 plan 文件)

---

## 4. Action Items (CC 实施期 SQL 注释要求)

CC 在 Step 2 `cat > migration.sql <<'EOF'` heredoc 里, 以下位置加注释:

### 注释 A (必加): DP-PF-4 explicit (维度 4)

放在 RLS Dynamic SQL DO 块**之前**:

```sql
-- ========== RLS on store_id tables (strict mode, no fallback) ==========
--
-- NOTE on platform_audit_log: this table uses target_store_id (not store_id),
-- so the dynamic SQL below auto-skips it. RLS is intentionally NOT applied —
-- platform_audit_log is platform-scope audit (cross-tenant by design).
-- platform_admin role has BYPASSRLS for direct read access (DP-PF-4 决议 A).
--
DO $$
DECLARE t text;
BEGIN
  ...
```

### 注释 B (必加): Phase H import 顺序约束 (维度 8b)

放在 RLS DO 块**之后**:

```sql
END $$;

-- DEPLOY ORDER: This RLS migration must be applied BEFORE Phase H 
-- import-legacy-json.ts runs. If import runs without RLS active, rows can 
-- leak across tenants (no store_id filter enforced at DB layer).
-- Verify in Phase H startup: 
--   psql -c "SELECT relname, relrowsecurity FROM pg_class 
--            WHERE relname IN ('orders', 'sessions', 'menu_items', ...);"
-- All listed tables should show relrowsecurity = 't'.
```

### 注释 C (必加): Partial Unique Index scope 解释 (维度 7)

放在 partial unique index 行**之前**:

```sql
-- ========== Partial unique: one draft per (session, device) ==========
-- NOTE: this is a schema-level index (not RLS-related), conceptually belongs 
-- in 20260417000001_extend_schema. Placed here because Task 3 already shipped 
-- (commit c831d3b8) and Rule 1 (incremental migration ironclad) prohibits 
-- modifying published migrations. Adding to next available migration.
CREATE UNIQUE INDEX one_draft_per_device
  ON orders (session_id, device_id)
  WHERE status = 'draft';
```

### 注释 D (可选, 非必需): Helper 端 cross-ref (维度 6)

可加在 RLS Policy USING 行附近:

```sql
-- (cross-ref) helper at server/src/middleware/tenant-aware.ts (Phase D Task 6) 
-- MUST use: set_config('app.current_store_id', storeId, true) — third param 
-- is_local=true ensures setting is tx-scoped, won't leak across pooled connections.
-- D33 strict mode (current_setting without fallback) provides fail-loud safety net.
```

**实施期 self-check**: Step 4 SQL review 时, CC 必须 verify 注释 A/B/C 已落到最终 migration.sql, 且与本文 §4 wording 实质一致 (措辞可微调, 信息内容不能少)。

---

## 5. D 候选关联

| D | Task 4 关联 | 应用方式 |
|---|---|---|
| D74 行数预算 | ✅ 适用 | CC 实施前估算 commit body 行数, 实际对比, 入汇报 |
| D75 数据 guard | ✅ 适用 | heredoc `cat > migration.sql` 后必须 `[ -s migration.sql ]` verify 非空, 否则规则 8 暂停 |
| D76 push verify | ✅ 适用 | commit 后必跑 `git push origin main && git log origin/main -1 --format='%h %s'` verify origin SHA = local HEAD, 入汇报 |
| D67-D73 | ❌ 不适用 | Task 4 是 RLS SQL, 不动 types.ts / Order snapshot / JWT / 业务逻辑 |

---

## 6. 决议候选 (α/β/γ/δ)

Task 4 plan 通过 L1 verify, **未浮现 α/β/γ/δ 级决议**。

8 维度 5 PASS, 3 实质 GAP 全注释级 (CC 实施期处理), 2 可选优化。无需 plan β refinement commit, 无需暂停实施。

实施前置: 无 blocker。Task 3 已 c831d3b8 + pushed, Task 4 可启动。

---

## 7. Verify 锚点声明

本 work-log 是 Task 4 实施期的 SQL review checkpoint:

- **Step 4 (CC 人工 review SQL) 必须对照本文 8 维度逐项 PASS**
- **任何 SQL 与本文 verify 不一致 → 规则 8 暂停, Ian 判**
- **Action items §4 注释 A / B / C 必须出现在最终 migration.sql** (注释 D 可选)
- 维度 7 / 8c 可选优化, CC 不应主动加 (除非 Ian 指示)

实施期完成后 commit body 应含: 8 维度 verify 落实清单 + 3 注释落实位置确认 + D74/D75/D76 输出 + 规则 8.1 pending commits 清单。

---

**Verify 完成。Task 4 plan 通过, 实施可启动。**