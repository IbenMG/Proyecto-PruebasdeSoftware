# Mejora visual y usabilidad de CrowdStarter

Diseño con verde profundo, fondo claro, tarjetas y jerarquía visual común para acceso, registro, inicio, búsqueda y campañas. Las pantallas se adaptan a anchos pequeños mediante CSS; requieren revisión en navegador con datos reales.

Se tomaron como guía las [10 heurísticas de Jakob Nielsen](https://www.nngroup.com/articles/ten-usability-heuristics/). Esta tabla documenta decisiones del proyecto, no una certificación de usabilidad.

| Heurística | Aplicación en la interfaz |
| --- | --- |
| 1. Estado del sistema | Mensajes de carga, envío, éxito y resultados; botones deshabilitados durante operaciones. |
| 2. Lenguaje familiar | Etiquetas como Crear campaña, Mis campañas y Meta de financiamiento. |
| 3. Control y libertad | Volver, Cancelar y Limpiar búsqueda; confirmación al descartar cambios mediante los enlaces del formulario. |
| 4. Consistencia | Cabecera, colores, controles y navegación compartidos. |
| 5. Prevención de errores | Validación de campos, restricciones de fecha y monto, confirmación antes de eliminar. |
| 6. Reconocimiento | Etiquetas permanentes, acciones visibles y tarjetas con título, categoría, meta y progreso. |
| 7. Eficiencia | Accesos directos desde inicio, búsqueda sin tildes y controles operables con teclado. |
| 8. Diseño esencial | Jerarquía de títulos, espacio entre controles y decoración separada del contenido. |
| 9. Recuperación de errores | Mensajes junto a campos, conservación del formulario y foco en el primer campo inválido al enviar. |
| 10. Ayuda | Indicaciones en campos y sección ¿Cómo empezar? en el inicio. |

## Alcance y verificación

- La eliminación sigue siendo irreversible: se confirma antes de ejecutarla.
- La advertencia de cambios pendientes cubre Cancelar y Volver del formulario; no bloquea el cierre de pestaña ni toda la navegación externa al formulario.
- No se añaden dependencias ni cambios de base de datos.
- Se actualizó la prueba de registro para el nuevo título del panel.
- Compilación, ESLint de componentes modificados y cuatro pruebas unitarias de búsqueda verificados.
- Ejecutar las 16 pruebas funcionales en Brave con Django y Vite iniciados. Revisar también teclado, ventanas estrechas y los estados vacío, error y éxito. No se ha realizado un estudio con usuarios ni una auditoría completa de accesibilidad.
