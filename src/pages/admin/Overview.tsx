import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { useAuth } from '../../contexts/AuthContext';

export default function Overview() {
  const { user, profile } = useAuth();
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (chartRef.current) {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
      chartInstance.current = new Chart(chartRef.current, {
        type: 'line',
        data: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [{
            label: 'Revenue (UGX)',
            data: [1200, 1900, 1500, 2200, 3100, 4200, 3800],
            borderColor: '#b60055',
            backgroundColor: 'rgba(182, 0, 85, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#b60055',
            pointRadius: 4,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(0,0,0,0.05)' },
              border: { display: false }
            },
            x: {
              grid: { display: false },
              border: { display: false }
            }
          }
        }
      });
    }
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, []);

  return (
    <div className="p-margin-mobile md:p-margin-desktop max-w-[1600px] mx-auto space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-surface-container-lowest p-6 rounded-2xl border border-outline/10 shadow-sm gap-4">
        <div>
          <h1 className="font-headline-md text-2xl text-on-surface">
            Welcome back, <span className="text-primary font-bold">{profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Admin'}</span> 👋
          </h1>
          <p className="font-body-md text-sm text-secondary mt-1">
            Logged in as <span className="font-semibold">{user?.email || 'Administrator'}</span> • Role: <span className="uppercase text-xs font-bold text-primary bg-primary-container/30 px-2 py-0.5 rounded">{profile?.role || 'admin'}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-secondary bg-surface-container px-3 py-1.5 rounded-full font-label-caps">
            Realtime Analytics
          </span>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-outline/5 hover:border-primary/20 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined">payments</span>
            </div>
            <span className="bg-surface-container-high px-2 py-1 rounded text-xs font-bold text-on-surface flex items-center"><span className="material-symbols-outlined text-[14px] mr-1 text-primary">trending_up</span>+12.5%</span>
          </div>
          <h3 className="font-label-caps text-label-caps text-on-surface-variant mb-1">Today's Revenue</h3>
          <p className="font-headline-lg text-headline-lg text-on-surface">UGX 4,250</p>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-outline/5 hover:border-primary/20 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-xl bg-tertiary-container text-on-tertiary-container flex items-center justify-center">
              <span className="material-symbols-outlined">calendar_month</span>
            </div>
            <span className="bg-surface-container-high px-2 py-1 rounded text-xs font-bold text-on-surface flex items-center"><span className="material-symbols-outlined text-[14px] mr-1 text-primary">trending_up</span>+4.2%</span>
          </div>
          <h3 className="font-label-caps text-label-caps text-on-surface-variant mb-1">Appointments</h3>
          <p className="font-headline-lg text-headline-lg text-on-surface">32</p>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-outline/5 hover:border-primary/20 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center">
              <span className="material-symbols-outlined">group</span>
            </div>
            <span className="bg-surface-container-high px-2 py-1 rounded text-xs font-bold text-on-surface flex items-center"><span className="material-symbols-outlined text-[14px] mr-1 text-primary">trending_up</span>+8.1%</span>
          </div>
          <h3 className="font-label-caps text-label-caps text-on-surface-variant mb-1">New Clients</h3>
          <p className="font-headline-lg text-headline-lg text-on-surface">12</p>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-outline/5 hover:border-primary/20 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-xl bg-error-container text-on-error-container flex items-center justify-center">
              <span className="material-symbols-outlined">shopping_bag</span>
            </div>
            <span className="bg-surface-container-high px-2 py-1 rounded text-xs font-bold text-on-surface flex items-center text-error"><span className="material-symbols-outlined text-[14px] mr-1">trending_down</span>-2.4%</span>
          </div>
          <h3 className="font-label-caps text-label-caps text-on-surface-variant mb-1">Product Sales</h3>
          <p className="font-headline-lg text-headline-lg text-on-surface">UGX 845</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        {/* Main Chart */}
        <div className="xl:col-span-2 bg-surface-container-lowest rounded-2xl p-6 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-outline/5">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-headline-md text-headline-md text-on-surface">Revenue Overview</h3>
            <select className="bg-surface-container-low border-none rounded-lg px-3 py-1 font-body-md text-sm outline-none focus:ring-1 focus:ring-primary/50 text-on-surface">
              <option>This Week</option>
              <option>Last Week</option>
              <option>This Month</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <canvas ref={chartRef}></canvas>
          </div>
        </div>

        {/* Upcoming Appointments */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-outline/5 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-headline-md text-headline-md text-on-surface">Up Next</h3>
            <button className="text-primary hover:bg-primary/10 p-1 rounded-full transition-colors"><span className="material-symbols-outlined">more_vert</span></button>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
            <div className="flex items-start space-x-4 p-3 rounded-xl hover:bg-surface-container-low transition-colors group cursor-pointer border border-transparent hover:border-outline/10">
              <div className="w-12 h-12 rounded-full bg-surface-variant overflow-hidden shrink-0">
                <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBgwTn_sZ0K09Ti-g1s__HpZVjedmdDdd454oTNGiqFoxffzzzj_jhbDuEffCyzx-fwhGzmAcLrb8y8yMmDBV8R47Slre6DnEOc8rbWlHx9lk7tVOlnaRzEfs9Yj3UusQxTJ275yP5OIspPBVNp_kQYnnmn5KItNJG1N9KW147hJqjiPnFHFdcxMDBwGFC8hBYW7gA-lpveNudBOTIDogB_eaVQFhG8b-7hFb-OT4r2SNkPJQ9KORNN8w" alt="Client" className="w-full h-full object-cover"/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h4 className="font-body-md font-bold text-on-surface truncate">Eleanor Vance</h4>
                  <span className="font-label-caps text-[10px] text-primary">10:00 AM</span>
                </div>
                <p className="font-body-md text-sm text-on-surface-variant truncate">Signature Balayage</p>
                <div className="flex items-center space-x-2 mt-2">
                  <div className="w-5 h-5 rounded-full bg-secondary-container flex items-center justify-center text-[10px] font-bold text-on-secondary-container">M</div>
                  <span className="text-xs text-secondary">with Marcus</span>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-4 p-3 rounded-xl hover:bg-surface-container-low transition-colors group cursor-pointer border border-transparent hover:border-outline/10">
              <div className="w-12 h-12 rounded-full bg-surface-variant overflow-hidden shrink-0">
                <div className="w-full h-full flex items-center justify-center bg-primary text-on-primary font-bold">JW</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h4 className="font-body-md font-bold text-on-surface truncate">Jessica Wong</h4>
                  <span className="font-label-caps text-[10px] text-primary">11:30 AM</span>
                </div>
                <p className="font-body-md text-sm text-on-surface-variant truncate">Luxury Blowout</p>
                <div className="flex items-center space-x-2 mt-2">
                  <div className="w-5 h-5 rounded-full bg-secondary-container flex items-center justify-center text-[10px] font-bold text-on-secondary-container">E</div>
                  <span className="text-xs text-secondary">with Elena</span>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-4 p-3 rounded-xl hover:bg-surface-container-low transition-colors group cursor-pointer border border-transparent hover:border-outline/10">
              <div className="w-12 h-12 rounded-full bg-surface-variant overflow-hidden shrink-0">
                <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCyD94FxZkrxDr_SwFvNuZdXSmAGRB73hVOWqO6oARHGBgchktUsKFkz2Vcq56rOoGMwot75eB6WlpZkGohABoRpHaTTXL5VlxKMLNDf3dz2nt4VLAYqYkmkIZ41fsFxhP6x_K8hyoUK-IncGH2DXOtOFevrGn3eA6O4rIRrGdktwqmi2FsDjJPPyq-89yrDxIQQ36S48-hvRclyp-5aMl_z6AlyizK4FiZd1Uuf67Ib4so3ggwBsaSgA" alt="Client" className="w-full h-full object-cover"/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h4 className="font-body-md font-bold text-on-surface truncate">Sarah Jenkins</h4>
                  <span className="font-label-caps text-[10px] text-primary">1:00 PM</span>
                </div>
                <p className="font-body-md text-sm text-on-surface-variant truncate">Precision Cut & Style</p>
                <div className="flex items-center space-x-2 mt-2">
                  <div className="w-5 h-5 rounded-full bg-secondary-container flex items-center justify-center text-[10px] font-bold text-on-secondary-container">S</div>
                  <span className="text-xs text-secondary">with Sofia</span>
                </div>
              </div>
            </div>
          </div>
          <button className="w-full mt-4 py-2 text-center text-primary font-label-caps text-xs border border-primary/20 rounded-lg hover:bg-primary/5 transition-colors">View Schedule</button>
        </div>
      </div>

      {/* Staff Performance & Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Staff Performance */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-outline/5">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-headline-md text-headline-md text-on-surface">Top Stylists</h3>
            <span className="font-label-caps text-xs text-secondary">This Week</span>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center font-bold text-on-primary-container">E</div>
                <div>
                  <h4 className="font-body-md font-bold">Elena</h4>
                  <p className="text-xs text-secondary">18 Appointments</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-body-md font-bold text-primary">UGX 2,140</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center font-bold text-on-secondary-container">M</div>
                <div>
                  <h4 className="font-body-md font-bold">Marcus</h4>
                  <p className="text-xs text-secondary">15 Appointments</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-body-md font-bold text-primary">UGX 1,850</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-tertiary-container flex items-center justify-center font-bold text-on-tertiary-container">S</div>
                <div>
                  <h4 className="font-body-md font-bold">Sofia</h4>
                  <p className="text-xs text-secondary">12 Appointments</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-body-md font-bold text-primary">UGX 1,200</p>
              </div>
            </div>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-outline/5">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-2">
              <h3 className="font-headline-md text-headline-md text-on-surface">Inventory Alerts</h3>
              <span className="bg-error text-on-error text-[10px] font-bold px-2 py-0.5 rounded-full">3</span>
            </div>
            <button className="text-primary text-xs font-bold hover:underline">Reorder</button>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border border-error/20 bg-error-container/10">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-md bg-surface-variant overflow-hidden">
                  <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuAm2wZjCBO9xqWih3OUxAZt9Te3Pl6gTy4kI4tTl50ryxf_LMFc3w9sDud8fSHCVCMyRpZ_tucpchx91BlsR-qxDkUDE5AU2j3aeojUx__gJZzD7FXeAmryB60ku2-TmjU-AZQiE37jBdrjZ2tbNQeWdn3XH56ik7OwaWgMRnBJZOWxmK4yP0lUJZg49-xC-YecZVlJpyyvVnufrQHsXdGcIShSgbLl8GcD4A8MJnv1DQKXzRDQkxrppg" alt="Product" className="w-full h-full object-cover"/>
                </div>
                <div>
                  <h4 className="font-body-md font-bold">Lumina Silk Serum</h4>
                  <p className="text-xs text-error font-bold">2 units left</p>
                </div>
              </div>
              <button className="p-2 text-secondary hover:text-primary transition-colors"><span className="material-symbols-outlined">add_shopping_cart</span></button>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-outline/10 hover:bg-surface-container-low">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-md bg-surface-variant overflow-hidden">
                  <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCl43bZbpBWR0oCSq0objQXwl6sav0pGjHmIFjKAxcKBMRGOUoK6qKDNH93GSoDYQbAZ6dFDrvLbzBGnZq-xLMEjN49w1gVtxYoFqxnoC2u9eEboYhnOKwjpQZwE469ZgFD99Cg-6szBI1hCTrN-dj2jfJeooizReDO4RgXeE2nxeqwlKD9OIJXV_vAbgSX6rTImDLnmc0hTzE7YanY0gwB2e7oVyUEoNRGyK2SpRyWEt6Z422ZFFcqxg" alt="Product" className="w-full h-full object-cover"/>
                </div>
                <div>
                  <h4 className="font-body-md font-bold">Hydrating Shampoo (Backbar)</h4>
                  <p className="text-xs text-tertiary font-bold">4 units left</p>
                </div>
              </div>
              <button className="p-2 text-secondary hover:text-primary transition-colors"><span className="material-symbols-outlined">add_shopping_cart</span></button>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-outline/10 hover:bg-surface-container-low">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-md bg-surface-variant overflow-hidden">
                  <div className="w-full h-full bg-surface-container-high flex items-center justify-center text-xs text-secondary">Color</div>
                </div>
                <div>
                  <h4 className="font-body-md font-bold">Ash Blonde Toner (9V)</h4>
                  <p className="text-xs text-tertiary font-bold">5 tubes left</p>
                </div>
              </div>
              <button className="p-2 text-secondary hover:text-primary transition-colors"><span className="material-symbols-outlined">add_shopping_cart</span></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
