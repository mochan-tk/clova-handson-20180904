import * as clova from '@line/clova-cek-sdk-nodejs';
import supertest from 'supertest'; 
const app = require('../src/app');

const request = supertest(app);

const launchRequestJSON = require('./fixtures/launchRequest.json');

const launchSpeechInfo = clova.SpeechBuilder.createSpeechText('こんにちは！鳴き声クイズへようこそ。クイズの説明を聞きますか？');

describe('Tests app', () => {
  it('verifies post', done => {
    request.post('/test')
      .send(launchRequestJSON)
      .expect('Content-Type', /json/)
      .expect(200)
      .then(response => {
        const { outputSpeech } = response.body.response;
        expect(outputSpeech).toEqual({
          type: 'SimpleSpeech',
          values: launchSpeechInfo,
        });
        done();
      });
  });
});