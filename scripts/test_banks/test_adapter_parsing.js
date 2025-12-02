const fs = require('fs');
const path = require('path');
const ZiraatAdapter = require('../../services/banks/adapters/ZiraatAdapter');
const VakifAdapter = require('../../services/banks/adapters/VakifAdapter');
const HalkAdapter = require('../../services/banks/adapters/HalkAdapter');

async function testParsing() {
    try {
        console.log('--- Testing Ziraat Adapter Parsing ---');
        const ziraatXml = fs.readFileSync(path.join(__dirname, 'ziraat_response.xml'), 'utf8');
        const ziraatAdapter = new ZiraatAdapter({ customer_code: 'test', password: 'test', iban: 'test' });
        const ziraatTransactions = await ziraatAdapter.parseResponse(ziraatXml);
        console.log(`Parsed ${ziraatTransactions.length} Ziraat transactions.`);
        if (ziraatTransactions.length > 0) {
            console.log('Sample Ziraat Transaction:', JSON.stringify(ziraatTransactions[0], null, 2));
        }

        console.log('\n--- Testing Vakif Adapter Parsing ---');
        const vakifXml = fs.readFileSync(path.join(__dirname, 'vakifbank_response.xml'), 'utf8');
        const vakifAdapter = new VakifAdapter({ customer_no: 'test', username: 'test', password: 'test' });
        const vakifTransactions = await vakifAdapter.parseResponse(vakifXml);
        console.log(`Parsed ${vakifTransactions.length} Vakif transactions.`);
        if (vakifTransactions.length > 0) {
            console.log('Sample Vakif Transaction:', JSON.stringify(vakifTransactions[0], null, 2));
        }

        console.log('\n--- Testing Halk Adapter Parsing ---');
        const halkXml = fs.readFileSync(path.join(__dirname, 'halkbank_response.xml'), 'utf8');
        const halkAdapter = new HalkAdapter({ username: 'test', password: 'test', account_no: 'test' });
        const halkTransactions = await halkAdapter.parseResponse(halkXml);
        console.log(`Parsed ${halkTransactions.length} Halk transactions.`);
        if (halkTransactions.length > 0) {
            console.log('Sample Halk Transaction:', JSON.stringify(halkTransactions[0], null, 2));
        }

    } catch (error) {
        console.error('Error during parsing test:', error);
    }
}

testParsing();
