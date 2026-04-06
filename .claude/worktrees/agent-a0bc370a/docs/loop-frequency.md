# Loop 执行频率指南

## 频率总表

| Loop | 名称 | 间隔 | 触发时机 |
|------|------|------|---------|
| 1 | Structure Documentation | 2h | 每次大功能完成后 |
| 2 | Type Consistency Check | 1h | 每次加新 API 路由后 |
| 3 | Import Path Audit | 30m | 每次重构目录结构后 |
| 4 | Type Chain Check | 1.5h | 每次修改数据 schema 后 |
| 5 | Dead Code Audit | 1h | 每 1-2 周 |
| 6 | UX / Tailwind Audit | 1h | 每次做完新页面/组件后 |
| 7 | Hardcoded Value Audit | 30m | 每次准备部署前 |
| 8 | Update CLAUDE.md | 1h | 每次跑完 Loop 1 之后，或每周一次 |
| 9 | i18n Language Audit | 1h | 每次加新页面/修改 UI 文案后 |

## 简单记法

- **改结构** → 跑 1 / 3 / 4
- **加功能** → 跑 2 / 6
- **改文案** → 跑 9
- **部署前** → 跑 7 / 9
- **定期**   → 跑 5
- **跑完 1** → 紧接跑 8（把结构快照消化成 CLAUDE.md context）

## 推荐组合

### 日常开发
```
加了新 API 路由 → Loop 2（type consistency）
做完新页面     → Loop 6（UX audit）+ Loop 9（i18n audit）
改了 UI 文案   → Loop 9（i18n audit）
```

### 重构后
```
Loop 3（import audit）→ Loop 1（structure docs）→ Loop 8（update CLAUDE.md）
```

### 发布前
```
Loop 7（hardcode audit）→ Loop 9（i18n audit）→ Loop 5（dead code）→ Loop 2（type check）
```

### 每周维护
```
Loop 1 → Loop 8 → Loop 5
```
