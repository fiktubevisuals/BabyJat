import { Link } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { SEOHead } from '../../components/SEOHead';

export default function LuminaSerum() {
  const { addToCart } = useCart();

  const handleAddToCart = () => {
    addToCart({
      id: 'prod_serum_1',
      name: 'Lumina Silk Hair Serum',
      price: 48,
      quantity: 1,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAm2wZjCBO9xqWih3OUxAZt9Te3Pl6gTy4kI4tTl50ryxf_LMFc3w9sDud8fSHCVCMyRpZ_tucpchx91BlsR-qxDkUDE5AU2j3aeojUx__gJZzD7FXeAmryB60ku2-TmjU-AZQiE37jBdrjZ2tbNQeWdn3XH56ik7OwaWgMRnBJZOWxmK4yP0lUJZg49-xC-YecZVlJpyyvVnufrQHsXdGcIShSgbLl8GcD4A8MJnv1DQKXzRDQkxrppg'
    });
  };

  const handleAddCrossSell = (id: string, name: string, price: number, image: string) => {
    addToCart({ id, name, price, quantity: 1, image });
  };

  return (
    <main className="max-w-container-max mx-auto md:px-margin-desktop px-0 pb-[100px] md:pb-[120px]">
      <SEOHead 
        pageKey="shop" 
        productId="lumina-serum" 
        productName="Lumina Silk Hair Serum" 
        fallbackTitle="Lumina Silk Hair Serum | BabyJat Shop" 
        fallbackDescription="Transform dull locks into liquid glass with Lumina Silk Hair Serum. Infused with argan oil & heat defense." 
      />
      <div className="grid grid-cols-1 md:grid-cols-12 gap-0 md:gap-gutter mt-0 md:mt-stack-md">
        {/* Product Image Hero (Left Col Desktop) */}
        <div className="col-span-1 md:col-span-7 relative bg-surface-container-low md:rounded-xl overflow-hidden h-[530px] md:h-[707px]">
          <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAm2wZjCBO9xqWih3OUxAZt9Te3Pl6gTy4kI4tTl50ryxf_LMFc3w9sDud8fSHCVCMyRpZ_tucpchx91BlsR-qxDkUDE5AU2j3aeojUx__gJZzD7FXeAmryB60ku2-TmjU-AZQiE37jBdrjZ2tbNQeWdn3XH56ik7OwaWgMRnBJZOWxmK4yP0lUJZg49-xC-YecZVlJpyyvVnufrQHsXdGcIShSgbLl8GcD4A8MJnv1DQKXzRDQkxrppg" alt="Lumina Silk Hair Serum" />
          {/* Badge */}
          <div className="absolute top-margin-mobile left-margin-mobile bg-tertiary-container text-on-tertiary-container px-3 py-1 rounded-full font-label-caps text-label-caps shadow-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
            Stylist Favorite
          </div>
        </div>

        {/* Product Details (Right Col Desktop) */}
        <div className="col-span-1 md:col-span-5 px-margin-mobile md:px-0 py-stack-md flex flex-col space-y-stack-md">
          {/* Title & Price */}
          <div className="space-y-stack-sm">
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-on-background">
              Lumina Silk Hair Serum
            </h1>
            <p className="font-body-lg text-body-lg text-secondary">
              UGX 48.00
            </p>
          </div>

          {/* Description */}
          <div className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
            Infused with a proprietary blend of weightless botanical oils, this high-gloss serum delivers instant mirror-like shine while providing thermal protection up to 450°F. The ultimate finishing touch for a polished, editorial look.
          </div>

          {/* Key Benefits */}
          <div className="grid grid-cols-1 gap-3 py-stack-sm border-t border-surface-variant border-b">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">water_drop</span>
              <span className="font-body-md text-body-md">Shine Enhancement</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">waves</span>
              <span className="font-body-md text-body-md">Frizz Control</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">local_fire_department</span>
              <span className="font-body-md text-body-md">Heat Protection up to 450°F</span>
            </div>
          </div>

          {/* Stylist Tip Quote */}
          <div className="bg-surface-container p-stack-md rounded-xl border-l-4 border-primary">
            <p className="font-body-md text-body-md italic text-on-surface mb-2">
              "Apply 2-3 drops to damp hair before blow-drying for a mirror-like finish."
            </p>
            <p className="font-label-caps text-label-caps text-secondary uppercase">
              — Stylist Elena
            </p>
          </div>

          {/* How to Use */}
          <div className="space-y-stack-sm">
            <h3 className="font-headline-md text-headline-md">Application</h3>
            <ol className="space-y-3 font-body-md text-body-md text-on-surface-variant list-decimal list-inside marker:text-primary marker:font-bold">
              <li>Dispense 1-2 pumps into palms.</li>
              <li>Warm between hands.</li>
              <li>Smooth evenly through mid-lengths to ends.</li>
            </ol>
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:block pt-stack-md">
            <button onClick={handleAddToCart} className="w-full bg-primary text-on-primary font-label-caps text-label-caps py-4 rounded-xl hover:bg-surface-tint transition-colors glossy-shadow">
              Add to Bag — UGX 48.00
            </button>
          </div>
        </div>
      </div>

      {/* Complete the Look */}
      <section className="mt-stack-lg md:mt-[96px] px-margin-mobile md:px-0 mb-stack-lg">
        <h2 className="font-headline-md text-headline-md mb-stack-md">Complete the Look</h2>
        <div className="flex overflow-x-auto gap-4 md:gap-gutter hide-scrollbar pb-stack-sm">
          {/* Item 1 */}
          <div className="min-w-[200px] md:min-w-[280px] group cursor-pointer">
            <div className="w-full aspect-[3/4] bg-surface-container-low rounded-xl overflow-hidden mb-3 relative">
              <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCl43bZbpBWR0oCSq0objQXwl6sav0pGjHmIFjKAxcKBMRGOUoK6qKDNH93GSoDYQbAZ6dFDrvLbzBGnZq-xLMEjN49w1gVtxYoFqxnoC2u9eEboYhnOKwjpQZwE469ZgFD99Cg-6szBI1hCTrN-dj2jfJeooizReDO4RgXeE2nxeqwlKD9OIJXV_vAbgSX6rTImDLnmc0hTzE7YanY0gwB2e7oVyUEoNRGyK2SpRyWEt6Z422ZFFcqxg" alt="Hydrating Shampoo" />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                <button onClick={() => handleAddCrossSell('prod_shampoo_1', 'Hydrating Shampoo', 32, 'https://lh3.googleusercontent.com/aida-public/AB6AXuCl43bZbpBWR0oCSq0objQXwl6sav0pGjHmIFjKAxcKBMRGOUoK6qKDNH93GSoDYQbAZ6dFDrvLbzBGnZq-xLMEjN49w1gVtxYoFqxnoC2u9eEboYhnOKwjpQZwE469ZgFD99Cg-6szBI1hCTrN-dj2jfJeooizReDO4RgXeE2nxeqwlKD9OIJXV_vAbgSX6rTImDLnmc0hTzE7YanY0gwB2e7oVyUEoNRGyK2SpRyWEt6Z422ZFFcqxg')} className="bg-surface text-on-surface font-label-caps text-label-caps px-4 py-2 rounded-full">Quick Add</button>
              </div>
            </div>
            <h3 className="font-body-md text-body-md font-bold">Hydrating Shampoo</h3>
            <p className="font-body-md text-body-md text-secondary">UGX 32.00</p>
          </div>
          {/* Item 2 */}
          <div className="min-w-[200px] md:min-w-[280px] group cursor-pointer">
            <div className="w-full aspect-[3/4] bg-surface-container-low rounded-xl overflow-hidden mb-3 relative">
              <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBQSOtwqn-ZgV2-omksr6OMhN0m1q44snwFqJIANwHkqt6-a--ozWnV4q4ai8ULRakSRR3iVRg95yVVAtBtlvYUXJFKxCz9Kd9e1yaf36kMQwnKl3IAQICczJPzbtEdqPfeLubR5wanJitH9UpAKPUP7hfy_TIK0PvQQPUtEcEbDUbhIGdVZDxFIIsmQO4qLnZFNPatYuz9-s_3uF64_2dhazgZyzxds4oA_6GRTNXoJzlPkNiGtRtFnA" alt="Velvet Crown Band" />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                <button onClick={() => handleAddCrossSell('prod_band_1', 'Velvet Crown Band', 24, 'https://lh3.googleusercontent.com/aida-public/AB6AXuBQSOtwqn-ZgV2-omksr6OMhN0m1q44snwFqJIANwHkqt6-a--ozWnV4q4ai8ULRakSRR3iVRg95yVVAtBtlvYUXJFKxCz9Kd9e1yaf36kMQwnKl3IAQICczJPzbtEdqPfeLubR5wanJitH9UpAKPUP7hfy_TIK0PvQQPUtEcEbDUbhIGdVZDxFIIsmQO4qLnZFNPatYuz9-s_3uF64_2dhazgZyzxds4oA_6GRTNXoJzlPkNiGtRtFnA')} className="bg-surface text-on-surface font-label-caps text-label-caps px-4 py-2 rounded-full">Quick Add</button>
              </div>
            </div>
            <h3 className="font-body-md text-body-md font-bold">Velvet Crown Band</h3>
            <p className="font-body-md text-body-md text-secondary">UGX 24.00</p>
          </div>
          <div className="min-w-[24px] md:hidden"></div>
        </div>
      </section>

      {/* Sticky Mobile CTA Bar */}
      <div className="fixed bottom-0 left-0 w-full glass-panel border-t border-surface-variant p-margin-mobile pb-[max(env(safe-area-inset-bottom,20px),16px)] md:hidden z-40">
        <button onClick={handleAddToCart} className="w-full bg-primary text-on-primary font-label-caps text-label-caps py-4 rounded-xl hover:bg-surface-tint transition-colors glossy-shadow">
          Add to Bag — UGX 48.00
        </button>
      </div>
    </main>
  );
}
