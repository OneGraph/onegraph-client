// @flow
import type {Options} from './OneGraphSubscriptionClient';

export function fetchUuid(options: ?Options): Promise<?string> {
  const fetchFn = (options && options.fetchImpl) || fetch;
  if (typeof fetchFn !== 'undefined') {
    return fetchFn('https://serve.onegraph.com/uuid', {
      method: 'POST',
    }).then(function (r) {
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
        (res) => {
          res.on('data', (d) => {
            resolve(d.toString('utf-8'));
          });
        },
      );
      req.on('error', (e) => {
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
