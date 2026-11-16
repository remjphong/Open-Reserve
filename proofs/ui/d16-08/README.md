# D16-08 · Portal shells

**AWAITING_REVIEW.** Screenshots show the built React app served by Vite preview. One fixture (OR-024) is used across all three roles. Wallets, Fuji, backend requests and signatures are outside this checkpoint.

| Portal | Entry | Screenshot |
| --- | --- | --- |
| Customer | `/customer` | [1440×900](customer-1440x900.jpg) |
| Gym | `/gym` | [1440×900](gym-1440x900.jpg) |
| Operations | `/operations` | [1440×900](operations-1440x900.jpg) · [390×844](operations-390x844.jpg) |

Checks used Chromium at 1440×900 and 390×844. All visible navigation targets were opened and refreshed against Vite preview. The Customer evidence deep link reloads before the disabled confirmation control is shown. Gym separates disputed funds from withdrawable earnings. Operations keeps its three mobile nav items visible, explains resolver requirements and disables submission. Empty, loading and error examples are available under “Xem mẫu trạng thái”. Unknown portal subpaths display a recovery link.

[Browser verification output](browser.log)

```sh
npm ci
npm run typecheck --workspace @openreserve/web
npm run build --workspace @openreserve/web
npm run preview --workspace @openreserve/web
```

A later production host must serve `index.html` for the portal deep links, as Vite preview does.
