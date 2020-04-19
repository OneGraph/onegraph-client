// @flow

export function fetchUuid(): Promise<?string> {
  if (typeof fetch !== 'undefined') {
    return fetch('https://serve.onegraph.com/uuid', {
      method: 'POST',
    }).then(function(r) {
      return r.text();
    });
  } else if (typeof global.https !== 'undefined' && global.https.request) {
    return new Promise((resolve, reject) => {
      const req = global.https.request(
        {
          hostname: 'serve.onegraph.com',
          port: 443,
          path: '/uuid',
          method: 'POST',
        },
        res => {
          res.on('data', d => {
            resolve(d.toString('utf-8'));
          });
        },
      );
      req.on('error', e => {
        reject(
          new Error(
            'Unable to generate sessionId to start subscription client.',
          ),
        );
      });
      req.end();
    });
  } else {
    return Promise.resolve(null);
  }
}
