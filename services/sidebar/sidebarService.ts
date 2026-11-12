/**
 * SIDEBAR SERVICE
 * Sidebar için kategori ve ikon yönetimi.
 * HTTP yok — categoryService facade.
 *
 * Path alias yok: /api/sidebar, /categories/main kullanılmaz
 *   → GET /api/v1/categories?parent_id=null  (loadCategories)
 *   → hizmet menüsü: categoryService.getServiceCategories
 *     GET /api/v1/categories?is_service=true
 */

import { FaHandshakeSimple } from 'react-icons/fa6';
import { FaCar, FaQuestionCircle } from 'react-icons/fa';
import { IoHomeOutline, IoSettingsOutline, IoSwapHorizontal } from 'react-icons/io5';
import { GiClawHammer, GiHanger } from 'react-icons/gi';
import { BsTools, BsQuestionCircle } from 'react-icons/bs';
import { MdOutlineComputer, MdCheckroom } from 'react-icons/md';
import { BiSolidHomeHeart } from 'react-icons/bi';
import { RxCube } from 'react-icons/rx';
import categoryService from '@/services/category/categoryService';

type IconComponent = React.ComponentType<{ size?: number; className?: string }>;

interface CategoryItem {
  category_id?: number | string;
  id?: number | string;
  bgColor?: string;
  label?: string;
  name?: string;
  icon?: string;
  [key: string]: unknown;
}

/** Dokümantasyon / log — gerçek fetch categoryService içinde */
function resolveSidebarCategoriesTarget(): string {
  const raw = (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    ''
  ).replace(/\/$/, '');
  if (!raw) return '/api/v1/categories';
  const host = raw
    .replace(/\/api\/v1\/?$/, '')
    .replace(/\/api\/?$/, '')
    .replace(/\/v1\/?$/, '');
  return `${host}/api/v1/categories`;
}

const CATEGORIES_API_TARGET = resolveSidebarCategoriesTarget();

class SidebarService {
  private iconMap: Record<string, IconComponent>;

  constructor() {
    this.iconMap = {
      FaHandshakeSimple: FaHandshakeSimple as IconComponent,
      IoHomeOutline: IoHomeOutline as IconComponent,
      FaCar: FaCar as IconComponent,
      IoSettingsOutline: IoSettingsOutline as IconComponent,
      GiClawHammer: GiClawHammer as IconComponent,
      BsTools: BsTools as IconComponent,
      MdOutlineComputer: MdOutlineComputer as IconComponent,
      GiHanger: GiHanger as IconComponent,
      MdCheckroom: MdCheckroom as IconComponent,
      BiSolidHomeHeart: BiSolidHomeHeart as IconComponent,
      RxCube: RxCube as IconComponent,
      IoSwapHorizontal: IoSwapHorizontal as IconComponent,
      BsQuestionCircle: BsQuestionCircle as IconComponent,
      FaQuestionCircle: FaQuestionCircle as IconComponent,
    };
  }

  /**
   * Ana kategorileri yükler (Sidebar için)
   * Hedef: GET /api/v1/categories?parent_id=null (via categoryService)
   */
  async loadCategories(): Promise<CategoryItem[]> {
    try {
      console.log(
        `🔄 SidebarService: Ana kategoriler — hedef GET ${CATEGORIES_API_TARGET}?parent_id=null`
      );

      const categories = (await categoryService.getMainCategories()) as CategoryItem[];

      console.log(`✅ SidebarService: ${categories.length} ana kategori yüklendi`);

      return categories;
    } catch (error) {
      console.error('❌ SidebarService: Kategori yükleme hatası:', error);
      throw error;
    }
  }

  /**
   * Hizmet kategorileri (opsiyonel facade — Sidebar şu an doğrudan categoryService çağırır)
   * Hedef: GET /api/v1/categories?is_service=true
   */
  async loadServiceCategories(): Promise<CategoryItem[]> {
    try {
      console.log(
        `🔄 SidebarService: Hizmet kategorileri — hedef GET ${CATEGORIES_API_TARGET}?is_service=true`
      );
      const categories = (await categoryService.getServiceCategories()) as CategoryItem[];
      return categories;
    } catch (error) {
      console.error('❌ SidebarService: Hizmet kategori yükleme hatası:', error);
      throw error;
    }
  }

  getIconComponent(iconName: string): IconComponent {
    if (!iconName) {
      return BsQuestionCircle as IconComponent;
    }

    const Icon = this.iconMap[iconName];

    if (!Icon) {
      console.warn(`⚠️ İkon bulunamadı: ${iconName}, varsayılan ikon kullanılıyor`);
      return BsQuestionCircle as IconComponent;
    }

    return Icon;
  }

  getCategoryColor(category: CategoryItem): string {
    return category.bgColor || '#6c757d';
  }

  getCategoryName(category: CategoryItem): string {
    return category.label || category.name || 'İsimsiz Kategori';
  }

  getCategoryId(category: CategoryItem): number | string | undefined {
    return category.category_id || category.id;
  }
}

const sidebarService = new SidebarService();

export default sidebarService;
