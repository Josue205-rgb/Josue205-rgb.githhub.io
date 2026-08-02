/**
 * Lógica de la Página de Detalles
 */
const API_URL = 'http://localhost:3000/api/perfumes';

// Leemos el ID que pasamos por la URL (ej: detalle.html?id=5)
const parametrosURL = new URLSearchParams(window.location.search);
const perfumeId = parametrosURL.get('id');

document.addEventListener('DOMContentLoaded', () => {
  if (perfumeId) {
    cargarPerfume(perfumeId);
  } else {
    document.getElementById('txt-nombre').textContent = "Perfume no encontrado";
  }
});

async function cargarPerfume(id) {
  try {
    const respuesta = await fetch(API_URL);
    if (!respuesta.ok) throw new Error("Error al conectar con el servidor");
    
    const perfumes = await respuesta.json();
    
    // Buscamos el perfume específico en la lista
    const perfume = perfumes.find(p => p.id == id);

    if (!perfume) {
      document.getElementById('txt-nombre').textContent = "Perfume no encontrado";
      return;
    }

    // --- INYECTAMOS LOS DATOS EN EL HTML ---
    
    // 1. Nombre
    document.getElementById('txt-nombre').textContent = perfume.nombre;
    
    // 2. Precio
    document.getElementById('txt-precio').textContent = perfume.precio;
    
    // 3. Imagen (Si tiene, la ponemos, si no, dejamos el placeholder)
    if (perfume.imagen_url) {
      document.getElementById('img-perfume').src = perfume.imagen_url;
      document.getElementById('img-perfume').alt = perfume.nombre;
    }

    // 4. Configurar el botón de WhatsApp
    configurarBotonWhatsapp(perfume);

  } catch (error) {
    console.error("Error:", error);
    document.getElementById('txt-nombre').textContent = "Error al cargar la información";
  }
}

function configurarBotonWhatsapp(perfume) {
  const btnWhatsapp = document.getElementById('btn-whatsapp');
  
  // Mensaje predeterminado que enviará el cliente
  const mensaje = `¡Hola Perfumería Camargo! Estoy interesado en pedir el perfume directo: *${perfume.nombre}* (Precio: Bs ${perfume.precio}).`;
  
  // Número de teléfono de tu negocio (Cámbialo por el tuyo, con código de país 591 para Bolivia)
  const numeroTelefono = "59100000000"; // ¡PON TU NÚMERO AQUÍ!
  
  // Enlace a la API de WhatsApp
  const enlace = `https://api.whatsapp.com/send?phone=${numeroTelefono}&text=${encodeURIComponent(mensaje)}`;
  
  btnWhatsapp.onclick = () => {
    window.open(enlace, '_blank');
  };
}
// Cuando Supabase te devuelva los datos del perfume...
// Suponiendo que tu variable con los datos se llama 'perfume'

document.getElementById('detalle-nombre').textContent = perfume.nombre;
document.getElementById('detalle-marca').textContent = perfume.marca;
document.getElementById('detalle-genero').textContent = perfume.genero;
document.getElementById('detalle-tipo').textContent = perfume.tipo;

// Actualizar el precio en los dos lugares
document.getElementById('precio-select').textContent = perfume.precio;
document.getElementById('detalle-precio-completo').textContent = `${perfume.precio} Bs`;

// Configurar el botón de WhatsApp (Esto ya lo habíamos hecho, pero lo adaptamos al nuevo botón)
const btnComprarWa = document.getElementById('btn-comprar-wa');
btnComprarWa.addEventListener('click', () => {
    const numeroWhatsApp = "59170000000"; // Tu número
    const mensaje = `¡Hola Pariente! 👋 Estoy interesado en comprar el perfume ${perfume.nombre} de la marca ${perfume.marca}. ¿Tienen disponibilidad?`;
    const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
});