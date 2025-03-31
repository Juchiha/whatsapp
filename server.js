const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

let qrCodes = {}; // Guardar QR por sesión
let clients = {}; // Guardar clientes activos

app.post('/whatsapp/init-session', async (req, res) => {
    const { sessionId } = req.body;

    if (!sessionId) {
        return res.status(400).json({ error: 'Se requiere un sessionId' });
    }

    if (clients[sessionId]) {
        return res.json({ success: true, message: `La sesión ${sessionId} ya está activa` });
    }

    const client = new Client({
        authStrategy: new LocalAuth({ clientId: sessionId }),
        puppeteer: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    });

    client.on('qr', async (qr) => {
        qrCodes[sessionId] = await qrcode.toDataURL(qr); // Generar imagen QR en base64
    });

    client.on('ready', () => {
        console.log(`Cliente ${sessionId} listo`);
    });

    client.initialize();
    clients[sessionId] = client;

    res.json({ success: true, message: `Sesión ${sessionId} iniciada. Escanea el QR en /qr/${sessionId}` });
});

app.post('/whatsapp/send-message', async (req, res) => {
    const { sessionId, number, message } = req.body;

    if (!sessionId || !clients[sessionId]) {
        return res.status(400).json({ error: 'Sesión no encontrada. Inicia sesión primero.' });
    }

    const formattedNumber = number.includes('@c.us') ? number : `${number}@c.us`;

    try {
        await clients[sessionId].sendMessage(formattedNumber, message);
        res.json({ success: true, message: `Mensaje enviado a ${number} desde sesión ${sessionId}` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/whatsapp/qr/:sessionId', async (req, res) => {
    const { sessionId } = req.params;

    if (!qrCodes[sessionId]) {
        return res.status(404).json({ error: 'QR no disponible. Inicia la sesión primero.' });
    }

    res.send(`<img src="${qrCodes[sessionId]}" alt="QR Code">`);
});

app.get('/whatsapp/health/', async (res) => {
    return res.status(200).json({ msg: 'Aplicacion corriendo sin problema.' });
});


app.listen(3000, () => console.log('Servidor API corriendo en http://localhost:3000'));