# OpenReserve — Primary survey evidence (D19-05)

**Evidence class:** OWNER_REPORTED_SURVEY_SUMMARY, not a representative market sample.
**Snapshot:** Owner-provided survey exports summarized in CTO succession package dated 2026-11-20; the individual raw exports were not included in this GitHub change. These aggregate figures must not be presented as an independent audit of all original response rows.
**Privacy:** Do not publish identifiable respondents, phone numbers, named gym customers, or raw free-text responses without permission. This annex reports aggregate figures only.

## Consumer responses

| Measure | Count | Interpretation |
|---|---:|---|
| All submissions | 21 | Convenience sample; selection bias unknown |
| Said they had purchased a prepaid package | 14 | 14 of 21 respondents |
| Said they had never purchased one | 7 | May include inconsistent downstream answers |
| Among 14 past purchasers, reported monetary loss from unused portion | 8 | Self-reported experience, **not** a legal or smart-contract refund entitlement |
| Among 7 non-purchasers, nonetheless provided gym/package details | 6 | Skip-logic or answer inconsistency; **do not** treat these as six additional past buyers |

**Warning:** 8/14 is a within-sample descriptive fraction, not a population rate. Sample does not establish product-market fit, causal effect of OpenReserve, willingness to pay, or refund eligibility. A user leaving a class unused is not evidence of provider default. Distinguish voluntary nonattendance from facility closure, cancellation, service nonperformance, or a contract-authorized early exit.

## Provider responses

| Measure | Count / report | Interpretation |
|---|---|---|
| Provider-role submissions | 3 | One owner, one manager, one sales respondent; not proven to represent three distinct businesses |
| Named up-front cash flow as an advantage | 3 of 3 | Strong signal **within these three answers**, not a validated market demand |
| Preferred taking 100% immediately in the 10-session example | 2 of 3 | Important conflict with an escrow/gradual-earn model |
| Separate A/B/C/D co-operation form | 1 response | Preferred D; also regarded B and D as worth considering. **Insufficient** to select a commercial model |

**Product implication:** preserving provider cash flow and contribution margin is a first-order constraint; customer protection alone does not validate two-sided adoption. No verified signed gym pilot, merchant unit-economics audit, or executed pricing agreement is claimed.

## Research boundaries and next validation

1. Interview real provider decision makers about cash-gap financing, refund conditions, operational cost per attendance, capacity constraints, and willingness to pilot; do not infer three businesses from three staff roles.
2. Separate `PER_SESSION` (ten entitlements) from `TIME_ACCESS` (elapsed period for unlimited access); ask about annualized contribution and seasonality for both.
3. For buyers, validate reasons for unused packages and what they would pay for protection; never equate perceived loss with guaranteed refund.
4. Test provider cooperation options A/B/C/D with a larger distinct-business sample; labels alone do not evidence economically agreed terms.
5. Document actual consent, commercial terms, market segment and legal review before leaving product discovery.

## Truthful pitch language

- Acceptable: “Trong khảo sát nhỏ của nhóm, 8/14 người từng mua gói trả trước nói họ từng mất tiền từ phần gói chưa sử dụng.”
- Acceptable: “Cả ba phản hồi ở phía nhà cung cấp đều nêu dòng tiền trả trước là lợi ích, nhưng mẫu quá nhỏ để tổng quát hóa.”
- Not acceptable: “57% người Việt cần hoàn tiền”; “các gym đã đồng ý tham gia”; “OpenReserve đảm bảo hoàn tiền cho buổi không đi tập”.
