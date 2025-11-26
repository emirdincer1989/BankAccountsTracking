/**
 * Standartlaştırılmış Hesap Hareketi Modeli
 * Tüm banka adaptörleri veriyi bu formata çevirmelidir.
 */
class UnifiedTransaction {
    constructor({
        bankRefNo,      // Bankadaki benzersiz işlem numarası (Unique ID)
        transactionDate,// İşlem tarihi (Date objesi)
        amount,         // Tutar (Number, örn: 150.50)
        currency,       // Para birimi (TRY, USD, EUR)
        direction,      // Yön: 'INCOMING' (Giriş/Alacak) veya 'OUTGOING' (Çıkış/Borç)
        description,    // Açıklama
        senderIban,     // Gönderen IBAN (Varsa)
        receiverIban,   // Alıcı IBAN (Varsa)
        balanceAfter,   // İşlem sonrası bakiye (Varsa)
        taxNumber,      // Karşı taraf VKN/TCKN (Varsa)
        rawResponse     // Debug için bankadan gelen ham veri (JSON string)
    }) {
        this.bankRefNo = bankRefNo;
        this.transactionDate = transactionDate;
        this.amount = amount;
        this.currency = currency || 'TRY';
        this.direction = direction; // 'INCOMING' (+), 'OUTGOING' (-)
        this.description = description;
        this.senderIban = senderIban;
        this.receiverIban = receiverIban;
        this.balanceAfter = balanceAfter;
        this.taxNumber = taxNumber;
        this.rawResponse = rawResponse;
    }
}

module.exports = UnifiedTransaction;
