/* Conexión con Supabase.
   Déjalo vacío para usar el modo demostración (datos solo en este navegador, sin contraseñas).
   Para usar cuentas reales, sigue supabase/GUIA.md y pega aquí la "Project URL" y la clave
   "anon" o "publishable" de tu proyecto. Esas dos son públicas (viajan dentro de la página).
   NUNCA pongas aquí la clave "service_role" ni la contraseña de la base de datos. */
window.SGE_CONFIG = {
  supabaseUrl: '',   // p. ej. 'https://abcdefghijkl.supabase.co'
  supabaseKey: '',   // p. ej. 'sb_publishable_…' o la clave anon 'eyJ…'
  colegio: 'Colegio Marcelino Champagnat II', // nombre que se muestra en la pantalla de entrada
};
