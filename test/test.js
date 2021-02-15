import * as zlib from 'zlib';
import { expect } from 'chai';
import nock from 'nock';

import StatEngine from '../src';

describe('API', () => {
  describe('Constructor', () => {
    it('should use default options', () => {
      const se = new StatEngine();
      expect(se.options.protocol).to.equal('https');
      expect(se.options.host).to.equal('api.statengine.io');
      expect(se.options.stage).to.equal('v1');
      expect(se.options.baseUrl).to.equal('https://api.statengine.io/v1');

      expect(se.options.auth.aws.accessKeyId).to.equal('');
      expect(se.options.auth.aws.secretAccessKey).to.equal('');
    });

    it('should merge user options', () => {
      const se = new StatEngine({ protocol: 'http' });
      expect(se.options.baseUrl).to.equal('http://api.statengine.io/v1');
    });
  });

  describe('Ingest', () => {
    it('should require id', (done) => {
      const se = new StatEngine();
      se.ingest({}, (err) => {
        expect(err.message).to.equal('id is required');
        done();
      });
    });

    it('should require firecaresId', (done) => {
      const se = new StatEngine();
      se.ingest({ id: '1232 ' }, (err) => {
        expect(err.message).to.equal('firecaresId is required');
        done();
      });
    });

    it('should require payload', (done) => {
      const se = new StatEngine();
      se.ingest({ id: '1234', firecaresId: '2312' }, (err) => {
        expect(err.message).to.equal('payload is required');
        done();
      });
    });

    it('should compress payload', (done) => {
      const se = new StatEngine();
      const payload = JSON.stringify({
        id: 10,
        firecaresId: 'test',
        msg: 'this is a message',
      });

      nock('https://api.statengine.io')
        .post('/v1/fire-departments/1234/fire-incidents/')
        .reply((uri, body, cb) => {
          zlib.gunzip(Buffer.from(body.compressedPayload, 'base64'), (err, res) => {
            if (err) cb(err, [500, err]);

            expect(res.toString()).to.equal(payload);

            cb(null, [204, '']);
          });
        });

      se.ingest({
        id: 'testId',
        firecaresId: '1234',
        payload,
      }, (err) => {
        expect(err).to.be.null;
        done();
      });
    });

    it('should ingest a payload', (done) => {
      const se = new StatEngine();
      nock('https://api.statengine.io')
        .post('/v1/fire-departments/1234/fire-incidents/')
        .reply(204);

      se.ingest({ id: 'testId', firecaresId: '1234', payload: 'sample incident' }, (err) => {
        expect(err).to.be.null;
        done();
      });
    });

    it('should return error when not a 204', (done) => {
      const se = new StatEngine();
      nock('https://api.statengine.io')
        .post('/v1/fire-departments/1234/fire-incidents/')
        .reply(403);

      se.ingest({ id: 'testId', firecaresId: '1234', payload: 'sample incident' }, (err) => {
        expect(err.message).to.equal('Unexpected response: 403');
        done();
      });
    });
  });
});
