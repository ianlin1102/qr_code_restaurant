# 2026-04-19 Phase B Task 2 Implementation Postmortem — D75 候选 + D74 复盘

Created: 2026-04-19,Phase B Task 2 实施(`396343f3`)后 closure 文档。追加 D75 候选(数据写入 guard pattern)+ D74 机制本轮复盘。

## 1. 事件经过(staff.json 意外清空)

Task 2 Step 2.5 执行 staff.json 清理时,CC 两次 jq 失败链:
1. **第 1 次** `/tmp/staff-cleaned-$$.json` → sandbox "operation not permitted"
2. **第 2 次** `${TMPDIR}/...`:jq 模式 `\!=` 被 **zsh `!` history expansion 干扰** → jq 编译错误 → shell `> $TMP_FILE` 仍创建空文件 + **无条件 `mv`**(非 `&& mv`)→ staff.json 被 empty 覆盖
3. **第 3 次** 用 `(.storeId == "xxx") | not` 模式避开 `!`:成功但此时 staff.json 已空

## 2. 自救路径(零副作用)

`git checkout HEAD -- server/data/staff.json` 恢复 3 records(staff.json pre-existing 改动未 commit,HEAD 保有 3 records baseline)。第 4 次 jq 加 `&& mv` guard + `not` pattern,成功。Commit 前 verify length=1 ✅。

## 3. D75 候选:数据写入操作前置 guard(非空验证)

**触发**:上述 staff.json 意外清空事件。

**反模式** / **正模式**:
```bash
# ❌ 反:命令失败时 tmp 空文件无条件覆盖目标
cmd > /tmp/out && mv /tmp/out target   # 注意:即使 cmd exit != 0, > 仍创建空文件

# ✅ 正:非空 guard 保护
cmd > /tmp/out && [ -s /tmp/out ] && mv /tmp/out target
# 或 jq --exit-status + 显式 check
cmd > /tmp/out || { rm /tmp/out; exit 1; }
[ -s /tmp/out ] && mv /tmp/out target
```

**通用化**:任何 `cmd > tmp && mv` 模式都必须含非空 / 语义 valid guard。

**关联规则**:
- **规则 6 扩展**:前置 guard(执行前 predicate)非后置 verify(完成后才检查)
- **D74 并列**(工作流补强):D74 行数外化(plan 修订)/ D75 数据完整性外化(代码实施)

**升格目标**:Phase H Task 45 spec reconcile 时与 D67-D74 统一处理。

## 4. D74 机制本轮 live 复盘

| Edit | 预测(行)| 实际 | 偏差 | 方向 |
|---|---|---|---|---|
| Task 8 β refinement(G7-4 helper)| 30 | 24 | -6 / 20% | 偏高 |
| schema.prisma 重写 | ~500 | +458(净 +433)| -8~14% | 偏低 |
| staff.json 清理 | 10-20 | ~18 | 命中 | ✅ |
| types.ts 移除 | 1 | +5/-1 = 6 | +5 | 偏低(comment 增多)|

**调整建议**:
- **大型 schema 重写**:按 `model 数 × 平均 20-25 行/model`(本次 21 × 22 ≈ 462,比"~500"准)
- **含 comment/decision anchor 的改动**:实际行数 = 代码行 × 1.5~2(comment 占 30-50%)
- 总体预测精度 ~75-85%,实用但需精化

---

**End of Task 2 implementation postmortem.**
