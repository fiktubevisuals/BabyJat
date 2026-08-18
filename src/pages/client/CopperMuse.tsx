import { Link } from 'react-router-dom';

export default function CopperMuse() {
  return (
    <main className="max-w-container-max mx-auto px-0 md:px-margin-desktop grid grid-cols-1 md:grid-cols-12 gap-x-gutter">
      {/* Hero Section (Left Column on Desktop) */}
      <section className="md:col-span-7 mb-stack-md md:mb-0">
        <div className="w-full h-[530px] md:h-[707px] relative overflow-hidden bg-surface-container-low group rounded-none md:rounded-xl">
          <img className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBPg5fbyj8IYvVQya7-cbRRvFI67pCjhNcDI5KRuCFY5Ep_it7N_EELjOqeXQ8gQSRr-2suylolWJqDGBXHj1OEBdmnRysYgl-oCSSdfMilyNUKi1cZa00fuLEc7TIodP-EaqBf_06BWSnxPTpd0jkv1Kg5s_9l1zJs476QNVgpuQZD6eykDLRQLApp0pd3wlspJIuq-BcHgIBn4Le9EyFn9dFIPaQrzAGRjDLLsRD8rG3hKLAYJnipOQ" alt="The Copper Muse Hairstyle" />
          {/* Stylist Badge Overlay */}
          <div className="absolute bottom-margin-mobile left-margin-mobile md:bottom-stack-md md:left-stack-md glass-panel px-4 py-2 rounded-full flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-tertiary-container" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            <span className="font-label-caps text-label-caps text-on-surface">Stylist: Elena</span>
          </div>
        </div>
      </section>

      {/* Details Section (Right Column on Desktop) */}
      <section className="md:col-span-5 px-margin-mobile md:px-0 flex flex-col pt-stack-md md:pt-0 sticky top-24 self-start">
        {/* Title & Description */}
        <div className="mb-stack-lg">
          <span className="font-label-caps text-label-caps text-primary tracking-widest uppercase mb-2 block">Signature Look</span>
          <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-background mb-4">The Copper Muse</h2>
          <p className="font-body-lg text-body-lg text-secondary">
            A vibrant cascade of rich copper and amber tones, designed to catch the light with every movement. This look combines high-gloss finish with effortless, editorial waves for a truly magnetic presence.
          </p>
        </div>

        {/* Get the Look (Services) */}
        <div className="mb-stack-lg">
          <h3 className="font-label-caps text-label-caps text-on-background border-b-[0.5px] border-on-background pb-2 mb-stack-sm uppercase">Get The Look</h3>
          <ul className="space-y-4">
            <li className="flex justify-between items-center group">
              <span className="font-headline-md text-headline-md text-on-background">Full Balayage</span>
              <div className="flex items-center gap-4">
                <span className="font-body-md text-body-md text-secondary">from UGX 250</span>
                <button className="w-8 h-8 rounded-full border border-on-background flex items-center justify-center group-hover:bg-primary group-hover:border-primary group-hover:text-on-primary transition-colors">
                  <span className="material-symbols-outlined text-[18px]">add</span>
                </button>
              </div>
            </li>
            <li className="w-full h-[0.5px] bg-on-background/20"></li>
            <li className="flex justify-between items-center group">
              <span className="font-headline-md text-headline-md text-on-background">Glaze Treatment</span>
              <div className="flex items-center gap-4">
                <span className="font-body-md text-body-md text-secondary">from UGX 65</span>
                <button className="w-8 h-8 rounded-full border border-on-background flex items-center justify-center group-hover:bg-primary group-hover:border-primary group-hover:text-on-primary transition-colors">
                  <span className="material-symbols-outlined text-[18px]">add</span>
                </button>
              </div>
            </li>
          </ul>
        </div>

        {/* Primary Action */}
        <div className="mt-auto pt-stack-md">
          <button className="w-full bg-primary text-on-primary font-label-caps text-label-caps py-4 rounded-none hover:bg-primary-container transition-colors shadow-[0_4px_20px_rgba(182,0,85,0.15)] uppercase tracking-widest flex items-center justify-center gap-2">
            Book This Style
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      </section>
      
      {/* Recommended Products (Full Width Section) */}
      <section className="col-span-1 md:col-span-12 mt-12 mb-32 md:mb-24">
        <div className="px-margin-mobile md:px-0 mb-stack-sm flex justify-between items-end">
          <h3 className="font-headline-md text-headline-md text-on-background">Maintain the Gloss</h3>
          <Link to="/shop" className="font-label-caps text-label-caps text-secondary hover:text-primary transition-colors">Shop All</Link>
        </div>
        
        {/* Horizontal Scroll Area */}
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 px-margin-mobile md:px-0 pb-8 hide-scrollbar">
          {/* Product Card 1 */}
          <Link to="/shop/lumina-serum" className="snap-start shrink-0 w-[70vw] md:w-[280px] group cursor-pointer relative block">
            <div className="bg-surface-container-low aspect-[3/4] mb-4 relative overflow-hidden">
              <img className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBzfG1VKnOs01YJb6-oJur93Fhe9mPf0vlL-g_YbKyDk94LPgpl4eH8nC6ym12FQvOlGrvCti561dvTvVLM6S53zv_7NbXpKqnMs-RqS61F_Sg3dSSs1wXP9msoiO9A0GL6c89k1IjiJ_EbfGBGg2qzHeR6VKx3mJqcIaicpPNznE29CuHOWE1Q-SIbbEQ7zmF7mTVsf3h6H43R6r4NgD743bHrnaPLwzvjIRHb7AbTQvMBtjiu0OOzEA" alt="Lumina Silk Hair Serum" />
              <div className="absolute inset-0 bg-on-background/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button className="bg-primary text-on-primary font-label-caps text-label-caps px-6 py-3 rounded-none uppercase tracking-widest translate-y-4 group-hover:translate-y-0 transition-all duration-300">Quick Add</button>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-label-caps text-label-caps text-primary mb-1">Styling</span>
              <span className="font-body-md text-body-md font-bold text-on-background">Lumina Silk Hair Serum</span>
              <span className="font-body-md text-body-md text-secondary">UGX 48.00</span>
            </div>
          </Link>
          
          {/* Product Card 2 */}
          <div className="snap-start shrink-0 w-[70vw] md:w-[280px] group cursor-pointer relative">
            <div className="bg-surface-container-low aspect-[3/4] mb-4 relative overflow-hidden">
              <img className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCiToPq1urgphT_CyxA-UCj-EkSS4lhLzQkirniW_nqTQMXJv3OG-lw8h-m2Bw5GXxk0S1xfSEPUv5hWoxcbVeXf7OhsAI5PdEKpAyEmzLYX0TPEoQN32hrUf8MzRrGuu04rmtz6K8UWuAZiYJ_phi3UPxP2JPJohSyBZQvLigvfmJl5V3ysj9x4hi2VDznZYXempq5WZP4fh4P0NrA7LRpHoDicUgmntn2ITJzrc_3gJmSa56oz4tYvQ" alt="Gloss Serum Drops" />
              <div className="absolute inset-0 bg-on-background/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button className="bg-primary text-on-primary font-label-caps text-label-caps px-6 py-3 rounded-none uppercase tracking-widest translate-y-4 group-hover:translate-y-0 transition-all duration-300">Quick Add</button>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-label-caps text-label-caps text-primary mb-1">Treatment</span>
              <span className="font-body-md text-body-md font-bold text-on-background">Gloss Serum Drops</span>
              <span className="font-body-md text-body-md text-secondary">UGX 32.00</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
