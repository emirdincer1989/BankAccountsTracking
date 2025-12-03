/**
 * Raporlar ve İstatistikler Sayfası
 */

export async function loadContent() {
    const html = `
        <div class="row mb-3">
            <div class="col-12 d-flex justify-content-between align-items-center">
                <h4 class="mb-0">Finansal Raporlar</h4>
                <button class="btn btn-light" onclick="loadDashboardStats()">
                    <i class="ri-refresh-line align-bottom me-1"></i> Yenile
                </button>
            </div>
        </div>

        <!-- Özet Kartları -->
        <div class="row">
            <div class="col-xl-4 col-md-6">
                <div class="card card-animate">
                    <div class="card-body">
                        <div class="d-flex align-items-center">
                            <div class="flex-grow-1 overflow-hidden">
                                <p class="text-uppercase fw-medium text-muted text-truncate mb-0">Toplam Varlık</p>
                            </div>
                            <div class="flex-shrink-0">
                                <div class="avatar-sm">
                                    <span class="avatar-title bg-success-subtle text-success rounded fs-3">
                                        <i class="ri-money-dollar-circle-line"></i>
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div class="d-flex align-items-end justify-content-between mt-4">
                            <div>
                                <h4 class="fs-22 fw-semibold ff-secondary mb-4" id="totalBalance">₺0,00</h4>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-xl-4 col-md-6">
                <div class="card card-animate">
                    <div class="card-body">
                        <div class="d-flex align-items-center">
                            <div class="flex-grow-1 overflow-hidden">
                                <p class="text-uppercase fw-medium text-muted text-truncate mb-0">Bugünkü Giriş</p>
                            </div>
                            <div class="flex-shrink-0">
                                <div class="avatar-sm">
                                    <span class="avatar-title bg-info-subtle text-info rounded fs-3">
                                        <i class="ri-arrow-up-circle-line"></i>
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div class="d-flex align-items-end justify-content-between mt-4">
                            <div>
                                <h4 class="fs-22 fw-semibold ff-secondary mb-4" id="todayIncome">₺0,00</h4>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-xl-4 col-md-6">
                <div class="card card-animate">
                    <div class="card-body">
                        <div class="d-flex align-items-center">
                            <div class="flex-grow-1 overflow-hidden">
                                <p class="text-uppercase fw-medium text-muted text-truncate mb-0">Bugünkü Çıkış</p>
                            </div>
                            <div class="flex-shrink-0">
                                <div class="avatar-sm">
                                    <span class="avatar-title bg-danger-subtle text-danger rounded fs-3">
                                        <i class="ri-arrow-down-circle-line"></i>
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div class="d-flex align-items-end justify-content-between mt-4">
                            <div>
                                <h4 class="fs-22 fw-semibold ff-secondary mb-4" id="todayExpense">₺0,00</h4>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Grafikler -->
        <div class="row">
            <div class="col-xl-8">
                <div class="card">
                    <div class="card-header">
                        <h4 class="card-title mb-0">Son 7 Günlük Nakit Akışı</h4>
                    </div>
                    <div class="card-body">
                        <div id="cashFlowChart" class="apex-charts" dir="ltr"></div>
                    </div>
                </div>
            </div>
            <div class="col-xl-4">
                <div class="card">
                    <div class="card-header">
                        <h4 class="card-title mb-0">Banka Dağılımı</h4>
                    </div>
                    <div class="card-body">
                        <div id="bankDistributionChart" class="apex-charts" dir="ltr"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Bakiye Geçmişi Grafiği -->
        <div class="row">
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <div class="d-flex justify-content-between align-items-center">
                            <h4 class="card-title mb-0">Son Bir Aylık Bakiye Geçmişi</h4>
                            <div class="d-flex align-items-center gap-2">
                                <div class="btn-group" role="group">
                                    <input type="radio" class="btn-check" name="balanceViewType" id="balanceViewTotal" value="total" checked>
                                    <label class="btn btn-outline-primary btn-sm" for="balanceViewTotal">
                                        <i class="ri-bar-chart-line me-1"></i> Toplam
                                    </label>
                                    <input type="radio" class="btn-check" name="balanceViewType" id="balanceViewByBank" value="byBank">
                                    <label class="btn btn-outline-primary btn-sm" for="balanceViewByBank">
                                        <i class="ri-building-line me-1"></i> Kurum Bazında
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="card-body">
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
    window.loadDashboardStats = loadDashboardStats;
    window.loadBalanceHistory = loadBalanceHistory;

    // ApexCharts yüklü mü kontrol et, değilse yükle
    if (typeof ApexCharts === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/apexcharts';
        script.onload = () => {
            loadDashboardStats();
            loadBalanceHistory();
        };
        document.head.appendChild(script);
    } else {
        loadDashboardStats();
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
    }, 100);
}

async function loadDashboardStats() {
    try {
        const response = await fetch('/api/reports/dashboard', {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();

        if (data.success) {
            updateSummaryCards(data.data.summary);
            renderCashFlowChart(data.data.dailyFlow);
            renderBankDistributionChart(data.data.distribution);
        }
    } catch (error) {
        console.error('Rapor hatası:', error);
    }
}

function updateSummaryCards(summary) {
    const format = (val) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val || 0);

    document.getElementById('totalBalance').textContent = format(summary.total_balance);
    document.getElementById('todayIncome').textContent = format(summary.income_today);
    document.getElementById('todayExpense').textContent = format(summary.expense_today);
}

function renderCashFlowChart(dailyFlow) {
    const categories = dailyFlow.map(d => new Date(d.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }));
    const incomeData = dailyFlow.map(d => d.income);
    const expenseData = dailyFlow.map(d => d.expense);

    const options = {
        series: [{
            name: 'Giriş',
            data: incomeData
        }, {
            name: 'Çıkış',
            data: expenseData
        }],
        chart: {
            type: 'bar',
            height: 350,
            toolbar: { show: false }
        },
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: '45%',
                endingShape: 'rounded'
            },
        },
        dataLabels: { enabled: false },
        stroke: {
            show: true,
            width: 2,
            colors: ['transparent']
        },
        xaxis: {
            categories: categories,
        },
        yaxis: {
            title: { text: 'Tutar (TL)' }
        },
        fill: { opacity: 1 },
        colors: ['#0ab39c', '#f06548'],
        tooltip: {
            y: {
                formatter: function (val) {
                    return "₺ " + new Intl.NumberFormat('tr-TR').format(val)
                }
            }
        }
    };

    const chart = new ApexCharts(document.querySelector("#cashFlowChart"), options);
    chart.render();
}

function renderBankDistributionChart(distribution) {
    const labels = distribution.map(d => d.bank_name);
    const series = distribution.map(d => parseFloat(d.total));

    const options = {
        series: series,
        labels: labels,
        chart: {
            type: 'donut',
            height: 300,
        },
        plotOptions: {
            pie: {
                donut: {
                    size: '70%'
                }
            }
        },
        dataLabels: { enabled: false },
        legend: {
            position: 'bottom'
        },
        colors: ['#405189', '#0ab39c', '#f7b84b', '#f06548'],
        tooltip: {
            y: {
                formatter: function (val) {
                    return "₺ " + new Intl.NumberFormat('tr-TR').format(val)
                }
            }
        }
    };

    const chart = new ApexCharts(document.querySelector("#bankDistributionChart"), options);
    chart.render();
}

let balanceHistoryChartInstance = null;

async function loadBalanceHistory() {
    try {
        const viewType = document.querySelector('input[name="balanceViewType"]:checked')?.value || 'total';
        const groupByBank = viewType === 'byBank';
        
        const response = await fetch(`/api/reports/balance-history?groupByBank=${groupByBank}&days=30`, {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();

        if (data.success) {
            renderBalanceHistoryChart(data.data, groupByBank);
        }
    } catch (error) {
        console.error('Bakiye geçmişi hatası:', error);
    }
}

function renderBalanceHistoryChart(balanceData, groupByBank) {
    // Mevcut grafik varsa yok et
    if (balanceHistoryChartInstance) {
        balanceHistoryChartInstance.destroy();
    }

    if (!balanceData || balanceData.length === 0) {
        const container = document.querySelector("#balanceHistoryChart");
        if (container) {
            container.innerHTML = '<div class="text-center p-4"><p class="text-muted">Veri bulunamadı</p></div>';
        }
        return;
    }

    let series = [];
    let categories = [];

    if (groupByBank) {
        // Kurum bazında veri işleme
        const bankNames = [...new Set(balanceData.map(d => d.bank_name))];
        const dates = [...new Set(balanceData.map(d => d.date))].sort();
        
        categories = dates.map(d => new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }));

        // Her banka için seri oluştur
        bankNames.forEach(bankName => {
            const bankData = balanceData.filter(d => d.bank_name === bankName);
            const dataPoints = dates.map(date => {
                const found = bankData.find(d => d.date === date);
                return found ? parseFloat(found.total_balance) : null;
            });
            
            series.push({
                name: bankName,
                data: dataPoints
            });
        });
    } else {
        // Toplam veri işleme
        const sortedData = balanceData.sort((a, b) => new Date(a.date) - new Date(b.date));
        categories = sortedData.map(d => new Date(d.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }));
        
        series = [{
            name: 'Toplam Bakiye',
            data: sortedData.map(d => parseFloat(d.total_balance))
        }];
    }

    const colors = groupByBank 
        ? ['#405189', '#0ab39c', '#f7b84b', '#f06548', '#51d28c', '#ffc35a', '#8b5cf6', '#ec4899']
        : ['#405189'];

    const options = {
        series: series,
        chart: {
            type: 'area',
            height: 400,
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
            position: 'top',
            horizontalAlign: 'right',
            floating: false,
            offsetY: -10,
            offsetX: 0
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

    balanceHistoryChartInstance = new ApexCharts(document.querySelector("#balanceHistoryChart"), options);
    balanceHistoryChartInstance.render();
}
