'use strict';

const clova = require('@line/clova-cek-sdk-nodejs');
const supertest = require('supertest'); 
const test = require('unit.js');
const app = require('../app.js');

const request = supertest(app);

const launchRequestJSON = require('./fixtures/launchRequest.json');

const launchSpeechInfo = clova.SpeechBuilder.createSpeechText('こんにちは！鳴き声クイズへようこそ。クイズの説明を聞きますか？');

describe('Tests app', function() {
  it('verifies post', function(done) {
    request
    .post('/test')
    .send(launchRequestJSON)
    .expect('Content-Type', /json/)
    .expect(200)
    .end(function(err, response) {
      const { outputSpeech } = response.body.response;
      test.string(JSON.stringify(outputSpeech)).contains(JSON.stringify({
        type: 'SimpleSpeech',
        values: launchSpeechInfo,
      }));
      test.value(response).hasHeader('content-type', 'application/json; charset=utf-8');
      done(err);
    });
  });
});
