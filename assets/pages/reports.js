/**
 * Raporlar ve İstatistikler Sayfası
 */

export async function loadContent() {
    const html = `
        <div class="row mb-2">
            <div class="col-12 d-flex justify-content-between align-items-center">
                <h4 class="mb-0">Finansal Raporlar</h4>
                <div class="d-flex align-items-center gap-2">
                    <select class="form-select form-select-sm" id="institutionFilter" style="width: auto; min-width: 200px;">
                        <option value="">Tüm Kurumlar</option>
                    </select>
                    <button class="btn btn-light" onclick="loadDashboardStats()">
                        <i class="ri-refresh-line align-bottom me-1"></i> Yenile
                    </button>
                </div>
            </div>
        </div>

        <!-- My Portfolio ve Bakiye Geçmişi - Yan Yana -->
        <div class="row mb-5">
            <!-- Sol Taraf: My Portfolio -->
            <div class="col-xl-4 col-lg-5 col-md-12 mb-3 mb-xl-0">
                <div class="card border-0 shadow-sm h-100">
                    <div class="card-header bg-transparent border-bottom py-2">
                        <h4 class="card-title mb-0 fs-16 fw-semibold">Toplam Varlıklar</h4>
                    </div>
                    <div class="card-body p-2">
                        <div class="mb-1 text-center">
                            <h4 class="text-primary mb-0 fw-bold" id="portfolioTotalBalance" style="font-size: 1.4rem;">₺0,00</h4>
                        </div>
                        <div id="portfolioChart" class="apex-charts mb-1" dir="ltr"></div>
                        <div id="portfolioBankList" class="portfolio-list">
                            <!-- Banka listesi buraya yüklenecek -->
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Sağ Taraf: Bakiye Geçmişi Grafiği -->
            <div class="col-xl-8 col-lg-7 col-md-12">
                <div class="card border-0 shadow-sm h-100">
                    <div class="card-header bg-transparent border-bottom py-2">
                        <div class="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2">
                            <h4 class="card-title mb-0 fs-16 fw-semibold">Son 1 Aylık Bakiye Geçmişi</h4>
                            <div class="btn-group" role="group">
                                <input type="radio" class="btn-check" name="balanceViewType" id="balanceViewTotal" value="total" checked>
                                <label class="btn btn-outline-primary btn-sm" for="balanceViewTotal">
                                    <i class="ri-bar-chart-line me-1"></i> Toplam
                                </label>
                                <input type="radio" class="btn-check" name="balanceViewType" id="balanceViewByBank" value="byBank">
                                <label class="btn btn-outline-primary btn-sm" for="balanceViewByBank">
                                    <i class="ri-building-line me-1"></i> Banka Bazında
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="card-body p-2">
                        <div id="balanceHistoryChart" class="apex-charts" dir="ltr"></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    return {
        html,
        title: 'Raporlar'
    };
}

export function init() {
    window.loadBalanceHistory = loadBalanceHistory;
    window.loadPortfolioData = loadPortfolioData;

    // Kurumları yükle
    loadInstitutions();

    // Portföy verilerini yükle
    loadPortfolioData();

    // ApexCharts yüklü mü kontrol et, değilse yükle
    if (typeof ApexCharts === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/apexcharts';
        script.onload = () => {
            loadBalanceHistory();
            loadPortfolioData();
        };
        document.head.appendChild(script);
    } else {
        loadBalanceHistory();
        loadPortfolioData();
    }

    // Bakiye görüntüleme tipi değiştiğinde
    setTimeout(() => {
        const radioButtons = document.querySelectorAll('input[name="balanceViewType"]');
        radioButtons.forEach(radio => {
            radio.addEventListener('change', function() {
                if (this.checked) {
                    loadBalanceHistory();
                }
            });
        });

        // Kurum filtresi değiştiğinde
        const institutionFilter = document.getElementById('institutionFilter');
        if (institutionFilter) {
            institutionFilter.addEventListener('change', function() {
                loadBalanceHistory();
                loadPortfolioData();
            });
        }
    }, 100);
    
    // Window resize event listener - responsive için
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            // Grafikleri yeniden render et
            if (window.portfolioChartInstance) {
                window.portfolioChartInstance.updateOptions({
                    chart: {
                        height: window.innerWidth < 768 ? 220 : 160
                    }
                });
            }
            if (balanceHistoryChartInstance) {
                balanceHistoryChartInstance.updateOptions({
                    chart: {
                        height: window.innerWidth < 768 ? 300 : (window.innerWidth < 1200 ? 350 : 380)
                    }
                });
            }
        }, 250);
    });
}

async function loadInstitutions() {
    try {
        const response = await fetch('/api/institutions', {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();

        if (data.success && data.data) {
            const select = document.getElementById('institutionFilter');
            if (select) {
                // Mevcut seçimi sakla
                const currentValue = select.value;

                // Seçenekleri temizle (varsayılan hariç)
                select.innerHTML = '<option value="">Tüm Kurumlar</option>';

                // Kurumları ekle
                data.data.forEach(institution => {
                    const option = document.createElement('option');
                    option.value = institution.id;
                    option.textContent = institution.name;
                    select.appendChild(option);
                });

                // Önceki seçimi geri yükle
                if (currentValue) {
                    select.value = currentValue;
                }
            }
        }
    } catch (error) {
        console.error('Kurumlar yüklenirken hata:', error);
    }
}


let balanceHistoryChartInstance = null;
let portfolioChartInstance = null;

// Portföy verilerini yükle
async function loadPortfolioData() {
    try {
        const institutionId = document.getElementById('institutionFilter')?.value || '';
        
        let url = '/api/reports/dashboard';
        if (institutionId) {
            url += `?institution_id=${institutionId}`;
        }
        
        const response = await fetch(url, {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();

        if (data.success && data.data) {
            renderPortfolioComponent(data.data.distribution, data.data.summary.total_balance);
        }
    } catch (error) {
        console.error('Portföy verisi yüklenirken hata:', error);
    }
}

// Portföy componentini render et
function renderPortfolioComponent(distribution, totalBalance) {
    const format = (val) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val || 0);
    
    // Toplam bakiyeyi güncelle
    const totalBalanceElement = document.getElementById('portfolioTotalBalance');
    if (totalBalanceElement) {
        totalBalanceElement.textContent = format(totalBalance);
    }
    
    // Banka listesini oluştur
    const bankListContainer = document.getElementById('portfolioBankList');
    if (!bankListContainer) return;
    
    // Toplam hesapla
    const total = distribution.reduce((sum, d) => sum + parseFloat(d.total || 0), 0);
    
    // Banka renkleri - Uygulama ile uyumlu
    const bankColors = {
        'vakif': '#FFC107',      // Vakıfbank - Sarı
        'vakıf': '#FFC107',
        'ziraat': '#E30613',     // Ziraat - Kırmızı
        'halk': '#005596',        // Halkbank - Mavi
        'halkbank': '#005596'
    };
    
    // Bankaları büyükten küçüğe sırala
    const sortedDistribution = [...distribution].sort((a, b) => parseFloat(b.total || 0) - parseFloat(a.total || 0));
    
    let html = '';
    sortedDistribution.forEach((bank, index) => {
        const amount = parseFloat(bank.total || 0);
        const percentage = total > 0 ? ((amount / total) * 100).toFixed(2) : 0;
        
        // Banka rengini belirle
        const bankName = (bank.bank_name || '').toLowerCase();
        let color = '#405189'; // Varsayılan renk
        if (bankName.includes('vakif') || bankName.includes('vakıf')) {
            color = bankColors['vakif'];
        } else if (bankName.includes('ziraat')) {
            color = bankColors['ziraat'];
        } else if (bankName.includes('halk')) {
            color = bankColors['halk'];
        }
        
        html += `
            <div class="d-flex align-items-center mb-1 p-1 border rounded" style="border-radius: 6px !important;">
                <div class="flex-shrink-0">
                    <span class="rounded-circle text-white d-flex align-items-center justify-content-center" style="background-color: ${color}; width: 30px; height: 30px; font-weight: 600; font-size: 12px;">
                        ${bank.bank_name ? bank.bank_name.charAt(0).toUpperCase() : 'B'}
                    </span>
                </div>
                <div class="flex-grow-1 ms-2">
                    <div class="d-flex align-items-center justify-content-between mb-0">
                        <span class="fw-semibold" style="font-size: 13px; color: #212529;">${bank.bank_name || 'Bilinmeyen Banka'}</span>
                        <span class="badge ms-2" style="font-size: 11px; padding: 3px 7px; background-color: ${color}; color: white; font-weight: 600;">${percentage}%</span>
                    </div>
                    <div class="d-flex align-items-center justify-content-between mt-0">
                        <span class="fw-bold" style="font-size: 14px; color: #495057;">${format(amount)}</span>
                    </div>
                    <div class="progress mt-1" style="height: 2px;">
                        <div class="progress-bar" role="progressbar" style="width: ${percentage}%; background-color: ${color};" 
                             aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100"></div>
                    </div>
                </div>
            </div>
        `;
    });
    
    if (html === '') {
        html = '<div class="text-center text-muted py-4">Henüz banka verisi bulunmamaktadır.</div>';
    }
    
    bankListContainer.innerHTML = html;
    
    // Grafiği oluştur - banka renklerini kullan
    // Not: Renkler banka isimlerine göre belirlenir, sıraya göre değil
    renderPortfolioChart(distribution, bankColors, total);
}

// Portföy grafiğini render et
function renderPortfolioChart(distribution, bankColors, total) {
    const labels = distribution.map(d => d.bank_name);
    const series = distribution.map(d => parseFloat(d.total || 0));
    
    // Banka renklerini banka isimlerine göre belirle (sıraya göre değil)
    const colors = labels.map(bankName => {
        const bankNameLower = (bankName || '').toLowerCase();
        if (bankNameLower.includes('vakif') || bankNameLower.includes('vakıf')) return bankColors['vakif'];
        if (bankNameLower.includes('ziraat')) return bankColors['ziraat'];
        if (bankNameLower.includes('halk')) return bankColors['halk'];
        return '#405189'; // Varsayılan renk
    });
    
    // Responsive yükseklik belirleme
    const isMobile = window.innerWidth < 768;
    const chartHeight = isMobile ? 220 : 160;
    
    const options = {
        series: series,
        labels: labels,
        chart: {
            type: 'donut',
            height: chartHeight,
        },
        plotOptions: {
            pie: {
                donut: {
                    size: '75%',
                    labels: {
                        show: true,
                        name: {
                            show: false
                        },
                        value: {
                            show: false
                        },
                        total: {
                            show: true,
                            label: 'Toplam Varlık',
                            fontSize: '12px',
                            fontWeight: 500,
                            color: '#6c757d',
                            formatter: function() {
                                return new Intl.NumberFormat('tr-TR', { 
                                    style: 'currency', 
                                    currency: 'TRY',
                                    maximumFractionDigits: 0
                                }).format(total);
                            }
                        }
                    }
                }
            }
        },
        dataLabels: {
            enabled: true,
            formatter: function(val, opts) {
                return parseFloat(val).toFixed(1) + '%';
            },
            style: {
                fontSize: '11px',
                fontWeight: 600,
                colors: ['#fff']
            },
            dropShadow: {
                enabled: false
            }
        },
        legend: {
            position: 'bottom',
            horizontalAlign: 'center',
            fontSize: '11px',
            fontWeight: 500,
            itemMargin: {
                horizontal: 6,
                vertical: 2
            },
            markers: {
                width: 7,
                height: 7,
                radius: 3
            },
            offsetY: -5
        },
        colors: colors,
        tooltip: {
            y: {
                formatter: function(val) {
                    const percentage = total > 0 ? ((val / total) * 100).toFixed(2) : 0;
                    return new Intl.NumberFormat('tr-TR', { 
                        style: 'currency', 
                        currency: 'TRY' 
                    }).format(val) + ' (' + percentage + '%)';
                }
            }
        },
        responsive: [{
            breakpoint: 1200,
            options: {
                chart: {
                    height: 150
                }
            }
        }, {
            breakpoint: 768,
            options: {
                chart: {
                    height: 200
                },
                legend: {
                    fontSize: '10px'
                }
            }
        }, {
            breakpoint: 480,
            options: {
                chart: {
                    height: 180
                },
                legend: {
                    position: 'bottom',
                    fontSize: '9px'
                }
            }
        }]
    };
    
    // Eski chart varsa temizle
    const chartElement = document.querySelector("#portfolioChart");
    if (!chartElement) return;
    
    if (portfolioChartInstance) {
        portfolioChartInstance.destroy();
    }
    
    portfolioChartInstance = new ApexCharts(chartElement, options);
    portfolioChartInstance.render();
}

async function loadBalanceHistory() {
    try {
        const viewType = document.querySelector('input[name="balanceViewType"]:checked')?.value || 'total';
        const groupByBank = viewType === 'byBank';
        const institutionId = document.getElementById('institutionFilter')?.value || '';
        
        let url = `/api/reports/balance-history?groupByBank=${groupByBank}&days=30`;
        if (institutionId) {
            url += `&institution_id=${institutionId}`;
        }
        
        const response = await fetch(url, {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();

        if (data.success) {
            console.log('Bakiye geçmişi verisi:', data.data);
            renderBalanceHistoryChart(data.data, groupByBank);
        } else {
            console.error('API hatası:', data);
        }
    } catch (error) {
        console.error('Bakiye geçmişi hatası:', error);
    }
}

function renderBalanceHistoryChart(balanceData, groupByBank) {
    // Mevcut grafik varsa yok et
    if (balanceHistoryChartInstance) {
        balanceHistoryChartInstance.destroy();
        balanceHistoryChartInstance = null;
    }

    if (!balanceData || balanceData.length === 0) {
        const container = document.querySelector("#balanceHistoryChart");
        if (container) {
            container.innerHTML = '<div class="text-center p-4"><p class="text-muted">Veri bulunamadı</p></div>';
        }
        return;
    }

    console.log('Grafik için veri:', balanceData.length, 'kayıt');

    let series = [];
    let categories = [];

    if (groupByBank) {
        // Kurum bazında veri işleme
        const validData = balanceData.filter(d => d.date && d.bank_name && d.total_balance !== null && d.total_balance !== undefined);
        
        if (validData.length === 0) {
            const container = document.querySelector("#balanceHistoryChart");
            if (container) {
                container.innerHTML = '<div class="text-center p-4"><p class="text-muted">Veri bulunamadı</p></div>';
            }
            return;
        }
        
        const bankNames = [...new Set(validData.map(d => d.bank_name))];
        const dates = [...new Set(validData.map(d => d.date))].sort();
        
        categories = dates.map(d => {
            const date = new Date(d);
            return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
        });

        // Her banka için seri oluştur
        bankNames.forEach(bankName => {
            const bankData = validData.filter(d => d.bank_name === bankName);
            const dataPoints = dates.map(date => {
                const found = bankData.find(d => d.date === date);
                if (found && found.total_balance !== null && found.total_balance !== undefined) {
                    const value = parseFloat(found.total_balance);
                    return isNaN(value) ? null : value;
                }
                return null;
            });
            
            // Eğer tüm değerler null değilse seriye ekle
            if (dataPoints.some(v => v !== null)) {
                series.push({
                    name: bankName,
                    data: dataPoints
                });
            }
        });
    } else {
        // Toplam veri işleme
        const sortedData = balanceData
            .filter(d => d.date && d.total_balance !== null && d.total_balance !== undefined)
            .sort((a, b) => new Date(a.date) - new Date(b.date));
        
        if (sortedData.length === 0) {
            const container = document.querySelector("#balanceHistoryChart");
            if (container) {
                container.innerHTML = '<div class="text-center p-4"><p class="text-muted">Veri bulunamadı</p></div>';
            }
            return;
        }
        
        categories = sortedData.map(d => {
            const date = new Date(d.date);
            return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
        });
        
        series = [{
            name: 'Toplam Bakiye (Günlük Maksimum)',
            data: sortedData.map(d => {
                const value = parseFloat(d.total_balance);
                return isNaN(value) ? 0 : value;
            })
        }];
    }

    // Series boşsa hata göster
    if (series.length === 0) {
        const container = document.querySelector("#balanceHistoryChart");
        if (container) {
            container.innerHTML = '<div class="text-center p-4"><p class="text-muted">Gösterilecek veri bulunamadı</p></div>';
        }
        return;
    }

    // Banka renkleri - Uygulama ile uyumlu
    const bankColors = {
        'vakif': '#FFC107',      // Vakıfbank - Sarı
        'vakıf': '#FFC107',
        'ziraat': '#E30613',     // Ziraat - Kırmızı
        'halk': '#005596',        // Halkbank - Mavi
        'halkbank': '#005596'
    };
    
    // Renkleri banka isimlerine göre eşleştir
    let colors;
    if (groupByBank) {
        // Series'deki banka isimlerine göre renkleri eşleştir
        colors = series.map(serie => {
            const bankName = serie.name.toLowerCase();
            if (bankName.includes('vakif') || bankName.includes('vakıf')) return bankColors['vakif'];
            if (bankName.includes('ziraat')) return bankColors['ziraat'];
            if (bankName.includes('halk')) return bankColors['halk'];
            return '#405189'; // Varsayılan renk
        });
    } else {
        colors = ['#405189'];
    }

    // Responsive yükseklik belirleme
    const isMobile = window.innerWidth < 768;
    const chartHeight = isMobile ? 350 : 380;
    
    const options = {
        series: series,
        chart: {
            type: 'area',
            height: chartHeight,
            zoom: {
                enabled: true,
                type: 'x',
                autoScaleYaxis: true
            },
            toolbar: {
                show: true,
                tools: {
                    download: true,
                    selection: true,
                    zoom: true,
                    zoomin: true,
                    zoomout: true,
                    pan: true,
                    reset: true
                }
            }
        },
        dataLabels: {
            enabled: false
        },
        stroke: {
            curve: 'smooth',
            width: 2
        },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                inverseColors: false,
                opacityFrom: 0.5,
                opacityTo: 0.1,
                stops: [0, 90, 100]
            }
        },
        colors: colors,
        xaxis: {
            categories: categories,
            labels: {
                rotate: -45,
                rotateAlways: false,
                style: {
                    fontSize: '12px'
                }
            }
        },
        yaxis: {
            title: {
                text: 'Bakiye (₺)',
                style: {
                    fontSize: '14px',
                    fontWeight: 600
                }
            },
            labels: {
                formatter: function (val) {
                    return "₺ " + new Intl.NumberFormat('tr-TR', { 
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0 
                    }).format(val);
                }
            }
        },
        tooltip: {
            shared: true,
            intersect: false,
            y: {
                formatter: function (val) {
                    return "₺ " + new Intl.NumberFormat('tr-TR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    }).format(val);
                }
            }
        },
        legend: {
            position: 'bottom',
            horizontalAlign: 'center',
            floating: false,
            offsetY: 10,
            offsetX: 0,
            fontSize: '14px',
            fontWeight: 500,
            itemMargin: {
                horizontal: 20,
                vertical: 10
            },
            markers: {
                width: 12,
                height: 12,
                radius: 6
            }
        },
        grid: {
            borderColor: '#f1f1f1',
            strokeDashArray: 4
        },
        markers: {
            size: 4,
            hover: {
                size: 6
            }
        },
        responsive: [{
            breakpoint: 1200,
            options: {
                chart: {
                    height: 350
                }
            }
        }, {
            breakpoint: 768,
            options: {
                chart: {
                    height: 300
                },
                legend: {
                    fontSize: '12px',
                    itemMargin: {
                        horizontal: 10,
                        vertical: 5
                    }
                }
            }
        }, {
            breakpoint: 480,
            options: {
                chart: {
                    height: 280
                },
                legend: {
                    fontSize: '11px',
                    itemMargin: {
                        horizontal: 8,
                        vertical: 3
                    }
                }
            }
        }]
    };

    try {
        const chartElement = document.querySelector("#balanceHistoryChart");
        if (!chartElement) {
            console.error('Grafik elementi bulunamadı');
            return;
        }
        
        balanceHistoryChartInstance = new ApexCharts(chartElement, options);
        balanceHistoryChartInstance.render();
    } catch (error) {
        console.error('Grafik render hatası:', error);
        const container = document.querySelector("#balanceHistoryChart");
        if (container) {
            container.innerHTML = '<div class="text-center p-4"><p class="text-danger">Grafik oluşturulurken hata oluştu: ' + error.message + '</p></div>';
        }
    }
}

