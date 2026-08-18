import { Link } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';

export default function Shop() {
  const { addToCart } = useCart();

  const handleAddToCart = (id: string, name: string, price: number, image: string) => {
    addToCart({ id, name, price, quantity: 1, image });
  };

  return (
    <main className="pt-8 md:pt-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
      {/* Header Section */}
      <section className="mb-stack-md md:mb-stack-lg flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg mb-2">Curated Accessories</h1>
          <p className="text-secondary max-w-md">Elevate your everyday look with our premium selection of hair accessories and care essentials.</p>
        </div>
        {/* Filters */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          <button className="shrink-0 px-4 py-2 rounded-full bg-tertiary-container text-on-tertiary-container font-label-caps text-label-caps transition-all active:scale-95">All</button>
          <button className="shrink-0 px-4 py-2 rounded-full border border-on-background/10 text-secondary hover:border-primary/30 hover:text-primary font-label-caps text-label-caps transition-all active:scale-95">Hair Clips</button>
          <button className="shrink-0 px-4 py-2 rounded-full border border-on-background/10 text-secondary hover:border-primary/30 hover:text-primary font-label-caps text-label-caps transition-all active:scale-95">Headbands</button>
          <button className="shrink-0 px-4 py-2 rounded-full border border-on-background/10 text-secondary hover:border-primary/30 hover:text-primary font-label-caps text-label-caps transition-all active:scale-95">Hair Care</button>
        </div>
      </section>

      {/* Product Grid */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-gutter mb-stack-lg">
        {/* Product Card 1 */}
        <article className="group flex flex-col gap-3">
          <div className="relative bg-surface-container-low aspect-[4/5] overflow-hidden rounded-sm ambient-glow transition-shadow duration-300">
            <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDWfQg8h6rHard5l5tnu3BCeEPfMnsVx5b8YqcHc4deD4n4Ayv5-Lab_K-j8vU2vr6mPEUxMAZmRK4uf1y6uxsarqwVE7FLwRULA3oY3YMHKWr9zeMsORAHw9P1gpde_P1MkEYw3TvM5DPC2VmSq2nH2NnFej8VeypB7hL5VvDs8zVkTJwM7bsDcCTmDyXzl3tr5QqUlsos-J5kzPxHcja5BvJZjYDLJjKFU07vgaDmwom3NWRG7cpceg" alt="Tortoise Shell Claw" />
            <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out bg-gradient-to-t from-surface/80 to-transparent backdrop-blur-[2px]">
              <button onClick={() => handleAddToCart('prod_claw_1', 'Tortoise Shell Claw', 24, 'https://lh3.googleusercontent.com/aida-public/AB6AXuDWfQg8h6rHard5l5tnu3BCeEPfMnsVx5b8YqcHc4deD4n4Ayv5-Lab_K-j8vU2vr6mPEUxMAZmRK4uf1y6uxsarqwVE7FLwRULA3oY3YMHKWr9zeMsORAHw9P1gpde_P1MkEYw3TvM5DPC2VmSq2nH2NnFej8VeypB7hL5VvDs8zVkTJwM7bsDcCTmDyXzl3tr5QqUlsos-J5kzPxHcja5BvJZjYDLJjKFU07vgaDmwom3NWRG7cpceg')} className="w-full bg-primary text-on-primary py-3 font-label-caps text-label-caps hover:bg-primary-container transition-colors shadow-lg flex justify-center items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                Quick Add
              </button>
            </div>
            <div className="absolute top-3 left-3 bg-tertiary-container text-on-tertiary-container px-2 py-1 font-label-caps text-[10px] tracking-wider rounded-sm">NEW</div>
          </div>
          <div className="flex flex-col">
            <h3 className="font-body-lg text-body-lg font-semibold truncate">Tortoise Shell Claw</h3>
            <p className="text-secondary mt-1">UGX 24.00</p>
          </div>
        </article>

        {/* Product Card 2 */}
        <article className="group flex flex-col gap-3">
          <div className="relative bg-surface-container-low aspect-[4/5] overflow-hidden rounded-sm ambient-glow transition-shadow duration-300">
            <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAFx1wnFYnxjNUnGFYUyUcp_uqOXyBBbLX4uG_qRB08J8XqhMOA45QEvvk8WKx24VmGn8yAqAc2bikQ-5RnSkuqfM4reLXDKfFlYS1gFkFpHEaV8n6asNebY3o1WmWVHWxa41L6avISAmcnCrArkJ2tcplKBY1hU1YO1Til_pBzJQZon9JSqKlKyXslMqvkfhDIbQjAhkuBHv12LmbwUwvNoO2XgIph71uNsCBteOtmOI2ysd-CcvKKqw" alt="Velvet Crown Band" />
            <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out bg-gradient-to-t from-surface/80 to-transparent backdrop-blur-[2px]">
              <button onClick={() => handleAddToCart('prod_band_1', 'Velvet Crown Band', 38, 'https://lh3.googleusercontent.com/aida-public/AB6AXuAFx1wnFYnxjNUnGFYUyUcp_uqOXyBBbLX4uG_qRB08J8XqhMOA45QEvvk8WKx24VmGn8yAqAc2bikQ-5RnSkuqfM4reLXDKfFlYS1gFkFpHEaV8n6asNebY3o1WmWVHWxa41L6avISAmcnCrArkJ2tcplKBY1hU1YO1Til_pBzJQZon9JSqKlKyXslMqvkfhDIbQjAhkuBHv12LmbwUwvNoO2XgIph71uNsCBteOtmOI2ysd-CcvKKqw')} className="w-full bg-primary text-on-primary py-3 font-label-caps text-label-caps hover:bg-primary-container transition-colors shadow-lg flex justify-center items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                Quick Add
              </button>
            </div>
          </div>
          <div className="flex flex-col">
            <h3 className="font-body-lg text-body-lg font-semibold truncate">Velvet Crown Band</h3>
            <p className="text-secondary mt-1">UGX 38.00</p>
          </div>
        </article>

        {/* Product Card 3 */}
        <article className="group flex flex-col gap-3">
          <Link to="/shop/lumina-serum" className="relative bg-surface-container-low aspect-[4/5] overflow-hidden rounded-sm ambient-glow transition-shadow duration-300 block">
            <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAFsPEFTnqKSCuB1bJHJjVPsLGTxmR5pE_euNMCnp3gc6jGDy0LLR4BR53ZmSjqjPxPsiwTu1N0LtQWZDd2C5dyRy2xxEDRU2iqxrO0IaffTTZ0mFYt__JnPzLuzEBKrL9sBxlbkInB9LBS1AM6VsRgQkjchjiffam4yPv_X5xuTBOqvv3Yv0yGbA-kHfCbXTPFZ9vBbIh8_OowPLJO_lp4-B__iLDMifouIubySPy8r4tbj4IfoqvK_Q" alt="Gloss Serum Drops" />
            <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out bg-gradient-to-t from-surface/80 to-transparent backdrop-blur-[2px]">
              <button onClick={(e) => { e.preventDefault(); handleAddToCart('prod_serum_1', 'Gloss Serum Drops', 45, 'https://lh3.googleusercontent.com/aida-public/AB6AXuAFsPEFTnqKSCuB1bJHJjVPsLGTxmR5pE_euNMCnp3gc6jGDy0LLR4BR53ZmSjqjPxPsiwTu1N0LtQWZDd2C5dyRy2xxEDRU2iqxrO0IaffTTZ0mFYt__JnPzLuzEBKrL9sBxlbkInB9LBS1AM6VsRgQkjchjiffam4yPv_X5xuTBOqvv3Yv0yGbA-kHfCbXTPFZ9vBbIh8_OowPLJO_lp4-B__iLDMifouIubySPy8r4tbj4IfoqvK_Q'); }} className="w-full bg-primary text-on-primary py-3 font-label-caps text-label-caps hover:bg-primary-container transition-colors shadow-lg flex justify-center items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                Quick Add
              </button>
            </div>
          </Link>
          <div className="flex flex-col">
            <h3 className="font-body-lg text-body-lg font-semibold truncate">Gloss Serum Drops</h3>
            <p className="text-secondary mt-1">UGX 45.00</p>
          </div>
        </article>

        {/* Product Card 4 */}
        <article className="group flex flex-col gap-3">
          <div className="relative bg-surface-container-low aspect-[4/5] overflow-hidden rounded-sm ambient-glow transition-shadow duration-300">
            <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB6zifN1b70P4H31JCdKg_KQU1AkjX5EacZsmZhF-S0t77FP166I4Df1hdfmB0mR30t03ann5MDDpricDlsrKt9oZwmHQNoL2brXLjZRXDrEL5WeuV_ZjHhHZptwY5wFRBrj_FP7pqnDYyzpuE5MYPxB5u4t5nE126_H8YycXv0WZX52J0CjZ7HA8lihfxD8_tsWaztLEzboYXvtKryeIBjUDYs-e4OPkmRTJET79C5jXzB65T2vnxbjQ" alt="Pearl Pin Set" />
            <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out bg-gradient-to-t from-surface/80 to-transparent backdrop-blur-[2px]">
              <button onClick={() => handleAddToCart('prod_pin_1', 'Pearl Pin Set', 18, 'https://lh3.googleusercontent.com/aida-public/AB6AXuB6zifN1b70P4H31JCdKg_KQU1AkjX5EacZsmZhF-S0t77FP166I4Df1hdfmB0mR30t03ann5MDDpricDlsrKt9oZwmHQNoL2brXLjZRXDrEL5WeuV_ZjHhHZptwY5wFRBrj_FP7pqnDYyzpuE5MYPxB5u4t5nE126_H8YycXv0WZX52J0CjZ7HA8lihfxD8_tsWaztLEzboYXvtKryeIBjUDYs-e4OPkmRTJET79C5jXzB65T2vnxbjQ')} className="w-full bg-primary text-on-primary py-3 font-label-caps text-label-caps hover:bg-primary-container transition-colors shadow-lg flex justify-center items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                Quick Add
              </button>
            </div>
            <div className="absolute top-3 left-3 bg-on-background text-surface px-2 py-1 font-label-caps text-[10px] tracking-wider rounded-sm">BESTSELLER</div>
          </div>
          <div className="flex flex-col">
            <h3 className="font-body-lg text-body-lg font-semibold truncate">Pearl Pin Set</h3>
            <p className="text-secondary mt-1">UGX 18.00</p>
          </div>
        </article>
      </section>
    </main>
  );
}
