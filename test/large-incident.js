import { expect } from 'chai';
import fs from 'fs';
import zlib from 'zlib';
import sizeof from 'object-sizeof';
import nock from 'nock';

import { StatEngine } from '../src';

describe('API', () => {
  describe('payload', () => {
    const buildNock = (payload) => {
      nock('https://api.statengine.io')
        .post('/v1/fire-departments/1234/fire-incidents/')
        .reply((uri, body, cb) => {
          expect(sizeof(body)).to.be.lt(10 * 1024 * 1024);

          zlib.gunzip(Buffer.from(body.compressedPayload, 'base64'), (err, res) => {
            if (err) cb(err, [500, err.message]);

            expect(res.toString()).to.equal(payload);

            cb(null, [204, '']);
          });
        });
    };

    it('should not be too big for large payload', (done) => {
      const se = new StatEngine();
      const payload = Buffer.from(fs.readFileSync('test/data/2000105271.json', 'UTF-8')).toString('base64');

      expect(sizeof(payload)).to.be.gt(10 * 1024 * 1024);

      buildNock(payload);
      se.ingest({ id: 'test', firecaresId: '1234', payload }, done);
    });

    it('should not be too big for working as of 2021-02-15', (done) => {
      const se = new StatEngine();
      const payload = Buffer.from(fs.readFileSync('test/data/2000105204.json', 'UTF-8')).toString('base64');

      expect(sizeof(payload)).to.be.lt(10 * 1024 * 1024);

      buildNock(payload);
      se.ingest({ id: 'test', firecaresId: '1234', payload }, done);
    });
  });
});
