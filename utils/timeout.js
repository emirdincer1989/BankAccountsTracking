/**
 * Promise timeout wrapper
 * Belirtilen süre içinde tamamlanmazsa reject eder
 */
function withTimeout(promise, timeoutMs, errorMessage) {
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(errorMessage || `İşlem ${timeoutMs}ms içinde tamamlanamadı`));
            }, timeoutMs);
        })
    ]);
}

module.exports = { withTimeout };

