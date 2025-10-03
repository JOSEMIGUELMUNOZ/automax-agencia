const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar sesiones
app.use(session({
    secret: process.env.SESSION_SECRET || 'automax-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Cambiar a false para que funcione sin HTTPS
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Base de datos
const db = new sqlite3.Database('./automax.db', (err) => {
    if (err) {
        console.error('Error al conectar a la base de datos:', err);
    } else {
        console.log('✅ Conectado a la base de datos SQLite');
    }
});

// Crear tablas
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        telefono TEXT,
        password TEXT NOT NULL,
        fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS autos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        marca TEXT NOT NULL,
        modelo TEXT NOT NULL,
        año INTEGER NOT NULL,
        precio REAL NOT NULL,
        tipo TEXT NOT NULL,
        combustible TEXT NOT NULL,
        transmision TEXT NOT NULL,
        imagen TEXT,
        descripcion TEXT,
        disponible BOOLEAN DEFAULT 1
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS citas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER,
        auto_id INTEGER,
        fecha DATE NOT NULL,
        hora TIME NOT NULL,
        mensaje TEXT,
        estado TEXT DEFAULT 'Pendiente',
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(usuario_id) REFERENCES usuarios(id),
        FOREIGN KEY(auto_id) REFERENCES autos(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS financiamientos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER,
        auto_id INTEGER,
        enganche REAL NOT NULL,
        mensualidades INTEGER NOT NULL,
        pago_mensual REAL NOT NULL,
        monto_financiar REAL NOT NULL,
        ocupacion TEXT,
        ingresos REAL,
        antiguedad TEXT,
        estado TEXT DEFAULT 'Solicitud enviada',
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(usuario_id) REFERENCES usuarios(id),
        FOREIGN KEY(auto_id) REFERENCES autos(id)
    )`);

    // Insertar datos de ejemplo
    db.get("SELECT COUNT(*) as count FROM autos", (err, row) => {
        if (!err && row && row.count === 0) {
            const autos = [
                ['Toyota', 'Corolla', 2024, 380000, 'Sedan', 'Gasolina', 'Automática', '/images/toyota-corolla.jpg', 'Sedan confiable'],
                ['Honda', 'Civic', 2024, 420000, 'Sedan', 'Gasolina', 'Manual', '/images/honda-civic.jpg', 'Deportivo elegante'],
                ['Ford', 'F-150', 2024, 750000, 'Pickup', 'Gasolina', 'Automática', '/images/ford-f150.jpg', 'Pickup potente'],
                ['Chevrolet', 'Suburban', 2024, 920000, 'SUV', 'Gasolina', 'Automática', '/images/chevrolet-suburban.jpg', 'SUV familiar'],
                ['Nissan', 'Sentra', 2024, 350000, 'Sedan', 'Gasolina', 'CVT', '/images/nissan-sentra.jpg', 'Compacto moderno'],
                ['Volkswagen', 'Tiguan', 2024, 580000, 'SUV', 'Gasolina', 'Automática', '/images/volkswagen-tiguan.jpg', 'SUV alemán'],
                ['Mazda', 'CX-5', 2024, 520000, 'SUV', 'Gasolina', 'Automática', '/images/mazda-cx5.jpg', 'SUV premium'],
                ['Hyundai', 'Elantra', 2024, 395000, 'Sedan', 'Gasolina', 'Automática', '/images/hyundai-elantra.jpg', 'Sedan moderno']
            ];
            
            const stmt = db.prepare("INSERT INTO autos (marca, modelo, año, precio, tipo, combustible, transmision, imagen, descripcion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            autos.forEach(auto => stmt.run(auto));
            stmt.finalize();
            console.log('✅ Datos de ejemplo insertados');
        }
    });
});

// Middleware de autenticación
const requireAuth = (req, res, next) => {
    if (!req.session.usuario) {
        return res.status(401).json({ error: 'Debes iniciar sesión' });
    }
    next();
};

// Rutas HTML
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'views', 'login.html')));
app.get('/registro', (req, res) => res.sendFile(path.join(__dirname, 'views', 'registro.html')));
app.get('/autos', (req, res) => res.sendFile(path.join(__dirname, 'views', 'autos.html')));
app.get('/citas', (req, res) => res.sendFile(path.join(__dirname, 'views', 'citas.html')));
app.get('/perfil', (req, res) => res.sendFile(path.join(__dirname, 'views', 'perfil.html')));
app.get('/enganche', (req, res) => res.sendFile(path.join(__dirname, 'views', 'enganche.html')));

// API - Registro
app.post('/api/registro', async (req, res) => {
    const { nombre, email, telefono, password } = req.body;
    try {
        db.get("SELECT id FROM usuarios WHERE email = ?", [email], async (err, row) => {
            if (err) return res.status(500).json({ error: 'Error en la base de datos' });
            if (row) return res.status(400).json({ error: 'El email ya está registrado' });
            
            const hashedPassword = await bcrypt.hash(password, 10);
            db.run("INSERT INTO usuarios (nombre, email, telefono, password) VALUES (?, ?, ?, ?)",
                [nombre, email, telefono, hashedPassword], function(err) {
                    if (err) return res.status(500).json({ error: 'Error al crear usuario' });
                    req.session.usuario = { id: this.lastID, nombre, email, telefono };
                    res.json({ success: true, usuario: req.session.usuario });
                });
        });
    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// API - Login
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    db.get("SELECT * FROM usuarios WHERE email = ?", [email], async (err, usuario) => {
        if (err) return res.status(500).json({ error: 'Error en la base de datos' });
        if (!usuario) return res.status(400).json({ error: 'Credenciales inválidas' });
        
        const passwordValido = await bcrypt.compare(password, usuario.password);
        if (!passwordValido) return res.status(400).json({ error: 'Credenciales inválidas' });
        
        req.session.usuario = { id: usuario.id, nombre: usuario.nombre, email: usuario.email, telefono: usuario.telefono };
        res.json({ success: true, usuario: req.session.usuario });
    });
});

// API - Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ error: 'Error al cerrar sesión' });
        res.json({ success: true });
    });
});

// API - Sesión
app.get('/api/sesion', (req, res) => {
    res.json({ usuario: req.session.usuario || null });
});

// API - Autos
app.get('/api/autos', (req, res) => {
    db.all("SELECT * FROM autos WHERE disponible = 1", (err, autos) => {
        if (err) return res.status(500).json({ error: 'Error al obtener autos' });
        res.json(autos);
    });
});

app.get('/api/auto/:id', (req, res) => {
    db.get("SELECT * FROM autos WHERE id = ? AND disponible = 1", [req.params.id], (err, auto) => {
        if (err) return res.status(500).json({ error: 'Error al obtener auto' });
        if (!auto) return res.status(404).json({ error: 'Auto no encontrado' });
        res.json(auto);
    });
});

// API - Citas
app.post('/api/citas', requireAuth, (req, res) => {
    const { autoId, fecha, hora, mensaje } = req.body;
    db.run("INSERT INTO citas (usuario_id, auto_id, fecha, hora, mensaje) VALUES (?, ?, ?, ?, ?)",
        [req.session.usuario.id, autoId || null, fecha, hora, mensaje || ''], function(err) {
            if (err) return res.status(500).json({ error: 'Error al agendar cita' });
            db.get(`SELECT c.*, a.marca, a.modelo, a.año, a.precio, a.imagen FROM citas c LEFT JOIN autos a ON c.auto_id = a.id WHERE c.id = ?`, 
                [this.lastID], (err, cita) => {
                    if (err) return res.status(500).json({ error: 'Error al obtener cita' });
                    res.json({ success: true, cita });
                });
        });
});

// API - Financiamientos
app.post('/api/financiamientos', requireAuth, (req, res) => {
    const { autoId, enganche, mensualidades, ocupacion, ingresos, antiguedad } = req.body;
    db.get("SELECT precio FROM autos WHERE id = ?", [autoId], (err, auto) => {
        if (err || !auto) return res.status(500).json({ error: 'Error al obtener auto' });
        
        const montoFinanciar = auto.precio - enganche;
        const tasaMensual = 0.08 / 12;
        const pagoMensual = montoFinanciar * (tasaMensual * Math.pow(1 + tasaMensual, mensualidades)) / (Math.pow(1 + tasaMensual, mensualidades) - 1);
        
        db.run(`INSERT INTO financiamientos (usuario_id, auto_id, enganche, mensualidades, pago_mensual, monto_financiar, ocupacion, ingresos, antiguedad) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.session.usuario.id, autoId, enganche, mensualidades, pagoMensual, montoFinanciar, ocupacion, ingresos, antiguedad],
            function(err) {
                if (err) return res.status(500).json({ error: 'Error al crear financiamiento' });
                db.get(`SELECT f.*, a.marca, a.modelo, a.año, a.precio, a.imagen FROM financiamientos f JOIN autos a ON f.auto_id = a.id WHERE f.id = ?`, 
                    [this.lastID], (err, financiamiento) => {
                        if (err) return res.status(500).json({ error: 'Error al obtener financiamiento' });
                        res.json({ success: true, financiamiento });
                    });
            });
    });
});

// API - Perfil
app.get('/api/perfil', requireAuth, (req, res) => {
    const userId = req.session.usuario.id;
    db.all(`SELECT c.*, a.marca, a.modelo, a.año, a.precio, a.imagen FROM citas c LEFT JOIN autos a ON c.auto_id = a.id WHERE c.usuario_id = ? ORDER BY c.fecha_creacion DESC`, 
        [userId], (err, citas) => {
            if (err) return res.status(500).json({ error: 'Error al obtener citas' });
            db.all(`SELECT f.*, a.marca, a.modelo, a.año, a.precio, a.imagen FROM financiamientos f JOIN autos a ON f.auto_id = a.id WHERE f.usuario_id = ? ORDER BY f.fecha_creacion DESC`, 
                [userId], (err, financiamientos) => {
                    if (err) return res.status(500).json({ error: 'Error al obtener financiamientos' });
                    res.json({ usuario: req.session.usuario, citas: citas || [], financiamientos: financiamientos || [] });
                });
        });
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'OK' }));

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Servidor en puerto ${PORT}`);
    console.log(`🌐 Modo: ${process.env.NODE_ENV || 'development'}`);
});