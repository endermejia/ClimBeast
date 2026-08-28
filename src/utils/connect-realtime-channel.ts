/** Connects a Supabase realtime channel without exposing its imperative API to consumers. */
export function connectRealtimeChannel<T extends { subscribe: () => unknown }>(
  channel: T,
): ReturnType<T['subscribe']> {
  return Reflect.apply(channel.subscribe, channel, []) as ReturnType<
    T['subscribe']
  >;
}
