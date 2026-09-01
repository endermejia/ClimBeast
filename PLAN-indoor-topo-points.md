# Plan Técnico: Topos Indoor — Estados de Puntos y Rutas de Travesía

## 1. Contexto y Objetivos

En las salas de escalada indoor (rocódromos de boulder y vías), las rutas presentan particularidades que requieren enriquecer el trazado de topos:

1. **Rutas de Travesía (_Traverses_)**: Recorridos donde la secuencia de presas es continua y secuencial, requiriendo una numeración ordenada (1, 2, 3...) de cada agarre a lo largo del recorrido.
2. **Estados Específicos por Presa (_Point States_)**: Presas clave de un bloque o vía que precisan una semántica visual clara:
   - **Inicio (_Start_)**: Presa(s) de salida (manos/pies de inicio).
   - **Top (_Top_)**: Presa final donde se completa el bloque o vía.
   - **Juntar (_Match_)**: Presa donde es característico o reglamentario juntar ambas manos.
   - **Neutral**: Presa intermedia estándar del recorrido.

### Objetivos Principales

- Permitir clasificar cualquier presa de una ruta como `neutral`, `start`, `top` o `match`.
- Permitir marcar un trazado como travesía (`isTraverse`), mostrando la numeración secuencial de cada presa.
- Proporcionar una experiencia de edición fluida y táctil (compatible con móviles, tablets y ratón de escritorio).
- Mantener compatibilidad 100% hacia atrás con los topos y datos existentes en Supabase sin requerir migraciones de base de datos.

---

## 2. Modelo de Datos (`src/models/topo.model.ts`)

Los datos de los trazados se almacenan como JSON en la columna `path` de la tabla `topo_routes`.

```typescript
export type PointState = "neutral" | "start" | "top" | "match";

export interface TopoPoint {
  x: number;
  y: number;
  state?: PointState; // Por defecto 'neutral' si es undefined
}

export interface TopoPath {
  points: TopoPoint[];
  color?: string;
  width?: number;
  type?: "line" | "circle";
  isTraverse?: boolean; // Por defecto false
  [key: string]: unknown;
}
```

### Compatibilidad hacia atrás

- Los objetos anteriores `{ x, y }` son válidos directamente como `TopoPoint` (`state` opcional).
- Si `isTraverse` o `state` no están definidos, se asume `isTraverse = false` y `state = 'neutral'`, comportándose exactamente igual que en la versión actual.

---

## 3. Especificación Visual y Código de Colores

### 3.1 Paleta de Estados de Punto

| Estado        | Token / Color       | Hex       | Identificador Visual        | Significado                   |
| :------------ | :------------------ | :-------- | :-------------------------- | :---------------------------- |
| **`neutral`** | Color de vía / Base | Dinámico  | Sin badge especial          | Presa intermedia estándar     |
| **`start`**   | Verde esmeralda     | `#22C55E` | Badge **`S`** / Borde verde | Presa de inicio               |
| **`top`**     | Rojo carmesí        | `#EF4444` | Badge **`T`** / Borde rojo  | Presa final / Top             |
| **`match`**   | Azul eléctrico      | `#3B82F6` | Badge **`M`** / Borde azul  | Presa de reunión / doble mano |

### 3.2 Renderizado en el Visor (`TopoRouteRendererComponent`)

#### Caso A: Ruta estándar (No Travesía, `isTraverse = false`)

- **Puntos `neutral`**: Se renderizan como líneas o círculos estándar según el `type`.
- **Puntos con estado (`start`, `top`, `match`)**: Muestran un badge circular con su inicial (`S`, `T`, `M`) y el color de fondo correspondiente.
- **Punto de inicio**: Si el primer punto es `start`, combina el grado de la vía con el badge (o muestra el grado con el color distintivo).
- **Punto final**: Si el último punto de una polilínea es `top`, el punto final blanco estándar se sustituye por el indicador de Top rojo.

#### Caso B: Travesía (`isTraverse = true`)

- **Numeración Secuencial**: Cada presa muestra su número de orden (1, 2, 3...) centrado en el círculo o sobre la línea.
- **Presa 1 (Salida)**: Muestra `Grado · 1` o el badge `S` con el número `1`.
- **Presas intermedias con estado**: Muestran el número secuencial acompañado del badge de estado (`3 · M`, `5 · T`, etc.).
- **Legibilidad**: Texto en blanco en negrita con sombra (`text-shadow: 0 0 3px rgba(0,0,0,0.9)`) para garantizar contraste sobre cualquier fondo o imagen de muro.

---

## 4. Experiencia de Usuario e Interacciones en el Editor

**Archivo**: `src/components/dialogs/topo-path-editor-dialog.ts`

### 4.1 Panel de Configuración de Vía

Junto a los selectores de tipo de trazado (`Línea` / `Círculos`) y grosor:
| **`match`** | Azul eléctrico | `#3B82F6` | Badge **`M`** / Borde azul | Presa de juntar ambas manos |

---

## 3. Comportamiento y Flujo de Interacción

### 3.1 Ciclo de Estados de Punto

El usuario puede cambiar el estado de cualquier punto del trazado mediante **doble clic** (escritorio) o **doble tap** (móvil/táctil):
$$\text{Neutral} \longrightarrow \text{Inicio (Start)} \longrightarrow \text{Top} \longrightarrow \text{Juntar (Match)} \longrightarrow \text{Neutral}$$

- **Neutral**: Estado por defecto para todos los puntos añadidos.
- **Start**: Marca presa de salida.
- **Top**: Marca presa final.
- **Match**: Marca presa para juntar manos.

### 3.2 Modo Travesía (`isTraverse = true`)

- Activable desde un botón conmutador (_switch_ / _toggle_) en la barra de herramientas del editor cuando una vía está seleccionada.
- Permite transformar una secuencia de puntos discretos o continuos en una travesía numerada.
- Si una presa dentro de una travesía tiene un estado (`start`, `top`, `match`), se renderiza tanto el número secuencial como la indicación del estado.

---

## 4. Leyenda e Información en Interfaz

Para facilitar la comprensión tanto a equipadores como a usuarios escaladores, se incorpora una leyenda contextual en el diálogo de edición:

- `🟢 S = Inicio (Start)`
- `🔴 T = Top`
- `🔵 M = Juntar (Match)`
- Tip: _"Doble clic en un punto para cambiar su estado"_.

---

## 5. Modificaciones por Archivo

| Archivo                                                 | Responsabilidad y Cambios                                                                                                                                                                                                                           |
| :------------------------------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`src/models/topo.model.ts`**                          | Declarar `PointState`, `TopoPoint`, y añadir `isTraverse?: boolean` a `TopoPath`.                                                                                                                                                                   |
| **`src/utils/topo-styles.utils.ts`**                    | Añadir helpers de estilos: `getPointStateColor(state)`, `getPointStateLabel(state)`.                                                                                                                                                                |
| **`src/utils/drawing.utils.ts`**                        | Actualizar `addPointToPath` para inicializar puntos con `state: 'neutral'`. Tipar con `TopoPoint`.                                                                                                                                                  |
| **`src/components/dialogs/topo-path-editor-dialog.ts`** | - Añadir toggle de travesía en la barra de propiedades de ruta.<br>- Añadir detección de doble clic/tap en control points para ciclar estados.<br>- Renderizar estilos/colores de estado en los puntos de control.<br>- Añadir leyenda informativa. |
| **`src/components/topo/topo-route-renderer.ts`**        | - Renderizar badges de estado (`S`, `T`, `M`) en cada punto configurado.<br>- Renderizar números secuenciales cuando `path.isTraverse` es `true`.<br>- Ajustar el punto de fin de polilínea si coincide con `top`.                                  |
| **`public/i18n/es.json` & `public/i18n/en.json`**       | Añadir claves de traducción para `topos.editor.traverse`, `topos.editor.pointStateHelp`, `topos.states.start`, `topos.states.top`, `topos.states.match`.                                                                                            |

---

## 6. Casos Límite y Consideraciones Técnicas

1. **Rendimiento y Detección de Cambios (Zoneless)**:
   - Toda la computación de etiquetas y badges se realiza mediante _pure pipes_ o señales computadas (`computed()`), sin invocar funciones directas en la plantilla SVG.
2. **Escala y SVG ViewBox**:
   - Las coordenadas normalizadas `[0, 1]` escalan a `1000 x (1000 / ratio)`. Los badges y textos de números deben usar tamaños proporcionales basados en `width * factor` para ser nítidos y legibles en cualquier resolución.
3. **Múltiples Puntos de Inicio / Top**:
   - En bloques de rocódromo es común tener 2 presas de inicio (2 manos) o presas compartidas. El modelo admite que varios puntos tengan `state: 'start'` o `state: 'top'` sin restricciones arbitrarias.
4. **Eliminación y Reordenación de Puntos**:
   - Al borrar un punto intermedio (`click derecho` o long-press), los estados de los puntos restantes se preservan y la numeración de travesía se reajusta automáticamente al nuevo índice.

---

## 7. Plan de Verificación y Testing

1. **Pruebas Unitarias**:
   - Validar utilidades en `src/utils/drawing.utils.spec.ts` y `src/utils/topo-styles.utils.spec.ts`.
   - Verificar que `TopoPath` serializa correctamente a JSON para Supabase.
2. **Pruebas de Editor**:
   - Creación de ruta nueva $\rightarrow$ marcar puntos $\rightarrow$ ciclar estados con doble clic $\rightarrow$ verificar colores en tiempo real.
   - Activar toggle de travesía $\rightarrow$ verificar aparición de números 1, 2, 3...
   - Guardar y recargar $\rightarrow$ comprobar persistencia exacta en base de datos.
3. **Pruebas en Visor**:
   - Visualización en modo desktop y móvil responsive.
   - Contraste de texto y badges sobre fondos claros y oscuros.
4. **Verificación de Calidad**:
   - `bun run check:imports`
   - `bun run lint`
   - `bun run build`
