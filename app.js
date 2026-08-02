/**
 * Catálogo de Perfumes — Frontend Vanilla JS
 * Consume la API REST local y renderiza el inventario disponible.
 */

const API_URL = 'http://localhost:3000/api/perfumes';
const LOW_STOCK_THRESHOLD = 5;
const STAGGER_STEP_MS = 90; 

const catalogGrid = document.getElementById('catalog-grid');
const feedbackContainer = document.getElementById('feedback-container');

/**
 * Observador compartido para animaciones de scroll
 */
const observadorDeAparicion = new IntersectionObserver(
  (entradas) => {
    entradas.forEach((entrada) => {
      if (entrada.isIntersecting) {
        entrada.target.classList.add('is-visible');
        observadorDeAparicion.unobserve(entrada.target);
      }
    });
  },
  { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
);

function observarAparicion(elemento) {
  elemento.classList.add('reveal');
  observadorDeAparicion.observe(elemento);
}

document.addEventListener('DOMContentLoaded', () => {
  cargarCatalogo();
});

/**
 * Obtiene los perfumes del Backend (Supabase)
 */
async function cargarCatalogo() {
  mostrarCargando();

  try {
    const respuesta = await fetch(API_URL);

    if (!respuesta.ok) {
      throw new Error(`Error del servidor: ${respuesta.status} ${respuesta.statusText}`);
    }

    const perfumes = await respuesta.json();
    limpiarFeedback();

    if (!Array.isArray(perfumes) || perfumes.length === 0) {
      mostrarMensaje('No hay perfumes disponibles en este momento.');
      return;
    }

    renderizarPerfumes(perfumes);

  } catch (error) {
    console.error('Fallo al obtener el catálogo de perfumes:', error);
    mostrarMensaje(
      'No se pudo cargar el catálogo. Verifica tu conexión o intenta nuevamente más tarde.',
      { esError: true }
    );
  }
}

/**
 * Dibuja la cuadrícula de perfumes
 */
function renderizarPerfumes(perfumes) {
  const fragmento = document.createDocumentFragment();

  perfumes.forEach((perfume, indice) => {
    fragmento.appendChild(crearTarjetaPerfume(perfume, indice));
  });

  catalogGrid.innerHTML = '';
  catalogGrid.appendChild(fragmento);
}

/**
 * Construye cada tarjeta de perfume individual (¡AQUÍ YA INCLUYE IMAGEN!)
 */
function crearTarjetaPerfume(perfume, indice = 0) {
  const { id, nombre, imagen_url } = perfume;

  const card = document.createElement('article');
  card.className = 'perfume-card';
  card.dataset.id = id;

  card.style.setProperty('--reveal-delay', `${indice * STAGGER_STEP_MS}ms`);

  const inicial = nombre?.charAt(0)?.toUpperCase() ?? '?';

  const visualHtml = imagen_url 
    ? `<img src="${imagen_url}" alt="${escaparHTML(nombre)}" class="perfume-card__image">`
    : `<span class="perfume-card__initial">${inicial}</span>`;

  card.innerHTML = `
    <div class="perfume-card__media">
      ${visualHtml}
    </div>
    <div class="perfume-card__body">
      <h2 class="perfume-card__name">${escaparHTML(nombre)}</h2>
    </div>
    <div class="perfume-card__footer">
      <button class="perfume-card__button" type="button">Ver detalle</button>
    </div>
  `;

  // --- EL TRUCO NINJA ---
  // Capturamos el botón que acabamos de crear y le "enchufamos" la acción.
  const botonVerDetalle = card.querySelector('.perfume-card__button');
  botonVerDetalle.addEventListener('click', () => {
    window.location.href = `detalle.html?id=${id}`;
  });

  observarAparicion(card);
  return card;
}

// Nueva función para redirigir al usuario al detalle del perfume
/**
 * Funciones de Utilidad (Moneda en Bolivianos, Seguridad y Mensajes)
 */
function formatearPrecio(precio) {
  return new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: 'BOB', 
    minimumFractionDigits: 2,
  }).format(precio);
}

function escaparHTML(texto = '') {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

function mostrarCargando() {
  feedbackContainer.innerHTML = `
    <div class="feedback__spinner" role="status" aria-label="Cargando catálogo"></div>
  `;
  catalogGrid.innerHTML = '';
}

function mostrarMensaje(texto, { esError = false } = {}) {
  feedbackContainer.innerHTML = `
    <p class="feedback__message ${esError ? 'feedback__message--error' : ''}">${escaparHTML(texto)}</p>
  `;
}

function limpiarFeedback() {
  feedbackContainer.innerHTML = '';
}
// ==========================================
// LÓGICA DE FILTROS PREMIUM
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  inicializarFiltros();
});

function inicializarFiltros() {
  // 1. Efecto visual de las Píldoras (Botones)
  const pildoras = document.querySelectorAll('.pildora');
  
  pildoras.forEach(boton => {
    boton.addEventListener('click', function() {
      // Buscamos todos los botones dentro del mismo grupo (Género o Tipo)
      const contenedor = this.parentElement;
      const botonesHermandad = contenedor.querySelectorAll('.pildora');
      
      // Les quitamos la clase 'active' a todos
      botonesHermandad.forEach(b => b.classList.remove('active'));
      
      // Se la ponemos solo al que hicimos clic
      this.classList.add('active');
    });
  });

  // 2. MAGIA: Auto-seleccionar Marca al escribir (El detalle que pediste)
  const inputBuscar = document.getElementById('input-buscar');
  const selectMarca = document.getElementById('select-marca');

  inputBuscar.addEventListener('input', (evento) => {
    const texto = evento.target.value.toLowerCase();

    // Lógica inteligente: Si el texto contiene ciertas palabras clave, cambiamos la marca.
    if (texto.includes('eclaire') || texto.includes('asad') || texto.includes('fakhar')) {
      selectMarca.value = 'Lattafa';
    } 
    else if (texto.includes('club de nuit') || texto.includes('odyssey')) {
      selectMarca.value = 'Armaf';
    } 
    else if (texto.includes('liquid brun')) {
      selectMarca.value = 'French Avenue';
    }
    // Si borran todo, devolvemos a "Todas las marcas"
    else if (texto === '') {
      selectMarca.value = 'todos';
    }
    
    // (En el próximo paso, conectaremos esto para que filtre las tarjetas reales)
  });
}