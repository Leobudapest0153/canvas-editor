# 🎯 Guía Rápida: Selección Múltiple

## Cómo seleccionar múltiples elementos en el canvas

### Método 1: Usando la Marquesina (Shift + Arrastrar)

1. **Mantén presionada** la tecla `Shift`
2. **Haz clic** en un área vacía del canvas
3. **Arrastra** para dibujar un rectángulo de selección
4. **Suelta** el mouse para seleccionar todos los elementos dentro del área

### Cancelar la selección
- Presiona `Esc` mientras arrastras para cancelar

---

## Ejemplo Visual

```
Antes:                    Durante:                   Después:
                          
  [El-1]  [El-2]           ╔═══════════════╗         [El-1]✓ [El-2]✓
                           ║ [El-1] [El-2] ║
  [El-3]  [El-4]           ║               ║         [El-3]  [El-4]
                           ║ [El-3]        ║
                           ╚═══════════════╝
                           
                          (Shift + Arrastrar)        (Seleccionados)
```

---

## Notas Importantes

✅ **Funciona con:**
- Elementos parcialmente dentro del área
- Cualquier nivel de zoom
- Modo edición activo

❌ **NO funciona con:**
- Cambios pendientes sin guardar
- Modo visualización
- Click sobre un elemento existente

---

## Atajos de Teclado

| Acción | Atajo |
|--------|-------|
| Iniciar marquesina | `Shift` + Click + Arrastrar |
| Cancelar | `Esc` |

---

**¿Necesitas más ayuda?**
- 📖 [Documentación completa](./marquee-selection.md)
- 🎥 [Demo visual](./marquee-selection-demo.md)
