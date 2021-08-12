// @flow

function getCrypto() {
  return window.crypto || window.msCrypto;
}

function getSubtle() {
  const crypto = getCrypto();
  return crypto.subtle || crypto.webkitSubtle;
}

// https://tools.ietf.org/html/rfc7636#section-4.1
function generateVerifier(): string {
  const chars =
    '0123456789AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz-._~';
  let s = '';
  for (const value of getCrypto().getRandomValues(new Uint8Array(64))) {
    s = s + chars[value % chars.length];
  }
  return s;
}

function supportsSha256() {
  const subtle = getSubtle();
  return (
    subtle &&
    subtle.digest &&
    typeof TextEncoder !== 'undefined' &&
    typeof btoa !== 'undefined' &&
    // Skip old version of subtle.digest on IE that returns a CryptoOperation
    typeof subtle.digest({name: 'SHA-256'}, new Uint8Array(2)).process ===
      'undefined'
  );
}

type CodeChallenge = {
  challenge: string,
  method: 'plain' | 'S256',
};

function sha256(s: string): Promise<Uint8Array> {
  return getSubtle().digest({name: 'SHA-256'}, new TextEncoder().encode(s));
}

function urlSafeBase64(s: string): string {
  return s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function codeChallengeOfVerifier(verifier: string): Promise<CodeChallenge> {
  if (!supportsSha256()) {
    return Promise.resolve({
      challenge: verifier,
      method: 'plain',
    });
  } else {
    return sha256(verifier).then((s) => {
      return {
        challenge: urlSafeBase64(
          btoa(String.fromCharCode(...Array.from(new Uint8Array(s)))),
        ),
        method: 'S256',
      };
    });
  }
}

export default {
  generateVerifier,
  codeChallengeOfVerifier,
};
