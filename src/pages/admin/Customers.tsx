import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';

interface UserData {
  id: string;
  email: string;
  displayName: string;
  role: 'client' | 'admin' | 'stylist';
  createdAt?: any;
  stylistNotes?: string;
  hairFormula?: string;
  allergies?: string;
  hairTexture?: string;
  clientPreferences?: string;
}

export default function Customers() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  
  const [userHistory, setUserHistory] = useState<{
    appointments: any[];
    orders: any[];
    lifetimeSpend: number;
    loading: boolean;
  }>({ appointments: [], orders: [], lifetimeSpend: 0, loading: false });

  const [notesDraft, setNotesDraft] = useState('');
  const [formulaDraft, setFormulaDraft] = useState('');
  const [allergiesDraft, setAllergiesDraft] = useState('');
  const [textureDraft, setTextureDraft] = useState('');
  const [preferencesDraft, setPreferencesDraft] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    const snapshot = await getDocs(collection(db, 'users'));
    const data: UserData[] = [];
    snapshot.forEach((doc) => {
      data.push({ id: doc.id, ...doc.data() } as UserData);
    });
    setUsers(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (window.confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
      try {
        await updateDoc(doc(db, 'users', userId), {
          role: newRole,
          updatedAt: serverTimestamp()
        });
        fetchUsers();
      } catch (err) {
        console.error(err);
        alert('Failed to update role. Make sure you have admin privileges.');
      }
    }
  };

  const openProfile = async (user: UserData) => {
    setSelectedUser(user);
    setNotesDraft(user.stylistNotes || '');
    setFormulaDraft(user.hairFormula || '');
    setAllergiesDraft(user.allergies || '');
    setTextureDraft(user.hairTexture || '');
    setPreferencesDraft(user.clientPreferences || '');
    setUserHistory({ appointments: [], orders: [], lifetimeSpend: 0, loading: true });

    try {
      // Fetch appointments
      const aptsSnap = await getDocs(query(collection(db, 'appointments'), where('clientId', '==', user.id)));
      const appointments = aptsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Fetch orders (POS or online)
      const ordersSnap = await getDocs(query(collection(db, 'orders'), where('clientId', '==', user.id)));
      const orders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const totalAptSpend = appointments.reduce((sum: number, a: any) => a.status === 'completed' ? sum + (a.price || 0) : sum, 0);
      const totalOrderSpend = orders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);

      setUserHistory({
        appointments,
        orders,
        lifetimeSpend: totalAptSpend + totalOrderSpend,
        loading: false
      });
    } catch (err) {
      console.error('Failed to fetch history', err);
      setUserHistory(prev => ({ ...prev, loading: false }));
    }
  };

  const saveNotes = async () => {
    if (!selectedUser) return;
    try {
      await updateDoc(doc(db, 'users', selectedUser.id), {
        stylistNotes: notesDraft,
        hairFormula: formulaDraft,
        allergies: allergiesDraft,
        hairTexture: textureDraft,
        clientPreferences: preferencesDraft,
        updatedAt: serverTimestamp()
      });
      setSelectedUser({
        ...selectedUser,
        stylistNotes: notesDraft,
        hairFormula: formulaDraft,
        allergies: allergiesDraft,
        hairTexture: textureDraft,
        clientPreferences: preferencesDraft
      });
      alert('Client CRM Profile & Technical Formulas saved.');
      fetchUsers(); // Refresh background list
    } catch (err) {
      console.error(err);
      alert('Failed to save notes.');
    }
  };

  return (
    <div className="p-margin-mobile md:p-margin-desktop max-w-[1600px] mx-auto">
      <div className="mb-8">
        <h2 className="font-headline-md text-headline-md text-on-surface">Client & Staff Directory</h2>
        <p className="font-body-md text-sm text-secondary mt-1">Manage platform access, roles, and client CRM profiles</p>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-outline/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-lowest border-b border-outline/10">
                <th className="p-4 font-label-caps text-[10px] text-secondary font-normal">Name</th>
                <th className="p-4 font-label-caps text-[10px] text-secondary font-normal">Email</th>
                <th className="p-4 font-label-caps text-[10px] text-secondary font-normal text-center">Role</th>
                <th className="p-4 font-label-caps text-[10px] text-secondary font-normal text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="font-body-md text-sm divide-y divide-outline/5">
              {loading ? (
                <tr><td colSpan={4} className="p-4 text-center text-secondary">Loading users...</td></tr>
              ) : users.map(user => (
                <tr key={user.id} className="hover:bg-surface-container-low/50 transition-colors cursor-pointer" onClick={(e) => {
                  // Prevent opening modal if clicking the select dropdown
                  if ((e.target as HTMLElement).tagName !== 'SELECT') {
                    openProfile(user);
                  }
                }}>
                  <td className="p-4 font-bold text-on-surface">{user.displayName}</td>
                  <td className="p-4 text-secondary">{user.email}</td>
                  <td className="p-4 text-center">
                    <span className={`inline-block px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      user.role === 'admin' ? 'bg-primary/20 text-primary' : 
                      user.role === 'stylist' ? 'bg-tertiary/20 text-tertiary' : 
                      'bg-surface-container-high text-secondary'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      disabled={user.email === 'mubirushafik1088@gmail.com' || (user.id === profile?.uid && user.role === 'admin')}
                      className="bg-surface-container text-xs border border-outline/20 rounded p-1 focus:outline-primary disabled:opacity-50"
                    >
                      <option value="client">Client</option>
                      <option value="stylist">Stylist</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CRM Profile Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-sm">
          <div className="bg-surface w-full md:w-[500px] h-full shadow-2xl flex flex-col animate-slide-in-right">
            <div className="p-6 border-b border-outline/10 flex justify-between items-center bg-surface-container-lowest">
              <div>
                <h3 className="font-headline-md text-xl">{selectedUser.displayName}</h3>
                <p className="text-secondary text-sm">{selectedUser.email}</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-surface-variant rounded-full">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-primary-container/20 p-4 rounded-xl border border-primary/10">
                  <p className="text-[10px] font-label-caps text-primary">Lifetime Spend</p>
                  <p className="font-headline-md text-xl">UGX {userHistory.lifetimeSpend.toLocaleString()}</p>
                </div>
                <div className="bg-surface-container p-4 rounded-xl">
                  <p className="text-[10px] font-label-caps text-secondary">Total Visits</p>
                  <p className="font-headline-md text-xl">{userHistory.appointments.filter(a => a.status === 'completed').length}</p>
                </div>
              </div>

              {/* Technical CRM & Hair Formulas */}
              <div className="bg-surface-container-low p-4 rounded-xl border border-outline/10 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-label-caps text-xs text-primary font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">science</span> Technical Hair Formulas & Sensitivities
                  </h4>
                  <button onClick={saveNotes} className="bg-primary text-on-primary px-3 py-1 rounded-lg text-xs font-label-caps hover:opacity-90">
                    Save CRM Profile
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-label-caps text-secondary mb-1">Color & Technical Formula</label>
                  <input
                    type="text"
                    value={formulaDraft}
                    onChange={e => setFormulaDraft(e.target.value)}
                    placeholder="e.g. 6N + 7G 20vol root touchup, 10-min gloss"
                    className="w-full p-2.5 bg-surface-container-lowest border border-outline/20 rounded-lg text-xs focus:outline-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-label-caps text-secondary mb-1">Allergies & Sensitivities</label>
                    <input
                      type="text"
                      value={allergiesDraft}
                      onChange={e => setAllergiesDraft(e.target.value)}
                      placeholder="e.g. Sensitive scalp, Ammonia allergy"
                      className="w-full p-2.5 bg-surface-container-lowest border border-outline/20 rounded-lg text-xs focus:outline-primary text-error"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-label-caps text-secondary mb-1">Hair Type & Texture</label>
                    <input
                      type="text"
                      value={textureDraft}
                      onChange={e => setTextureDraft(e.target.value)}
                      placeholder="e.g. Fine, High Porosity, 2B Wavy"
                      className="w-full p-2.5 bg-surface-container-lowest border border-outline/20 rounded-lg text-xs focus:outline-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-label-caps text-secondary mb-1">Styling & Beverage Preferences</label>
                  <input
                    type="text"
                    value={preferencesDraft}
                    onChange={e => setPreferencesDraft(e.target.value)}
                    placeholder="e.g. Silent appointment, warm jasmine tea"
                    className="w-full p-2.5 bg-surface-container-lowest border border-outline/20 rounded-lg text-xs focus:outline-primary"
                  />
                </div>
              </div>

              <div>
                <h4 className="font-label-caps text-xs text-secondary mb-2 flex items-center justify-between">
                  Private Stylist & Consultation Notes
                  <button onClick={saveNotes} className="text-primary hover:underline text-xs">Save</button>
                </h4>
                <textarea 
                  value={notesDraft}
                  onChange={e => setNotesDraft(e.target.value)}
                  placeholder="Additional observations, previous appointment notes..."
                  className="w-full h-24 p-3 bg-surface-container-lowest border border-outline/20 rounded-xl text-xs focus:outline-primary resize-none"
                />
              </div>

              <div>
                <h4 className="font-label-caps text-sm mb-3">Recent Appointments</h4>
                {userHistory.loading ? <p className="text-sm text-secondary">Loading...</p> : 
                  userHistory.appointments.length === 0 ? <p className="text-sm text-secondary italic">No history</p> :
                  <div className="space-y-2">
                    {userHistory.appointments.slice(0, 5).map(apt => (
                      <div key={apt.id} className="bg-surface-container-lowest p-3 rounded-lg border border-outline/10 flex justify-between items-center">
                        <div>
                          <p className="text-sm font-bold">{apt.serviceName}</p>
                          <p className="text-xs text-secondary">{new Date(apt.date).toLocaleDateString()}</p>
                        </div>
                        <span className={`text-[10px] font-label-caps px-2 py-1 rounded ${apt.status === 'completed' ? 'bg-secondary-container/30 text-secondary' : 'bg-surface-variant text-secondary'}`}>
                          {apt.status}
                        </span>
                      </div>
                    ))}
                  </div>
                }
              </div>

              <div>
                <h4 className="font-label-caps text-sm mb-3">Retail Purchases</h4>
                {userHistory.loading ? <p className="text-sm text-secondary">Loading...</p> : 
                  userHistory.orders.length === 0 ? <p className="text-sm text-secondary italic">No history</p> :
                  <div className="space-y-2">
                    {userHistory.orders.slice(0, 5).map(order => (
                      <div key={order.id} className="bg-surface-container-lowest p-3 rounded-lg border border-outline/10">
                        <div className="flex justify-between mb-1">
                          <p className="text-xs text-secondary">{new Date(order.createdAt?.seconds * 1000).toLocaleDateString()}</p>
                          <p className="text-xs font-bold">UGX {order.total.toLocaleString()}</p>
                        </div>
                        <p className="text-sm">
                          {order.items?.map((i: any) => `${i.name} (x${i.quantity})`).join(', ')}
                        </p>
                      </div>
                    ))}
                  </div>
                }
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
