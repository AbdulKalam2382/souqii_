import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ──────────────────────────────
// Categories to ensure exist
// ──────────────────────────────
const categories = [
  { name: 'Graphics Cards', slug: 'gpu' },
  { name: 'Processors', slug: 'cpu' },
  { name: 'Motherboards', slug: 'motherboard' },
  { name: 'Memory (RAM)', slug: 'ram' },
  { name: 'Power Supplies', slug: 'psu' },
  { name: 'Storage', slug: 'storage' },
];

// ──────────────────────────────
// Products with full specs
// ──────────────────────────────
function getProducts(catMap) {
  return [
    // ── GPUs ──
    {
      name: 'NVIDIA GeForce RTX 4090 Founders Edition',
      brand: 'NVIDIA',
      price: 550.00,
      stock: 5,
      category_id: catMap['gpu'],
      image_url: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400',
      specs: { chipset: 'RTX 4090', vram: '24GB GDDR6X', tdp: '450W', pcie: 'PCIe 4.0 x16', clock: '2520 MHz Boost', outputs: 'HDMI 2.1, 3x DisplayPort 1.4a' }
    },
    {
      name: 'NVIDIA GeForce RTX 4070 Ti SUPER',
      brand: 'NVIDIA',
      price: 260.00,
      stock: 12,
      category_id: catMap['gpu'],
      image_url: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400',
      specs: { chipset: 'RTX 4070 Ti SUPER', vram: '16GB GDDR6X', tdp: '285W', pcie: 'PCIe 4.0 x16', clock: '2610 MHz Boost', outputs: 'HDMI 2.1, 3x DisplayPort 1.4a' }
    },
    {
      name: 'AMD Radeon RX 7900 XTX',
      brand: 'AMD',
      price: 300.00,
      stock: 8,
      category_id: catMap['gpu'],
      image_url: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400',
      specs: { chipset: 'RX 7900 XTX', vram: '24GB GDDR6', tdp: '355W', pcie: 'PCIe 4.0 x16', clock: '2500 MHz Boost', outputs: 'HDMI 2.1, 2x DisplayPort 2.1' }
    },
    {
      name: 'NVIDIA GeForce RTX 4060',
      brand: 'NVIDIA',
      price: 95.00,
      stock: 20,
      category_id: catMap['gpu'],
      image_url: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400',
      specs: { chipset: 'RTX 4060', vram: '8GB GDDR6', tdp: '115W', pcie: 'PCIe 4.0 x16', clock: '2460 MHz Boost', outputs: 'HDMI 2.1, 3x DisplayPort 1.4a' }
    },

    // ── CPUs ──
    {
      name: 'Intel Core i9-14900K',
      brand: 'Intel',
      price: 175.00,
      stock: 10,
      category_id: catMap['cpu'],
      image_url: 'https://images.unsplash.com/photo-1555617981-dac3d01bef5b?w=400',
      specs: { socket: 'LGA 1700', cores: '24 (8P+16E)', threads: 32, clock: '6.0 GHz Boost', tdp: '253W', ddr: 'DDR4/DDR5', pcie: 'PCIe 5.0' }
    },
    {
      name: 'Intel Core i7-14700K',
      brand: 'Intel',
      price: 120.00,
      stock: 15,
      category_id: catMap['cpu'],
      image_url: 'https://images.unsplash.com/photo-1555617981-dac3d01bef5b?w=400',
      specs: { socket: 'LGA 1700', cores: '20 (8P+12E)', threads: 28, clock: '5.6 GHz Boost', tdp: '253W', ddr: 'DDR4/DDR5', pcie: 'PCIe 5.0' }
    },
    {
      name: 'AMD Ryzen 9 7950X',
      brand: 'AMD',
      price: 185.00,
      stock: 7,
      category_id: catMap['cpu'],
      image_url: 'https://images.unsplash.com/photo-1555617981-dac3d01bef5b?w=400',
      specs: { socket: 'AM5', cores: 16, threads: 32, clock: '5.7 GHz Boost', tdp: '170W', ddr: 'DDR5', pcie: 'PCIe 5.0' }
    },
    {
      name: 'AMD Ryzen 7 7800X3D',
      brand: 'AMD',
      price: 135.00,
      stock: 18,
      category_id: catMap['cpu'],
      image_url: 'https://images.unsplash.com/photo-1555617981-dac3d01bef5b?w=400',
      specs: { socket: 'AM5', cores: 8, threads: 16, clock: '5.0 GHz Boost', tdp: '120W', ddr: 'DDR5', pcie: 'PCIe 5.0', cache: '96MB 3D V-Cache' }
    },

    // ── Motherboards ──
    {
      name: 'ASUS ROG Maximus Z790 Hero',
      brand: 'ASUS',
      price: 195.00,
      stock: 6,
      category_id: catMap['motherboard'],
      image_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400',
      specs: { socket: 'LGA 1700', chipset: 'Z790', formFactor: 'ATX', ddr: 'DDR5', maxRam: '128GB', pcie: 'PCIe 5.0 x16', m2Slots: 5, wifi: 'WiFi 6E' }
    },
    {
      name: 'MSI MAG B760 TOMAHAWK WiFi',
      brand: 'MSI',
      price: 65.00,
      stock: 14,
      category_id: catMap['motherboard'],
      image_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400',
      specs: { socket: 'LGA 1700', chipset: 'B760', formFactor: 'ATX', ddr: 'DDR5', maxRam: '128GB', pcie: 'PCIe 4.0 x16', m2Slots: 2, wifi: 'WiFi 6E' }
    },
    {
      name: 'ASUS ROG Crosshair X670E Hero',
      brand: 'ASUS',
      price: 210.00,
      stock: 4,
      category_id: catMap['motherboard'],
      image_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400',
      specs: { socket: 'AM5', chipset: 'X670E', formFactor: 'ATX', ddr: 'DDR5', maxRam: '128GB', pcie: 'PCIe 5.0 x16', m2Slots: 4, wifi: 'WiFi 6E' }
    },

    // ── RAM ──
    {
      name: 'Corsair Vengeance DDR5 32GB (2x16GB) 6000MHz',
      brand: 'Corsair',
      price: 45.00,
      stock: 25,
      category_id: catMap['ram'],
      image_url: 'https://images.unsplash.com/photo-1562976540-1502c2145886?w=400',
      specs: { type: 'DDR5', capacity: '32GB (2x16GB)', speed: '6000 MHz', latency: 'CL36', voltage: '1.35V', profile: 'Intel XMP 3.0 / AMD EXPO' }
    },
    {
      name: 'G.Skill Trident Z5 RGB DDR5 16GB (2x8GB) 6400MHz',
      brand: 'G.Skill',
      price: 28.00,
      stock: 30,
      category_id: catMap['ram'],
      image_url: 'https://images.unsplash.com/photo-1562976540-1502c2145886?w=400',
      specs: { type: 'DDR5', capacity: '16GB (2x8GB)', speed: '6400 MHz', latency: 'CL32', voltage: '1.40V', profile: 'Intel XMP 3.0' }
    },

    // ── PSUs ──
    {
      name: 'Corsair RM850x 850W 80+ Gold Modular',
      brand: 'Corsair',
      price: 42.00,
      stock: 16,
      category_id: catMap['psu'],
      image_url: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=400',
      specs: { wattage: '850W', efficiency: '80+ Gold', modular: 'Fully Modular', fan: '135mm ML Fan', protection: 'OVP/UVP/OCP/OTP/SCP', connectors: '2x PCIe 5.0 12VHPWR' }
    },
    {
      name: 'EVGA SuperNOVA 750 G7 750W 80+ Gold',
      brand: 'EVGA',
      price: 32.00,
      stock: 10,
      category_id: catMap['psu'],
      image_url: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=400',
      specs: { wattage: '750W', efficiency: '80+ Gold', modular: 'Fully Modular', fan: '120mm FDB Fan', protection: 'OVP/UVP/OCP/OTP/SCP' }
    },

    // ── Storage ──
    {
      name: 'Samsung 990 Pro 2TB NVMe M.2 SSD',
      brand: 'Samsung',
      price: 60.00,
      stock: 22,
      category_id: catMap['storage'],
      image_url: 'https://images.unsplash.com/photo-1597138804456-e7dca7f59d54?w=400',
      specs: { capacity: '2TB', interface: 'NVMe PCIe 4.0 x4', formFactor: 'M.2 2280', readSpeed: '7450 MB/s', writeSpeed: '6900 MB/s', endurance: '1200 TBW' }
    },
  ];
}

// ──────────────────────────────
// SEED LOGIC
// ──────────────────────────────
async function seed() {
  console.log('🌱 Starting Souqii database seed...\n');

  // Step 1: Upsert categories
  console.log('📁 Seeding categories...');
  for (const cat of categories) {
    const { data, error } = await supabase
      .from('categories')
      .upsert(cat, { onConflict: 'slug' })
      .select()
      .single();
    if (error) {
      console.error(`  ❌ Category "${cat.name}":`, error.message);
    } else {
      console.log(`  ✅ ${cat.name} (ID: ${data.id})`);
    }
  }

  // Step 2: Build category slug → id map
  const { data: allCats } = await supabase.from('categories').select('id, slug');
  const catMap = {};
  for (const c of allCats) {
    catMap[c.slug] = c.id;
  }
  console.log('\n📦 Category map:', catMap);

  // Step 3: Insert products
  const products = getProducts(catMap);
  console.log(`\n🖥  Seeding ${products.length} products...`);
  
  for (const product of products) {
    // Check if a product with same name already exists
    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('name', product.name)
      .maybeSingle();
    
    if (existing) {
      console.log(`  ⏭  Skipping "${product.name}" (already exists, ID: ${existing.id})`);
      continue;
    }

    const { data, error } = await supabase
      .from('products')
      .insert(product)
      .select()
      .single();

    if (error) {
      console.error(`  ❌ "${product.name}":`, error.message);
    } else {
      console.log(`  ✅ ${product.name} — KD ${product.price} (ID: ${data.id})`);
    }
  }

  // Step 4: Final count
  const { count } = await supabase.from('products').select('*', { count: 'exact', head: true });
  console.log(`\n🎉 Done! Total products in database: ${count}`);
}

seed();
