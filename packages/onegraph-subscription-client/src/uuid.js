// @flow

function toHex(b) {
  return (b + 0x100).toString(16).substr(1);
}

function getRandomValues() {
  if (
    typeof window !== 'undefined' &&
    window.crypto &&
    window.crypto.getRandomValues
  ) {
    return window.crypto.getRandomValues(new Uint8Array(16));
  } else if (typeof global.crypto !== 'undefined' && global.crypto.randomBytes) {
    return global.crypto.randomBytes(16);
  }
}

export function uuid(): ?string {
  const buf = getRandomValues();
  if (!buf) {
    return null;
  }
  let i = 0;
  return (
    toHex(buf[i++]) +
    toHex(buf[i++]) +
    toHex(buf[i++]) +
    toHex(buf[i++]) +
    '-' +
    toHex(buf[i++]) +
    toHex(buf[i++]) +
    '-' +
    toHex(buf[i++]) +
    toHex(buf[i++]) +
    '-' +
    toHex(buf[i++]) +
    toHex(buf[i++]) +
    '-' +
    toHex(buf[i++]) +
    toHex(buf[i++]) +
    toHex(buf[i++]) +
    toHex(buf[i++]) +
    toHex(buf[i++]) +
    toHex(buf[i++])
  );
}
