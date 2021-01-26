import request from 'supertest';

import app from '../../app';

describe('GET /api/user/token', () => {
  it('responds with json', (done) => {
    request(app)
      .get('/api/user/token')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });

  it('returns token if valid key and username', (done) => {
    request(app)
      .get('/api/user/token?key=TEST_KEY&username=david')
      .then((response) => {
        expect(Object.keys(response.body)).toContain('token');
        done();
      })
      .catch((err) => done(err));
  });

  it('returns error if invalid key and username', (done) => {
    request(app)
      .get('/api/user/token')
      .then((response) => {
        expect(Object.keys(response.body)).toContain('error');
        done();
      })
      .catch((err) => done(err));
  });
});