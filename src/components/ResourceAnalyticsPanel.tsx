import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  LiveEnrichmentResult,
  ResourceItem,
  ResourceLiveAnalyticsResponse,
} from '../types/resource';

interface ResourceAnalyticsPanelProps {
  resource: ResourceItem;
  liveEnrichment?: LiveEnrichmentResult | null;
}

const CHART_COLORS = ['#0f766e', '#0369a1', '#b45309', '#475569', '#0d9488'];

export const ResourceAnalyticsPanel: React.FC<ResourceAnalyticsPanelProps> = ({
  resource,
  liveEnrichment,
}) => {
  const [liveData, setLiveData] = useState<ResourceLiveAnalyticsResponse | null>(null);
  const [loadingLive, setLoadingLive] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  const primarySite = resource.occurrences?.[0] ?? null;

  const fetchLiveCharts = useCallback(
    async (forceRefresh = false) => {
      setLoadingLive(true);
      setLiveError(null);
      try {
        const params = new URLSearchParams({
          name: resource.name,
          category: resource.category,
        });
        if (primarySite) {
          params.set('lat', String(primarySite.latitude));
          params.set('lon', String(primarySite.longitude));
          params.set('siteName', primarySite.siteName);
          params.set('country', primarySite.country);
        }
        if (forceRefresh) {
          params.set('refresh', '1');
        }

        const res = await fetch(`/api/resources/analytics?${params.toString()}`);
        const json = (await res.json()) as ResourceLiveAnalyticsResponse & { error?: string };
        if (!res.ok) {
          throw new Error(json.error || 'Failed to fetch analytics.');
        }
        setLiveData(json);
      } catch (err: unknown) {
        setLiveError(
          err instanceof Error ? err.message : 'Unable to fetch market & climate trends.'
        );
      } finally {
        setLoadingLive(false);
      }
    },
    [
      resource.name,
      resource.category,
      primarySite?.latitude,
      primarySite?.longitude,
      primarySite?.siteName,
      primarySite?.country,
    ]
  );

  useEffect(() => {
    fetchLiveCharts(false);
  }, [fetchLiveCharts]);

  const liveLocalityCountryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const occ of resource.occurrences || []) {
      const c = occ.country || 'International';
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([country, sites]) => ({ country, sites }))
      .sort((a, b) => b.sites - a.sites)
      .slice(0, 8);
  }, [resource.occurrences]);

  const producerChartData = (resource.majorProducers || []).map((p) => ({
    country: p.country,
    value: p.annualOutput ?? p.sharePct ?? 0,
    unit: p.unit,
    year: p.year,
    status: p.status,
    source: p.source,
  }));

  const worldBankData = liveEnrichment?.worldBankStats ?? [];
  const applications = resource.applicationBreakdown || [];

  const producerUnit = resource.majorProducers?.[0]?.unit || 'units';
  const producerSource = resource.majorProducers?.[0]?.source || resource.sourceName;
  const producerYear = resource.majorProducers?.[0]?.year || resource.lastUpdated;

  const market = liveData?.market;
  const climate = liveData?.climateSeries;

  return (
    <div className="space-y-6">
      {/* Live Refresh Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
        <div className="text-xs text-slate-700">
          <span className="font-semibold text-teal-800">2026 Analytics Stream</span>
          <span className="mx-1.5" aria-hidden="true">·</span>
          <span>
            {liveData
              ? `Synced ${new Date(liveData.fetchedAt).toLocaleString()} (Market & Open-Meteo ERA5/IFS)`
              : loadingLive
              ? 'Synchronizing market & climate datasets…'
              : 'Ready'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => fetchLiveCharts(true)}
          disabled={loadingLive}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 cursor-pointer"
        >
          {loadingLive ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          <span>{loadingLive ? 'Refreshing…' : 'Refresh Charts'}</span>
        </button>
      </div>

      {liveError && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
          {liveError}
        </div>
      )}

      {/* Availability & Reserve Overview Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Global Reserves & Extent</p>
          <p className="text-sm font-semibold text-slate-900 mt-1.5 leading-snug">
            {resource.availabilityMetrics.globalReservesText}
          </p>
          <p className="text-xs font-mono text-slate-500 mt-3">
            Reference: {resource.availabilityMetrics.source} ({resource.availabilityMetrics.year})
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Renewability Classification</p>
          <p className="text-sm font-semibold text-slate-900 mt-1.5 leading-snug">
            {resource.availabilityMetrics.renewability}
          </p>
          <p className="text-xs font-mono text-slate-500 mt-3">
            {resource.availabilityMetrics.reserveLifeYears
              ? `Est. static reserve life: ${resource.availabilityMetrics.reserveLifeYears} years`
              : 'Horizon depends on stewardship & recovery rates'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Relative Supply Scarcity Index</p>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-2xl font-mono font-bold text-slate-900 tabular-nums">
              {resource.availabilityMetrics.scarcityIndex}
            </span>
            <span className="text-xs font-mono text-slate-500">/ 100 scale</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-teal-700 rounded-full"
              style={{
                width: `${Math.min(100, Math.max(4, resource.availabilityMetrics.scarcityIndex))}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* ROW 1: Live 2026 Market Trend & Live 30-Day Locality Climate Series */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live 52-Week Commodity / Sector Market Price Trend */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h4 className="text-base font-semibold text-slate-900">
                Market Price & Benchmark Trend (52-Week)
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                {market
                  ? `${market.instrumentName} (${market.symbol}) · ${
                      market.matchType === 'exact_commodity_spot'
                        ? 'Direct Commodity Futures'
                        : 'Related Sector Benchmark'
                    }`
                  : 'Fetching market feed…'}
              </p>
            </div>
            {market && (
              <div className="text-right shrink-0">
                <div className="text-sm font-mono font-bold text-slate-900 tabular-nums">
                  ${market.currentPrice.toLocaleString()}
                </div>
                <div
                  className={`inline-flex items-center gap-0.5 text-[11px] font-mono font-semibold ${
                    market.changePct >= 0 ? 'text-teal-700' : 'text-rose-700'
                  }`}
                >
                  {market.changePct >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  <span>
                    {market.changePct >= 0 ? '+' : ''}
                    {market.changePct}% (1Y)
                  </span>
                </div>
              </div>
            )}
          </div>

          {loadingLive && !market ? (
            <div className="h-60 flex items-center justify-center gap-2 text-xs text-slate-500 border border-slate-100 rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin text-teal-700" />
              <span>Fetching 2026 market chart…</span>
            </div>
          ) : market && market.points.length > 0 ? (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={market.points} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="liveMarketFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f766e" stopOpacity={0.24} />
                      <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v: string) => v.slice(2, 7)}
                    minTickGap={28}
                    tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'JetBrains Mono' }}
                  />
                  <YAxis
                    domain={['auto', 'auto']}
                    tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'JetBrains Mono' }}
                    width={58}
                  />
                  <Tooltip
                    formatter={(val: unknown) => [`$${val} (${market.unit})`, market.symbol]}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="#0f766e"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#liveMarketFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-60 flex items-center justify-center border border-dashed border-slate-200 rounded-lg text-xs text-slate-500 px-6 text-center">
              Market feed temporarily unavailable for this benchmark.
            </div>
          )}

          <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
            {market
              ? `Source: ${market.source} · Latest Close: ${market.asOfDate} · Unit: ${market.unit}`
              : 'Market feed via Yahoo Finance'}
          </p>
        </div>

        {/* Rolling 30-Day Locality Climate & Weather Trend */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h4 className="text-base font-semibold text-slate-900">
                30-Day Site Climate & Rainfall Trend
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                {climate
                  ? `${climate.siteName} (${climate.country}) · ${climate.startDate} → ${climate.latestDate}`
                  : primarySite
                  ? `Loading ERA5/IFS observations for ${primarySite.siteName}…`
                  : 'No mapped coordinates available for locality climate sampling'}
              </p>
            </div>
            {climate && (
              <div className="text-right shrink-0 font-mono text-xs">
                <div className="font-bold text-slate-900">{climate.latestTempC.toFixed(1)} °C</div>
                <div className="text-[11px] text-sky-700">{climate.latestPrecipMm.toFixed(1)} mm</div>
              </div>
            )}
          </div>

          {loadingLive && !climate && primarySite ? (
            <div className="h-60 flex items-center justify-center gap-2 text-xs text-slate-500 border border-slate-100 rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin text-teal-700" />
              <span>Fetching 30-day Open-Meteo data…</span>
            </div>
          ) : climate && climate.days.length > 0 ? (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={climate.days}
                  margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v: string) => v.slice(5)}
                    minTickGap={20}
                    tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'JetBrains Mono' }}
                  />
                  <YAxis
                    yAxisId="temp"
                    tick={{ fontSize: 11, fill: '#b45309', fontFamily: 'JetBrains Mono' }}
                    width={36}
                  />
                  <YAxis
                    yAxisId="precip"
                    orientation="right"
                    tick={{ fontSize: 11, fill: '#0369a1', fontFamily: 'JetBrains Mono' }}
                    width={36}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar
                    yAxisId="precip"
                    dataKey="precipMm"
                    name="Daily Precip (mm)"
                    fill="#38bdf8"
                    opacity={0.55}
                    radius={[2, 2, 0, 0]}
                  />
                  <Line
                    yAxisId="temp"
                    type="monotone"
                    dataKey="tempC"
                    name="Mean Temp (°C)"
                    stroke="#d97706"
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-60 flex items-center justify-center border border-dashed border-slate-200 rounded-lg text-xs text-slate-500 px-6 text-center">
              Open a resource with mapped site coordinates to view 30-day locality climate trends.
            </div>
          )}

          <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
            {climate
              ? `Source: ${climate.source} (${climate.latitude.toFixed(2)}°, ${climate.longitude.toFixed(2)}°) · Latest: ${climate.latestDate}`
              : 'Weather dataset via Open-Meteo ERA5 / IFS API'}
          </p>
        </div>
      </div>

      {/* ROW 2: Mapped Sites by Country + End-Use Sector Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mapped Country Localities */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h4 className="text-base font-semibold text-slate-900">
                Mapped Localities by Country (Atlas Record)
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Verified & online-discovered sites grouped by country · {resource.occurrences?.length || 0} total plotted
              </p>
            </div>
            <span className="text-xs font-mono text-teal-800 shrink-0">
              {new Date().getFullYear()} Atlas
            </span>
          </div>

          {liveLocalityCountryCounts.length > 0 ? (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={liveLocalityCountryCounts}
                  layout="vertical"
                  margin={{ top: 4, right: 20, left: 10, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'JetBrains Mono' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="country"
                    width={115}
                    tick={{ fontSize: 11, fill: '#334155' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <Tooltip
                    formatter={(val: unknown) => [`${val} mapped site(s)`, 'Localities']}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="sites" fill="#0369a1" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-60 flex items-center justify-center border border-dashed border-slate-200 rounded-lg text-xs text-slate-500 px-6 text-center">
              No mapped coordinates yet for country aggregation.
            </div>
          )}

          <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
            Aggregated from Cloud SQL &amp; online georeferenced records (Wikidata / GBIF)
          </p>
        </div>

        {/* End-Use & Industrial Sector Distribution */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="mb-4">
            <h4 className="text-base font-semibold text-slate-900">
              End-Use & Industrial Sector Distribution
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Share of global consumption or functional allocation (%)
            </p>
          </div>

          {applications.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={applications}
                      dataKey="sharePct"
                      nameKey="sector"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={78}
                      paddingAngle={2}
                    >
                      {applications.map((_entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: unknown) => [`${val}%`, 'Share']}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2.5">
                {applications.map((app, i) => (
                  <div key={app.sector} className="flex items-start justify-between gap-3 text-xs">
                    <div className="flex items-start gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-sm mt-0.5 shrink-0"
                        style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                      <span className="text-slate-700 leading-snug">{app.sector}</span>
                    </div>
                    <span className="font-mono font-semibold text-slate-900 tabular-nums shrink-0">
                      {app.sharePct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center border border-dashed border-slate-200 rounded-lg text-xs text-slate-500 px-6 text-center">
              Sectoral percentage breakdown not published in upstream APIs for this resource.
            </div>
          )}
          <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
            Data Source: {applications[0]?.source || resource.sourceName}
          </p>
        </div>
      </div>

      {/* ROW 3: Global Production Reference + Live World Bank Indicator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h4 className="text-base font-semibold text-slate-900">
                Production & Concentration by Country
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Unit: <span className="font-mono">{producerUnit}</span> · Published Release: {producerYear}
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500 shrink-0">
              {resource.majorProducers?.[0]?.status ?? 'reported'}
            </span>
          </div>

          {producerChartData.length > 0 ? (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={producerChartData}
                  layout="vertical"
                  margin={{ top: 4, right: 20, left: 10, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'JetBrains Mono' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="country"
                    width={110}
                    tick={{ fontSize: 11, fill: '#334155' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(
                      val: unknown,
                      _name: unknown,
                      item: { payload?: { unit?: string; status?: string; source?: string } }
                    ) => [
                      `${val} ${item?.payload?.unit ?? ''} (${item?.payload?.status ?? 'reported'})`,
                      'Output / Share',
                    ]}
                  />
                  <Bar dataKey="value" fill="#0f766e" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center border border-dashed border-slate-200 rounded-lg text-xs text-slate-500 px-6 text-center">
              No standardized country-level production dataset published for this specimen.
            </div>
          )}
          <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
            Published Baseline Source: {producerSource}
          </p>
        </div>

        {/* Live World Bank Macro Resource Rents / Freshwater Indicator */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h4 className="text-base font-semibold text-slate-900">
                World Bank Country Resource Indicator (Latest WDI)
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                {worldBankData.length > 0
                  ? `${worldBankData[0].indicatorName} (${worldBankData[0].indicatorCode})`
                  : 'Click "Fetch External Data" above to query World Bank Open Data API'}
              </p>
            </div>
            {worldBankData.length > 0 && (
              <span className="text-xs font-mono text-slate-500 shrink-0">
                WDI {worldBankData[0].year}
              </span>
            )}
          </div>

          {worldBankData.length > 0 ? (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={worldBankData} margin={{ top: 8, right: 12, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="iso3"
                    tick={{ fontSize: 11, fill: '#475569', fontFamily: 'JetBrains Mono' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'JetBrains Mono' }}
                    width={45}
                  />
                  <Tooltip
                    formatter={(
                      val: unknown,
                      _name: unknown,
                      item: { payload?: { country?: string; indicatorName?: string } }
                    ) => [
                      `${val}%`,
                      `${item?.payload?.country ?? ''} · ${item?.payload?.indicatorName ?? ''}`,
                    ]}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="value" fill="#0369a1" radius={[4, 4, 0, 0]} barSize={26} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-56 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-lg px-6 text-center bg-slate-50/50">
              <p className="text-sm font-medium text-slate-800">
                World Bank Country Rents Indicator
              </p>
              <p className="text-xs text-slate-500 mt-1.5 max-w-md">
                Click &ldquo;Fetch External Data&rdquo; at the top of this profile to pull the newest World Bank WDI country release.
              </p>
            </div>
          )}
          <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
            Source: World Bank Open Data API (latest published national accounts release)
          </p>
        </div>
      </div>
    </div>
  );
};
