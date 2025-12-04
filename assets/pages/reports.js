/**
 * Raporlar ve İstatistikler Sayfası
 */

export async function loadContent() {
    const html = `
        <div class="row mb-3">
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

        <!-- Bakiye Geçmişi Grafiği -->
        <div class="row">
            <div class="col-12">
                <div class="card border-0 shadow-sm">
                    <div class="card-header bg-transparent border-bottom py-3">
                        <div class="d-flex justify-content-between align-items-center">
                            <h4 class="card-title mb-0 fs-16 fw-semibold">Son 1 Aylık Bakiye Geçmişi (Günlük Maksimum)</h4>
                            <div class="d-flex align-items-center gap-2">
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
                    </div>
                    <div class="card-body p-4">
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

    // Kurumları yükle
    loadInstitutions();

    // ApexCharts yüklü mü kontrol et, değilse yükle
    if (typeof ApexCharts === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/apexcharts';
        script.onload = () => {
            loadBalanceHistory();
        };
        document.head.appendChild(script);
    } else {
        loadBalanceHistory();
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
            });
        }
    }, 100);
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

    const options = {
        series: series,
        chart: {
            type: 'area',
            height: 450,
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
        }
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

