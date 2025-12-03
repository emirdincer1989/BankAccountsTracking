/**
 * Page Loader - Dinamik sayfa yükleme sistemi
 *
 * Her sayfa assets/pages/ klasöründe ayrı bir modül olarak tutulur.
 * Bu dosya sayfaları dinamik olarak yükler ve render eder.
 */

class PageLoader {
    constructor() {
        this.pages = new Map();
        this.currentPage = null;
    }

    /**
     * Sayfa modülünü yükle (lazy loading)
     */
    async loadPageModule(pageName) {
        // Cache kontrolü
        if (this.pages.has(pageName)) {
            return this.pages.get(pageName);
        }

        try {
            // Dinamik import
            const module = await import(`../pages/${pageName}.js`);
            this.pages.set(pageName, module);
            return module;
        } catch (error) {
            console.warn(`Page module not found: ${pageName}, using template fallback`);

            // Fallback: template.js kullan
            try {
                const templateModule = await import(`../pages/template.js`);
                return templateModule;
            } catch (templateError) {
                console.error('Template fallback also failed:', templateError);
                return null;
            }
        }
    }

    /**
     * Sayfa içeriğini yükle ve render et
     */
    async loadPage(pageName) {
        const contentArea = document.getElementById('dynamicContent');
        const pageTitle = document.getElementById('pageTitle');
        const breadcrumbActive = document.getElementById('breadcrumbActive');

        if (!contentArea) {
            console.error('Content area not found!');
            return;
        }

        // Önceki sayfanın destroy fonksiyonunu çağır (temizlik için)
        if (this.currentPage && this.currentPage !== pageName) {
            try {
                const previousModule = this.pages.get(this.currentPage);
                if (previousModule && typeof previousModule.destroy === 'function') {
                    previousModule.destroy();
                }
            } catch (error) {
                console.warn('Error calling destroy on previous page:', error);
            }
        }

        // Loading state
        contentArea.innerHTML = `
            <div class="d-flex justify-content-center align-items-center" style="height: 400px;">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Yükleniyor...</span>
                </div>
            </div>
        `;

        try {
            // Modülü yükle
            const module = await this.loadPageModule(pageName);

            if (!module || !module.loadContent) {
                throw new Error(`Module or loadContent function not found: ${pageName}`);
            }

            // İçeriği al
            const { html, title } = await module.loadContent();

            // Render
            if (html) {
                contentArea.innerHTML = html;
                if (pageTitle) pageTitle.textContent = title || pageName;
                if (breadcrumbActive) breadcrumbActive.textContent = title || pageName;

                // Sayfa init fonksiyonu varsa çalıştır
                if (module.init) {
                    setTimeout(() => module.init(), 100);
                }

                this.currentPage = pageName;
            } else {
                throw new Error('No HTML content returned');
            }

        } catch (error) {
            console.error(`Page load error: ${pageName}`, error);
            contentArea.innerHTML = `
                <div class="alert alert-danger">
                    <h5 class="alert-heading">Sayfa Yüklenemedi</h5>
                    <p>Sayfa yüklenirken bir hata oluştu: <strong>${pageName}</strong></p>
                    <hr>
                    <p class="mb-0">${error.message}</p>
                </div>
            `;
        }
    }

    /**
     * Sayfayı yeniden yükle (refresh)
     */
    async reloadCurrentPage() {
        if (this.currentPage) {
            // Cache'i temizle
            this.pages.delete(this.currentPage);
            await this.loadPage(this.currentPage);
        }
    }

    /**
     * Cache'i temizle
     */
    clearCache() {
        this.pages.clear();
    }

    /**
     * Yüklü sayfa sayısını döndür
     */
    getCacheSize() {
        return this.pages.size;
    }
}

// Global instance
window.pageLoader = new PageLoader();

// Global helper fonksiyonlar
window.loadPage = (pageName) => window.pageLoader.loadPage(pageName);
window.reloadPage = () => window.pageLoader.reloadCurrentPage();
