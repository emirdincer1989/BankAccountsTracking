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
    `;

    return {
        html,
        title: 'Raporlar'
    };
}

export function init() {
    window.loadDashboardStats = loadDashboardStats;

    // ApexCharts yüklü mü kontrol et, değilse yükle
    if (typeof ApexCharts === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/apexcharts';
        script.onload = loadDashboardStats;
        document.head.appendChild(script);
    } else {
        loadDashboardStats();
    }
}

async function loadDashboardStats() {
    try {
        const response = await fetch('/api/reports/dashboard');
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
