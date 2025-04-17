const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const express = require('express');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(cors());

let qrCodes = {}; 
let clients = {};
const SESSION_FILE_PATH = './session.json'; // Archivo donde guardaremos el estado de sesiones

// Función para guardar el estado de sesión
const guardarSesion = (sessionId) => {
    const sessionData = { sessionId, active: true, timestamp: Date.now() };
    fs.writeFileSync(SESSION_FILE_PATH, JSON.stringify(sessionData));
};

// Función para cargar la sesión desde el archivo
const cargarSesion = () => {
    if (fs.existsSync(SESSION_FILE_PATH)) {
        const data = JSON.parse(fs.readFileSync(SESSION_FILE_PATH));
        return data.active ? data.sessionId : null;
    }
    return null;
};

// Inicialización de una sesión nueva o restaurada
const iniciarCliente = (sessionId) => {
    if (clients[sessionId]) {
        console.log(`La sesión ${sessionId} ya está activa.`);
        return clients[sessionId];
    }

    const client = new Client({
        authStrategy: new LocalAuth({ clientId: sessionId })
    });

    client.on('qr', async (qr) => {
        qrCodes[sessionId] = await qrcode.toDataURL(qr);
    });

    client.on('ready', () => {
        console.log(`Cliente ${sessionId} listo.`);
        guardarSesion(sessionId);
    });

    client.on('disconnected', () => {
        console.log(`Cliente ${sessionId} desconectado. Intentando restaurar...`);
        fs.unlinkSync(SESSION_FILE_PATH);
        setTimeout(() => iniciarCliente(sessionId), 3000);
    });

    client.initialize();
    clients[sessionId] = client;
    return client;
};

// Endpoint para iniciar sesión de WhatsApp
app.post('/whatsapp/init-session', async (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId) {
        return res.status(400).json({ error: 'Se requiere un sessionId' });
    }

    const sesionGuardada = cargarSesion();
    const cliente = iniciarCliente(sesionGuardada || sessionId);

    res.json({ success: true, message: `Sesión ${sessionId} iniciada o restaurada. Escanea el QR en /qr/${sessionId}` });
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
    console.log('Servidor API corriendo en http://localhost:3000/whatsapp/status OK')
    if (!qrCodes[sessionId]) {
        return res.status(404).json({ error: 'QR no disponible. Inicia la sesión primero.' });
    }

    res.send(`<img src="${qrCodes[sessionId]}" alt="QR Code">`);
});

app.get('/whatsapp/health/', async (req, res) => {
    console.log('Servidor API corriendo en http://localhost:3000/whatsapp/status OK')
    return res.status(200).json({ msg: 'Aplicacion corriendo sin problema.' });
});


app.listen(3000, () => console.log('Servidor API corriendo en http://localhost:3000'));