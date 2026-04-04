import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// High-quality aesthetic Unsplash IDs for PC parts
const IMAGES = {
  cpu: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=600&q=80",
  gpu: "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=600&q=80",
  motherboard: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80",
  ram: "https://images.unsplash.com/photo-1562976540-1502f75923ba?w=600&q=80",
  storage: "https://images.unsplash.com/photo-1531492746076-161ca9bcad58?w=600&q=80",
  case: "https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=600&q=80",
  monitor: "https://images.unsplash.com/photo-1527443154391-42b76e36df17?w=600&q=80",
  default: "https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=600&q=80"
};

async function updateImages() {
  console.log("Fetching all products...");
  const { data: products, error } = await supabase.from('products').select('id, name, category_id, image_url');
  
  if (error) {
    console.error("Failed to fetch products:", error);
    return;
  }

  console.log(`Found ${products.length} products. Grouping updates by category...`);
  
  for (const product of products) {
    let newImage = IMAGES.default;
    const name = product.name.toLowerCase();
    
    // Attempt to parse category from name or ID simply since we know the rough inventory
    if (name.includes('core i') || name.includes('ryzen') || name.includes('cpu')) newImage = IMAGES.cpu;
    else if (name.includes('rtx') || name.includes('rx') || name.includes('gpu')) newImage = IMAGES.gpu;
    else if (name.includes('ddr4') || name.includes('ddr5') || name.includes('ram') || name.includes('corsair vengeance')) newImage = IMAGES.ram;
    else if (name.includes('z790') || name.includes('b650') || name.includes('motherboard')) newImage = IMAGES.motherboard;
    else if (name.includes('nvme') || name.includes('ssd') || name.includes('hdd') || name.includes('sata')) newImage = IMAGES.storage;
    else if (name.includes('case') || name.includes('tower') || name.includes('nzxt h')) newImage = IMAGES.case;
    else if (name.includes('monitor') || name.includes('gaming display')) newImage = IMAGES.monitor;

    if (product.image_url !== newImage) {
      await supabase.from('products').update({ image_url: newImage }).eq('id', product.id);
      console.log(`Updated [${product.name}] -> ${newImage.split('?')[0].split('/').pop()}`);
    }
  }

  console.log("✅ All product images successfully mapped and loaded.");
}

updateImages();
