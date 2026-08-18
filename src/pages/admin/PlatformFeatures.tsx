import { useState, useEffect } from 'react';
import { useFeatures } from '../../contexts/FeatureContext';

export default function PlatformFeatures() {
  const { features, updateFeatures, loading } = useFeatures();
  const [localFeatures, setLocalFeatures] = useState(features);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalFeatures(features);
  }, [features]);

  const toggleFeature = (key: keyof typeof localFeatures) => {
    setLocalFeatures(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateFeatures(localFeatures);
      alert('Settings saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Error saving settings.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="p-margin-desktop text-secondary">Loading settings...</div>;

  return (
    <div className="p-margin-mobile md:p-margin-desktop max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">Platform Features</h2>
          <p className="font-body-md text-sm text-secondary mt-1">Configure global application settings and feature flags</p>
        </div>
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-primary text-on-primary px-4 py-2 rounded-lg font-label-caps text-xs shadow-md hover:opacity-90 whitespace-nowrap disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface-container-lowest rounded-2xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-outline/5 p-6">
          <h3 className="font-headline-sm text-lg mb-4">Core Modules</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl">
              <div>
                <p className="font-bold text-on-surface">Appointments</p>
                <p className="text-xs text-secondary">Allow users to book services online.</p>
              </div>
              <button 
                onClick={() => toggleFeature('enableAppointments')}
                className={`w-12 h-6 rounded-full relative transition-colors ${localFeatures.enableAppointments ? 'bg-primary' : 'bg-surface-variant'}`}
              >
                <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${localFeatures.enableAppointments ? 'translate-x-6' : ''}`} />
              </button>
            </div>
            <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl">
              <div>
                <p className="font-bold text-on-surface">E-commerce Shop</p>
                <p className="text-xs text-secondary">Enable retail and product purchases.</p>
              </div>
              <button 
                onClick={() => toggleFeature('enableShop')}
                className={`w-12 h-6 rounded-full relative transition-colors ${localFeatures.enableShop ? 'bg-primary' : 'bg-surface-variant'}`}
              >
                <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${localFeatures.enableShop ? 'translate-x-6' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-outline/5 p-6">
          <h3 className="font-headline-sm text-lg mb-4">Security & Access</h3>
          <div className="space-y-4">
             <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl border border-error/20">
              <div>
                <p className="font-bold text-error">Maintenance Mode</p>
                <p className="text-xs text-secondary">Disable access for non-admins.</p>
              </div>
              <button 
                onClick={() => toggleFeature('maintenanceMode')}
                className={`w-12 h-6 rounded-full relative transition-colors ${localFeatures.maintenanceMode ? 'bg-error' : 'bg-surface-variant'}`}
              >
                <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${localFeatures.maintenanceMode ? 'translate-x-6' : ''}`} />
              </button>
            </div>
            <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl">
              <div>
                <p className="font-bold text-on-surface">Require Email Verification</p>
                <p className="text-xs text-secondary">Users must verify before booking.</p>
              </div>
              <button 
                onClick={() => toggleFeature('requireEmailVerification')}
                className={`w-12 h-6 rounded-full relative transition-colors ${localFeatures.requireEmailVerification ? 'bg-primary' : 'bg-surface-variant'}`}
              >
                <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${localFeatures.requireEmailVerification ? 'translate-x-6' : ''}`} />
              </button>
            </div>
            <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl">
              <div>
                <p className="font-bold text-on-surface">Guest Checkout</p>
                <p className="text-xs text-secondary">Allow purchases without an account.</p>
              </div>
              <button 
                onClick={() => toggleFeature('allowGuestCheckout')}
                className={`w-12 h-6 rounded-full relative transition-colors ${localFeatures.allowGuestCheckout ? 'bg-primary' : 'bg-surface-variant'}`}
              >
                <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${localFeatures.allowGuestCheckout ? 'translate-x-6' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
