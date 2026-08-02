/**
 * Panel de Administración — Alta de perfumes
 * Envía el formulario a la API vía POST y muestra notificaciones tipo toast.
 */

const API_URL = 'http://localhost:3000/api/perfumes';
const TOAST_DURATION_MS = 4000;

const formulario = document.getElementById('perfume-form');
const botonSubmit = document.getElementById('submit-button');
const toastContainer = document.getElementById('toast-container');

formulario.addEventListener('submit', manejarEnvioFormulario);

/**
 * Maneja el submit del formulario: valida, envía a la API y notifica el resultado.
 * @param {SubmitEvent} evento
 */
async function manejarEnvioFormulario(evento) {
  evento.preventDefault();

  limpiarErrores();

  const datosPerfume = obtenerDatosFormulario();
  const erroresDeValidacion = validarPerfume(datosPerfume);

  if (Object.keys(erroresDeValidacion).length > 0) {
    mostrarErrores(erroresDeValidacion);
    return;
  }

  alternarEstadoCarga(true);

  try {
    const respuesta = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datosPerfume),
    });

    if (!respuesta.ok) {
      throw new Error(`Error del servidor: ${respuesta.status} ${respuesta.statusText}`);
    }

    mostrarToast(`Perfume registrado: "${datosPerfume.nombre}".`, 'success');
    formulario.reset();

  } catch (error) {
    console.error('Fallo al guardar el perfume:', error);
    mostrarToast('No se pudo guardar el perfume. Intenta nuevamente.', 'error');

  } finally {
    alternarEstadoCarga(false);
  }
}

/**
 * Lee y normaliza los valores actuales del formulario.
 * @returns {{nombre: string, precio: number, stock: number}}
 */
function obtenerDatosFormulario() {
  const formData = new FormData(formulario);

  return {
    nombre: formData.get('nombre').trim(),
    imagen_url: formData.get('imagen_url').trim() || '',
    genero: formData.get('genero'),
    tipo: formData.get('tipo'),
    marca: formData.get('marca'),
    precio: parseFloat(formData.get('precio')),
    stock: parseInt(formData.get('stock'), 10),
  };
}

/**
 * Valida los datos del perfume antes de enviarlos a la API.
 * @param {{nombre: string, precio: number, stock: number}} datos
 * @returns {Object<string, string>} Mapa de campo -> mensaje de error
 */
function validarPerfume({ nombre, precio, stock }) {
  const errores = {};

  if (!nombre) {
    errores.nombre = 'El nombre es obligatorio.';
  }

  if (isNaN(precio) || precio <= 0) {
    errores.precio = 'Ingresa un precio válido mayor a 0.';
  }

  if (isNaN(stock) || stock < 0 || !Number.isInteger(stock)) {
    errores.stock = 'Ingresa una cantidad de stock válida.';
  }

  return errores;
}

/**
 * Muestra los mensajes de error debajo de cada campo correspondiente.
 * @param {Object<string, string>} errores
 */
function mostrarErrores(errores) {
  Object.entries(errores).forEach(([campo, mensaje]) => {
    const contenedorError = document.querySelector(`[data-error-for="${campo}"]`);
    if (contenedorError) {
      contenedorError.textContent = mensaje;
    }
  });
}

/**
 * Limpia todos los mensajes de error del formulario.
 */
function limpiarErrores() {
  document.querySelectorAll('.form-field__error').forEach((el) => {
    el.textContent = '';
  });
}

/**
 * Activa/desactiva el estado de carga del botón de envío.
 * @param {boolean} estaCargando
 */
function alternarEstadoCarga(estaCargando) {
  botonSubmit.disabled = estaCargando;
  botonSubmit.textContent = estaCargando ? 'Guardando...' : 'Guardar Perfume';
}

/**
 * Crea y muestra una notificación tipo toast, con auto-cierre.
 * @param {string} mensaje
 * @param {'success' | 'error'} tipo
 */
function mostrarToast(mensaje, tipo = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast--${tipo}`;
  toast.textContent = mensaje;
  toast.setAttribute('role', 'status');

  toastContainer.appendChild(toast);

  // Se agrega en el siguiente frame para que la transición de entrada se dispare.
  requestAnimationFrame(() => {
    toast.classList.add('is-visible');
  });

  setTimeout(() => cerrarToast(toast), TOAST_DURATION_MS);
}

/**
 * Oculta y elimina un toast del DOM tras su transición de salida.
 * @param {HTMLElement} toast
 */
function cerrarToast(toast) {
  toast.classList.remove('is-visible');
  toast.addEventListener('transitionend', () => toast.remove(), { once: true });
}