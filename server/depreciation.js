/**
 * Calculation of straight-line depreciation according to the Comptroller General's Department (กรมบัญชีกลาง)
 * Thai Fiscal Year: Oct 1 - Sep 30
 */

export function calculateDepreciation(costPrice, salvageValue, usefulLifeYears, acquiredDateStr, targetFiscalYear = null) {
  const cost = Number(costPrice) || 0;
  const salvage = Number(salvageValue) !== undefined && Number(salvageValue) !== null ? Number(salvageValue) : 1;
  const life = Number(usefulLifeYears) || 5;

  if (cost <= 0 || life <= 0) {
    return {
      depreciableBase: 0,
      annualRate: 0,
      annualDepreciation: 0,
      accumulatedDepreciation: 0,
      bookValue: cost,
      isFullyDepreciated: false,
      schedule: []
    };
  }

  const depreciableBase = Math.max(0, cost - salvage);
  const annualRatePct = +(100 / life).toFixed(2);
  const standardAnnualDepreciation = +(depreciableBase / life).toFixed(2);

  // Parse acquired date
  const acquiredDate = new Date(acquiredDateStr);
  const acqYear = acquiredDate.getFullYear();
  const acqMonth = acquiredDate.getMonth() + 1; // 1-12
  const acqDay = acquiredDate.getDate();

  // Determine starting Thai fiscal year (พ.ศ.)
  // Thai FY starts Oct 1: if month >= 10, FY = Western Year + 543 + 1, else Western Year + 543
  let startFY = acqYear + 543;
  if (acqMonth >= 10) {
    startFY += 1;
  }

  // End of the first fiscal year in Western date: Sep 30 of (startFY - 543)
  const fy1End = new Date(startFY - 543, 8, 30); // Month 8 is September (0-indexed)
  
  // Days in first fiscal year
  const diffTime = Math.max(0, fy1End.getTime() - acquiredDate.getTime());
  const daysInFirstFY = Math.min(365, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);

  const schedule = [];
  let accumulated = 0;
  let remainingDepreciable = depreciableBase;

  let currentFY = startFY;
  let yearIndex = 1;

  while (remainingDepreciable > 0.001 && yearIndex <= life + 2) {
    let depThisYear = 0;
    let daysCount = 365;

    if (yearIndex === 1) {
      // Pro-rate first year based on days
      daysCount = daysInFirstFY;
      depThisYear = +((depreciableBase / life) * (daysInFirstFY / 365)).toFixed(2);
    } else {
      depThisYear = standardAnnualDepreciation;
    }

    // Cap so we don't exceed depreciable base
    if (depThisYear > remainingDepreciable || yearIndex === life + 1) {
      depThisYear = +remainingDepreciable.toFixed(2);
    }

    accumulated = +(accumulated + depThisYear).toFixed(2);
    remainingDepreciable = +(remainingDepreciable - depThisYear).toFixed(2);
    const bookValue = +(cost - accumulated).toFixed(2);

    schedule.push({
      yearIndex,
      fiscalYear: currentFY,
      daysCount,
      depreciationAmount: depThisYear,
      accumulatedDepreciation: accumulated,
      bookValue: Math.max(salvage, bookValue)
    });

    if (remainingDepreciable <= 0.01) break;
    currentFY++;
    yearIndex++;
  }

  // Current calculation based on target fiscal year or today's fiscal year
  const today = new Date();
  const currentFiscalYear = targetFiscalYear || (today.getMonth() + 1 >= 10 ? today.getFullYear() + 544 : today.getFullYear() + 543);

  // Find accumulated up to target fiscal year
  let currentAccumulated = 0;
  let currentBookValue = cost;
  let currentAnnualDep = 0;

  for (const row of schedule) {
    if (row.fiscalYear <= currentFiscalYear) {
      currentAccumulated = row.accumulatedDepreciation;
      currentBookValue = row.bookValue;
      currentAnnualDep = row.depreciationAmount;
    }
  }

  // If acquired in the future
  if (currentFiscalYear < startFY) {
    currentAccumulated = 0;
    currentBookValue = cost;
    currentAnnualDep = 0;
  }

  const isFullyDepreciated = currentAccumulated >= depreciableBase - 0.05;

  return {
    depreciableBase,
    annualRate: annualRatePct,
    standardAnnualDepreciation,
    currentFiscalYear,
    currentAnnualDepreciation: currentAnnualDep,
    accumulatedDepreciation: currentAccumulated,
    bookValue: currentBookValue,
    isFullyDepreciated,
    schedule
  };
}

