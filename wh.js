const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');

const app = express();
app.use(express.json());

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true }
});

client.on('ready', () => console.log('WhatsApp Web listo'));

client.on('message', msg => {
    console.log(`Mensaje recibido: ${msg.body}`);
});

client.initialize();

// Endpoint para enviar mensajes desde PHP
app.post('/send-message', async (req, res) => {
    const { number, message } = req.body;
    const formattedNumber = number.includes('@c.us') ? number : `${number}@c.us`;

    try {
        await client.sendMessage(formattedNumber, message);
        res.json({ success: true, message: `Mensaje enviado a ${number}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => console.log('API corriendo en http://localhost:3000'));