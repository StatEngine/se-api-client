import async from 'async';
import request from 'requestretry';
import moment from 'moment';
import zlib from 'zlib';
import aws4 from 'aws4';
import _ from 'lodash';

export default class StatEngine {
  constructor(options) {
    const defaultOptions = {
      protocol: 'https',
      host: 'api.statengine.io',
      stage: 'v1',
      auth: {
        aws: {
          accessKeyId: process.env.INGEST_AWS_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.INGEST_AWS_SECRET_ACCESS_KEY || '',
        },
      },
    };
    this.options = _.merge({}, defaultOptions, options);

    this.options.baseUrl = `${this.options.protocol}://${this.options.host}/${this.options.stage}`;
  }

  ingest(params, cb) {
    if (_.isUndefined(params.id)) return cb(new Error('id is required'));
    if (_.isUndefined(params.firecaresId)) return cb(new Error('firecaresId is required'));
    if (_.isUndefined(params.payload)) return cb(new Error('payload is required'));

    const incident = {
      id: params.id,
      timestamp: params.timestamp || moment.utc().format(),
      firecaresId: params.firecaresId,
      sourceFile: params.sourceFile,
      msgType: 'FIRE_INCIDENT',
      action: 'UPSERT',
    };
    let body;

    return async.series([
      (compressCb) => zlib.gzip(params.payload, (err, buffer) => {
        if (err) {
          return compressCb(err);
        }

        incident.compressedPayload = buffer.toString('base64');
        body = JSON.stringify(incident);

        return compressCb();
      }),
      (postCb) => {
        const req = {
          host: this.options.host,
          service: 'execute-api',
          path: `/${this.options.stage}/fire-departments/${incident.firecaresId}/fire-incidents/`,
          url: `${this.options.baseUrl}/fire-departments/${incident.firecaresId}/fire-incidents/`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body,
          maxAttempts: 5,
          retryDelay: 5000,
          retryStrategy: request.RetryStrategies.HTTPOrNetworkError,
        };

        aws4.sign(req, this.options.auth.aws);

        request(req, (err, response) => {
          if (err) {
            // eslint-disable-next-line no-console
            console.error(err);
            return postCb(err);
          }

          if (response.statusCode !== 204) {
            return postCb(new Error(`Unexpected response: ${response.statusCode}`));
          }

          return postCb();
        });
      },
    ], (err) => {
      cb(err);
    });
  }
}
