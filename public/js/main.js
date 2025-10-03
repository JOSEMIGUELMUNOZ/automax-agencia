// Funciones globales para la aplicación de AutoMax

// Función para formatear números como moneda mexicana
function formatCurrency(amount) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(amount);
}

// Función para validar email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Función para validar teléfono mexicano
function isValidPhone(phone) {
    const phoneRegex = /^(\+52|52)?\s?(\d{3})\s?(\d{3})\s?(\d{4})$|^(\d{3})\s?(\d{3})\s?(\d{4})$/;
    return phoneRegex.test(phone);
}

// Función para mostrar notificaciones toast
function showToast(message, type = 'info') {
    // Crear elemento toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#74b9ff'};
        color: white;
        padding: 1rem 2rem;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 1000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 300px;
        word-wrap: break-word;
    `;
    toast.innerHTML = message;
    
    document.body.appendChild(toast);
    
    // Mostrar toast
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Ocultar toast después de 4 segundos
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 4000);
}

// Función para mostrar loading spinner
function showLoading(element, text = 'Cargando...') {
    element.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: #666;">
            <div style="display: inline-block; width: 30px; height: 30px; border: 3px solid #f3f3f3; border-top: 3px solid #74b9ff; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 1rem;"></div>
            <div>${text}</div>
        </div>
    `;
}

// Función para crear elementos de auto reutilizable
function createAutoCard(auto, showActions = true) {
    const card = document.createElement('div');
    card.className = 'auto-card';
    
    const actions = showActions ? `
        <div class="auto-actions">
            <button onclick="calcularEnganche(${auto.id})" class="btn btn-small">Calcular Enganche</button>
            <button onclick="agendarCita(${auto.id})" class="btn btn-small btn-secondary">Agendar Cita</button>
        </div>
    ` : '';
    
    card.innerHTML = `
        <img src="${auto.imagen}" alt="${auto.marca} ${auto.modelo}" loading="lazy">
        <div class="auto-info">
            <h3>${auto.marca} ${auto.modelo} ${auto.año}</h3>
            <div class="precio">${formatCurrency(auto.precio)}</div>
            <div class="specs">
                <div class="spec-item">
                    <span><strong>Tipo:</strong></span>
                    <span>${auto.tipo}</span>
                </div>
                <div class="spec-item">
                    <span><strong>Combustible:</strong></span>
                    <span>${auto.combustible}</span>
                </div>
                <div class="spec-item">
                    <span><strong>Transmisión:</strong></span>
                    <span>${auto.transmision}</span>
                </div>
                <div class="spec-item">
                    <span><strong>Año:</strong></span>
                    <span>${auto.año}</span>
                </div>
            </div>
            ${actions}
        </div>
    `;
    return card;
}

// Función para navegar a calculadora de enganche
function calcularEnganche(autoId) {
    window.location.href = `/enganche?auto=${autoId}`;
}

// Función para navegar a agendar cita
function agendarCita(autoId) {
    window.location.href = `/citas?auto=${autoId}`;
}

// Función para hacer smooth scroll
function smoothScrollTo(element) {
    element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
    });
}

// Función para capitalizar primera letra
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Función para detectar si es dispositivo móvil
function isMobile() {
    return window.innerWidth <= 768;
}

// Event listeners globales
document.addEventListener('DOMContentLoaded', function() {
    // Marcar enlace activo en navegación
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('nav a');
    
    navLinks.forEach(link => {
        const linkPath = new URL(link.href).pathname;
        if (linkPath === currentPath) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
    
    // Agregar animación de carga a las imágenes
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        img.addEventListener('load', function() {
            this.style.opacity = '1';
        });
        img.addEventListener('error', function() {
            this.src = 'https://via.placeholder.com/300x200/cccccc/666666?text=Imagen+No+Disponible';
        });
        img.style.opacity = '0';
        img.style.transition = 'opacity 0.3s ease';
    });
    
    // Validación en tiempo real para formularios
    const inputs = document.querySelectorAll('input[type="email"]');
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            if (this.value && !isValidEmail(this.value)) {
                this.style.borderColor = '#e74c3c';
                showToast('Por favor ingresa un email válido', 'error');
            } else {
                this.style.borderColor = '#e0e0e0';
            }
        });
    });
    
    const phoneInputs = document.querySelectorAll('input[type="tel"]');
    phoneInputs.forEach(input => {
        input.addEventListener('input', function() {
            // Formatear teléfono mientras se escribe
            let value = this.value.replace(/\D/g, '');
            if (value.length >= 10) {
                value = value.substring(0, 10);
                value = value.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
            }
            this.value = value;
        });
    });
    
    // Agregar confirmación para acciones importantes
    const importantButtons = document.querySelectorAll('button[type="submit"]');
    importantButtons.forEach(button => {
        if (button.textContent.includes('Enviar') || button.textContent.includes('Solicitud')) {
            button.addEventListener('click', function(e) {
                if (!confirm('¿Estás seguro de que deseas continuar?')) {
                    e.preventDefault();
                }
            });
        }
    });
});

// Función para manejar errores de la API
function handleApiError(error, userMessage = 'Ha ocurrido un error inesperado') {
    console.error('API Error:', error);
    showToast(userMessage, 'error');
}

// Función para hacer peticiones HTTP con manejo de errores
async function apiRequest(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        handleApiError(error);
        throw error;
    }
}

// Función para validar formularios
function validateForm(formElement) {
    const requiredInputs = formElement.querySelectorAll('input[required], select[required], textarea[required]');
    let isValid = true;
    
    requiredInputs.forEach(input => {
        if (!input.value.trim()) {
            input.style.borderColor = '#e74c3c';
            isValid = false;
        } else {
            input.style.borderColor = '#e0e0e0';
        }
        
        // Validaciones específicas
        if (input.type === 'email' && input.value && !isValidEmail(input.value)) {
            input.style.borderColor = '#e74c3c';
            isValid = false;
        }
        
        if (input.type === 'tel' && input.value && !isValidPhone(input.value)) {
            input.style.borderColor = '#e74c3c';
            isValid = false;
        }
        
        if (input.type === 'number' && input.value && input.min && parseFloat(input.value) < parseFloat(input.min)) {
            input.style.borderColor = '#e74c3c';
            isValid = false;
        }
    });
    
    return isValid;
}

// Función para animar elementos cuando entran en vista
function observeElements() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });
    
    const animatedElements = document.querySelectorAll('.auto-card, .section');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// Inicializar animaciones cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', observeElements);

// Función para manejar el responsive del menú
function initMobileMenu() {
    const nav = document.querySelector('nav ul');
    const menuButton = document.createElement('button');
    menuButton.innerHTML = '☰';
    menuButton.className = 'menu-toggle';
    menuButton.style.cssText = `
        display: none;
        background: none;
        border: none;
        color: white;
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0.5rem;
    `;
    
    if (nav) {
        nav.parentNode.insertBefore(menuButton, nav);
        
        menuButton.addEventListener('click', function() {
            nav.classList.toggle('mobile-open');
        });
        
        // Cerrar menú al hacer clic en un enlace
        nav.addEventListener('click', function(e) {
            if (e.target.tagName === 'A') {
                nav.classList.remove('mobile-open');
            }
        });
    }
    
    // Mostrar/ocultar botón según el tamaño de pantalla
    function checkMobile() {
        if (isMobile()) {
            menuButton.style.display = 'block';
            if (nav) {
                nav.style.cssText = `
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background: rgba(30, 60, 114, 0.95);
                    flex-direction: column;
                    padding: 1rem;
                    transform: translateY(-100%);
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.3s ease;
                `;
            }
        } else {
            menuButton.style.display = 'none';
            if (nav) {
                nav.style.cssText = '';
                nav.classList.remove('mobile-open');
            }
        }
    }
    
    // CSS para menú móvil abierto
    const style = document.createElement('style');
    style.textContent = `
        nav ul.mobile-open {
            transform: translateY(0) !important;
            opacity: 1 !important;
            visibility: visible !important;
        }
    `;
    document.head.appendChild(style);
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
}

// Inicializar menú móvil
document.addEventListener('DOMContentLoaded', initMobileMenu);

// Función para lazy loading de imágenes
function initLazyLoading() {
    if ('IntersectionObserver' in window) {
        const lazyImages = document.querySelectorAll('img[loading="lazy"]');
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const image = entry.target;
                    image.src = image.dataset.src || image.src;
                    image.classList.remove('lazy');
                    imageObserver.unobserve(image);
                }
            });
        });
        
        lazyImages.forEach(image => {
            imageObserver.observe(image);
        });
    }
}

// Inicializar lazy loading
document.addEventListener('DOMContentLoaded', initLazyLoading);