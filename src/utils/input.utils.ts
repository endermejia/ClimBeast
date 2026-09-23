/**
 * Lee una `input.required()` que todavía puede no haber sido enlazada.
 *
 * El router enlaza los inputs de las rutas de forma asíncrona
 * (`withComponentInputBinding`), así que en la primera evaluación de `params`
 * de un `resource` la lectura lanza `RuntimeError(-950)`. Ese error no es
 * fatal para Angular: el resource lo captura y queda en su estado `error`, y la
 * UI mostraría «no encontrado» mientras la consulta ni siquiera ha empezado.
 *
 * Devuelve `undefined` mientras no haya valor (el resource queda en `idle` y se
 * muestra el spinner). La dependencia de la signal queda registrada antes de
 * lanzar, así que cuando el router enlace la input `params` se recalcula y la
 * carga arranca.
 */
export function inputValueOrUndefined<T>(read: () => T): T | undefined {
  try {
    return read();
  } catch (error) {
    if ((error as { code?: number })?.code === -950) {
      return undefined;
    }
    throw error;
  }
}
