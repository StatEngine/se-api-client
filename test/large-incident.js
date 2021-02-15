import fs from 'fs';
import moment from 'moment';
import sizeof from 'object-sizeof';
import zlib from 'zlib';
import async from 'async';
import request from 'requestretry';
import aws4 from 'aws4';

describe('API', () => {
  describe('payload', () => {
    it('should not be too big for large payload', (cb) => {
      const largeIncidentFile = fs.readFileSync('test/data/2000105271.json', 'UTF-8');
      const payload = Buffer.from(largeIncidentFile).toString('base64');

      const params = {
        id: 'incidentNumber',
        timestamp: moment.utc().format(),
        firecaresId: 'process.env.FIRECARES_ID',
        sourceFile: 'event.Records[0].s3.object.key',
        msgType: 'FIRE_INCIDNET',
        action: 'UPSERT',
        payload,
      };

      console.log(`Size after base64 encoding [MB]: ${sizeof(params) / 1024 / 1024}`);

      zlib.deflate(JSON.stringify(params), (err, body) => {
        console.log(`Size after compression encoding [MB]: ${sizeof(body.toString()) / 1024 / 1024}`);

        const req = {
          host: 'api.statengine.io',
          service: 'execute-api',
          path: '/v1/fire-departments/process.env.FIRECARES_ID/fire-incidents/',
          url: 'v1/fire-departments/process.env.FIRECARES_ID/fire-incidents/',
          method: 'POST',
          headers: {
            'Content-Encoding': 'deflate',
            'Content-Type': 'application/json',
          },
          body,
          maxAttempts: 5,
        };

        aws4.sign(req);
        console.log(`Size after signing [MB]: ${sizeof(req.body.toString()) / 1024 / 1024}`);
        console.log(`req size after signing [MB]: ${sizeof(req) / 1024 / 1024}`);

        cb();
      });
    });

    it('should not be too big for working as of 2021-02-15', (cb) => {
      const largeIncidentFile = fs.readFileSync('test/data/2000105204.json', 'UTF-8');
      const payload = Buffer.from(largeIncidentFile).toString('base64');

      const params = {
        id: 'incidentNumber',
        timestamp: moment.utc().format(),
        firecaresId: 'process.env.FIRECARES_ID',
        sourceFile: 'event.Records[0].s3.object.key',
        msgType: 'FIRE_INCIDNET',
        action: 'UPSERT',
        payload,
      };

      console.log(`Size after base64 encoding [MB]: ${sizeof(params) / 1024 / 1024}`);

      zlib.deflate(JSON.stringify(params), (err, body) => {
        console.log(`Size after compression encoding [MB]: ${sizeof(body.toString()) / 1024 / 1024}`);

        const req = {
          host: 'api.statengine.io',
          service: 'execute-api',
          path: '/v1/fire-departments/process.env.FIRECARES_ID/fire-incidents/',
          url: 'v1/fire-departments/process.env.FIRECARES_ID/fire-incidents/',
          method: 'POST',
          headers: {
            'Content-Encoding': 'deflate',
            'Content-Type': 'application/json',
          },
          body,
          maxAttempts: 5,
        };

        aws4.sign(req);
        console.log(`Size after signing [MB]: ${sizeof(req.body.toString()) / 1024 / 1024}`);
        console.log(`req size after signing [MB]: ${sizeof(req) / 1024 / 1024}`);

        cb();
      });
    });

    it('compression called from async.series should work', (cb) => {
      const largeIncidentFile = fs.readFileSync('test/data/2000105271.json', 'UTF-8');
      const payload = Buffer.from(largeIncidentFile).toString('base64');

      let body;

      async.series([
        (compressCb) => zlib.deflate(JSON.stringify(payload), (err, buffer) => {
          if (err) {
            return compressCb(err);
          }
          body = buffer;
          return compressCb();
        }),
        (postCb) => {
          const req = {
            host: 'this.options.host',
            service: 'execute-api',
            path: '/{this.options.stage}/fire-departments/{incident.firecaresId}/fire-incidents/',
            url: '{this.options.baseUrl}/fire-departments/{incident.firecaresId}/fire-incidents/',
            method: 'POST',
            headers: {
              'Content-Encoding': 'deflate',
              'Content-Type': 'application/json',
            },
            body,
            maxAttempts: 5,
            retryDelay: 5000,
            retryStrategy: request.RetryStrategies.HTTPOrNetworkError,
          };

          console.log(`Size [MB]: ${sizeof(req) / 1024 / 1024}`);

          aws4.sign(req, {
            accessKeyId: process.env.INGEST_AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.INGEST_AWS_SECRET_ACCESS_KEY,
          });

          console.log(`Size [MB]: ${sizeof(req) / 1024 / 1024}`);
          return postCb();
        },
      ], (err) => {
        cb(err);
      });
    });
  });
});
