// Polyfill para navegadores que não suportam Map.prototype.getOrInsertComputed (Stage 3 proposal)
if (typeof Map !== "undefined" && !(Map.prototype as any).getOrInsertComputed) {
  (Map.prototype as any).getOrInsertComputed = function <K, V>(
    this: Map<K, V>,
    key: K,
    callbackFn: (k: K) => V
  ): V {
    if (this.has(key)) {
      return this.get(key)!;
    }
    const value = callbackFn(key);
    this.set(key, value);
    return value;
  };
}

export {};
