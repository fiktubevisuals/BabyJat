import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { HomeEditorModal } from './HomeEditorModal';

const defaultHomepageData = {
  heroMain: {
    title: "The Glossy\nBlowout",
    subtitle: "Signature Style",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCwu7vmNcvbbGwf71WM58T0wuiDK2g9Gc7BBJEF96AVLtfM_Tn1JM_7w-9Y2qFSW_Ixs5BGsMXBMmCCQyBe6x3zZlK91arhgLirfhLggndtKbXy9du-Tx_ZqswIVPb5Mpn5TcrZF59uFrEF3IZXYtcX1NaFuJeGF6pOHwubNbPYFp-gZtrGG_EY0SCqevMTM7-52mz9rpzXd-n0z5c5fF5K0zp9Ufw7BbX2FWat-czikkslfd7oM1r_Cw"
  },
  heroSecondary1: {
    title: "Summer Glow\nPackage",
    subtitle: "Complete color & treatment"
  },
  heroSecondary2: {
    title: "Shop New Arrivals",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuC-R9mnzNsY5u6p6O6IulVwyohOeqhYyQG4jfACo_P3oPihh7f_u_W4M3gO8CmEQhygkt2_PUFMsiuJVObcI1MnRQnz209dk2tQ9xZS5uHDLSxRd7SBr1TzQvm88QwV7FZ1YQsMmf2U5pGO97Nl5OQuMKd__pZmvRwRQZvrFSaGKvPc8H7mn76sHn0kAdcXCwsCxgDGVUtGfLH-okNl8d1p-eghL-dzkOgSa_DpvmzZSxJjjHHCxT0Q6w"
  }
};

export default function Home() {
  const { profile } = useAuth();
  const [data, setData] = useState<any>(defaultHomepageData);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'content', 'homepage'), (docSnap) => {
      if (docSnap.exists()) {
        setData({ ...defaultHomepageData, ...docSnap.data() });
      }
    });
    return () => unsub();
  }, []);

  const handleSave = async (updatedData: any) => {
    try {
      await setDoc(doc(db, 'content', 'homepage'), {
        ...updatedData,
        updatedAt: serverTimestamp()
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save homepage content", error);
      alert("Failed to save. Make sure you are an Admin.");
    }
  };

  return (
    <main className="pt-8 md:pt-16 max-w-container-max mx-auto relative">
      {profile?.role === 'admin' && (
        <button 
          onClick={() => setIsEditing(true)}
          className="fixed bottom-24 right-4 md:right-8 z-40 bg-primary text-on-primary px-4 py-3 rounded-full shadow-xl font-label-caps flex items-center gap-2 hover:bg-primary/90"
        >
          <span className="material-symbols-outlined text-sm">edit</span>
          Edit Home Page
        </button>
      )}

      {isEditing && (
        <HomeEditorModal 
          data={data} 
          onSave={handleSave} 
          onClose={() => setIsEditing(false)} 
        />
      )}

      {/* Personalized Greeting */}
      <section className="px-margin-mobile md:px-margin-desktop py-stack-md flex justify-between items-end">
        <div>
          <p className="font-label-caps text-label-caps text-secondary uppercase tracking-widest mb-1">Welcome Back</p>
          <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-background">Hello, {profile?.displayName?.split(' ')[0] || 'Guest'}.</h2>
        </div>
        <div className="hidden md:block">
          <Link to="/services" className="bg-primary text-on-primary px-8 py-3 rounded-DEFAULT font-label-caps text-label-caps hover:bg-primary-container transition-colors inline-block">Book Appointment</Link>
        </div>
      </section>

      {/* Hero Section - Bento Grid Style */}
      <section className="px-margin-mobile md:px-margin-desktop mb-stack-lg">
        {/* Adjusted height to make images smaller as requested */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-base md:gap-gutter h-auto md:h-[450px]">
          {/* Main Featured Image */}
          <div className="md:col-span-8 rounded-xl overflow-hidden relative group h-[300px] md:h-full">
            <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" src={data.heroMain.imageUrl} alt="Hero" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
            <div className="absolute bottom-0 left-0 p-8 w-full flex flex-col justify-end">
              <span className="bg-tertiary-container text-on-tertiary-container px-3 py-1 font-label-caps text-label-caps rounded-full w-fit mb-4">{data.heroMain.subtitle}</span>
              <h3 className="font-display-lg text-display-lg text-white mb-4 leading-tight whitespace-pre-line">{data.heroMain.title}</h3>
              <Link to="/services" className="md:hidden bg-primary text-on-primary px-6 py-3 rounded-DEFAULT font-label-caps text-label-caps w-full mb-4 text-center">Book Now</Link>
            </div>
          </div>

          {/* Secondary Highlights */}
          <div className="md:col-span-4 flex flex-col gap-base md:gap-gutter h-full">
            {/* Promo Card */}
            <div className="flex-1 rounded-xl overflow-hidden relative group bg-surface-container-high p-8 flex flex-col justify-center items-center text-center">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary-fixed/30 to-transparent opacity-50"></div>
              <h4 className="font-headline-md text-headline-md mb-2 z-10 whitespace-pre-line">{data.heroSecondary1.title}</h4>
              <p className="font-body-md text-body-md text-secondary mb-6 z-10">{data.heroSecondary1.subtitle}</p>
              <Link to="/services" className="border border-on-background text-on-background hover:border-tertiary hover:text-tertiary px-6 py-2 rounded-DEFAULT font-label-caps text-label-caps transition-colors z-10 inline-block">Discover</Link>
            </div>
            {/* Accessory Highlight */}
            <div className="flex-1 rounded-xl overflow-hidden relative group h-[200px] md:h-auto">
              <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" src={data.heroSecondary2.imageUrl} alt="Accessories" />
              <div className="absolute inset-0 glass-panel opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Link to="/shop" className="font-label-caps text-label-caps text-white tracking-widest bg-black/50 px-4 py-2 block">{data.heroSecondary2.title}</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Styles / Lookbook Slider */}
      <section className="mb-stack-lg overflow-hidden">
        <div className="px-margin-mobile md:px-margin-desktop flex justify-between items-end mb-stack-sm">
          <h3 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg">Featured Looks</h3>
          <Link to="/lookbook" className="font-label-caps text-label-caps text-secondary hover:text-primary transition-colors flex items-center gap-1">View Gallery <span className="material-symbols-outlined text-sm">arrow_forward</span></Link>
        </div>
        <div className="flex overflow-x-auto hide-scrollbar gap-4 px-margin-mobile md:px-margin-desktop pb-8 pt-4">
          {/* Look 1 */}
          <Link to="/lookbook/copper-muse" className="min-w-[240px] md:min-w-[320px] aspect-[3/4] relative rounded-lg overflow-hidden group block">
            <img className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA7mRsfVDUfYMNPcwdZhc449HQGNT84BBpI909sphCPInvyoTMbN0bDeceCY1LQpvTqFa-WuPVZoqvnJ8tHwqAbcBS_4TN7BRIZYdJ-A-x5kSqJ_MojDMzIaVz_8CwMgIuoXiCVQ_GgYycInG9y_z2Y2Yz-TOqkO6G7bZIQbsjSiAg0Mqz6Vf4QMzFYL8wfFQXdW-EuB-YgnmBU_fXp98lpg2wYceXc6mN6iC9ZpewljG8gO57FJODGFQ" alt="Textured Bob" />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors"></div>
            <div className="absolute bottom-6 left-6 right-6">
              <h4 className="font-headline-md text-headline-md text-white">Textured Bob</h4>
              <p className="font-body-md text-body-md text-white/80">Stylist: Elena</p>
            </div>
          </Link>
          {/* Look 2 */}
          <Link to="/lookbook/copper-muse" className="min-w-[240px] md:min-w-[320px] aspect-[3/4] relative rounded-lg overflow-hidden group block">
            <img className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCcUEqO-OSLC0OaLRLICcvOn4TkyMycdM5Hnrj2VbLuVBo6aj6vCRSAg6VfS2L2Li8VZJd-07InPnCuUrANGGX0etiNkIaeR7G48CUPniFOSYDdCGyQ3ilJSJs5vJ3f22vQvtLH4H0XYakSzSX1l3YAlQ65o1syWj5S41CmlxftxY0YWsJeDHlskUQIIBXRElwZZA5xmPoi15XZ9dv-B_T7QaYNChb5mna1MaS4K1RF5i8dfOQKBH3Dng" alt="Golden Balayage" />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors"></div>
            <div className="absolute bottom-6 left-6 right-6">
              <h4 className="font-headline-md text-headline-md text-white">Golden Balayage</h4>
              <p className="font-body-md text-body-md text-white/80">Stylist: Marcus</p>
            </div>
          </Link>
          {/* Look 3 */}
          <Link to="/lookbook/copper-muse" className="min-w-[240px] md:min-w-[320px] aspect-[3/4] relative rounded-lg overflow-hidden group block">
            <img className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA8FbK4Dr2Spr_zh5aFtyRh5zX1bSHE58aa4NI4g9yA3kfXvWMdLV_1KaskymMX2fUqqLDj5vugTWmW-hQGWZmnF0rJ9sgx-FWbENkLnkpSsoFndzE_FKIu4YdQ6CtaVSdQYB1D0M8M5jGqFJbqif3ThGKpNqjKy7EplNX8ClR3MFrwQIcjPomQ02cyjlApgKN2Z7KzhBdKH-CM1CKYzCJ0OMau2yJkXMynfZBSaySMdRaEcpH4ROj2LA" alt="Glass Hair" />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors"></div>
            <div className="absolute bottom-6 left-6 right-6">
              <h4 className="font-headline-md text-headline-md text-white">Glass Hair</h4>
              <p className="font-body-md text-body-md text-white/80">Stylist: Sofia</p>
            </div>
          </Link>
        </div>
      </section>

      {/* Trending Accessories */}
      <section className="px-margin-mobile md:px-margin-desktop mb-stack-lg">
        <div className="flex justify-between items-end mb-stack-md">
          <h3 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg">Trending Accents</h3>
          <Link to="/shop" className="font-label-caps text-label-caps text-secondary hover:text-primary transition-colors flex items-center gap-1">Shop All <span className="material-symbols-outlined text-sm">arrow_forward</span></Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {/* Product 1 */}
          <div className="group cursor-pointer">
            <div className="bg-surface-bright aspect-square rounded-lg mb-4 relative overflow-hidden flex items-center justify-center p-4">
              <img className="w-full h-full object-contain mix-blend-multiply" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBQvN1NZjHDbxoq8y41j-26OG1JWWPZ3XxV-vEzuXQFHS6r9XutWH__2N0pEa2JjYQBX9KvB8BroyqAVt9cPCfRunluj5WJ1QEUlh8bqn22URB2aoFapT_fTJx1YGGbESH1YCQg1I6LR4IiIqE64gWhXlYdIaYwxhz3zDKI9jGoPE7bRWZA2azMbBLeS56TGsmIWt0StdXXn9uXJOgSH54_jllZsSC1eUrtex1Qo8MfcNEOTBdTsh61cA" alt="Pearl Accent Clip" />
              <div className="absolute bottom-4 left-0 right-0 flex justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                <button className="bg-black text-white font-label-caps text-label-caps px-6 py-2 rounded-full shadow-lg hover:bg-primary transition-colors">Quick Add</button>
              </div>
            </div>
            <div>
              <h4 className="font-body-lg text-body-lg text-on-background mb-1">Pearl Accent Clip</h4>
              <p className="font-body-md text-body-md text-secondary">UGX 34.00</p>
            </div>
          </div>
          {/* Product 2 */}
          <div className="group cursor-pointer">
            <div className="bg-surface-bright aspect-square rounded-lg mb-4 relative overflow-hidden flex items-center justify-center p-4">
              <span className="absolute top-2 left-2 bg-tertiary-container text-on-tertiary-container px-2 py-1 font-label-caps text-[10px] rounded">New</span>
              <img className="w-full h-full object-contain mix-blend-multiply" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB9qms5ytA7x0D3K9KklEuE_Ue_cIxThY1jlG9vYY0BxUZH-IHrVJkN-FlsuYH7tcKHBdZvBzNPA-qe12WvImlc5ccH57oliULC4GD9eNgGuxYRrIlN-UIBO6GS91D4UgKJOL7-BZXpmpy2ZHqlTb50VWrix2umk5sXveLZxKSobynMp2sOq3mM74omah3zAxvga0cwf1uIIRFdAwisE8k8jD5ZNK-frv8RKAPHzgszhXH22dY2JZxAWg" alt="Blush Silk Scrunchie" />
              <div className="absolute bottom-4 left-0 right-0 flex justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                <button className="bg-black text-white font-label-caps text-label-caps px-6 py-2 rounded-full shadow-lg hover:bg-primary transition-colors">Quick Add</button>
              </div>
            </div>
            <div>
              <h4 className="font-body-lg text-body-lg text-on-background mb-1">Blush Silk Scrunchie</h4>
              <p className="font-body-md text-body-md text-secondary">UGX 22.00</p>
            </div>
          </div>
          {/* Product 3 */}
          <div className="group cursor-pointer hidden md:block">
            <div className="bg-surface-bright aspect-square rounded-lg mb-4 relative overflow-hidden flex items-center justify-center p-4">
              <img className="w-full h-full object-contain mix-blend-multiply" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC2glgNK5wJbpFY3Njl43MyjCaY6gE4dag8_z7aMYUnSDLn6pM08hfBb-icQwvC0x8482fPPsY0PplcR1kHAgjo9dtWjKB_3qKQNBTgluOqwWgO_ZV7ZdCmvMs25oYaEmoHrCXJIu3IBXzZCyQwgQfLqG9TCkPl_fZp1IExkpnICjE09OSKLRw56Odm1aGOvW5kZZWmeuUfYJqST34K-C4o7UuNKX0xeu4ljWY1uJ2DV7wnzYpspuWNDg" alt="Gold Artisan Fork" />
              <div className="absolute bottom-4 left-0 right-0 flex justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                <button className="bg-black text-white font-label-caps text-label-caps px-6 py-2 rounded-full shadow-lg hover:bg-primary transition-colors">Quick Add</button>
              </div>
            </div>
            <div>
              <h4 className="font-body-lg text-body-lg text-on-background mb-1">Gold Artisan Fork</h4>
              <p className="font-body-md text-body-md text-secondary">UGX 45.00</p>
            </div>
          </div>
          {/* Product 4 */}
          <div className="group cursor-pointer hidden md:block">
            <div className="bg-surface-bright aspect-square rounded-lg mb-4 relative overflow-hidden flex items-center justify-center p-4">
              <img className="w-full h-full object-contain mix-blend-multiply" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAuPB8fxxJVu34ppTBXc2QFj4hRAfSCW7mDKSS8Z9xxcX_pS0MSspy_5jz8njcxNrcGbiO4gLcVGqnh2Y_jMewmpsa1Vg9ydrJFm9iJLxjg-yf_a-SvzpefLNrdNDTh215M7goKpu62RE-g4qAnQ1o3fG37DMRnYvUGzEr6HjHhrOf57W5HxMpE3EMWMrU-I557E2shmWT7vK6PHZ6jbGeaNkHuksM5rhNn_ZL-kh6ULDcdzjhAojBjXw" alt="Glossing Serum" />
              <div className="absolute bottom-4 left-0 right-0 flex justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                <button className="bg-black text-white font-label-caps text-label-caps px-6 py-2 rounded-full shadow-lg hover:bg-primary transition-colors">Quick Add</button>
              </div>
            </div>
            <div>
              <h4 className="font-body-lg text-body-lg text-on-background mb-1">Glossing Serum</h4>
              <p className="font-body-md text-body-md text-secondary">UGX 58.00</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
