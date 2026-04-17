# Phase 5 Plan — Phase A：Stage -1 备份 EC2 演示数据

> **如何使用本文件**
>
> - 全局规则（增量 migration、SSE emit 时机、repo 签名、commit 粒度、agent 独占、验证铁律）见 [`00-index.md`](./00-index.md#全局规则所有-task-遵守)
> - 本 phase 前置：无
> - 本 phase 输出：`archive/legacy-demo-data/` 下的 EC2 演示数据 dump + schema drift 笔记
> - 阻塞后续：**Task 1c 必须在 Phase B 开始前完成**——若发现 legacy 数据和新 schema 不兼容，现在调 `import-legacy-json.ts` 映射逻辑最便宜
> - 下一个 phase：[`phase-b-infrastructure.md`](./phase-b-infrastructure.md)

## Task 列表

| Task | 内容 | 阻塞关系 |
|---|---|---|
| 1a | SSH + pg_dump 4 张表 | 先 |
| 1b | scp 回本地 + 完整性验证 | 在 1a 后 |
| 1c | 本地 dry-run restore | 在 1b 后，**必须在 Phase B 开始前完成** |

---

## Phase A：Stage -1 备份 EC2 演示数据

### Task 1a：SSH + pg_dump 4 张表

**Files:**
- Create: `archive/legacy-demo-data/.gitkeep`（保留目录，不 commit dump）
- Create: `.gitignore` 追加 `archive/legacy-demo-data/*.sql.gz`

**前置检查**：
- 你有 EC2 的 SSH 访问（`ssh ec2-user@<host>` 能登）
- 本地有 `scp` 和 `gunzip` 命令

- [ ] **Step 1：创建本地归档目录 + gitignore**

```bash
mkdir -p archive/legacy-demo-data
touch archive/legacy-demo-data/.gitkeep

# .gitignore 里加一行
echo 'archive/legacy-demo-data/*.sql.gz' >> .gitignore
echo 'archive/legacy-demo-data/*.json' >> .gitignore
```

- [ ] **Step 2：SSH 上 EC2 确认 docker postgres container 名**

```bash
ssh ec2-user@<your-ec2-host>
docker ps --format "{{.Names}}\t{{.Image}}" | grep -i postgres
```

预期输出（container 名可能不同）：
```
qr-order-postgres-1    postgres:16
```

**记下 container 名**（后续命令用）。如果没有 postgres container，说明 EC2 现状不符合前置假设，停下来跟用户确认。

- [ ] **Step 3：在 EC2 上 pg_dump 4 张表**

```bash
# 仍在 EC2 上
CONTAINER=qr-order-postgres-1   # 换成你刚记下的名字
TS=$(date -u +%Y%m%d-%H%M%S)
docker exec $CONTAINER pg_dump \
  -U postgres \
  -t stores -t categories -t menu_items -t tables \
  --data-only \
  qr_order \
  | gzip > /tmp/legacy-demo-$TS.sql.gz

ls -lh /tmp/legacy-demo-$TS.sql.gz
```

预期输出：
```
-rw-rw-r-- 1 ec2-user ec2-user 1234 Apr 17 10:23 /tmp/legacy-demo-20260417-102334.sql.gz
```

**文件大小应 >0**（真实数据即使少也不会是 0）。若 0 字节说明 pg_dump 失败或表为空——贴输出让用户判断继续与否。

- [ ] **Step 4：在 EC2 上额外导出 JSON 格式（供 import-legacy-json.ts 用）**

```bash
# 仍在 EC2 上，同一时间戳
for t in stores categories menu_items tables; do
  docker exec $CONTAINER psql -U postgres -d qr_order -t -c \
    "SELECT json_agg(row_to_json(${t}.*)) FROM ${t}" \
    > /tmp/legacy-${t}-$TS.json
  echo "---- ${t} ----"
  head -c 200 /tmp/legacy-${t}-$TS.json
  echo
done
```

预期输出（前 200 字节示例）：
```
---- stores ----
[{"id":"abc-123","name":"Demo Restaurant","description":null,"opening_hours":null,...}]

---- categories ----
[{"id":"cat-1","store_id":"abc-123","name":"Drinks","sort_order":0,...}]
```

空表会显示 `null`，非空显示 JSON 数组。记下这 5 个文件的时间戳。

- [ ] **Step 5：commit 目录占位**

```bash
# 回到本地项目根目录
cd "$(git rev-parse --show-toplevel)"
git add archive/legacy-demo-data/.gitkeep .gitignore
git commit -m "chore(phase-5): create archive dir for legacy demo data

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 1b：scp 回本地 + 完整性验证

**Files:** 无代码文件改动，只搬运数据

**前置**：Task 1a 完成，EC2 `/tmp/legacy-*-$TS.*` 文件已生成。

- [ ] **Step 1：scp 5 个文件回本地**

```bash
# 从本地执行（不在 EC2 上）
cd "$(git rev-parse --show-toplevel)"
TS=<从 Task 1a Step 3 记下的时间戳>

scp ec2-user@<host>:/tmp/legacy-demo-$TS.sql.gz archive/legacy-demo-data/
for t in stores categories menu_items tables; do
  scp ec2-user@<host>:/tmp/legacy-${t}-$TS.json archive/legacy-demo-data/
done

ls -lh archive/legacy-demo-data/
```

预期输出：
```
-rw-r--r-- 1 user staff 1234 Apr 17 10:30 legacy-demo-20260417-102334.sql.gz
-rw-r--r-- 1 user staff  856 Apr 17 10:30 legacy-stores-20260417-102334.json
-rw-r--r-- 1 user staff  412 Apr 17 10:30 legacy-categories-20260417-102334.json
-rw-r--r-- 1 user staff 4621 Apr 17 10:30 legacy-menu_items-20260417-102334.json
-rw-r--r-- 1 user staff  789 Apr 17 10:30 legacy-tables-20260417-102334.json
```

**所有文件大小 >0**。其中 `menu_items` 应该最大（有几十道菜）。若某个文件 0 字节，scp 有问题，停下重跑。

- [ ] **Step 2：验证 gzip 完整性**

```bash
gunzip -t archive/legacy-demo-data/legacy-demo-$TS.sql.gz
echo "exit code: $?"
```

预期：
```
exit code: 0
```

非 0 = dump 文件损坏，scp 重来。

- [ ] **Step 3：验证 JSON 结构**

```bash
for f in archive/legacy-demo-data/legacy-*.json; do
  echo "=== $f ==="
  # 如果是 null（空表），应该正好是 "null\n"
  # 如果非空，应该是 JSON 数组
  python3 -c "
import json, sys
with open('$f') as fp:
    data = json.load(fp)
if data is None:
    print('empty table (null)')
else:
    print(f'records: {len(data)}')
    if data:
        print(f'sample keys: {list(data[0].keys())[:5]}')
"
done
```

预期（示例）：
```
=== archive/legacy-demo-data/legacy-stores-20260417-102334.json ===
records: 1
sample keys: ['id', 'name', 'description', 'opening_hours', 'announcement']

=== archive/legacy-demo-data/legacy-menu_items-20260417-102334.json ===
records: 42
sample keys: ['id', 'store_id', 'category_id', 'name', 'description']
```

记录每张表的 record 数——Task 1c dry-run 完要核对。若 `stores` records=0，说明 EC2 上没演示店铺，跟用户确认是否符合预期。

- [ ] **Step 4：commit JSON 文件（sql.gz 被 gitignore 挡住）**

```bash
git add archive/legacy-demo-data/*.json
git status  # 确认 .sql.gz 没被 add
git commit -m "chore(phase-5): archive legacy demo data JSON from EC2

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 1c：本地 dry-run restore（阻塞 Phase B）

**目的**：在动 Phase B schema 前，确认 legacy dump 的列名/类型与新 schema 兼容。发现不兼容现在调 `import-legacy-json.ts` 转换逻辑比 Phase H 晚发现好。

**Files:** 无代码文件改动（只是验证）

**前置**：Task 1b 完成；本地 docker 已起（或可以起）一个空 postgres 16 container。

- [ ] **Step 1：起一个临时 postgres 容器（不用项目的 compose）**

```bash
docker run -d --name postgres-dryrun \
  -e POSTGRES_DB=qr_order_dryrun \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=dryrun \
  -p 15432:5432 \
  postgres:16

sleep 5
docker exec postgres-dryrun pg_isready -U postgres
```

预期：
```
/var/run/postgresql:5432 - accepting connections
```

- [ ] **Step 2：把 .sql.gz dump restore 到空 DB**

```bash
TS=<从 Task 1a Step 3 的时间戳>
gunzip -c archive/legacy-demo-data/legacy-demo-$TS.sql.gz \
  | docker exec -i postgres-dryrun psql -U postgres -d qr_order_dryrun 2>&1 \
  | tee /tmp/dryrun-restore.log
```

**预期情况**：会报错，因为 dump 是 `--data-only` 模式，表还不存在。这是正常的——我们只是验证 **INSERT 语句的列名/类型** 能不能被一个模拟的目标 schema 接受。

- [ ] **Step 3：分析错误模式**

```bash
# 查看 restore 报的错
grep -E "ERROR|FATAL" /tmp/dryrun-restore.log | head -20
```

**预期错误模式**：
- `relation "stores" does not exist` —— 正常，表没建（我们还没跑 Phase B migration）
- `column "xxx" of relation "stores" does not exist` —— **关键！** 这类错误才是真正的"列名漂移"

如果只看到第一种错误（表不存在），dump 跟新 schema 的**列名兼容**（或至少没显式冲突，因为表都没建）。

如果看到第二种错误，或者 dump 里的列在我们新 schema §4.1 里查不到，记下清单，Phase H 改 `import-legacy-json.ts` 时处理映射。

- [ ] **Step 4：手工过一遍关键字段**

```bash
# 从 EC2 dump 里提取表结构信息（CREATE TABLE 段落如果有的话）
zcat archive/legacy-demo-data/legacy-demo-$TS.sql.gz | grep -E "^(COPY|INSERT)" | head -20
```

预期：每行类似
```
COPY public.stores (id, name, description, opening_hours, announcement, logo, created_at, updated_at) FROM stdin;
COPY public.menu_items (id, store_id, category_id, name, description, image_url, price, ...) FROM stdin;
```

**对照新 schema §4.1 的字段清单**，逐列核对。重点关注：
- `stores.tip_base`：新 schema 有这个字段，legacy 可能没有 → import 时给默认 `'pretax'`
- `menu_items.is_staff_only`：legacy 可能叫 `staff_only` 或缺失 → import 映射
- `tables.qr_code`：legacy 字段可能叫 `qr_token` 或 `code` → 映射
- `categories.sort_order`：legacy 可能叫 `order` → 映射

把发现的差异记到 `archive/legacy-demo-data/schema-drift.md`（一个非 commit 的笔记）。

- [ ] **Step 5：清理临时容器**

```bash
docker stop postgres-dryrun
docker rm postgres-dryrun
```

- [ ] **Step 6：写 dry-run 结果笔记并 commit**

```bash
cat > archive/legacy-demo-data/schema-drift.md <<'EOF'
# Legacy demo dump → 新 schema 字段差异

时间戳：<TS>
Dump 文件：legacy-demo-<TS>.sql.gz

## 发现的字段差异（需要 import-legacy-json.ts 映射）

| 表 | Legacy 字段 | 新字段 | 处理 |
|---|---|---|---|
| stores | （无 tip_base） | tip_base | 默认 'pretax' |
| menu_items | ??? | is_staff_only | ??? |
| tables | qr_code / qr_token? | qr_code | 记下实际值 |
| categories | ??? | sort_order | ??? |

（实际填入 Step 4 发现的内容）

## 结论

- [ ] 所有差异可通过 import-legacy-json.ts 的映射逻辑解决
- [ ] 无不可恢复的数据类型不兼容

Phase H 实施 import-legacy-json.ts 时必须读本文档。
EOF

git add archive/legacy-demo-data/schema-drift.md
git commit -m "docs(phase-5): record legacy dump schema drift findings

Co-Authored-By: Claude <noreply@anthropic.com>"
```

**Phase A 完成。**Phase B 可开工。

