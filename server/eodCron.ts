import { dispatchDailyEODSettlement, compileDailyEODReport, EODReportData } from './eodSettlementService';

export interface EODCronStats {
  lastRunAt: string | null;
  lastReportDate: string | null;
  scheduledTime: string; // "20:30"
  isRunning: boolean;
  lastSummary?: {
    grossRevenue: number;
    cashCollected: number;
    pesapalMobileMoney: number;
    completedAppointments: number;
    lowStockCount: number;
  };
}

let eodCronStats: EODCronStats = {
  lastRunAt: null,
  lastReportDate: null,
  scheduledTime: '20:30',
  isRunning: false
};

let eodCronTimerId: NodeJS.Timeout | null = null;

/**
 * Checks if the current time has reached or passed 20:30 and triggers today's EOD settlement if not already executed
 */
export async function checkAndExecuteEODSchedule() {
  if (eodCronStats.isRunning) return;

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const todayStr = now.toISOString().split('T')[0];

  // Target time: 20:30 (8:30 PM) or later
  const isTimeForEOD = currentHour > 20 || (currentHour === 20 && currentMinute >= 30);

  if (isTimeForEOD && eodCronStats.lastReportDate !== todayStr) {
    console.log(`[EOD Cron] Current time is ${currentHour}:${currentMinute} (>= 20:30). Triggering automated EOD Settlement for ${todayStr}...`);
    eodCronStats.isRunning = true;

    try {
      const report = await dispatchDailyEODSettlement(todayStr);
      eodCronStats.lastRunAt = new Date().toISOString();
      eodCronStats.lastReportDate = todayStr;
      eodCronStats.lastSummary = {
        grossRevenue: report.financials.grossRevenue,
        cashCollected: report.financials.cashCollected,
        pesapalMobileMoney: report.financials.pesapalMobileMoney,
        completedAppointments: report.appointments.completed,
        lowStockCount: report.inventoryWarnings.length
      };
      console.log(`[EOD Cron] Successfully compiled and dispatched 20:30 EOD Settlement! Total Gross: UGX ${report.financials.grossRevenue.toLocaleString()}`);
    } catch (err) {
      console.error('[EOD Cron] Error executing automated 20:30 EOD settlement:', err);
    } finally {
      eodCronStats.isRunning = false;
    }
  }
}

/**
 * Starts the recurring 20:30 EOD cron check loop (runs check every 5 minutes)
 */
export function startEODCron(checkIntervalMinutes: number = 5) {
  if (eodCronTimerId) {
    clearInterval(eodCronTimerId);
  }

  console.log(`[EOD Cron] Automated 20:30 EOD Settlement worker active (checking every ${checkIntervalMinutes}m)...`);

  // Initial check 8 seconds after boot
  setTimeout(() => {
    checkAndExecuteEODSchedule().catch(err => console.error('[EOD Cron] Initial check note:', err));
  }, 8000);

  // Interval check
  eodCronTimerId = setInterval(() => {
    checkAndExecuteEODSchedule().catch(err => console.error('[EOD Cron] Interval check note:', err));
  }, checkIntervalMinutes * 60 * 1000);
}

/**
 * Returns current EOD cron status
 */
export function getEODCronStats(): EODCronStats {
  return { ...eodCronStats };
}
