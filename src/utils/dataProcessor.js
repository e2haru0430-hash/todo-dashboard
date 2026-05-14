import Papa from 'papaparse';

export const processData = (csvText, agencyFee = 0) => {
  return new Promise((resolve) => {
    Papa.parse(csvText, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.toUpperCase().trim().replace(/\s+/g, '_'),
      complete: (results) => {
        const rawData = results.data;
        const processed = rawData.map(row => {
          // Normalize common field variations
          const cost = row.COST || row.AD_SPEND || row.SPEND || 0;
          const adjustedCost = cost * (1 + agencyFee / 100);
          const revenue = row.GA_REV || row.REVENUE || row.SALES || 0;
          const conv = row.GA_CONV || row.PURCHASE || row.CONVERSIONS || 0;
          const impressions = row.IMPRESSION || row.IMPRESSIONS || 0;
          const clicks = row.CLICKS || 0;
          
          return {
            ...row,
            IMPRESSION: impressions,
            CLICKS: clicks,
            COST: cost,
            ADJUSTED_COST: adjustedCost,
            GA_REV: revenue,
            GA_CONV: conv,
            ROAS: adjustedCost > 0 ? (revenue / adjustedCost) * 100 : 0,
            CTR: impressions > 0 ? (clicks / impressions) * 100 : 0,
            CPC: clicks > 0 ? adjustedCost / clicks : 0,
            CPA: conv > 0 ? adjustedCost / conv : 0,
            AOV: conv > 0 ? revenue / conv : 0
          };
        });
        resolve(processed);
      }
    });
  });
};

export const getComparisonData = (data, mode = 'Yesterday') => {
  try {
    const sorted = [...data].sort((a, b) => new Date(b.DATE) - new Date(a.DATE));
    if (sorted.length === 0) return null;

    const latestDate = sorted[0].DATE;
    if (!latestDate) return null;

    const currentData = sorted.filter(d => d.DATE === latestDate);

    const d = new Date(latestDate);
    if (isNaN(d.getTime())) return null;

    if (mode === 'Yesterday') {
      d.setDate(d.getDate() - 1);
    } else if (mode === 'WoW') {
      d.setDate(d.getDate() - 7);
    } else if (mode === 'MoM') {
      d.setMonth(d.getMonth() - 1);
    } else if (mode === 'YoY') {
      d.setFullYear(d.getFullYear() - 1);
    }

    if (isNaN(d.getTime())) return null;
    const targetDate = d.toISOString().split('T')[0];
    const previousData = sorted.filter(r => r.DATE === targetDate);

    const sum = (arr, key) => arr.reduce((acc, curr) => acc + (curr[key] || 0), 0);

    return {
      current: {
        cost: sum(currentData, 'ADJUSTED_COST'),
        revenue: sum(currentData, 'GA_REV'),
        clicks: sum(currentData, 'CLICKS'),
        impressions: sum(currentData, 'IMPRESSION'),
        conversions: sum(currentData, 'GA_CONV'),
        roas: sum(currentData, 'ADJUSTED_COST') > 0 ? (sum(currentData, 'GA_REV') / sum(currentData, 'ADJUSTED_COST')) * 100 : 0
      },
      previous: {
        cost: sum(previousData, 'ADJUSTED_COST'),
        revenue: sum(previousData, 'GA_REV'),
        clicks: sum(previousData, 'CLICKS'),
        impressions: sum(previousData, 'IMPRESSION'),
        conversions: sum(previousData, 'GA_CONV'),
        roas: sum(previousData, 'ADJUSTED_COST') > 0 ? (sum(previousData, 'GA_REV') / sum(previousData, 'ADJUSTED_COST')) * 100 : 0
      }
    };
  } catch (e) {
    console.error('getComparisonData error:', e);
    return null;
  }
};
