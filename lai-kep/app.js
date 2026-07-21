(() => {
  'use strict';

  const SIMULATIONS = 1200;
  const defaults = {
    monthlyContribution: 2000000,
    years: 10,
    startMonth: '2026-08',
    contributionGrowth: 10,
    annualReturn: 10,
    marketVolatility: 20,
    initialCapital: 0,
    dividendYield: 3,
    inflationRate: 3.5,
    tradeFee: 0.15,
    sellTax: 0.1,
    dividendTax: 5,
    targetValue: 3000000000,
    homeGrowthRate: 10,
    downPaymentRate: 30,
    currentUsdRate: 26600,
    vndDepreciationRate: 2.5,
    goldPrice: 146000000,
    goldGrowthRate: 8,
    reinvestDividends: true
  };

  const equalStockWeight = 100 / 7;
  const defaultWeights = {
    VCB: equalStockWeight,
    ACB: equalStockWeight,
    BSR: equalStockWeight,
    VPB: equalStockWeight,
    MBB: equalStockWeight,
    SSI: equalStockWeight,
    TCB: equalStockWeight
  };

  const els = {
    form: document.getElementById('calculatorForm'),
    monthlyContribution: document.getElementById('monthlyContribution'),
    monthlyRange: document.getElementById('monthlyRange'),
    monthlyRangeLabel: document.getElementById('monthlyRangeLabel'),
    years: document.getElementById('years'),
    startMonth: document.getElementById('startMonth'),
    contributionGrowth: document.getElementById('contributionGrowth'),
    annualReturn: document.getElementById('annualReturn'),
    marketVolatility: document.getElementById('marketVolatility'),
    initialCapital: document.getElementById('initialCapital'),
    dividendYield: document.getElementById('dividendYield'),
    inflationRate: document.getElementById('inflationRate'),
    tradeFee: document.getElementById('tradeFee'),
    sellTax: document.getElementById('sellTax'),
    dividendTax: document.getElementById('dividendTax'),
    targetValue: document.getElementById('targetValue'),
    homeGrowthRate: document.getElementById('homeGrowthRate'),
    downPaymentRate: document.getElementById('downPaymentRate'),
    currentUsdRate: document.getElementById('currentUsdRate'),
    vndDepreciationRate: document.getElementById('vndDepreciationRate'),
    goldPrice: document.getElementById('goldPrice'),
    goldGrowthRate: document.getElementById('goldGrowthRate'),
    reinvestDividends: document.getElementById('reinvestDividends'),
    resetButton: document.getElementById('resetButton'),
    finalValue: document.getElementById('finalValue'),
    finishDate: document.getElementById('finishDate'),
    rangeText: document.getElementById('rangeText'),
    totalContributed: document.getElementById('totalContributed'),
    totalProfit: document.getElementById('totalProfit'),
    totalDividends: document.getElementById('totalDividends'),
    liquidationValue: document.getElementById('liquidationValue'),
    goalProbability: document.getElementById('goalProbability'),
    goalNote: document.getElementById('goalNote'),
    lossProbability: document.getElementById('lossProbability'),
    realValue: document.getElementById('realValue'),
    inflationNote: document.getElementById('inflationNote'),
    finalMonthlyContribution: document.getElementById('finalMonthlyContribution'),
    contributionInsight: document.getElementById('contributionInsight'),
    estimatedCosts: document.getElementById('estimatedCosts'),
    wealthMultiple: document.getElementById('wealthMultiple'),
    futureHomePrice: document.getElementById('futureHomePrice'),
    homeGrowthNote: document.getElementById('homeGrowthNote'),
    homeCoverage: document.getElementById('homeCoverage'),
    homeCoverageBar: document.getElementById('homeCoverageBar'),
    homeGap: document.getElementById('homeGap'),
    downPaymentTarget: document.getElementById('downPaymentTarget'),
    downPaymentNote: document.getElementById('downPaymentNote'),
    homeGoalProbability: document.getElementById('homeGoalProbability'),
    requiredMonthly: document.getElementById('requiredMonthly'),
    homeGapValue: document.getElementById('homeGapValue'),
    futureUsdRate: document.getElementById('futureUsdRate'),
    usdRateNote: document.getElementById('usdRateNote'),
    portfolioUsd: document.getElementById('portfolioUsd'),
    futureGoldPrice: document.getElementById('futureGoldPrice'),
    goldGrowthNote: document.getElementById('goldGrowthNote'),
    goldEquivalent: document.getElementById('goldEquivalent'),
    growthChart: document.getElementById('growthChart'),
    projectionBody: document.getElementById('projectionBody'),
    allocationTotal: document.getElementById('allocationTotal'),
    stockAllocationGrid: document.getElementById('stockAllocationGrid'),
    rotationSchedule: document.getElementById('rotationSchedule'),
    rebalanceButton: document.getElementById('rebalanceButton'),
    csvButton: document.getElementById('csvButton'),
    copyButton: document.getElementById('copyButton'),
    printButton: document.getElementById('printButton'),
    toast: document.getElementById('toast')
  };

  let latestProjection = null;
  let toastTimer = null;
  let inputTimer = null;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const parseCurrency = (value) => {
    const digits = String(value ?? '').replace(/[^0-9]/g, '');
    return digits ? Number(digits) : 0;
  };

  const numberValue = (element, fallback = 0) => {
    const parsed = Number(String(element.value).replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const trimZero = (value) => value.toLocaleString('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: value >= 100 ? 0 : 1
  });

  const formatInputCurrency = (value) => Math.round(value).toLocaleString('vi-VN');

  const formatCurrency = (value, compact = false) => {
    if (!Number.isFinite(value)) return '0 ₫';
    if (compact) {
      const absolute = Math.abs(value);
      const sign = value < 0 ? '-' : '';
      if (absolute >= 1e12) return `${sign}${trimZero(absolute / 1e12)} nghìn tỷ`;
      if (absolute >= 1e9) return `${sign}${trimZero(absolute / 1e9)} tỷ`;
      if (absolute >= 1e6) return `${sign}${trimZero(absolute / 1e6)} triệu`;
    }
    return `${Math.round(value).toLocaleString('vi-VN')} ₫`;
  };

  const formatPercent = (value, digits = 1) => `${Number(value).toLocaleString('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits
  })}%`;

  const formatYearLabel = (startMonth, yearIndex) => {
    const [startYear] = startMonth.split('-').map(Number);
    return `Năm ${yearIndex} (${startYear + yearIndex - 1})`;
  };

  const getFinishDate = (startMonth, years) => {
    const [year, month] = startMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + years * 12 - 1, 1);
    return `Vào tháng ${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  const percentile = (sortedValues, probability) => {
    if (!sortedValues.length) return 0;
    const index = (sortedValues.length - 1) * probability;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sortedValues[lower];
    return sortedValues[lower] + (sortedValues[upper] - sortedValues[lower]) * (index - lower);
  };

  const mulberry32 = (seed) => () => {
    let value = seed += 0x6D2B79F5;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };

  const normalGenerator = (random) => {
    let spare = null;
    return () => {
      if (spare !== null) {
        const value = spare;
        spare = null;
        return value;
      }
      let first = 0;
      let second = 0;
      while (first === 0) first = random();
      while (second === 0) second = random();
      const magnitude = Math.sqrt(-2 * Math.log(first));
      spare = magnitude * Math.sin(2 * Math.PI * second);
      return magnitude * Math.cos(2 * Math.PI * second);
    };
  };

  const getInputs = () => {
    const years = Math.round(clamp(numberValue(els.years, defaults.years), 1, 50));
    const homeCurrentPrice = clamp(parseCurrency(els.targetValue.value), 0, 1e16);
    const homeGrowthRate = clamp(numberValue(els.homeGrowthRate, defaults.homeGrowthRate), 0, 50);
    const downPaymentRate = clamp(numberValue(els.downPaymentRate, defaults.downPaymentRate), 1, 100);
    const futureHomePrice = homeCurrentPrice * Math.pow(1 + homeGrowthRate / 100, years);

    return {
      monthlyContribution: clamp(parseCurrency(els.monthlyContribution.value), 0, 1e12),
      years,
      startMonth: /^\d{4}-\d{2}$/.test(els.startMonth.value) ? els.startMonth.value : defaults.startMonth,
      contributionGrowth: clamp(numberValue(els.contributionGrowth, 0), -50, 100),
      annualReturn: clamp(numberValue(els.annualReturn, 0), -90, 100),
      marketVolatility: clamp(numberValue(els.marketVolatility, 0), 0, 80),
      initialCapital: clamp(parseCurrency(els.initialCapital.value), 0, 1e15),
      dividendYield: clamp(numberValue(els.dividendYield, 0), 0, 30),
      inflationRate: clamp(numberValue(els.inflationRate, 0), 0, 30),
      tradeFee: clamp(numberValue(els.tradeFee, 0), 0, 5),
      sellTax: clamp(numberValue(els.sellTax, 0), 0, 5),
      dividendTax: clamp(numberValue(els.dividendTax, 0), 0, 30),
      homeCurrentPrice,
      homeGrowthRate,
      downPaymentRate,
      futureHomePrice,
      targetValue: futureHomePrice * downPaymentRate / 100,
      currentUsdRate: clamp(parseCurrency(els.currentUsdRate.value), 1, 1e9),
      vndDepreciationRate: clamp(numberValue(els.vndDepreciationRate, defaults.vndDepreciationRate), 0, 20),
      goldPrice: clamp(parseCurrency(els.goldPrice.value), 1, 1e12),
      goldGrowthRate: clamp(numberValue(els.goldGrowthRate, defaults.goldGrowthRate), 0, 50),
      reinvestDividends: els.reinvestDividends.checked
    };
  };

  const contributionPlan = (input) => {
    let total = input.initialCapital;
    return Array.from({ length: input.years }, (_, index) => {
      const monthlyContribution = input.monthlyContribution * Math.pow(1 + input.contributionGrowth / 100, index);
      const annualContribution = monthlyContribution * 12;
      total += annualContribution;
      return {
        year: index + 1,
        label: formatYearLabel(input.startMonth, index + 1),
        monthlyContribution,
        annualContribution,
        totalContributions: total
      };
    });
  };

  const simulateProjection = (input) => {
    const plan = contributionPlan(input);
    const buckets = Array.from({ length: input.years }, () => []);
    const finals = [];
    const tradeFeeRate = input.tradeFee / 100;
    const sellTaxRate = input.sellTax / 100;
    const dividendTaxRate = input.dividendTax / 100;
    const dividendRate = input.dividendYield / 100;
    const sigma = input.marketVolatility / 100;
    const expectedFactor = Math.max(0.01, 1 + input.annualReturn / 100);
    const annualLogDrift = Math.log(expectedFactor) - 0.5 * sigma * sigma;
    // A fixed seed keeps market paths identical when users compare contribution plans.
    const random = mulberry32(20260821);
    const normal = normalGenerator(random);

    for (let simulation = 0; simulation < SIMULATIONS; simulation += 1) {
      const initialBuyFee = input.initialCapital * tradeFeeRate;
      let portfolio = input.initialCapital - initialBuyFee;
      let cashDividends = 0;
      let grossDividends = 0;
      let runningCosts = initialBuyFee;

      for (let year = 0; year < input.years; year += 1) {
        const annualFactor = clamp(Math.exp(annualLogDrift + sigma * normal()), 0.05, 5);
        const monthlyFactor = Math.pow(annualFactor, 1 / 12);
        const monthlyContribution = plan[year].monthlyContribution;

        for (let month = 0; month < 12; month += 1) {
          const buyFee = monthlyContribution * tradeFeeRate;
          portfolio += monthlyContribution - buyFee;
          runningCosts += buyFee;
          portfolio *= monthlyFactor;
        }

        const grossDividend = Math.max(portfolio, 0) * dividendRate;
        const dividendTax = grossDividend * dividendTaxRate;
        const netDividend = grossDividend - dividendTax;
        grossDividends += grossDividend;
        runningCosts += dividendTax;

        if (input.reinvestDividends) {
          const reinvestFee = netDividend * tradeFeeRate;
          portfolio += netDividend - reinvestFee;
          runningCosts += reinvestFee;
        } else {
          cashDividends += netDividend;
        }

        buckets[year].push(portfolio + cashDividends);
      }

      const sellCosts = Math.max(portfolio, 0) * (tradeFeeRate + sellTaxRate);
      const totalWealth = portfolio + cashDividends;
      finals.push({
        totalWealth,
        liquidationValue: Math.max(portfolio - sellCosts, 0) + cashDividends,
        grossDividends,
        totalCosts: runningCosts + sellCosts
      });
    }

    const rows = buckets.map((values, index) => {
      values.sort((first, second) => first - second);
      const p10 = percentile(values, 0.1);
      const p50 = percentile(values, 0.5);
      const p90 = percentile(values, 0.9);
      return {
        ...plan[index],
        p10,
        p50,
        p90,
        medianProfit: p50 - plan[index].totalContributions
      };
    });

    const wealthValues = finals.map((item) => item.totalWealth).sort((first, second) => first - second);
    const liquidationValues = finals.map((item) => item.liquidationValue).sort((first, second) => first - second);
    const dividendValues = finals.map((item) => item.grossDividends).sort((first, second) => first - second);
    const costValues = finals.map((item) => item.totalCosts).sort((first, second) => first - second);
    const totalContributions = plan[plan.length - 1].totalContributions;
    const p10 = percentile(wealthValues, 0.1);
    const p50 = percentile(wealthValues, 0.5);
    const p90 = percentile(wealthValues, 0.9);
    const liquidationValue = percentile(liquidationValues, 0.5);
    const grossDividends = percentile(dividendValues, 0.5);
    const totalCosts = percentile(costValues, 0.5);

    return {
      input,
      rows,
      p10,
      p50,
      p90,
      liquidationValue,
      totalContributions,
      profit: p50 - totalContributions,
      grossDividends,
      totalCosts,
      realValue: liquidationValue / Math.pow(1 + input.inflationRate / 100, input.years),
      wealthMultiple: totalContributions > 0 ? p50 / totalContributions : 0,
      goalProbability: finals.filter((item) => item.liquidationValue >= input.targetValue).length / SIMULATIONS * 100,
      lossProbability: finals.filter((item) => item.liquidationValue < totalContributions).length / SIMULATIONS * 100
    };
  };

  const renderSummary = (result) => {
    const { input } = result;
    const finalMonthly = result.rows[result.rows.length - 1].monthlyContribution;
    const homeGap = Math.max(input.targetValue - result.liquidationValue, 0);
    const homeCoverage = input.targetValue > 0 ? result.liquidationValue / input.targetValue * 100 : 100;
    const requiredMonthly = input.monthlyContribution > 0 && result.liquidationValue > 0 && result.liquidationValue < input.targetValue
      ? input.monthlyContribution * input.targetValue / result.liquidationValue
      : null;
    const futureUsdRate = input.currentUsdRate * Math.pow(1 + input.vndDepreciationRate / 100, input.years);
    const futureGoldPrice = input.goldPrice * Math.pow(1 + input.goldGrowthRate / 100, input.years);
    els.finalValue.textContent = formatCurrency(result.p50);
    els.finishDate.textContent = getFinishDate(input.startMonth, input.years);
    els.rangeText.textContent = `Dải 80% kết quả: ${formatCurrency(result.p10, true)} - ${formatCurrency(result.p90, true)}`;
    els.totalContributed.textContent = formatCurrency(result.totalContributions);
    els.totalProfit.textContent = formatCurrency(result.profit);
    els.totalProfit.classList.toggle('negative', result.profit < 0);
    els.totalProfit.classList.toggle('positive', result.profit >= 0);
    els.totalDividends.textContent = formatCurrency(result.grossDividends);
    els.liquidationValue.textContent = formatCurrency(result.liquidationValue);
    els.goalProbability.textContent = formatPercent(result.goalProbability);
    els.goalNote.textContent = `Trả trước ${formatPercent(input.downPaymentRate)}: ${formatCurrency(input.targetValue, true)}`;
    els.lossProbability.textContent = formatPercent(result.lossProbability);
    els.lossProbability.classList.toggle('negative', result.lossProbability >= 30);
    els.realValue.textContent = formatCurrency(result.realValue);
    els.inflationNote.textContent = `Sau lạm phát ${formatPercent(input.inflationRate, 2)}/năm`;
    els.finalMonthlyContribution.textContent = formatCurrency(finalMonthly, true);
    els.contributionInsight.textContent = input.contributionGrowth === 0
      ? 'Khoản góp được giữ cố định trong toàn bộ kế hoạch.'
      : `Tăng ${formatPercent(input.contributionGrowth, 2)} sau mỗi 12 tháng.`;
    els.estimatedCosts.textContent = formatCurrency(result.totalCosts, true);
    els.wealthMultiple.textContent = `${result.wealthMultiple.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}×`;
    els.futureHomePrice.textContent = formatCurrency(input.futureHomePrice);
    els.homeGrowthNote.textContent = `Từ ${formatCurrency(input.homeCurrentPrice, true)}, tăng ${formatPercent(input.homeGrowthRate, 2)}/năm trong ${input.years} năm`;
    els.homeCoverage.textContent = formatPercent(homeCoverage);
    els.homeCoverageBar.style.width = `${clamp(homeCoverage, 0, 100)}%`;
    els.homeGap.textContent = homeGap > 0
      ? `Còn thiếu ${formatCurrency(homeGap)} so với mục tiêu trả trước.`
      : `Đã vượt mục tiêu trả trước ${formatCurrency(result.liquidationValue - input.targetValue)}.`;
    els.downPaymentTarget.textContent = formatCurrency(input.targetValue);
    els.downPaymentNote.textContent = `${formatPercent(input.downPaymentRate)} giá căn nhà tương lai`;
    els.homeGoalProbability.textContent = formatPercent(result.goalProbability);
    els.requiredMonthly.textContent = result.liquidationValue >= input.targetValue
      ? 'Đã đủ mục tiêu'
      : requiredMonthly
        ? `${formatCurrency(requiredMonthly)}/tháng`
        : 'Cần nhập mức góp';
    els.homeGapValue.textContent = formatCurrency(homeGap);
    els.futureUsdRate.textContent = `${Math.round(futureUsdRate).toLocaleString('vi-VN')} ₫/USD`;
    els.usdRateNote.textContent = `Từ ${Math.round(input.currentUsdRate).toLocaleString('vi-VN')} ₫, VNĐ mất giá ${formatPercent(input.vndDepreciationRate, 2)}/năm`;
    els.portfolioUsd.textContent = `${Math.round(result.liquidationValue / futureUsdRate).toLocaleString('vi-VN')} USD`;
    els.futureGoldPrice.textContent = `${formatCurrency(futureGoldPrice)}/lượng`;
    els.goldGrowthNote.textContent = `Từ ${formatCurrency(input.goldPrice, true)}, tăng ${formatPercent(input.goldGrowthRate, 2)}/năm`;
    els.goldEquivalent.textContent = `${(result.liquidationValue / futureGoldPrice).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} lượng`;
  };

  const renderTable = (result) => {
    els.projectionBody.innerHTML = result.rows.map((row) => `
      <tr>
        <td>${row.label}</td>
        <td>${formatCurrency(row.monthlyContribution)}</td>
        <td>${formatCurrency(row.annualContribution)}</td>
        <td>${formatCurrency(row.totalContributions)}</td>
        <td>${formatCurrency(row.p10)}</td>
        <td>${formatCurrency(row.p50)}</td>
        <td>${formatCurrency(row.p90)}</td>
        <td class="${row.medianProfit < 0 ? 'negative' : 'positive'}">${formatCurrency(row.medianProfit)}</td>
      </tr>
    `).join('');
  };

  const renderChart = (result) => {
    const width = 840;
    const height = 330;
    const padding = { top: 25, right: 24, bottom: 42, left: 68 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const values = [
      { year: 0, p10: result.input.initialCapital, p50: result.input.initialCapital, p90: result.input.initialCapital, capital: result.input.initialCapital },
      ...result.rows.map((row) => ({ year: row.year, p10: row.p10, p50: row.p50, p90: row.p90, capital: row.totalContributions }))
    ];
    const maxValue = Math.max(...values.flatMap((item) => [item.p90, item.capital]), 1) * 1.08;
    const x = (index) => padding.left + index / Math.max(values.length - 1, 1) * chartWidth;
    const y = (value) => padding.top + chartHeight - Math.max(value, 0) / maxValue * chartHeight;
    const path = (key, reverse = false) => {
      const source = reverse ? [...values].reverse() : values;
      return source.map((item, index) => {
        const originalIndex = reverse ? values.length - index - 1 : index;
        return `${index === 0 ? 'M' : 'L'} ${x(originalIndex).toFixed(2)} ${y(item[key]).toFixed(2)}`;
      }).join(' ');
    };
    const medianPath = path('p50');
    const lowPath = path('p10');
    const highPath = path('p90');
    const bandPath = `${highPath} ${path('p10', true).replace(/^M/, 'L')} Z`;
    const capitalPath = path('capital');
    const grid = Array.from({ length: 5 }, (_, index) => {
      const ratio = index / 4;
      const lineY = padding.top + ratio * chartHeight;
      const labelValue = maxValue * (1 - ratio);
      return `
        <line class="grid-line" x1="${padding.left}" y1="${lineY}" x2="${width - padding.right}" y2="${lineY}"></line>
        <text class="chart-label" x="${padding.left - 10}" y="${lineY + 4}" text-anchor="end">${formatCurrency(labelValue, true)}</text>
      `;
    }).join('');
    const labelStep = Math.max(1, Math.ceil(result.input.years / 5));
    const labels = values.map((item, index) => {
      if (item.year !== 0 && item.year !== result.input.years && item.year % labelStep !== 0) return '';
      return `<text class="chart-label" x="${x(index)}" y="${height - 15}" text-anchor="middle">${item.year === 0 ? 'Bắt đầu' : `Năm ${item.year}`}</text>`;
    }).join('');

    els.growthChart.innerHTML = `
      ${grid}
      ${labels}
      <path class="range-band" d="${bandPath}"></path>
      <path class="low-line" d="${lowPath}"></path>
      <path class="high-line" d="${highPath}"></path>
      <path class="capital-line" d="${capitalPath}"></path>
      <path class="asset-line" d="${medianPath}"></path>
    `;
  };

  const stockRows = () => [...els.stockAllocationGrid.querySelectorAll('.stock-row')].map((row) => ({
    code: row.dataset.stock,
    row,
    input: row.querySelector('.stock-weight'),
    amount: row.querySelector('.stock-amount'),
    weight: clamp(numberValue(row.querySelector('.stock-weight'), 0), 0, 100)
  }));

  const renderAllocation = (input = getInputs()) => {
    const stocks = stockRows();
    const total = stocks.reduce((sum, stock) => sum + stock.weight, 0);
    els.allocationTotal.textContent = `${trimZero(total)}%`;
    els.allocationTotal.classList.toggle('bad', Math.abs(total - 100) > 0.01);
    stocks.forEach((stock) => {
      const normalizedWeight = total > 0 ? stock.weight / total : 0;
      stock.amount.textContent = `${formatCurrency(input.monthlyContribution * normalizedWeight)}/tháng mục tiêu`;
    });

    const counts = Object.fromEntries(stocks.map((stock) => [stock.code, 0]));
    const schedule = [];
    for (let month = 0; month < 12; month += 1) {
      let selected = stocks[0];
      let bestDeficit = -Infinity;
      stocks.forEach((stock) => {
        const desired = total > 0 ? stock.weight / total * (month + 1) : 0;
        const deficit = desired - counts[stock.code];
        if (deficit > bestDeficit) {
          selected = stock;
          bestDeficit = deficit;
        }
      });
      counts[selected.code] += 1;
      schedule.push(selected.code);
    }

    const [startYear, startMonth] = input.startMonth.split('-').map(Number);
    els.rotationSchedule.innerHTML = schedule.map((code, index) => {
      const date = new Date(startYear, startMonth - 1 + index, 1);
      return `<div class="rotation-item"><span>T${date.getMonth() + 1}/${String(date.getFullYear()).slice(-2)}</span><strong>${code}</strong></div>`;
    }).join('');
  };

  const rebalanceWeights = () => {
    const stocks = stockRows();
    const equalWeight = 100 / stocks.length;
    stocks.forEach((stock) => { stock.input.value = equalWeight.toFixed(4); });
    renderAllocation();
    showToast('Đã chia đều tỷ trọng cho 7 mã');
  };

  const updateProjection = () => {
    const input = getInputs();
    els.years.value = input.years;
    latestProjection = simulateProjection(input);
    renderSummary(latestProjection);
    renderTable(latestProjection);
    renderChart(latestProjection);
    renderAllocation(input);
    updateRangeLabel(input.monthlyContribution);
  };

  const updateRangeLabel = (value) => {
    els.monthlyRangeLabel.textContent = formatCurrency(value, true);
    if (value >= Number(els.monthlyRange.min) && value <= Number(els.monthlyRange.max)) els.monthlyRange.value = value;
  };

  const showToast = (message) => {
    clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.classList.add('show');
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2200);
  };

  const reset = () => {
    Object.entries(defaults).forEach(([key, value]) => {
      const element = els[key];
      if (!element) return;
      if (element.type === 'checkbox') element.checked = value;
      else if (['monthlyContribution', 'initialCapital', 'targetValue', 'currentUsdRate', 'goldPrice'].includes(key)) element.value = formatInputCurrency(value);
      else element.value = value;
    });
    els.monthlyRange.value = defaults.monthlyContribution;
    stockRows().forEach((stock) => { stock.input.value = defaultWeights[stock.code]; });
    document.querySelectorAll('.preset').forEach((button) => button.classList.toggle('active', button.dataset.return === '10'));
    updateProjection();
    showToast('Đã khôi phục kịch bản Stock cơ sở');
  };

  const projectionCsv = (result) => {
    const header = ['Năm', 'Góp mỗi tháng', 'Góp trong năm', 'Tổng vốn góp', 'P10', 'P50 trung vị', 'P90', 'Lãi trung vị'];
    const rows = result.rows.map((row) => [row.label, row.monthlyContribution, row.annualContribution, row.totalContributions, row.p10, row.p50, row.p90, row.medianProfit].map((value) => typeof value === 'number' ? Math.round(value) : value));
    return `\uFEFF${[header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')}`;
  };

  const exportCsv = () => {
    if (!latestProjection) return;
    const blob = new Blob([projectionCsv(latestProjection)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mo-phong-stock-${latestProjection.input.years}-nam.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast('Đã xuất bảng mô phỏng CSV');
  };

  const copySummary = async () => {
    if (!latestProjection) return;
    const result = latestProjection;
    const allocations = stockRows().map((stock) => `${stock.code} ${stock.weight}%`).join(', ');
    const summary = [
      `MÔ PHỎNG STOCK ${result.input.years} NĂM - ${SIMULATIONS.toLocaleString('vi-VN')} KỊCH BẢN`,
      `Đầu tư mỗi tháng: ${formatCurrency(result.input.monthlyContribution)}`,
      `Tăng khoản góp: ${formatPercent(result.input.contributionGrowth)}/năm`,
      `Tăng giá kỳ vọng: ${formatPercent(result.input.annualReturn)}/năm`,
      `Biến động: ${formatPercent(result.input.marketVolatility)}/năm`,
      `Danh mục: ${allocations}`,
      `Tổng vốn góp: ${formatCurrency(result.totalContributions)}`,
      `Dải P10 - P90: ${formatCurrency(result.p10)} - ${formatCurrency(result.p90)}`,
      `Tài sản trung vị: ${formatCurrency(result.p50)}`,
      `Giá trị trung vị nếu bán toàn bộ: ${formatCurrency(result.liquidationValue)}`,
      `Giá căn nhà hôm nay: ${formatCurrency(result.input.homeCurrentPrice)}`,
      `Giá căn nhà dự phóng: ${formatCurrency(result.input.futureHomePrice)} (${formatPercent(result.input.homeGrowthRate)}/năm)`,
      `Mục tiêu trả trước ${formatPercent(result.input.downPaymentRate)}: ${formatCurrency(result.input.targetValue)}`,
      `Xác suất đạt mục tiêu trả trước: ${formatPercent(result.goalProbability)}`,
      `USD/VNĐ dự phóng: ${Math.round(result.input.currentUsdRate * Math.pow(1 + result.input.vndDepreciationRate / 100, result.input.years)).toLocaleString('vi-VN')} ₫/USD`,
      `Giá vàng dự phóng: ${formatCurrency(result.input.goldPrice * Math.pow(1 + result.input.goldGrowthRate / 100, result.input.years))}/lượng`
    ].join('\n');
    try {
      await navigator.clipboard.writeText(summary);
      showToast('Đã sao chép tóm tắt');
    } catch {
      showToast('Trình duyệt không cho phép sao chép');
    }
  };

  const queueUpdate = () => {
    clearTimeout(inputTimer);
    inputTimer = setTimeout(updateProjection, 140);
  };

  els.form.addEventListener('submit', (event) => {
    event.preventDefault();
    updateProjection();
    document.querySelector('.result-hero').scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  });

  els.form.querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', queueUpdate);
    input.addEventListener('change', updateProjection);
  });

  [els.monthlyContribution, els.initialCapital, els.targetValue, els.currentUsdRate, els.goldPrice].forEach((input) => {
    input.addEventListener('focus', () => {
      input.value = parseCurrency(input.value) || '';
      input.select();
    });
    input.addEventListener('blur', () => {
      input.value = formatInputCurrency(parseCurrency(input.value));
      updateProjection();
    });
  });

  els.monthlyRange.addEventListener('input', () => {
    const value = Number(els.monthlyRange.value);
    els.monthlyContribution.value = formatInputCurrency(value);
    updateProjection();
  });

  document.querySelectorAll('.preset').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.preset').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      els.annualReturn.value = button.dataset.return;
      els.marketVolatility.value = button.dataset.volatility;
      els.dividendYield.value = button.dataset.dividend;
      updateProjection();
    });
  });

  [els.annualReturn, els.marketVolatility, els.dividendYield].forEach((input) => {
    input.addEventListener('input', () => document.querySelectorAll('.preset').forEach((button) => button.classList.remove('active')));
  });

  els.stockAllocationGrid.addEventListener('input', () => renderAllocation());
  els.rebalanceButton.addEventListener('click', rebalanceWeights);
  els.resetButton.addEventListener('click', reset);
  els.csvButton.addEventListener('click', exportCsv);
  els.copyButton.addEventListener('click', copySummary);
  els.printButton.addEventListener('click', () => window.print());

  updateProjection();
})();
