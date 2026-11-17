import type { ScenarioComparisonV2, ScenarioInputV2 } from '@openreserve/api-contracts'

const models = [
  { model: 'A', protection: true, referral: false, advance: false },
  { model: 'B', protection: false, referral: true, advance: false },
  { model: 'C', protection: false, referral: false, advance: true },
  { model: 'D', protection: true, referral: true, advance: true },
] as const

export function compareScenariosV2(input: ScenarioInputV2): ScenarioComparisonV2 {
  const { price, incrementalNewCustomers: customers, incrementalCapacity: capacity } = input
  const warnings: ScenarioComparisonV2['warnings'] = []
  if (customers > 0) {
    warnings.push('INCREMENTAL_CUSTOMER_ATTRIBUTION_UNVERIFIED')
    if (capacity === undefined) warnings.push('CAPACITY_NOT_PROVIDED')
    else if (customers > capacity) warnings.push('CAPACITY_EXCEEDED')
  }

  const scenarios = models.map(({ model, protection, referral, advance }) => {
    const advanceRate = advance ? input.advanceRate : 0
    const initialVaultProtectionFraction = 1 - advanceRate
    const feeA = protection ? price * input.protectionFeeRate : 0
    const gymShareOfFeeA = feeA * input.protectionFeeGymShareRate
    const retainedFeeA = feeA - gymShareOfFeeA
    const referralFeeB = referral ? price * input.referralFeeRate : 0
    const gymFundingCostPerPackage =
      price * initialVaultProtectionFraction * input.annualCostOfFunds * input.averageSettlementDelayDays / 365
    const gymIncrementalContributionPerPackage =
      price - input.variableGymCost - input.gymProcessingCostPerPackage -
      gymFundingCostPerPackage + gymShareOfFeeA - referralFeeB
    const platformUnitMarginPerPackage = retainedFeeA + referralFeeB - input.platformCAC - input.platformVariableCost
    const elapsedFraction = input.coverageEvaluationDay / input.termDays

    return {
      model,
      gymIncrementalContributionPerPackage,
      platformUnitMarginPerPackage,
      gymFundingCostPerPackage,
      gymUpfrontCashGap: price * initialVaultProtectionFraction,
      initialVaultProtectionFraction,
      buyerCoverageShortfallAtDay: price * Math.max(0, advanceRate - elapsedFraction),
      coverageEvaluationDay: input.coverageEvaluationDay,
      gymIncrementalContributionAggregate: gymIncrementalContributionPerPackage * customers,
      platformContributionAggregateBeforeFixedCosts: platformUnitMarginPerPackage * customers,
    }
  })

  return { label: input.label, currency: input.currency, assumptions: input, warnings, scenarios }
}
