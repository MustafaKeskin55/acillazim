/**
 * Kategori API — sarmalayıcı (facade)
 *
 * Canlı BE'yi kullanan `services/category/categoryService.ts` üzerinden veri alır
 * (GET /api/v1/categories, USE_API=true). Eskiden burada categories-data.json mock
 * dosyası doğrudan okunup düzleştiriliyordu; artık sadece gerçek servisten gelen
 * düz listeyi bu modülün beklediği { category_id, name, parent_id, slug, path, level }
 * şekline dönüştürüyor. Çağıranların imzası (initialize/getCategories/getCategoryById/
 * getCategoryBySlug/getSubcategories) değişmedi.
 */
import categoryService from '@/services/category/categoryService';

interface Category {
    category_id: number;
    name: string;
    parent_id: number | null;
    slug: string;
    path: string[];
    level: number;
    hasSubcategories?: boolean;
}

interface ApiResponse<T = unknown> {
    success: boolean;
    data: T | null;
    status: number;
    timestamp: string;
    error: string | null;
}

class CategoryAPI {
    private categories: Category[];
    private categoryById: Map<number, Category>;
    private categoryBySlug: Map<string, Category>;
    private subcategoriesByParent: Map<number, Category[]>;
    private isInitialized: boolean;
    private initPromise: Promise<boolean> | null;

    constructor() {
        this.categories = [];
        this.categoryById = new Map();
        this.categoryBySlug = new Map();
        this.subcategoriesByParent = new Map();
        this.isInitialized = false;
        this.initPromise = null;
    }

    /**
     * API Servisini başlat ve verileri hazırla (canlı BE'den)
     */
    async initialize(): Promise<boolean> {
        if (this.isInitialized) {
            return true;
        }
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = (async () => {
            try {
                const allCategories = await categoryService.getAllCategories();

                const byId = new Map<number, { category_id: number; label: string; parent_id: number | null; slug: string }>();
                allCategories.forEach((cat) => {
                    byId.set(Number(cat.category_id), {
                        category_id: Number(cat.category_id),
                        label: cat.label,
                        parent_id: cat.parent_id === null || cat.parent_id === undefined ? null : Number(cat.parent_id),
                        slug: cat.slug,
                    });
                });

                const buildPath = (id: number): string[] => {
                    const path: string[] = [];
                    let currentId: number | null = id;
                    const visited = new Set<number>();
                    while (currentId !== null && !visited.has(currentId)) {
                        visited.add(currentId);
                        const node = byId.get(currentId);
                        if (!node) break;
                        path.unshift(node.label);
                        currentId = node.parent_id;
                    }
                    return path;
                };

                this.categories = Array.from(byId.values()).map((node): Category => ({
                    category_id: node.category_id,
                    name: node.label,
                    parent_id: node.parent_id,
                    slug: node.slug,
                    path: buildPath(node.category_id),
                    level: buildPath(node.category_id).length - 1,
                }));

                this._buildRelationships();
                this._createIndexes();

                this.isInitialized = true;
                return true;
            } catch (error) {
                console.error('[CategoryAPI] Başlatma hatası:', error);
                this.initPromise = null;
                throw error;
            }
        })();

        return this.initPromise;
    }

    /**
     * Kategori ilişkilerini oluşturur
     */
    _buildRelationships(): void {
        this.categories.forEach((category) => {
            if (category.parent_id) {
                const subcategories = this.subcategoriesByParent.get(category.parent_id) || [];
                subcategories.push(category);
                this.subcategoriesByParent.set(category.parent_id, subcategories);

                const parentCategory = this.categories.find((c) => c.category_id === category.parent_id);
                if (parentCategory) {
                    parentCategory.hasSubcategories = true;
                }
            }
        });
    }

    /**
     * ID ve slug bazlı indeksler oluşturur
     */
    _createIndexes(): void {
        this.categories.forEach((category) => {
            this.categoryById.set(category.category_id, category);

            if (category.slug) {
                this.categoryBySlug.set(category.slug, category);
            }
        });
    }

    /**
     * API yanıtı formatını oluşturur
     */
    _createResponse<T>(success: boolean, data: T | null = null, status: number = 200, error: string | null = null): ApiResponse<T> {
        return {
            success,
            data,
            status,
            timestamp: new Date().toISOString(),
            error
        };
    }

    /**
     * Tüm ana kategorileri getirir
     */
    async getCategories(): Promise<ApiResponse<Category[]>> {
        try {
            await this.initialize();
            const mainCategories = this.categories.filter((c) => !c.parent_id);
            return this._createResponse<Category[]>(true, mainCategories);
        } catch (error) {
            console.error('[CategoryAPI] Kategorileri alma hatası:', error);
            return this._createResponse<Category[]>(false, null, 500, 'Kategoriler alınırken bir hata oluştu');
        }
    }

    /**
     * ID ile kategori bilgisini getirir
     */
    async getCategoryById(id: number | string): Promise<ApiResponse<Category>> {
        try {
            await this.initialize();
            const numericId = typeof id === 'string' ? parseInt(id) : id;
            const category = this.categoryById.get(numericId);

            if (!category) {
                return this._createResponse<Category>(false, null, 404, `Kategori bulunamadı: ID ${id}`);
            }

            return this._createResponse<Category>(true, category);
        } catch (error) {
            console.error(`[CategoryAPI] ID ile kategori alma hatası (ID: ${id}):`, error);
            return this._createResponse<Category>(false, null, 500, 'Kategori alınırken bir hata oluştu');
        }
    }

    /**
     * Slug ile kategori bilgisini getirir
     */
    async getCategoryBySlug(slug: string): Promise<ApiResponse<Category>> {
        try {
            await this.initialize();
            if (!slug) {
                return this._createResponse<Category>(false, null, 400, 'Geçersiz slug parametresi');
            }

            const category = this.categoryBySlug.get(slug.toLowerCase());

            if (!category) {
                return this._createResponse<Category>(false, null, 404, `Kategori bulunamadı: Slug "${slug}"`);
            }

            return this._createResponse<Category>(true, category);
        } catch (error) {
            console.error(`[CategoryAPI] Slug ile kategori alma hatası (Slug: ${slug}):`, error);
            return this._createResponse<Category>(false, null, 500, 'Kategori alınırken bir hata oluştu');
        }
    }

    /**
     * Belirli bir kategorinin alt kategorilerini getirir
     */
    async getSubcategories(categoryId: number | string): Promise<ApiResponse<Category[]>> {
        try {
            await this.initialize();
            const numericId = typeof categoryId === 'string' ? parseInt(categoryId) : categoryId;
            const subcategories = this.subcategoriesByParent.get(numericId) || [];

            return this._createResponse<Category[]>(true, subcategories);
        } catch (error) {
            console.error(`[CategoryAPI] Alt kategorileri alma hatası (Parent ID: ${categoryId}):`, error);
            return this._createResponse<Category[]>(false, null, 500, 'Alt kategoriler alınırken bir hata oluştu');
        }
    }
}

// Singleton instance oluştur
const categoryApi = new CategoryAPI();

export default categoryApi;
