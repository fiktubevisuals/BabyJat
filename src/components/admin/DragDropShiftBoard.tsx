import React, { useState, useEffect } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export interface StaffProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  commissionRateService: number;
  commissionRateRetail: number;
  workingDays: string[];
  shiftStart: string;
  shiftEnd: string;
  assignedServices: string[];
  activeShift?: boolean;
  payoutStatus?: 'pending' | 'paid';
  shiftsByDay?: Record<string, { start: string; end: string; type: 'full' | 'morning' | 'evening' | 'custom' | 'off'; note?: string }>;
}

interface DragDropShiftBoardProps {
  staffList: StaffProfile[];
  onUpdateStaff?: () => void;
}

export interface ShiftTemplate {
  id: string;
  label: string;
  type: 'morning' | 'full' | 'evening' | 'custom' | 'off';
  start: string;
  end: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  icon: string;
}

const SHIFT_TEMPLATES: ShiftTemplate[] = [
  {
    id: 'full_day',
    label: 'Full Day Luxury',
    type: 'full',
    start: '09:00',
    end: '18:00',
    color: 'border-primary/40 bg-primary/10 text-primary',
    badgeBg: 'bg-primary text-on-primary',
    badgeText: '09:00 - 18:00 (9h)',
    icon: 'wb_sunny'
  },
  {
    id: 'morning_shift',
    label: 'Morning Glam',
    type: 'morning',
    start: '08:00',
    end: '14:00',
    color: 'border-amber-400/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    badgeBg: 'bg-amber-500 text-white',
    badgeText: '08:00 - 14:00 (6h)',
    icon: 'wb_twilight'
  },
  {
    id: 'evening_shift',
    label: 'Evening Gala',
    type: 'evening',
    start: '13:00',
    end: '20:00',
    color: 'border-purple-400/40 bg-purple-500/10 text-purple-700 dark:text-purple-300',
    badgeBg: 'bg-purple-600 text-white',
    badgeText: '13:00 - 20:00 (7h)',
    icon: 'bedtime'
  },
  {
    id: 'vip_late',
    label: 'VIP Late Night',
    type: 'custom',
    start: '12:00',
    end: '21:00',
    color: 'border-rose-400/40 bg-rose-500/10 text-rose-700 dark:text-rose-300',
    badgeBg: 'bg-rose-600 text-white',
    badgeText: '12:00 - 21:00 (9h)',
    icon: 'auto_awesome'
  },
  {
    id: 'off_duty',
    label: 'Off Duty (Rest)',
    type: 'off',
    start: '00:00',
    end: '00:00',
    color: 'border-outline/20 bg-surface-container text-secondary',
    badgeBg: 'bg-gray-400 text-white',
    badgeText: 'Rest Day',
    icon: 'block'
  }
];

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function DragDropShiftBoard({ staffList }: DragDropShiftBoardProps) {
  // Dragged shift preset item or dragged shift block
  const [draggedPreset, setDraggedPreset] = useState<ShiftTemplate | null>(null);
  const [draggedShiftSource, setDraggedShiftSource] = useState<{ staffId: string; day: string } | null>(null);
  const [dropTarget, setDropTarget] = useState<{ staffId: string; day: string } | null>(null);

  // Modal for fine-tuning specific shift cell
  const [editCell, setEditCell] = useState<{ staffId: string; day: string; start: string; end: string; type: string; note: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // Active week selection
  const [weekOffset, setWeekOffset] = useState(0);

  // Helper to get formatted week date range
  const getWeekRange = () => {
    const today = new Date();
    const curr = new Date(today.setDate(today.getDate() - today.getDay() + 1 + weekOffset * 7));
    const firstDay = new Date(curr);
    const lastDay = new Date(curr.setDate(curr.getDate() + 6));
    
    return {
      startStr: firstDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      endStr: lastDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };
  };

  // Get staff shift details for a given day
  const getStaffDayShift = (staff: StaffProfile, day: string) => {
    if (staff.shiftsByDay && staff.shiftsByDay[day]) {
      return staff.shiftsByDay[day];
    }
    // Fallback based on workingDays & standard shiftStart/End
    if (staff.workingDays.includes(day)) {
      return {
        start: staff.shiftStart || '09:00',
        end: staff.shiftEnd || '18:00',
        type: 'full' as const,
        note: ''
      };
    }
    return {
      start: '00:00',
      end: '00:00',
      type: 'off' as const,
      note: ''
    };
  };

  // Calculate hours between start and end
  const calculateHours = (start: string, end: string) => {
    if (start === '00:00' && end === '00:00') return 0;
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
    return Math.max(0, Math.round((diff / 60) * 10) / 10);
  };

  // Compute daily coverage metrics
  const getDayCoverageStats = (day: string) => {
    let count = 0;
    let totalHours = 0;
    staffList.forEach(s => {
      const shift = getStaffDayShift(s, day);
      if (shift.type !== 'off') {
        count++;
        totalHours += calculateHours(shift.start, shift.end);
      }
    });

    let status: 'optimal' | 'low' | 'understaffed' = 'optimal';
    if (count === 0) status = 'understaffed';
    else if (count < 2) status = 'low';

    return { count, totalHours, status };
  };

  // Total weekly scheduled hours across all staff
  const totalWeeklyHours = DAYS_OF_WEEK.reduce((total, day) => {
    return total + getDayCoverageStats(day).totalHours;
  }, 0);

  // Assign shift template to staff member for a day
  const assignShiftToStaff = async (staffId: string, day: string, template: ShiftTemplate | { start: string; end: string; type: any; note?: string }) => {
    const staff = staffList.find(s => s.id === staffId);
    if (!staff) return;

    const existingShifts = staff.shiftsByDay || {};
    const newShift = {
      start: template.start,
      end: template.end,
      type: template.type as any,
      note: (template as any).note || ''
    };

    const updatedShifts = {
      ...existingShifts,
      [day]: newShift
    };

    // Recalculate workingDays
    const updatedWorkingDays = DAYS_OF_WEEK.filter(d => {
      const s = updatedShifts[d] || getStaffDayShift(staff, d);
      return s.type !== 'off';
    });

    try {
      setSaving(true);
      await setDoc(doc(db, 'staff', staffId), {
        shiftsByDay: updatedShifts,
        workingDays: updatedWorkingDays,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.error("Error saving shift assignment:", err);
      alert("Failed to update shift assignment in database.");
    } finally {
      setSaving(false);
    }
  };

  // Handle Drag Start from Preset Palette
  const handlePresetDragStart = (e: React.DragEvent, template: ShiftTemplate) => {
    setDraggedPreset(template);
    setDraggedShiftSource(null);
    e.dataTransfer.setData('text/plain', template.id);
    e.dataTransfer.effectAllowed = 'copy';
  };

  // Handle Drag Start from existing cell block
  const handleCellDragStart = (e: React.DragEvent, staffId: string, day: string) => {
    setDraggedPreset(null);
    setDraggedShiftSource({ staffId, day });
    e.dataTransfer.setData('text/plain', `${staffId}:${day}`);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, staffId: string, day: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = draggedPreset ? 'copy' : 'move';
    if (!dropTarget || dropTarget.staffId !== staffId || dropTarget.day !== day) {
      setDropTarget({ staffId, day });
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStaffId: string, targetDay: string) => {
    e.preventDefault();
    setDropTarget(null);

    // Case 1: Dragged from Shift Preset Palette
    if (draggedPreset) {
      await assignShiftToStaff(targetStaffId, targetDay, draggedPreset);
      setDraggedPreset(null);
      return;
    }

    // Case 2: Dragged from another cell block
    if (draggedShiftSource) {
      const sourceStaff = staffList.find(s => s.id === draggedShiftSource.staffId);
      if (sourceStaff) {
        const sourceShift = getStaffDayShift(sourceStaff, draggedShiftSource.day);
        
        // Assign shift to target cell
        await assignShiftToStaff(targetStaffId, targetDay, sourceShift);

        // If moved to a different day/staff, set original source cell to OFF
        if (draggedShiftSource.staffId !== targetStaffId || draggedShiftSource.day !== targetDay) {
          const offPreset = SHIFT_TEMPLATES.find(t => t.type === 'off')!;
          await assignShiftToStaff(draggedShiftSource.staffId, draggedShiftSource.day, offPreset);
        }
      }
      setDraggedShiftSource(null);
    }
  };

  // Quick Preset Actions
  const handleAutoFillStandardWeek = async (staffId: string) => {
    if (!window.confirm("Auto-fill standard 9:00 - 18:00 weekday shifts for this staff member?")) return;
    const fullDay = SHIFT_TEMPLATES.find(t => t.id === 'full_day')!;
    const offDay = SHIFT_TEMPLATES.find(t => t.id === 'off_duty')!;

    for (const day of DAYS_OF_WEEK) {
      if (day === 'Sat' || day === 'Sun') {
        await assignShiftToStaff(staffId, day, offDay);
      } else {
        await assignShiftToStaff(staffId, day, fullDay);
      }
    }
  };

  const handleClearStaffShifts = async (staffId: string) => {
    if (!window.confirm("Clear all shifts for this staff member this week?")) return;
    const offDay = SHIFT_TEMPLATES.find(t => t.id === 'off_duty')!;
    for (const day of DAYS_OF_WEEK) {
      await assignShiftToStaff(staffId, day, offDay);
    }
  };

  const weekRange = getWeekRange();

  return (
    <div className="space-y-6">
      {/* HEADER BAR & COVERAGE STATS */}
      <div className="bg-surface-container-lowest border border-outline/10 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">calendar_view_week</span>
              <h3 className="font-headline-md text-base text-on-surface">Interactive Weekly Shift Planner</h3>
            </div>
            <p className="text-xs text-secondary mt-0.5">
              Drag shift templates or move shift blocks directly onto staff rows to assign working hours &amp; balance coverage.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Week Navigator */}
            <div className="flex items-center bg-surface border border-outline/20 rounded-xl p-1 shadow-xs">
              <button
                onClick={() => setWeekOffset(prev => prev - 1)}
                className="p-1.5 hover:bg-surface-container rounded-lg text-secondary hover:text-on-surface transition-colors"
                title="Previous Week"
              >
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>
              <span className="px-3 text-xs font-bold font-mono text-on-surface">
                {weekRange.startStr} - {weekRange.endStr}
              </span>
              <button
                onClick={() => setWeekOffset(prev => prev + 1)}
                className="p-1.5 hover:bg-surface-container rounded-lg text-secondary hover:text-on-surface transition-colors"
                title="Next Week"
              >
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>

            {weekOffset !== 0 && (
              <button
                onClick={() => setWeekOffset(0)}
                className="px-3 py-1.5 bg-surface-variant text-on-surface text-xs font-label-caps rounded-xl hover:bg-surface-container transition-colors"
              >
                Current Week
              </button>
            )}

            <div className="flex items-center gap-2 bg-primary/10 text-primary px-3.5 py-1.5 rounded-xl border border-primary/20">
              <span className="material-symbols-outlined text-sm">schedule</span>
              <span className="text-xs font-bold font-mono">{totalWeeklyHours} hrs Scheduled</span>
            </div>
          </div>
        </div>

        {/* DRAGGABLE SHIFT PALETTE */}
        <div className="pt-3 border-t border-outline/10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-label-caps text-secondary font-bold uppercase tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">drag_indicator</span>
              Drag &amp; Drop Shift Templates:
            </span>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {SHIFT_TEMPLATES.map((template) => (
              <div
                key={template.id}
                draggable
                onDragStart={(e) => handlePresetDragStart(e, template)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-grab active:cursor-grabbing hover:scale-105 transition-all shadow-xs select-none ${template.color}`}
              >
                <span className="material-symbols-outlined text-sm">{template.icon}</span>
                <div className="text-left">
                  <div className="text-xs font-bold leading-tight">{template.label}</div>
                  <div className="text-[10px] opacity-80 font-mono">{template.badgeText}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* DRAG AND DROP WEEKLY MATRIX GRID */}
      <div className="bg-surface-container-lowest border border-outline/10 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[980px]">
            {/* TABLE HEADER WITH DAY COVERAGE METRICS */}
            <thead>
              <tr className="bg-surface-container-low border-b border-outline/10">
                <th className="p-4 w-52 text-xs font-label-caps text-secondary font-bold">
                  Staff Member / Role
                </th>
                {DAYS_OF_WEEK.map((day) => {
                  const stats = getDayCoverageStats(day);
                  return (
                    <th key={day} className="p-3 text-center border-l border-outline/10 font-normal">
                      <div className="font-bold text-xs text-on-surface uppercase tracking-wider">{day}</div>
                      <div className="mt-1 flex flex-col items-center gap-1">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                            stats.status === 'optimal'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                              : stats.status === 'low'
                              ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {stats.count} Stylist{stats.count !== 1 ? 's' : ''}
                        </span>
                        <span className="text-[10px] text-secondary font-mono">{stats.totalHours} hrs</span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* TABLE BODY: STAFF ROWS */}
            <tbody className="divide-y divide-outline/10 text-sm">
              {staffList.map((staff) => (
                <tr key={staff.id} className="hover:bg-surface-container-low/30 transition-colors">
                  {/* STAFF INFO CELL */}
                  <td className="p-4 bg-surface-container-lowest/80">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm border border-primary/20 shrink-0">
                        {staff.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-on-surface truncate text-xs">{staff.name}</div>
                        <div className="text-[11px] text-secondary truncate">{staff.role}</div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <button
                            onClick={() => handleAutoFillStandardWeek(staff.id)}
                            className="text-[10px] text-primary hover:underline font-label-caps"
                            title="Fill Mon-Fri 9-6"
                          >
                            + Weekday 9-6
                          </button>
                          <span className="text-secondary/40">•</span>
                          <button
                            onClick={() => handleClearStaffShifts(staff.id)}
                            className="text-[10px] text-error/80 hover:underline font-label-caps"
                            title="Clear all shifts"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* DAYS COLUMNS CELLS */}
                  {DAYS_OF_WEEK.map((day) => {
                    const shift = getStaffDayShift(staff, day);
                    const isOff = shift.type === 'off';
                    const hrs = calculateHours(shift.start, shift.end);
                    const isDropTarget = dropTarget?.staffId === staff.id && dropTarget?.day === day;

                    // Match template style or custom
                    const matchedTemplate = SHIFT_TEMPLATES.find(t => t.type === shift.type) || SHIFT_TEMPLATES[0];

                    return (
                      <td
                        key={day}
                        onDragOver={(e) => handleDragOver(e, staff.id, day)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, staff.id, day)}
                        className={`p-2 border-l border-outline/10 text-center relative transition-all align-middle ${
                          isDropTarget ? 'bg-primary/20 ring-2 ring-primary ring-inset scale-[0.98]' : ''
                        }`}
                      >
                        {isOff ? (
                          /* OFF DUTY CELL */
                          <div
                            draggable
                            onDragStart={(e) => handleCellDragStart(e, staff.id, day)}
                            onClick={() => setEditCell({ staffId: staff.id, day, start: '09:00', end: '18:00', type: 'full', note: shift.note || '' })}
                            className="h-16 rounded-xl border border-dashed border-outline/20 bg-surface-container/40 flex flex-col items-center justify-center text-secondary/60 cursor-pointer hover:border-primary/40 hover:bg-surface-container/80 transition-all group select-none"
                          >
                            <span className="material-symbols-outlined text-xs group-hover:text-primary transition-colors">add_circle_outline</span>
                            <span className="text-[10px] font-label-caps mt-0.5">Off Duty</span>
                          </div>
                        ) : (
                          /* ACTIVE SHIFT BLOCK */
                          <div
                            draggable
                            onDragStart={(e) => handleCellDragStart(e, staff.id, day)}
                            onClick={() => setEditCell({ staffId: staff.id, day, start: shift.start, end: shift.end, type: shift.type, note: shift.note || '' })}
                            className={`h-16 rounded-xl border p-2 flex flex-col justify-between cursor-grab active:cursor-grabbing hover:shadow-md hover:scale-[1.02] transition-all text-left relative overflow-hidden select-none ${matchedTemplate.color}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase font-label-caps truncate flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">{matchedTemplate.icon}</span>
                                {matchedTemplate.label}
                              </span>
                              <span className="text-[10px] font-mono font-bold bg-surface/80 px-1.5 py-0.5 rounded text-on-surface">
                                {hrs}h
                              </span>
                            </div>

                            <div className="text-[11px] font-bold font-mono tracking-tight flex items-center justify-between">
                              <span>{shift.start} - {shift.end}</span>
                              <span className="material-symbols-outlined text-xs opacity-60">edit</span>
                            </div>

                            {shift.note && (
                              <div className="text-[9px] truncate opacity-80 italic border-t border-current/10 pt-0.5">
                                {shift.note}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* BOTTOM INSTRUCTION FOOTER */}
        <div className="bg-surface-container-low p-3.5 border-t border-outline/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-secondary">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-sm">touch_app</span>
            <span>Tip: Drag any shift preset card from the top palette directly into a day slot, or click a cell to edit exact hours.</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Optimal Coverage
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Low Coverage
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Understaffed
            </span>
          </div>
        </div>
      </div>

      {/* SHIFT CUSTOM EDIT MODAL */}
      {editCell && (() => {
        const staff = staffList.find(s => s.id === editCell.staffId);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md p-6 border border-outline/10">
              <div className="flex justify-between items-center mb-4 border-b border-outline/10 pb-3">
                <div>
                  <h3 className="font-headline-md text-base text-on-surface">
                    Shift Details: {staff?.name}
                  </h3>
                  <p className="text-xs text-secondary font-mono">{editCell.day} Shift Configuration</p>
                </div>
                <button onClick={() => setEditCell(null)} className="text-secondary hover:text-on-surface">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-label-caps text-secondary mb-1">Shift Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {SHIFT_TEMPLATES.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setEditCell({ ...editCell, type: t.type, start: t.start, end: t.end })}
                        className={`p-2.5 rounded-xl border text-xs text-left font-label-caps transition-all ${
                          editCell.type === t.type ? 'border-primary bg-primary/10 text-primary font-bold ring-1 ring-primary' : 'border-outline/20 bg-surface'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm">{t.icon}</span>
                          <span>{t.label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-label-caps text-secondary mb-1">Start Time</label>
                    <input
                      type="time"
                      value={editCell.start}
                      onChange={(e) => setEditCell({ ...editCell, start: e.target.value })}
                      className="w-full p-2.5 border border-outline/20 rounded-xl bg-surface text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-label-caps text-secondary mb-1">End Time</label>
                    <input
                      type="time"
                      value={editCell.end}
                      onChange={(e) => setEditCell({ ...editCell, end: e.target.value })}
                      className="w-full p-2.5 border border-outline/20 rounded-xl bg-surface text-sm font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-label-caps text-secondary mb-1">Shift Notes / Station</label>
                  <input
                    type="text"
                    value={editCell.note}
                    onChange={(e) => setEditCell({ ...editCell, note: e.target.value })}
                    placeholder="e.g. Station 1 • Balayage Specialist"
                    className="w-full p-2.5 border border-outline/20 rounded-xl bg-surface text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center mt-6 pt-4 border-t border-outline/10">
                <button
                  type="button"
                  onClick={async () => {
                    const offPreset = SHIFT_TEMPLATES.find(t => t.type === 'off')!;
                    await assignShiftToStaff(editCell.staffId, editCell.day, offPreset);
                    setEditCell(null);
                  }}
                  className="px-3.5 py-2 text-error hover:bg-error-container/20 rounded-xl text-xs font-label-caps flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">delete</span> Clear / Off
                </button>

                <div className="flex gap-2">
                  <button onClick={() => setEditCell(null)} className="px-4 py-2 text-secondary text-xs font-label-caps">
                    Cancel
                  </button>
                  <button
                    disabled={saving}
                    onClick={async () => {
                      await assignShiftToStaff(editCell.staffId, editCell.day, {
                        start: editCell.start,
                        end: editCell.end,
                        type: editCell.type,
                        note: editCell.note
                      });
                      setEditCell(null);
                    }}
                    className="px-5 py-2 bg-primary text-on-primary rounded-xl text-xs font-label-caps font-bold shadow-md hover:opacity-90 transition-opacity"
                  >
                    Save Shift
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
