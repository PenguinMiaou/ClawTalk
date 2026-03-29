import { Router } from 'express';
import { dualAuth } from '../middleware/dualAuth';
import axios from 'axios';

const router = Router();

// Preset images by topic (fallback when Unsplash is unavailable)
const PRESETS: Record<string, string[]> = {
  // Tech & Programming
  technology: [
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400',
    'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400',
    'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=400',
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400',
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400',
    'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=400',
  ],
  ai: [
    'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=400',
    'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=400',
    'https://images.unsplash.com/photo-1555255707-c07966088b7b?w=400',
    'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400',
    'https://images.unsplash.com/photo-1507146153580-69a1fe6d8aa1?w=400',
  ],
  coding: [
    'https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=400',
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400',
    'https://images.unsplash.com/photo-1515879218367-8466d910auj9?w=400',
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400',
    'https://images.unsplash.com/photo-1607799279861-4dd421887fc5?w=400',
  ],
  gaming: [
    'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400',
    'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400',
    'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400',
    'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400',
    'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=400',
  ],
  // Food & Drink
  food: [
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
    'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400',
    'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=400',
    'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=400',
    'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400',
  ],
  coffee: [
    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400',
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400',
    'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400',
    'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=400',
  ],
  dessert: [
    'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400',
    'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400',
    'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400',
    'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400',
  ],
  // Nature & Travel
  nature: [
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400',
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400',
    'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=400',
    'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=400',
    'https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?w=400',
  ],
  travel: [
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400',
    'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400',
    'https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=400',
    'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400',
    'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=400',
  ],
  ocean: [
    'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=400',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400',
    'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=400',
    'https://images.unsplash.com/photo-1494947065401-c9baab093171?w=400',
  ],
  city: [
    'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400',
    'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=400',
    'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=400',
    'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400',
    'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=400',
  ],
  // People & Lifestyle
  lifestyle: [
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400',
    'https://images.unsplash.com/photo-1488998427799-e3362cec87c3?w=400',
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    'https://images.unsplash.com/photo-1493863641943-9b68992a8d07?w=400',
  ],
  fashion: [
    'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400',
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
    'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400',
    'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400',
  ],
  beauty: [
    'https://images.unsplash.com/photo-1503236823255-94609f598e71?w=400',
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400',
    'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400',
    'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400',
    'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400',
  ],
  fitness: [
    'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400',
    'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400',
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400',
    'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=400',
  ],
  // Animals & Cute
  cat: [
    'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400',
    'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=400',
    'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=400',
    'https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?w=400',
    'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=400',
  ],
  dog: [
    'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400',
    'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400',
    'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400',
    'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=400',
  ],
  animal: [
    'https://images.unsplash.com/photo-1474511320723-9a56873571b7?w=400',
    'https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?w=400',
    'https://images.unsplash.com/photo-1484406566174-9da000fda645?w=400',
    'https://images.unsplash.com/photo-1425082661507-6af0db74d6a4?w=400',
  ],
  cute: [
    'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=400',
    'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400',
    'https://images.unsplash.com/photo-1560807707-8cc77767d783?w=400',
    'https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=400',
  ],
  // Art & Anime / Illustration
  anime: [
    'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400',
    'https://images.unsplash.com/photo-1613376023733-0a73315d9b06?w=400',
    'https://images.unsplash.com/photo-1560972550-aba3456b5564?w=400',
    'https://images.unsplash.com/photo-1607604276583-3d8a5e471607?w=400',
    'https://images.unsplash.com/photo-1611457194403-d3f8c5bfbef4?w=400',
  ],
  art: [
    'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400',
    'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=400',
    'https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=400',
    'https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=400',
    'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400',
  ],
  illustration: [
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400',
    'https://images.unsplash.com/photo-1633177317976-3f9bc45e1d1d?w=400',
    'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=400',
    'https://images.unsplash.com/photo-1614849963640-9cc74b2a826f?w=400',
  ],
  // Music & Entertainment
  music: [
    'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400',
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
    'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400',
    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400',
  ],
  movie: [
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400',
    'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400',
    'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400',
    'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400',
  ],
  // Work & Business
  work: [
    'https://images.unsplash.com/photo-1497215842964-222b430dc094?w=400',
    'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400',
    'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=400',
    'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400',
  ],
  finance: [
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400',
    'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=400',
    'https://images.unsplash.com/photo-1535320903710-d993d3d77d29?w=400',
    'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=400',
  ],
  // Books & Education
  book: [
    'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400',
    'https://images.unsplash.com/photo-1524578271613-d550eacf6090?w=400',
    'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400',
    'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400',
  ],
  // Abstract & Aesthetic
  abstract: [
    'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=400',
    'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=400',
    'https://images.unsplash.com/photo-1618172193622-ae2d025f4032?w=400',
    'https://images.unsplash.com/photo-1604076913837-52ab5f36df07?w=400',
    'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400',
  ],
  aesthetic: [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    'https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?w=400',
    'https://images.unsplash.com/photo-1525909002-1b05e0c869d8?w=400',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400',
  ],
  // Night & Neon
  night: [
    'https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=400',
    'https://images.unsplash.com/photo-1514900566782-1ef12fa73f5b?w=400',
    'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=400',
    'https://images.unsplash.com/photo-1532978379173-523e16f371f2?w=400',
  ],
  neon: [
    'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=400',
    'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400',
    'https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?w=400',
    'https://images.unsplash.com/photo-1550684376-efcbd6e3f031?w=400',
  ],
  // Meme & Fun
  meme: [
    'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=400',
    'https://images.unsplash.com/photo-1596854273338-cbf078ec7071?w=400',
    'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400',
    'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=400',
  ],
  // Default fallback
  default: [
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400',
    'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400',
    'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=400',
    'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=400',
  ],
};

// Alias mapping for fuzzy topic matching
const ALIASES: Record<string, string> = {
  tech: 'technology', 程序: 'coding', 编程: 'coding', 代码: 'coding', programming: 'coding',
  人工智能: 'ai', 机器学习: 'ai', robot: 'ai', ml: 'ai',
  游戏: 'gaming', game: 'gaming', esports: 'gaming',
  美食: 'food', 吃: 'food', 餐: 'food', cooking: 'food',
  咖啡: 'coffee', cafe: 'coffee', 奶茶: 'coffee',
  甜品: 'dessert', cake: 'dessert', 蛋糕: 'dessert',
  自然: 'nature', 风景: 'nature', scenery: 'nature', landscape: 'nature',
  旅行: 'travel', 旅游: 'travel', trip: 'travel', vacation: 'travel',
  海: 'ocean', sea: 'ocean', beach: 'ocean', 海滩: 'ocean',
  城市: 'city', urban: 'city', street: 'city', 街: 'city',
  生活: 'lifestyle', life: 'lifestyle', daily: 'lifestyle',
  时尚: 'fashion', 穿搭: 'fashion', outfit: 'fashion', style: 'fashion',
  美女: 'beauty', 颜值: 'beauty', portrait: 'beauty', model: 'beauty', 好看: 'beauty',
  健身: 'fitness', gym: 'fitness', workout: 'fitness', sport: 'fitness', 运动: 'fitness',
  猫: 'cat', 猫咪: 'cat', kitten: 'cat',
  狗: 'dog', 狗狗: 'dog', puppy: 'dog',
  动物: 'animal', pet: 'animal', 宠物: 'animal',
  可爱: 'cute', kawaii: 'cute', 萌: 'cute',
  二次元: 'anime', 动漫: 'anime', acg: 'anime', manga: 'anime', cosplay: 'anime',
  艺术: 'art', painting: 'art', 画: 'art', 绘画: 'art',
  插画: 'illustration', design: 'illustration', 设计: 'illustration',
  音乐: 'music', 歌: 'music', concert: 'music',
  电影: 'movie', film: 'movie', 影: 'movie', cinema: 'movie',
  工作: 'work', office: 'work', 职场: 'work', business: 'work',
  金融: 'finance', stock: 'finance', 股票: 'finance', money: 'finance', 理财: 'finance',
  书: 'book', reading: 'book', 读书: 'book', 阅读: 'book',
  抽象: 'abstract', 壁纸: 'abstract', wallpaper: 'abstract',
  审美: 'aesthetic', 氛围: 'aesthetic', vibe: 'aesthetic', mood: 'aesthetic',
  夜: 'night', 夜景: 'night', nightlife: 'night',
  霓虹: 'neon', 赛博朋克: 'neon', cyberpunk: 'neon',
  搞笑: 'meme', funny: 'meme', humor: 'meme', 表情包: 'meme',
};

router.get('/', dualAuth, async (req, res) => {
  const rawTopic = (req.query.topic as string || 'default').toLowerCase();
  const topic = ALIASES[rawTopic] || rawTopic;
  const count = Math.min(parseInt(req.query.count as string) || 3, 9);

  // Try Unsplash API if UNSPLASH_ACCESS_KEY is set
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
  if (unsplashKey) {
    try {
      const resp = await axios.get('https://api.unsplash.com/photos/random', {
        params: { query: topic, count, orientation: 'squarish' },
        headers: { Authorization: `Client-ID ${unsplashKey}` },
        timeout: 5000,
      });
      const images = resp.data.map((p: any) => ({
        url: p.urls.regular,
        thumb: p.urls.thumb,
        credit: p.user.name,
      }));
      return res.json({ images, source: 'unsplash' });
    } catch {
      // Fall through to presets
    }
  }

  // Fallback to presets (shuffle to avoid always returning the same images)
  const pool = [...(PRESETS[topic] || PRESETS.default)];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const images = pool.slice(0, count).map(url => ({
    url,
    thumb: url,
    credit: 'Unsplash',
  }));
  res.json({ images, source: 'preset' });
});

// List available topics
router.get('/topics', dualAuth, (_req, res) => {
  const topics = Object.keys(PRESETS).filter(k => k !== 'default');
  res.json({ topics, aliases: Object.keys(ALIASES) });
});

export { router as stockImagesRouter };
