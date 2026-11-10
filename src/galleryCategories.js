export const GALLERY_CATEGORIES = [
  { id: 'home', label: 'Trang chủ' },
  { id: 'mines', label: 'Dò mìn' },
  { id: 'mole', label: 'Tặng dép' },
  { id: 'tic', label: 'Thơm X Thơm O' },
  { id: 'reaction', label: 'Nhanh Tay Bắt Thơm' },
  { id: 'puzzle', label: 'Ghép Thơm Đi!' },
  { id: 'onet', label: 'Nối Thơm Đi!' },
  { id: 'connect4', label: 'Bốn Quân Nhà Thơm' },
  { id: 'simon', label: 'Nhớ Lời Thơm' },
  { id: 'jigsaw', label: 'Mảnh Ghép Nhà Thơm' },
  { id: 'miner', label: 'Đào Dép Đi!' },
  { id: 'shared', label: 'Ảnh dùng chung / Chưa phân loại' },
];

export const TAB_TO_GALLERY_CATEGORY = {
  'Đào Dép Đi!': 'miner',
  'Trang chủ': 'home',
  'Dò mìn': 'mines',
  'Tặng dép': 'mole',
  'Thơm X Thơm O': 'tic',
  'Nhanh Tay Bắt Thơm': 'reaction',
  'Ghép Thơm Đi!': 'puzzle',
  'Nối Thơm Đi!': 'onet',
  'Bốn Quân Nhà Thơm': 'connect4',
  'Nhớ Lời Thơm': 'simon',
  'Mảnh Ghép Nhà Thơm': 'jigsaw',
};

export function categoryForTab(tab) {
  return TAB_TO_GALLERY_CATEGORY[tab] || 'shared';
}

export function categoryLabel(category) {
  return GALLERY_CATEGORIES.find(item => item.id === (category || 'shared'))?.label || 'Ảnh dùng chung / Chưa phân loại';
}

export function filterGalleryByScope(gallery, scope, currentCategory) {
  if (scope === 'all') return gallery;
  const wanted = scope === 'shared' ? 'shared' : currentCategory;
  return gallery.filter(image => (image.category || 'shared') === wanted);
}

export function groupGalleryByCategory(gallery) {
  return GALLERY_CATEGORIES
    .map(category => ({ ...category, images: gallery.filter(image => (image.category || 'shared') === category.id) }))
    .filter(group => group.images.length > 0);
}
