<script setup lang="ts">
import { useSupabase } from '~/composables/useSupabase'
import PosHeader from '~/components/pos/PosHeader.vue'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

interface AnalyticsRow {
  date: string
  gross_sales: number
  net_sales: number
  total_orders_count: number
  total_cups_sold: number
}

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Performance Analytics' })

const supabase = useSupabase()
const chartCanvas = ref<HTMLCanvasElement | null>(null)
let chartInstance: Chart | null = null

// --- Data Fetching ---
// 1. Fetch Monthly for the Chart
const { data: monthlyData, pending: monthlyPending, refresh: refreshMonthly } = await useAsyncData<AnalyticsRow[]>('monthly-analytics', async () => {
  const { data, error } = await supabase.rpc('get_monthly_analytics')
  if (error) throw error
  return data || []
})

// 2. Fetch Weekly for the Table
const { data: weeklyData, pending: weeklyPending, refresh: refreshWeekly } = await useAsyncData<AnalyticsRow[]>('weekly-analytics', async () => {
  const { data, error } = await supabase.rpc('get_weekly_analytics')
  if (error) throw error
  return data || []
})

const pending = computed(() => monthlyPending.value || weeklyPending.value)
const refresh = () => { refreshMonthly(); refreshWeekly(); }

// --- Summary Metrics (Aggregated from Weekly) ---
const summary = computed(() => {
  if (!weeklyData.value?.length) return { net: 0, orders: 0, cups: 0, aov: 0 }
  const net = weeklyData.value.reduce((acc, curr) => acc + Number(curr.net_sales), 0)
  const orders = weeklyData.value.reduce((acc, curr) => acc + Number(curr.total_orders_count), 0)
  const cups = weeklyData.value.reduce((acc, curr) => acc + Number(curr.total_cups_sold), 0)
  return { net, orders, cups, aov: orders > 0 ? net / orders : 0 }
})

// --- Filter State ---
const now = new Date()

// Helper to format Date to "YYYY-MM" safely regardless of timezone
const formatYearMonth = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

// Rolling 6-month window: 5 months ago to current month
const defaultStart = new Date(now.getFullYear(), now.getMonth() - 5, 1)
const defaultEnd = new Date(now.getFullYear(), now.getMonth(), 1)

const filters = ref({
  startMonth: formatYearMonth(defaultStart),
  endMonth: formatYearMonth(defaultEnd),
  viewMode: 'monthly' as 'monthly' | 'weekly'
})

const selectedWeeklyMonth = ref(formatYearMonth(now))

// --- Filtered Weekly Data for the Table ---
const filteredWeeklyData = computed(() => {
  if (!weeklyData.value) return []
  return weeklyData.value.filter(row => {
    // row.date is expected to be "YYYY-MM-DD" or similar
    return row.date.startsWith(selectedWeeklyMonth.value)
  })
})

const weeklyTotals = computed(() => {
  return filteredWeeklyData.value.reduce((acc, curr) => {
    acc.orders += Number(curr.total_orders_count || 0)
    acc.gross += Number(curr.gross_sales || 0)
    acc.net += Number(curr.net_sales || 0)
    acc.cups += Number(curr.total_cups_sold || 0)
    return acc
  }, { orders: 0, gross: 0, net: 0, cups: 0 })
})

// Generate list of months for the dropdown selectors
const availableMonths = computed(() => {
  const months = []
  // Show 12 months past to 6 months future
  for (let i = -12; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    months.push({
      value: formatYearMonth(d),
      label: d.toLocaleDateString('en-MY', { month: 'short', year: 'numeric' })
    })
  }
  return months
})

// --- Chart.js Logic (Dynamic Mode) ---
const initChart = async () => {
  if (!chartCanvas.value) return
  await nextTick()
  if (chartInstance) chartInstance.destroy()

  const labels: string[] = []
  const salesData: number[] = []
  const cupsData: number[] = []

  if (filters.value.viewMode === 'monthly') {
    // Generate labels based on selected month range
    const [startYear, startMonth] = filters.value.startMonth.split('-').map(Number)
    const [endYear, endMonth] = filters.value.endMonth.split('-').map(Number)
    const current = new Date(startYear, startMonth - 1, 1)
    const end = new Date(endYear, endMonth - 1, 1)
    
    while (current <= end) {
      const key = formatYearMonth(current)
      labels.push(current.toLocaleDateString('en-MY', { month: 'short', year: 'numeric' }))
      const match = monthlyData.value?.find(d => d.date.startsWith(key))
      salesData.push(match ? Number(match.net_sales) : 0)
      cupsData.push(match ? Number(match.total_cups_sold) : 0)
      current.setMonth(current.getMonth() + 1)
      if (labels.length > 24) break 
    }
  } else {
    // Show last 12 weeks of data from the weekly stream
    const recentWeeks = [...(weeklyData.value || [])].reverse().slice(-12)
    recentWeeks.forEach(w => {
      labels.push(new Date(w.date).toLocaleDateString('en-MY', { day: '2-digit', month: 'short' }))
      salesData.push(Number(w.net_sales))
      cupsData.push(Number(w.total_cups_sold))
    })
  }

  const ctx = chartCanvas.value.getContext('2d')
  if (!ctx) return

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Net Sales',
          data: salesData,
          backgroundColor: '#D85A30',
          borderRadius: 6,
          maxBarThickness: 40,
          yAxisID: 'yRevenue',
          order: 2
        },
        {
          label: 'Cups Sold',
          data: cupsData,
          type: 'line',
          borderColor: '#378ADD',
          backgroundColor: '#378ADD',
          borderWidth: 4,
          pointRadius: 6,
          pointHoverRadius: 8,
          yAxisID: 'yCups',
          tension: 0.4,
          order: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#111827',
          padding: 16,
          titleFont: { size: 14, weight: 'bold' },
          callbacks: {
            label: (ctx) => {
              const y = ctx.parsed.y ?? 0
              return ctx.datasetIndex === 0 ? ` Revenue: RM ${y.toFixed(2)}` : ` Volume: ${y} cups`
            }
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11, weight: 'bold' }, color: '#94a3b8' } },
        yRevenue: {
          type: 'linear', position: 'left', beginAtZero: true,
          title: { display: true, text: 'Revenue (RM)', color: '#D85A30', font: { weight: 'bold' } },
          grid: { color: '#f1f5f9' }
        },
        yCups: {
          type: 'linear', position: 'right', beginAtZero: true,
          title: { display: true, text: 'Cups Sold', color: '#378ADD', font: { weight: 'bold' } },
          grid: { display: false }
        }
      }
    }
  })
}

watch([monthlyData, filters], () => process.client && initChart(), { deep: true })
onMounted(() => initChart())

const downloadCSV = () => {
  if (!weeklyData.value) return
  const headers = ['Week Starting', 'Orders', 'Gross Sales', 'Net Sales', 'Cups Sold']
  const rows = weeklyData.value.map(r => [r.date, r.total_orders_count, r.gross_sales, r.net_sales, r.total_cups_sold])
  const csv = [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const link = document.body.appendChild(document.createElement('a'))
  link.href = url; link.download = `dnb-weekly-report.csv`; link.click()
}
</script>

<template>
  <div class="min-h-dvh bg-white dark:bg-black text-gray-900 dark:text-white transition-colors duration-300">
    <PosHeader active-page="reports" />

    <main class="max-w-6xl mx-auto py-12 px-6">
      <div class="flex flex-wrap items-end justify-between gap-6 mb-10">
        <div>
          <h1 class="text-4xl font-black uppercase italic tracking-tighter leading-none mb-3">Performance</h1>
          <p class="text-[10px] font-black text-orange-600 uppercase tracking-[0.4em] ml-1">Monthly Trends & Weekly Data</p>
        </div>
        
        <div class="flex items-center gap-3">
          <!-- Month Range Filters -->
          <div class="hidden md:flex items-center gap-2 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-1.5 shadow-sm">
            <select v-model="filters.startMonth" class="bg-transparent text-[10px] font-black uppercase tracking-widest px-3 outline-none cursor-pointer hover:text-orange-600 transition-colors">
              <option v-for="m in availableMonths" :key="m.value" :value="m.value">{{ m.label }}</option>
            </select>
            <span class="text-gray-300 font-bold">→</span>
            <select v-model="filters.endMonth" class="bg-transparent text-[10px] font-black uppercase tracking-widest px-3 outline-none cursor-pointer hover:text-orange-600 transition-colors">
              <option v-for="m in availableMonths" :key="m.value" :value="m.value">{{ m.label }}</option>
            </select>
          </div>

          <button @click="refresh" :disabled="pending" class="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-400 hover:text-orange-600 transition-all active:scale-95">

             <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" :class="{'animate-spin': pending}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
             </svg>
          </button>
          <button @click="downloadCSV" class="flex items-center gap-3 px-6 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-orange-600 transition-all shadow-xl shadow-gray-900/10">
             <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
             </svg>
             Export CSV
          </button>
        </div>
      </div>

      <!-- Metric Cards -->
      <div v-if="weeklyData" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div class="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800">
          <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Net Sales</p>
          <p class="text-2xl font-black text-orange-600 italic">RM{{ summary.net.toFixed(2) }}</p>
        </div>
        <div class="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800">
          <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Orders</p>
          <p class="text-2xl font-black text-gray-900 dark:text-white">{{ summary.orders }}</p>
        </div>
        <div class="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800">
          <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Cups Sold</p>
          <p class="text-2xl font-black text-gray-900 dark:text-white">{{ summary.cups }}</p>
        </div>
        <div class="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800">
          <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Avg Order Value</p>
          <p class="text-2xl font-black text-gray-900 dark:text-white italic">RM{{ summary.aov.toFixed(2) }}</p>
        </div>
      </div>

      <!-- Chart Container -->
      <div class="bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-900 rounded-[3rem] p-8 mb-8 shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div class="flex items-center gap-4">
            <h3 class="text-xs font-black uppercase tracking-widest text-gray-400">Revenue Trend</h3>
            <!-- Mode Toggle -->
            <div class="flex bg-gray-50 dark:bg-gray-900 p-1 rounded-xl border border-gray-100 dark:border-gray-800">
              <button 
                @click="filters.viewMode = 'monthly'"
                class="px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                :class="filters.viewMode === 'monthly' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'"
              >Monthly</button>
              <button 
                @click="filters.viewMode = 'weekly'"
                class="px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                :class="filters.viewMode === 'weekly' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'"
              >Weekly</button>
            </div>
          </div>

          <div class="flex items-center gap-6">

            <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-sm bg-[#D85A30]"></div><span class="text-[9px] font-black uppercase text-gray-400">Net Sales</span></div>
            <div class="flex items-center gap-2"><div class="w-4 h-[3px] bg-[#378ADD]"></div><span class="text-[9px] font-black uppercase text-gray-400">Cups Sold</span></div>
          </div>
        </div>
        <div class="h-[300px] w-full relative">
          <canvas v-show="monthlyData?.length" ref="chartCanvas"></canvas>
          <div v-if="pending || !monthlyData?.length" class="absolute inset-0 flex items-center justify-center">
             <div class="animate-pulse text-[10px] font-black text-orange-600 uppercase tracking-widest">{{ pending ? 'Syncing...' : 'No Monthly Data' }}</div>
          </div>
        </div>
      </div>

      <!-- Weekly Data Table -->
      <div class="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] overflow-hidden shadow-sm">
        <div class="px-8 py-5 border-b border-gray-50 dark:border-gray-800 flex flex-wrap items-center justify-between gap-4">
           <h3 class="text-xs font-black uppercase tracking-widest text-gray-400">Weekly Breakdown</h3>
           <div class="flex items-center gap-3 w-48">
             <BrandedDatePicker 
               v-model="selectedWeeklyMonth"
               placeholder="Filter Month"
             />
           </div>
        </div>
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-gray-50/50 dark:bg-gray-950/50 text-[9px] font-black uppercase tracking-widest text-gray-400">
              <th class="px-8 py-4">Week Starting</th>
              <th class="px-8 py-4 text-center">Orders</th>
              <th class="px-8 py-4 text-center">Gross Orders</th>
              <th class="px-8 py-4 text-center">Sales</th>
              <th class="px-8 py-4 text-right">Cups Sold</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50 dark:divide-gray-800">
            <tr v-if="filteredWeeklyData.length === 0">
              <td colspan="5" class="px-8 py-10 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">No data available for this month</td>
            </tr>
            <tr v-for="row in filteredWeeklyData" :key="row.date" class="hover:bg-gray-50/30 dark:hover:bg-gray-800/30 transition-colors">
              <td class="px-8 py-5"><p class="text-xs font-black text-gray-900 dark:text-white uppercase italic">{{ row.date }}</p></td>
              <td class="px-8 py-5 text-center"><span class="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-[9px] font-black text-gray-500">{{ row.total_orders_count }}</span></td>
              <td class="px-8 py-5 text-center text-gray-400 font-bold text-xs">RM{{ Number(row.gross_sales).toFixed(2) }}</td>
              <td class="px-8 py-5 text-center text-orange-600 font-black text-sm italic">RM{{ Number(row.net_sales).toFixed(2) }}</td>
              <td class="px-8 py-5 text-right font-black text-xs text-gray-900 dark:text-white">{{ row.total_cups_sold }} <span class="text-[7px] text-gray-400 uppercase tracking-widest ml-1">cups</span></td>
            </tr>
          </tbody>
          <tfoot v-if="filteredWeeklyData.length > 0" class="bg-gray-50/50 dark:bg-gray-950/50 border-t-2 border-gray-100 dark:border-gray-800">
            <tr class="font-black text-gray-900 dark:text-white uppercase italic">
              <td class="px-8 py-5 text-[10px] tracking-widest">Total</td>
              <td class="px-8 py-5 text-center text-xs underline decoration-gray-200 underline-offset-4">{{ weeklyTotals.orders }}</td>
              <td class="px-8 py-5 text-center text-xs">RM{{ weeklyTotals.gross.toFixed(2) }}</td>
              <td class="px-8 py-5 text-center text-orange-600 text-sm">RM{{ weeklyTotals.net.toFixed(2) }}</td>
              <td class="px-8 py-5 text-right text-xs">{{ weeklyTotals.cups }} <span class="text-[7px] text-gray-400 uppercase tracking-widest ml-1">cups</span></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </main>
  </div>
</template>
