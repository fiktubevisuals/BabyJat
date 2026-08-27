import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, getDocs, query, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { DragDropShiftBoard } from '../../components/admin/DragDropShiftBoard';

interface StaffProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  commissionRateService: number; // e.g. 15 for 15%
  commissionRateRetail: number;  // e.g. 10 for 10%
  workingDays: string[];        // ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  shiftStart: string;           // '09:00'
  shiftEnd: string;             // '18:00'
  assignedServices: string[];   // service IDs or names
  activeShift?: boolean;
  payoutStatus?: 'pending' | 'paid';
  shiftsByDay?: Record<string, { start: string; end: string; type: 'full' | 'morning' | 'evening' | 'custom' | 'off'; note?: string }>;
}

export default function StaffManager() {
  const [activeTab, setActiveTab] = useState<'planner' | 'roster' | 'commissions'>('planner');
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [servicesList, setServicesList] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedStaff, setSelectedStaff] = useState<StaffProfile | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [analyticsModalStaff, setAnalyticsModalStaff] = useState<StaffProfile | null>(null);
  const [dateRange, setDateRange] = useState<'this_month' | 'last_30' | 'all'>('this_month');

  useEffect(() => {
    // Listen to users with role stylist or admin, cross-referenced with staff collection
    const unsubStaff = onSnapshot(collection(db, 'staff'), async (staffSnap) => {
      const staffMap = new Map<string, any>();
      staffSnap.forEach(d => staffMap.set(d.id, d.data()));

      // Also get users from users collection
      const usersSnap = await getDocs(query(collection(db, 'users')));
      const compiledStaff: StaffProfile[] = [];

      usersSnap.forEach(userDoc => {
        const u = userDoc.data();
        if (u.role === 'stylist' || u.role === 'admin') {
          const extra = staffMap.get(userDoc.id) || {};
          compiledStaff.push({
            id: userDoc.id,
            name: u.displayName || 'Unnamed Staff',
            email: u.email,
            phone: u.phone || '',
            role: u.role,
            commissionRateService: extra.commissionRateService ?? 15,
            commissionRateRetail: extra.commissionRateRetail ?? 10,
            workingDays: extra.workingDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            shiftStart: extra.shiftStart || '09:00',
            shiftEnd: extra.shiftEnd || '18:00',
            assignedServices: extra.assignedServices || [],
            activeShift: extra.activeShift !== undefined ? extra.activeShift : true,
            payoutStatus: extra.payoutStatus || 'pending',
            shiftsByDay: extra.shiftsByDay || undefined
          });
        }
      });

      // Default sample stylists if no custom staff configured yet
      if (compiledStaff.length === 0) {
        compiledStaff.push(
          {
            id: 'sample-elena',
            name: 'Elena Rostova',
            email: 'elena@babyjat.com',
            phone: '+256 700 111222',
            role: 'Master Stylist',
            commissionRateService: 20,
            commissionRateRetail: 15,
            workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            shiftStart: '09:00',
            shiftEnd: '17:00',
            assignedServices: ['Glossy Blowout', 'Honey Balayage'],
            activeShift: true,
            payoutStatus: 'pending'
          },
          {
            id: 'sample-marcus',
            name: 'Marcus Vance',
            email: 'marcus@babyjat.com',
            phone: '+256 700 333444',
            role: 'Color Specialist',
            commissionRateService: 18,
            commissionRateRetail: 10,
            workingDays: ['Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            shiftStart: '10:00',
            shiftEnd: '18:00',
            assignedServices: ['Honey Balayage', 'Precision Cut'],
            activeShift: true,
            payoutStatus: 'pending'
          },
          {
            id: 'sample-sofia',
            name: 'Sofia Chen',
            email: 'sofia@babyjat.com',
            phone: '+256 700 555666',
            role: 'Hair & Treatment Artist',
            commissionRateService: 15,
            commissionRateRetail: 12,
            workingDays: ['Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            shiftStart: '09:00',
            shiftEnd: '18:00',
            assignedServices: ['Glass Hair Treatment', 'Precision Cut'],
            activeShift: true,
            payoutStatus: 'paid'
          }
        );
      }

      setStaffList(compiledStaff);
      setLoading(false);
    }, (err) => {
      console.warn("Staff snapshot ended:", err);
      setLoading(false);
    });

    const unsubServices = onSnapshot(collection(db, 'services'), (snap) => {
      setServicesList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Services snapshot ended:", err));

    const unsubApts = onSnapshot(collection(db, 'appointments'), (snap) => {
      setAppointments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Appointments snapshot ended:", err));

    const unsubOrders = onSnapshot(collection(db, 'orders'), (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Orders snapshot ended:", err));

    return () => {
      unsubStaff();
      unsubServices();
      unsubApts();
      unsubOrders();
    };
  }, []);

  const openEditModal = (staff: StaffProfile) => {
    setSelectedStaff({ ...staff });
    setEditModalOpen(true);
  };

  const handleSaveStaff = async () => {
    if (!selectedStaff) return;
    try {
      await setDoc(doc(db, 'staff', selectedStaff.id), {
        commissionRateService: Number(selectedStaff.commissionRateService),
        commissionRateRetail: Number(selectedStaff.commissionRateRetail),
        workingDays: selectedStaff.workingDays,
        shiftStart: selectedStaff.shiftStart,
        shiftEnd: selectedStaff.shiftEnd,
        assignedServices: selectedStaff.assignedServices,
        activeShift: selectedStaff.activeShift ?? true,
        payoutStatus: selectedStaff.payoutStatus || 'pending',
        updatedAt: serverTimestamp()
      }, { merge: true });

      setEditModalOpen(false);
      alert('Staff shifts & commission settings updated!');
    } catch (err) {
      console.error(err);
      alert('Error updating staff configuration');
    }
  };

  const togglePayoutStatus = async (staff: StaffProfile) => {
    const newStatus = staff.payoutStatus === 'paid' ? 'pending' : 'paid';
    try {
      await setDoc(doc(db, 'staff', staff.id), {
        payoutStatus: newStatus,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.error(err);
    }
  };

  const toggleWorkingDay = (day: string) => {
    if (!selectedStaff) return;
    const current = selectedStaff.workingDays || [];
    const updated = current.includes(day)
      ? current.filter(d => d !== day)
      : [...current, day];
    setSelectedStaff({ ...selectedStaff, workingDays: updated });
  };

  const toggleAssignedService = (serviceName: string) => {
    if (!selectedStaff) return;
    const current = selectedStaff.assignedServices || [];
    const updated = current.includes(serviceName)
      ? current.filter(s => s !== serviceName)
      : [...current, serviceName];
    setSelectedStaff({ ...selectedStaff, assignedServices: updated });
  };

  // Commission & Detailed Analytics Calculations
  const calculateCommission = (staffId: string) => {
    const staff = staffList.find(s => s.id === staffId);
    if (!staff) return { serviceRev: 0, retailRev: 0, totalCommission: 0, totalCount: 0, completedCount: 0, completionRate: 0, avgTicket: 0, topServices: [] as { name: string; count: number }[] };

    // Appointments assigned to staff
    const staffApts = appointments.filter(a => a.stylistId === staffId || a.stylistId === `stylist_${staffId}` || a.stylistId === 'any');
    const completedApts = staffApts.filter(a => a.status === 'completed' || a.status === 'confirmed');
    
    const serviceRev = completedApts.reduce((sum, a) => sum + (Number(a.price) || 0), 0);

    // Orders processed
    const staffOrders = orders.filter(o => o.clientId === staffId || o.stylistId === staffId || o.status === 'paid');
    const retailRev = staffOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0) * 0.2; // 20% estimated retail attributed

    const serviceComm = (serviceRev * (staff.commissionRateService || 15)) / 100;
    const retailComm = (retailRev * (staff.commissionRateRetail || 10)) / 100;

    const completionRate = staffApts.length > 0 ? Math.round((completedApts.length / staffApts.length) * 100) : 100;
    const avgTicket = completedApts.length > 0 ? Math.round(serviceRev / completedApts.length) : 0;

    // Calculate top services for this staff member
    const serviceCounts: Record<string, number> = {};
    completedApts.forEach(a => {
      const sName = a.serviceName || 'General Styling';
      serviceCounts[sName] = (serviceCounts[sName] || 0) + 1;
    });

    const topServices = Object.entries(serviceCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return {
      serviceRev,
      retailRev,
      totalCommission: serviceComm + retailComm,
      totalCount: staffApts.length,
      completedCount: completedApts.length,
      completionRate,
      avgTicket,
      topServices
    };
  };

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="p-margin-mobile md:p-margin-desktop max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">Staff & Scheduling</h2>
          <p className="font-body-md text-sm text-secondary mt-1">Manage staff shifts, working hours, service assignments & commission payroll analytics</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 sm:gap-4 mb-6 border-b border-outline/10 overflow-x-auto">
        <button
          onClick={() => setActiveTab('planner')}
          className={`pb-3 px-3 font-label-caps text-sm border-b-2 transition-colors flex items-center gap-2 shrink-0 ${
            activeTab === 'planner' ? 'border-primary text-primary font-bold' : 'border-transparent text-secondary hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-sm">drag_indicator</span>
          Visual Shift Planner (Drag &amp; Drop)
        </button>
        <button
          onClick={() => setActiveTab('roster')}
          className={`pb-3 px-3 font-label-caps text-sm border-b-2 transition-colors flex items-center gap-2 shrink-0 ${
            activeTab === 'roster' ? 'border-primary text-primary font-bold' : 'border-transparent text-secondary hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-sm">badge</span>
          Roster &amp; Profiles
        </button>
        <button
          onClick={() => setActiveTab('commissions')}
          className={`pb-3 px-3 font-label-caps text-sm border-b-2 transition-colors flex items-center gap-2 shrink-0 ${
            activeTab === 'commissions' ? 'border-primary text-primary font-bold' : 'border-transparent text-secondary hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-sm">payments</span>
          Performance &amp; Commissions
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-secondary">Loading staff management data...</div>
      ) : activeTab === 'planner' ? (
        /* Drag and Drop Visual Shift Planner */
        <DragDropShiftBoard staffList={staffList} />
      ) : activeTab === 'roster' ? (
        /* Roster & Shifts Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {staffList.map((staff) => (
            <div key={staff.id} className="bg-surface-container-lowest border border-outline/10 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary-container text-on-primary-container font-bold flex items-center justify-center text-lg shadow-sm">
                      {staff.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-headline-md text-base text-on-surface">{staff.name}</h3>
                      <p className="text-xs text-secondary capitalize">{staff.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setAnalyticsModalStaff(staff)}
                      className="p-2 text-secondary hover:text-primary hover:bg-surface-variant rounded-full transition-colors"
                      title="View Performance Analytics"
                    >
                      <span className="material-symbols-outlined text-sm">analytics</span>
                    </button>
                    <button
                      onClick={() => openEditModal(staff)}
                      className="p-2 text-primary hover:bg-surface-variant rounded-full transition-colors"
                      title="Edit Shifts & Services"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-3 border-t border-outline/10 pt-4 text-xs text-secondary">
                  <div className="flex justify-between items-center">
                    <span className="font-label-caps">Shift Status:</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      staff.activeShift !== false ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {staff.activeShift !== false ? 'On Shift Today' : 'Off Duty'}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="font-label-caps">Shift Hours:</span>
                    <span className="font-bold text-on-surface">{staff.shiftStart} - {staff.shiftEnd}</span>
                  </div>

                  <div>
                    <span className="font-label-caps block mb-1">Working Days:</span>
                    <div className="flex flex-wrap gap-1">
                      {daysOfWeek.map(day => (
                        <span
                          key={day}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            staff.workingDays.includes(day)
                              ? 'bg-primary/10 text-primary border border-primary/20'
                              : 'bg-surface-container text-secondary/40'
                          }`}
                        >
                          {day}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <span className="font-label-caps">Service Commission:</span>
                    <span className="font-bold text-primary">{staff.commissionRateService}%</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="font-label-caps">Retail Commission:</span>
                    <span className="font-bold text-tertiary">{staff.commissionRateRetail}%</span>
                  </div>

                  <div>
                    <span className="font-label-caps block mb-1">Assigned Capabilities:</span>
                    {staff.assignedServices.length === 0 ? (
                      <span className="italic text-secondary/60">All salon services</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {staff.assignedServices.map(srv => (
                          <span key={srv} className="bg-surface-variant text-on-surface-variant px-2 py-0.5 rounded text-[10px]">
                            {srv}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => openEditModal(staff)}
                  className="flex-1 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface font-label-caps text-xs rounded-xl transition-colors border border-outline/10"
                >
                  Configure Shifts
                </button>
                <button
                  onClick={() => setAnalyticsModalStaff(staff)}
                  className="px-3 py-2 bg-primary/10 text-primary hover:bg-primary/20 font-label-caps text-xs rounded-xl transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">monitoring</span> Analytics
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Commission Tracking Tab */
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-surface-container-lowest p-4 rounded-xl border border-outline/10">
            <div>
              <h3 className="font-headline-md text-base">Commission & Payroll Summary</h3>
              <p className="text-xs text-secondary">Automatic calculation of service + retail commissions earned by staff</p>
            </div>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="bg-surface border border-outline/20 rounded-lg px-3 py-2 text-xs font-label-caps"
            >
              <option value="this_month">This Month</option>
              <option value="last_30">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline/10 text-xs font-label-caps text-secondary">
                    <th className="p-4 font-normal">Staff Member</th>
                    <th className="p-4 font-normal text-center">Completed Sessions</th>
                    <th className="p-4 font-normal text-right">Service Revenue</th>
                    <th className="p-4 font-normal text-right">Retail Attributed</th>
                    <th className="p-4 font-normal text-center">Comm. Rates</th>
                    <th className="p-4 font-normal text-right">Payout Earned</th>
                    <th className="p-4 font-normal text-center">Payout Status</th>
                    <th className="p-4 font-normal text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="font-body-md text-sm divide-y divide-outline/5">
                  {staffList.map(staff => {
                    const stats = calculateCommission(staff.id);
                    return (
                      <tr key={staff.id} className="hover:bg-surface-container-low/50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container font-bold flex items-center justify-center text-xs">
                              {staff.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-on-surface">{staff.name}</p>
                              <p className="text-xs text-secondary">{staff.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className="px-2.5 py-1 bg-surface-variant rounded-full text-xs font-bold">
                            {stats.completedCount} / {stats.totalCount} sessions
                          </span>
                        </td>
                        <td className="p-4 text-right font-medium">UGX {stats.serviceRev.toLocaleString()}</td>
                        <td className="p-4 text-right text-secondary">UGX {stats.retailRev.toLocaleString()}</td>
                        <td className="p-4 text-center text-xs text-secondary">
                          {staff.commissionRateService}% Srv / {staff.commissionRateRetail}% Rtl
                        </td>
                        <td className="p-4 text-right">
                          <span className="font-headline-md text-primary font-bold text-base">
                            UGX {Math.round(stats.totalCommission).toLocaleString()}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => togglePayoutStatus(staff)}
                            className={`px-3 py-1 rounded-full text-xs font-label-caps border transition-colors ${
                              staff.payoutStatus === 'paid'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                            }`}
                          >
                            {staff.payoutStatus === 'paid' ? 'Paid ✓' : 'Pending Payout'}
                          </button>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setAnalyticsModalStaff(staff)}
                            className="p-1.5 text-secondary hover:text-primary transition-colors"
                            title="Detailed Employee Analytics"
                          >
                            <span className="material-symbols-outlined text-sm">monitoring</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Employee Performance Analytics */}
      {analyticsModalStaff && (() => {
        const stats = calculateCommission(analyticsModalStaff.id);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-surface rounded-2xl shadow-xl w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b border-outline/10 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary-container text-on-primary-container font-bold flex items-center justify-center text-lg">
                    {analyticsModalStaff.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-headline-md text-lg">{analyticsModalStaff.name} Performance Analytics</h3>
                    <p className="text-xs text-secondary">{analyticsModalStaff.role} • {analyticsModalStaff.email}</p>
                  </div>
                </div>
                <button onClick={() => setAnalyticsModalStaff(null)} className="text-secondary hover:text-on-surface">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* KPI Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline/10">
                  <span className="text-[10px] font-label-caps text-secondary block mb-1">Total Revenue Attributed</span>
                  <span className="font-headline-md text-base text-primary font-bold">UGX {(stats.serviceRev + stats.retailRev).toLocaleString()}</span>
                </div>
                <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline/10">
                  <span className="text-[10px] font-label-caps text-secondary block mb-1">Commission Earned</span>
                  <span className="font-headline-md text-base text-emerald-700 font-bold">UGX {Math.round(stats.totalCommission).toLocaleString()}</span>
                </div>
                <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline/10">
                  <span className="text-[10px] font-label-caps text-secondary block mb-1">Avg Ticket Size</span>
                  <span className="font-headline-md text-base text-on-surface font-bold">UGX {stats.avgTicket.toLocaleString()}</span>
                </div>
                <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline/10">
                  <span className="text-[10px] font-label-caps text-secondary block mb-1">Completed Sessions</span>
                  <span className="font-headline-md text-base text-on-surface font-bold">{stats.completedCount}</span>
                </div>
                <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline/10">
                  <span className="text-[10px] font-label-caps text-secondary block mb-1">Completion Rate</span>
                  <span className="font-headline-md text-base text-on-surface font-bold">{stats.completionRate}%</span>
                </div>
                <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline/10">
                  <span className="text-[10px] font-label-caps text-secondary block mb-1">Performance Rating</span>
                  <span className="font-headline-md text-base text-amber-600 font-bold flex items-center gap-1">
                    4.9 <span className="material-symbols-outlined text-xs">star</span>
                  </span>
                </div>
              </div>

              {/* Top Performed Services */}
              <div className="mb-6 space-y-2">
                <h4 className="font-label-caps text-xs text-secondary">Top Performed Services</h4>
                {stats.topServices.length === 0 ? (
                  <p className="text-xs text-secondary italic">No completed service records yet for this period.</p>
                ) : (
                  <div className="space-y-2">
                    {stats.topServices.map((srv, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2.5 bg-surface-container-lowest rounded-lg border border-outline/10 text-xs">
                        <span className="font-medium text-on-surface">{srv.name}</span>
                        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">{srv.count} sessions</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t border-outline/10">
                <button onClick={() => setAnalyticsModalStaff(null)} className="px-5 py-2 bg-primary text-on-primary rounded-xl text-xs font-label-caps">
                  Close Analytics
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal for editing staff shifts & capabilities */}
      {editModalOpen && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="font-headline-md text-lg mb-1">Configure {selectedStaff.name}</h3>
            <p className="text-xs text-secondary mb-6">Set working days, shift hours, commission rates and skills.</p>

            <div className="space-y-4">
              {/* Active Shift Toggle */}
              <div className="flex items-center justify-between p-3 bg-surface-container-lowest rounded-xl border border-outline/10">
                <div>
                  <span className="font-label-caps text-xs text-on-surface block font-bold">Active Shift Availability</span>
                  <span className="text-[11px] text-secondary">Enable or disable roster availability for booking</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStaff({ ...selectedStaff, activeShift: selectedStaff.activeShift === false ? true : false })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-label-caps border transition-colors ${
                    selectedStaff.activeShift !== false ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-gray-200 text-gray-700 border-gray-300'
                  }`}
                >
                  {selectedStaff.activeShift !== false ? 'Active On Shift' : 'Off Shift'}
                </button>
              </div>

              {/* Working Days */}
              <div>
                <label className="block text-xs font-label-caps text-secondary mb-2">Working Days</label>
                <div className="flex flex-wrap gap-2">
                  {daysOfWeek.map(day => {
                    const isSelected = selectedStaff.workingDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleWorkingDay(day)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-label-caps border transition-colors ${
                          isSelected
                            ? 'bg-primary text-on-primary border-primary'
                            : 'bg-surface-container border-outline/20 text-secondary'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Shift Hours */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-label-caps text-secondary mb-1">Shift Start Time</label>
                  <input
                    type="time"
                    value={selectedStaff.shiftStart}
                    onChange={e => setSelectedStaff({ ...selectedStaff, shiftStart: e.target.value })}
                    className="w-full p-2 border border-outline/20 rounded-lg text-sm bg-surface"
                  />
                </div>
                <div>
                  <label className="block text-xs font-label-caps text-secondary mb-1">Shift End Time</label>
                  <input
                    type="time"
                    value={selectedStaff.shiftEnd}
                    onChange={e => setSelectedStaff({ ...selectedStaff, shiftEnd: e.target.value })}
                    className="w-full p-2 border border-outline/20 rounded-lg text-sm bg-surface"
                  />
                </div>
              </div>

              {/* Commission Rates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-label-caps text-secondary mb-1">Service Commission (%)</label>
                  <input
                    type="number"
                    value={selectedStaff.commissionRateService}
                    onChange={e => setSelectedStaff({ ...selectedStaff, commissionRateService: Number(e.target.value) })}
                    className="w-full p-2 border border-outline/20 rounded-lg text-sm bg-surface"
                  />
                </div>
                <div>
                  <label className="block text-xs font-label-caps text-secondary mb-1">Retail Commission (%)</label>
                  <input
                    type="number"
                    value={selectedStaff.commissionRateRetail}
                    onChange={e => setSelectedStaff({ ...selectedStaff, commissionRateRetail: Number(e.target.value) })}
                    className="w-full p-2 border border-outline/20 rounded-lg text-sm bg-surface"
                  />
                </div>
              </div>

              {/* Assigned Services */}
              <div>
                <label className="block text-xs font-label-caps text-secondary mb-2">Assigned Services / Skills</label>
                <div className="max-h-36 overflow-y-auto border border-outline/10 rounded-xl p-3 space-y-2 bg-surface-container-lowest">
                  {servicesList.length === 0 ? (
                    <p className="text-xs text-secondary italic">No services created yet in Service Menu Manager.</p>
                  ) : (
                    servicesList.map(srv => {
                      const isAssigned = selectedStaff.assignedServices.includes(srv.name);
                      return (
                        <label key={srv.id} className="flex items-center gap-2 text-xs cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isAssigned}
                            onChange={() => toggleAssignedService(srv.name)}
                            className="rounded border-outline/30 text-primary focus:ring-primary"
                          />
                          <span>{srv.name} ({srv.category})</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-outline/10">
              <button onClick={() => setEditModalOpen(false)} className="px-4 py-2 text-secondary text-xs font-label-caps">
                Cancel
              </button>
              <button onClick={handleSaveStaff} className="px-5 py-2 bg-primary text-on-primary rounded-xl text-xs font-label-caps hover:opacity-90">
                Save Shifts & Config
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

