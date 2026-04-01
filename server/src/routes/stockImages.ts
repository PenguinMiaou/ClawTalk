import { Router } from 'express';
import axios from 'axios';
import { dualAuth } from '../middleware/dualAuth';
import { getRedis } from '../config/redis';
import * as fs from 'fs';
import * as path from 'path';
import type { StockImageEntry } from '../services/stockImageCron';

const router = Router();

// 45 categories with fallback presets
const PRESETS: Record<string, string[]> = {
  // Tech
  technology: [
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400',
    'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400',
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400',
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400',
  ],
  ai: [
    'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=400',
    'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=400',
    'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400',
    'https://images.unsplash.com/photo-1507146153580-69a1fe6d8aa1?w=400',
  ],
  coding: [
    'https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=400',
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400',
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400',
    'https://images.unsplash.com/photo-1607799279861-4dd421887fc5?w=400',
  ],
  gaming: [
    'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400',
    'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400',
    'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400',
    'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400',
  ],
  // Food & Drink
  food: [
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
    'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400',
    'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=400',
    'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400',
  ],
  coffee: [
    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400',
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400',
    'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=400',
  ],
  tea: [
    'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400',
    'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400',
    'https://images.unsplash.com/photo-1558160074-4d7d8bdf4256?w=400',
  ],
  dessert: [
    'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400',
    'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400',
    'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400',
  ],
  // Nature & Scenery
  nature: [
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400',
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400',
    'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=400',
    'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=400',
  ],
  ocean: [
    'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=400',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400',
    'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=400',
  ],
  sunset: [
    'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=400',
    'https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=400',
    'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=400',
  ],
  flower: [
    'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=400',
    'https://images.unsplash.com/photo-1455659817273-f96807779a8a?w=400',
    'https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=400',
  ],
  plant: [
    'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400',
    'https://images.unsplash.com/photo-1463936575829-25148e1db1b8?w=400',
    'https://images.unsplash.com/photo-1501004318855-e73f7a5e92dd?w=400',
  ],
  space: [
    'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=400',
    'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=400',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400',
    'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=400',
  ],
  // Travel & City
  travel: [
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400',
    'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400',
    'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400',
    'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=400',
  ],
  city: [
    'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400',
    'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=400',
    'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400',
    'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=400',
  ],
  street: [
    'https://images.unsplash.com/photo-1476725376606-78bd56004997?w=400',
    'https://images.unsplash.com/photo-1517732306149-e8f829eb588a?w=400',
    'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=400',
  ],
  architecture: [
    'https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=400',
    'https://images.unsplash.com/photo-1431576901776-e539bd916ba2?w=400',
    'https://images.unsplash.com/photo-1448630360428-65456885c650?w=400',
  ],
  // People & Lifestyle
  lifestyle: [
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400',
    'https://images.unsplash.com/photo-1488998427799-e3362cec87c3?w=400',
    'https://images.unsplash.com/photo-1493863641943-9b68992a8d07?w=400',
  ],
  fashion: [
    'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400',
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
    'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400',
  ],
  beauty: [
    'https://images.unsplash.com/photo-1503236823255-94609f598e71?w=400',
    'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400',
    'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400',
  ],
  fitness: [
    'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400',
    'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400',
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400',
  ],
  sports: [
    'https://images.unsplash.com/photo-1461896836934-bd45ba208916?w=400',
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400',
    'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=400',
  ],
  health: [
    'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400',
    'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400',
    'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=400',
  ],
  wedding: [
    'https://images.unsplash.com/photo-1519741497674-611481863552?w=400',
    'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=400',
    'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400',
  ],
  baby: [
    'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=400',
    'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400',
    'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=400',
  ],
  // Home & Interior
  home: [
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400',
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400',
    'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=400',
    'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=400',
  ],
  // Animals
  cat: [
    'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400',
    'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=400',
    'https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?w=400',
    'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=400',
  ],
  dog: [
    'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400',
    'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400',
    'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=400',
  ],
  animal: [
    'https://images.unsplash.com/photo-1474511320723-9a56873571b7?w=400',
    'https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?w=400',
    'https://images.unsplash.com/photo-1425082661507-6af0db74d6a4?w=400',
  ],
  cute: [
    'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=400',
    'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400',
    'https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=400',
  ],
  // Art & Creative
  anime: [
    'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400',
    'https://images.unsplash.com/photo-1613376023733-0a73315d9b06?w=400',
    'https://images.unsplash.com/photo-1560972550-aba3456b5564?w=400',
    'https://images.unsplash.com/photo-1611457194403-d3f8c5bfbef4?w=400',
  ],
  art: [
    'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400',
    'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=400',
    'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400',
  ],
  illustration: [
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400',
    'https://images.unsplash.com/photo-1633177317976-3f9bc45e1d1d?w=400',
    'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=400',
  ],
  photography: [
    'https://images.unsplash.com/photo-1452780212940-6f5c0d14d848?w=400',
    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400',
    'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=400',
  ],
  // Entertainment
  music: [
    'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400',
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400',
  ],
  movie: [
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400',
    'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400',
    'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400',
  ],
  // Work & Education
  work: [
    'https://images.unsplash.com/photo-1497215842964-222b430dc094?w=400',
    'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=400',
    'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400',
  ],
  finance: [
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400',
    'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=400',
    'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=400',
  ],
  education: [
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400',
    'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400',
    'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=400',
  ],
  book: [
    'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400',
    'https://images.unsplash.com/photo-1524578271613-d550eacf6090?w=400',
    'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400',
  ],
  car: [
    'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400',
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400',
    'https://images.unsplash.com/photo-1542362567-b07e54358753?w=400',
  ],
  // Aesthetic & Mood
  abstract: [
    'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=400',
    'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=400',
    'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400',
  ],
  aesthetic: [
    'https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?w=400',
    'https://images.unsplash.com/photo-1525909002-1b05e0c869d8?w=400',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400',
  ],
  vintage: [
    'https://images.unsplash.com/photo-1501127122-f385ca6ddd9d?w=400',
    'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400',
    'https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?w=400',
  ],
  minimalist: [
    'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=400',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    'https://images.unsplash.com/photo-1449247709967-d4461a6a6103?w=400',
  ],
  night: [
    'https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=400',
    'https://images.unsplash.com/photo-1514900566782-1ef12fa73f5b?w=400',
    'https://images.unsplash.com/photo-1532978379173-523e16f371f2?w=400',
  ],
  neon: [
    'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=400',
    'https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?w=400',
    'https://images.unsplash.com/photo-1550684376-efcbd6e3f031?w=400',
  ],
  holiday: [
    'https://images.unsplash.com/photo-1482517967863-00e15c9b44be?w=400',
    'https://images.unsplash.com/photo-1512389142860-9c449e58a814?w=400',
    'https://images.unsplash.com/photo-1543589077-47d81606c1bf?w=400',
  ],
  // Misc
  meme: [
    'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=400',
    'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=400',
    'https://images.unsplash.com/photo-1596854273338-cbf078ec7071?w=400',
  ],
  default: [
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400',
    'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400',
    'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=400',
  ],
};

// Alias mapping for fuzzy topic matching (Chinese + English synonyms)
const ALIASES: Record<string, string> = {
  tech: 'technology', 科技: 'technology', 数码: 'technology',
  人工智能: 'ai', 机器学习: 'ai', robot: 'ai', ml: 'ai',
  程序: 'coding', 编程: 'coding', 代码: 'coding', programming: 'coding', dev: 'coding',
  游戏: 'gaming', game: 'gaming', esports: 'gaming',
  美食: 'food', 吃: 'food', 餐: 'food', cooking: 'food', 做饭: 'food',
  咖啡: 'coffee', cafe: 'coffee', 奶茶: 'coffee',
  茶: 'tea', 茶文化: 'tea',
  甜品: 'dessert', cake: 'dessert', 蛋糕: 'dessert',
  自然: 'nature', 风景: 'nature', scenery: 'nature', landscape: 'nature',
  海: 'ocean', sea: 'ocean', beach: 'ocean', 海滩: 'ocean',
  日落: 'sunset', sunrise: 'sunset', 日出: 'sunset',
  花: 'flower', 鲜花: 'flower', 花束: 'flower',
  绿植: 'plant', 园艺: 'plant', garden: 'plant', 盆栽: 'plant',
  太空: 'space', 星空: 'space', 宇宙: 'space', astronomy: 'space',
  旅行: 'travel', 旅游: 'travel', trip: 'travel', vacation: 'travel',
  城市: 'city', urban: 'city', 都市: 'city',
  街: 'street', 街拍: 'street', 街头: 'street',
  建筑: 'architecture', building: 'architecture',
  生活: 'lifestyle', life: 'lifestyle', daily: 'lifestyle',
  时尚: 'fashion', 穿搭: 'fashion', outfit: 'fashion', style: 'fashion', ootd: 'fashion',
  美女: 'beauty', 颜值: 'beauty', portrait: 'beauty', model: 'beauty', 好看: 'beauty', 护肤: 'beauty',
  健身: 'fitness', gym: 'fitness', workout: 'fitness',
  运动: 'sports', sport: 'sports', 篮球: 'sports', 足球: 'sports',
  养生: 'health', wellness: 'health', 瑜伽: 'health', yoga: 'health', meditation: 'health',
  婚礼: 'wedding', 婚纱: 'wedding',
  宝宝: 'baby', 母婴: 'baby', 育儿: 'baby', parenting: 'baby',
  家居: 'home', 家装: 'home', interior: 'home', decor: 'home', 装修: 'home',
  猫: 'cat', 猫咪: 'cat', kitten: 'cat',
  狗: 'dog', 狗狗: 'dog', puppy: 'dog',
  动物: 'animal', pet: 'animal', 宠物: 'animal',
  可爱: 'cute', kawaii: 'cute', 萌: 'cute',
  二次元: 'anime', 动漫: 'anime', acg: 'anime', manga: 'anime', cosplay: 'anime',
  艺术: 'art', painting: 'art', 画: 'art', 绘画: 'art',
  插画: 'illustration', design: 'illustration', 设计: 'illustration',
  摄影: 'photography', photo: 'photography', camera: 'photography',
  音乐: 'music', 歌: 'music', concert: 'music',
  电影: 'movie', film: 'movie', cinema: 'movie',
  工作: 'work', office: 'work', 职场: 'work', business: 'work',
  金融: 'finance', stock: 'finance', 股票: 'finance', money: 'finance', 理财: 'finance',
  教育: 'education', 学习: 'education', study: 'education', school: 'education',
  书: 'book', reading: 'book', 读书: 'book', 阅读: 'book',
  汽车: 'car', 车: 'car', automotive: 'car', driving: 'car',
  抽象: 'abstract', 壁纸: 'abstract', wallpaper: 'abstract',
  审美: 'aesthetic', 氛围: 'aesthetic', vibe: 'aesthetic', mood: 'aesthetic',
  复古: 'vintage', retro: 'vintage', 怀旧: 'vintage',
  极简: 'minimalist', minimal: 'minimalist', 简约: 'minimalist',
  夜: 'night', 夜景: 'night', nightlife: 'night',
  霓虹: 'neon', 赛博朋克: 'neon', cyberpunk: 'neon',
  节日: 'holiday', 春节: 'holiday', christmas: 'holiday', 圣诞: 'holiday', festival: 'holiday',
  搞笑: 'meme', funny: 'meme', humor: 'meme', 表情包: 'meme',
};

const DATA_FILE = path.join(__dirname, '../../data/stock-images.json');

// Shuffle array in place
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Normalize entry: handles both new format (object) and legacy format (plain URL string)
function normalizeEntry(entry: StockImageEntry | string): StockImageEntry {
  if (typeof entry === 'string') {
    return { url: entry, photographer: 'Unsplash', photographerUrl: 'https://unsplash.com', downloadLocation: '' };
  }
  return entry;
}

// Read cached images from Redis → file → presets
async function getImages(topic: string, count: number): Promise<{ images: any[]; source: string }> {
  const resolved = ALIASES[topic] || topic;

  // 1. Try Redis cache
  const redis = getRedis();
  if (redis) {
    try {
      const cached = await redis.get(`stock:${resolved}`);
      if (cached) {
        const entries: (StockImageEntry | string)[] = JSON.parse(cached);
        const images = shuffle([...entries]).slice(0, count).map(e => {
          const n = normalizeEntry(e);
          return { url: n.url, thumb: n.url, photographer: n.photographer, photographer_url: n.photographerUrl + '?utm_source=clawtalk&utm_medium=referral', credit: 'Unsplash', download_location: n.downloadLocation };
        });
        return { images, source: 'cache' };
      }
    } catch { /* fall through */ }
  }

  // 2. Try local JSON file
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
      if (data[resolved] && data[resolved].length > 0) {
        const images = shuffle([...data[resolved]]).slice(0, count).map((e: StockImageEntry | string) => {
          const n = normalizeEntry(e);
          return { url: n.url, thumb: n.url, photographer: n.photographer, photographer_url: n.photographerUrl + '?utm_source=clawtalk&utm_medium=referral', credit: 'Unsplash', download_location: n.downloadLocation };
        });
        return { images, source: 'file' };
      }
    }
  } catch { /* fall through */ }

  // 3. Fallback to hardcoded presets (no photographer info available)
  const pool = PRESETS[resolved] || PRESETS.default;
  const images = shuffle([...pool]).slice(0, count).map(url => ({
    url, thumb: url, photographer: 'Unsplash', photographer_url: 'https://unsplash.com?utm_source=clawtalk&utm_medium=referral', credit: 'Unsplash', download_location: '',
  }));
  return { images, source: 'preset' };
}

// Trigger Unsplash download event (Section 6 compliance)
async function triggerDownload(downloadLocation: string): Promise<void> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey || !downloadLocation) return;
  try {
    await axios.get(downloadLocation, {
      headers: { Authorization: `Client-ID ${accessKey}` },
      timeout: 5000,
    });
  } catch { /* non-critical, best effort */ }
}

router.get('/', dualAuth, async (req, res) => {
  const topic = (req.query.topic as string || 'default').toLowerCase();
  const count = Math.min(parseInt(req.query.count as string) || 3, 9);
  const result = await getImages(topic, count);

  // Fire-and-forget download tracking for each image (Unsplash TOS Section 6)
  for (const img of result.images) {
    if (img.download_location) triggerDownload(img.download_location);
  }

  res.json(result);
});

// List available topics
router.get('/topics', dualAuth, (_req, res) => {
  const topics = Object.keys(PRESETS).filter(k => k !== 'default');
  res.json({ topics, total: topics.length, aliases: Object.keys(ALIASES).length });
});

export { router as stockImagesRouter };
export { PRESETS, ALIASES, DATA_FILE };
