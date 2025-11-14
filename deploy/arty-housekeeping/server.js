const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Serve dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// CSV upload endpoint
app.post('/api/upload/csv', (req, res) => {
    // TODO: Implement CSV processing using tools/html_to_csv.py
    res.json({ message: 'CSV upload endpoint ready for implementation' });
});

// PMS webhook endpoints
app.post('/webhooks/:vendor', (req, res) => {
    const vendor = req.params.vendor;
    console.log(`Received webhook from ${vendor}:`, req.body);
ECHO is off.
    // TODO: Implement webhook processing using integrations/${vendor}/MAPPING.md
    res.status(200).send('OK');
});

app.listen(PORT, () => {
    console.log(`🏨 ARTY™ Housekeeping server running on port ${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}`);
    console.log(`🔌 Webhooks: http://localhost:${PORT}/webhooks/{vendor}`);
});
