const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000; // Usar puerto de entorno o 3000

// Configurar sesiones
app.use(session({
    secret: process.env.SESSION_SECRET || 'automax-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
}));

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Inicializar base de datos
const dbPath = process.env.NODE_ENV === 'production' 
    ? '/opt/render/project/src/automax.db' 
    : 'automax.db';
const db = new sqlite3.Database(dbPath);

// Crear tablas
db.serialize(() => {
    // Tabla usuarios
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        telefono TEXT,
        password TEXT NOT NULL,
        fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabla autos
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

    // Tabla citas
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

    // Tabla solicitudes de financiamiento
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

    // Insertar autos de ejemplo si no existen
    db.get("SELECT COUNT(*) as count FROM autos", (err, row) => {
        if (row && row.count === 0) {
            const autosEjemplo = [
                {
                    marca: 'Toyota', modelo: 'Corolla', año: 2024, precio: 380000, tipo: 'Sedan',
                    combustible: 'Gasolina', transmision: 'Automática',
                    imagen: '/images/toyota-corolla.jpg',
                    descripcion: 'Sedan confiable y económico, perfecto para uso diario con excelente rendimiento de combustible.'
                },
                {
                    marca: 'Honda', modelo: 'Civic', año: 2024, precio: 420000, tipo: 'Sedan',
                    combustible: 'Gasolina', transmision: 'Manual',
                    imagen: '/images/honda-civic.jpg',
                    descripcion: 'Deportivo y elegante, con tecnología avanzada y gran espacio interior.'
                },
                {
                    marca: 'Ford', modelo: 'F-150', año: 2024, precio: 750000, tipo: 'Pickup',
                    combustible: 'Gasolina', transmision: 'Automática',
                    imagen: '/images/ford-f150.jpg',
                    descripcion: 'La pickup más vendida en América, potente y versátil para trabajo y familia.'
                },
                {
                    marca: 'Chevrolet', modelo: 'Suburban', año: 2024, precio: 920000, tipo: 'SUV',
                    combustible: 'Gasolina', transmision: 'Automática',
                    imagen: '/images/chevrolet-suburban.jpg',
                    descripcion: 'SUV de lujo con capacidad para 8 pasajeros, ideal para familias grandes.'
                },
                {
                    marca: 'Nissan', modelo: 'Sentra', año: 2024, precio: 350000, tipo: 'Sedan',
                    combustible: 'Gasolina', transmision: 'CVT',
                    imagen: '/images/nissan-sentra.jpg',
                    descripcion: 'Compacto moderno con excelente tecnología y consumo eficiente.'
                },
                {
                    marca: 'Volkswagen', modelo: 'Tiguan', año: 2024, precio: 580000, tipo: 'SUV',
                    combustible: 'Gasolina', transmision: 'Automática',
                    imagen: '/images/volkswagen-tiguan.jpg',
                    descripcion: 'SUV alemán con diseño sofisticado y tecnología de punta.'
                },
                {
                    marca: 'Mazda', modelo: 'CX-5', año: 2024, precio: 520000, tipo: 'SUV',
                    combustible: 'Gasolina', transmision: 'Automática',
                    imagen: '/images/mazda-cx5.jpg',
                    descripcion: 'SUV compacto con diseño premium y excelente manejo.'
                },
                {
                    marca: 'Hyundai', modelo: 'Elantra', año: 2024, precio: 395000, tipo: 'Sedan',
                    combustible: 'Gasolina', transmision: 'Automática',
                    imagen: '/images/hyundai-elantra.jpg',
                    descripcion: 'Sedan elegante con garantía extendida y tecnología moderna.'
                }
            ];

            autosEjemplo.forEach(auto => {
                db.run(`INSERT INTO autos (marca, modelo, año, precio, tipo, combustible, transmision, imagen, descripcion) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [auto.marca, auto.modelo, auto.año, auto.precio, auto.tipo, auto.combustible, auto.transmision, auto.imagen, auto.descripcion]
                );
            });
            console.log('✅ Datos de ejemplo insertados');
        }
    });
});

// Middleware para verificar autenticación
const requireAuth = (req, res, next) => {
    if (!req.session.usuario) {
        return res.status(401).json({ error: 'Debes iniciar sesión' });
    }
    next();
};

// Rutas para servir páginas HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/registro', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'registro.html'));
});

app.get('/autos', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'autos.html'));
});

app.get('/citas', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'citas.html'));
});

app.get('/perfil', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'perfil.html'));
});

app.get('/enganche', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'enganche.html'));
});

// API Routes - Autenticación
app.post('/api/registro', async (req, res) => {
    const { nombre, email, telefono, password } = req.body;
    
    try {
        db.get("SELECT id FROM usuarios WHERE email = ?", [email], async (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Error en la base de datos' });
            }
            
            if (row) {
                return res.status(400).json({ error: 'El email ya está registrado' });
            }
            
            const hashedPassword = await bcrypt.hash(password, 10);
            
            db.run("INSERT INTO usuarios (nombre, email, telefono, password) VALUES (?, ?, ?, ?)",
                [nombre, email, telefono, hashedPassword], function(err) {
                    if (err) {
                        return res.status(500).json({ error: 'Error al crear usuario' });
                    }
                    
                    req.session.usuario = {
                        id: this.lastID,
                        nombre,
                        email,
                        telefono
                    };
                    
                    res.json({ success: true, usuario: req.session.usuario });
                });
        });
    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    db.get("SELECT * FROM usuarios WHERE email = ?", [email], async (err, usuario) => {
        if (err) {
            return res.status(500).json({ error: 'Error en la base de datos' });
        }
        
        if (!usuario) {
            return res.status(400).json({ error: 'Credenciales inválidas' });
        }
        
        const passwordValido = await bcrypt.compare(password, usuario.password);
        if (!passwordValido) {
            return res.status(400).json({ error: 'Credenciales inválidas' });
        }
        
        req.session.usuario = {
            id: usuario.id,
            nombre: usuario.nombre,
            email: usuario.email,
            telefono: usuario.telefono
        };
        
        res.json({ success: true, usuario: req.session.usuario });
    });
});

app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Error al cerrar sesión' });
        }
        res.json({ success: true });
    });
});

app.get('/api/sesion', (req, res) => {
    if (req.session.usuario) {
        res.json({ usuario: req.session.usuario });
    } else {
        res.json({ usuario: null });
    }
});

// API Routes - Autos
app.get('/api/autos', (req, res) => {
    db.all("SELECT * FROM autos WHERE disponible = 1", (err, autos) => {
        if (err) {
            return res.status(500).json({ error: 'Error al obtener autos' });
        }
        res.json(autos);
    });
});

app.get('/api/auto/:id', (req, res) => {
    const { id } = req.params;
    
    db.get("SELECT * FROM autos WHERE id = ? AND disponible = 1", [id], (err, auto) => {
        if (err) {
            return res.status(500).json({ error: 'Error al obtener auto' });
        }
        
        if (!auto) {
            return res.status(404).json({ error: 'Auto no encontrado' });
        }
        
        res.json(auto);
    });
});

// API Routes - Citas (requieren autenticación)
app.post('/api/citas', requireAuth, (req, res) => {
    const { autoId, fecha, hora, mensaje } = req.body;
    const usuarioId = req.session.usuario.id;
    
    db.run("INSERT INTO citas (usuario_id, auto_id, fecha, hora, mensaje) VALUES (?, ?, ?, ?, ?)",
        [usuarioId, autoId || null, fecha, hora, mensaje || ''], function(err) {
            if (err) {
                return res.status(500).json({ error: 'Error al agendar cita' });
            }
            
            db.get(`SELECT c.*, a.marca, a.modelo, a.año, a.precio, a.imagen 
                    FROM citas c 
                    LEFT JOIN autos a ON c.auto_id = a.id 
                    WHERE c.id = ?`, [this.lastID], (err, cita) => {
                if (err) {
                    return res.status(500).json({ error: 'Error al obtener cita' });
                }
                
                res.json({ success: true, cita });
            });
        });
});

// API Routes - Financiamientos (requieren autenticación)
app.post('/api/financiamientos', requireAuth, (req, res) => {
    const { autoId, enganche, mensualidades, ocupacion, ingresos, antiguedad } = req.body;
    const usuarioId = req.session.usuario.id;
    
    db.get("SELECT precio FROM autos WHERE id = ?", [autoId], (err, auto) => {
        if (err || !auto) {
            return res.status(500).json({ error: 'Error al obtener información del auto' });
        }
        
        const montoFinanciar = auto.precio - enganche;
        const tasaAnual = 0.08;
        const tasaMensual = tasaAnual / 12;
        let pagoMensual;
        
        if (tasaMensual > 0) {
            pagoMensual = montoFinanciar * (tasaMensual * Math.pow(1 + tasaMensual, mensualidades)) / (Math.pow(1 + tasaMensual, mensualidades) - 1);
        } else {
            pagoMensual = montoFinanciar / mensualidades;
        }
        
        db.run(`INSERT INTO financiamientos 
                (usuario_id, auto_id, enganche, mensualidades, pago_mensual, monto_financiar, ocupacion, ingresos, antiguedad) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [usuarioId, autoId, enganche, mensualidades, pagoMensual, montoFinanciar, ocupacion, ingresos, antiguedad],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Error al crear solicitud de financiamiento' });
                }
                
                db.get(`SELECT f.*, a.marca, a.modelo, a.año, a.precio, a.imagen 
                        FROM financiamientos f 
                        JOIN autos a ON f.auto_id = a.id 
                        WHERE f.id = ?`, [this.lastID], (err, financiamiento) => {
                    if (err) {
                        return res.status(500).json({ error: 'Error al obtener financiamiento' });
                    }
                    
                    res.json({ success: true, financiamiento });
                });
            });
    });
});

// API Routes - Perfil (requiere autenticación)
app.get('/api/perfil', requireAuth, (req, res) => {
    const usuarioId = req.session.usuario.id;
    
    db.all(`SELECT c.*, a.marca, a.modelo, a.año, a.precio, a.imagen 
            FROM citas c 
            LEFT JOIN autos a ON c.auto_id = a.id 
            WHERE c.usuario_id = ? 
            ORDER BY c.fecha_creacion DESC`, [usuarioId], (err, citas) => {
        if (err) {
            return res.status(500).json({ error: 'Error al obtener citas' });
        }
        
        db.all(`SELECT f.*, a.marca, a.modelo, a.año, a.precio, a.imagen 
                FROM financiamientos f 
                JOIN autos a ON f.auto_id = a.id 
                WHERE f.usuario_id = ? 
                ORDER BY f.fecha_creacion DESC`, [usuarioId], (err, financiamientos) => {
            if (err) {
                return res.status(500).json({ error: 'Error al obtener financiamientos' });
            }
            
            res.json({
                usuario: req.session.usuario,
                citas: citas || [],
                financiamientos: financiamientos || []
            });
        });
    });
});

// Health check para verificar que el servidor está funcionando
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Servidor corriendo en puerto ${PORT}`);
    console.log(`🌐 Modo: ${process.env.NODE_ENV || 'development'}`);
    console.log('🚗 AutoMax listo!');
});