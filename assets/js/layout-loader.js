// Layout Loader - Ortak layout sistemini yükler
class LayoutLoader {
    constructor() {
        this.baseTemplate = null;
        this.headerTemplate = null;
        this.sidebarTemplate = null;
        this.footerTemplate = null;
    }

    async loadTemplates() {
        try {
            // Template'leri paralel olarak yükle
            const [baseResponse, headerResponse, sidebarResponse, footerResponse] = await Promise.all([
                fetch('layouts/base.html'),
                fetch('layouts/header.html'),
                fetch('layouts/sidebar.html'),
                fetch('layouts/footer.html')
            ]);

            this.baseTemplate = await baseResponse.text();
            this.headerTemplate = await headerResponse.text();
            this.sidebarTemplate = await sidebarResponse.text();
            this.footerTemplate = await footerResponse.text();
        } catch (error) {
            console.error('Template loading error:', error);
        }
    }

    renderPage(pageTitle, pageContent, breadcrumb = '', extraCSS = '', extraJS = '') {
        if (!this.baseTemplate) {
            console.error('Templates not loaded');
            return;
        }

        let html = this.baseTemplate
            .replace('{{PAGE_TITLE}}', pageTitle)
            .replace('{{HEADER}}', this.headerTemplate)
            .replace('{{SIDEBAR}}', this.sidebarTemplate)
            .replace('{{FOOTER}}', this.footerTemplate)
            .replace('{{PAGE_CONTENT}}', pageContent)
            .replace('{{BREADCRUMB}}', breadcrumb)
            .replace('{{EXTRA_CSS}}', extraCSS)
            .replace('{{EXTRA_JS}}', extraJS);

        document.documentElement.innerHTML = html;
    }
}

// Global layout loader instance
window.layoutLoader = new LayoutLoader();






