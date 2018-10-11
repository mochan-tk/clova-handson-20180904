import * as clova from '@line/clova-cek-sdk-nodejs';
import * as line from '@line/bot-sdk';
import express from 'express';
import * as bodyParser from 'body-parser';
import { RequestHandler } from 'express-serve-static-core';
import dotenv from 'dotenv';
dotenv.config();

const jsonData = require('../data.json');

const MAX_QUESTION = 5;
const msg = '動物を答えてください。';

const client : line.Client = new line.Client({
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || '<your-access-token>',
  channelSecret: process.env.CHANNEL_SECRET || '<your-channel-secret>',
});

const launchHandler : Function = (responseHelper : clova.Context) => {
  console.log('onLaunchRequest');

  responseHelper.setSimpleSpeech(clova.SpeechBuilder.createSpeechText('こんにちは！鳴き声クイズへようこそ。クイズの説明を聞きますか？'));
  responseHelper.setReprompt(getRepromptMsg(clova.SpeechBuilder.createSpeechText('クイズの説明を聞きますか？')));

  responseHelper.setSessionAttributes({ 'question': 0, 'correct': 0, 'incorrect': 0 });
};

const intentHandler : Function = async (responseHelper : clova.Context) => {
  const intent = responseHelper.getIntentName();
  const reqSessionAttributes : any = responseHelper.getSessionAttributes();
  let speech;
  switch (intent) {
    case 'Clova.GuideIntent':
      speech = getGuideSpeech(reqSessionAttributes);
      responseHelper.setSpeechList(speech);
      responseHelper.setReprompt(getRepromptMsg(clova.SpeechBuilder.createSpeechText(msg)));
      break;
    case 'Clova.YesIntent':
      speech = getGuideSpeech(reqSessionAttributes);
      responseHelper.setSpeechList(speech);
      responseHelper.setReprompt(getRepromptMsg(clova.SpeechBuilder.createSpeechText(msg)));
      break;
    case 'Clova.NoIntent':
      // 問題取得
      speech = getQuestionSpeechList(0);
      responseHelper.setSpeechList(speech);
      responseHelper.setReprompt(getRepromptMsg(clova.SpeechBuilder.createSpeechText(msg)));
      break;
    case 'QuizIntent':
      const slots = responseHelper.getSlots();
      console.log(slots);
      const currentQuestion = Number(reqSessionAttributes.question) || 0;
      const nextQuestion = Number(currentQuestion) + 1;
      let correct = Number(reqSessionAttributes.correct);
      let incorrect = Number(reqSessionAttributes.incorrect);
      let speechArray = [];
      let speechArrayNextStep = [];

      // 正解か不正解
      if (jsonData[currentQuestion]['answer'] === slots.animal) {
        speechArray = [
          clova.SpeechBuilder.createSpeechUrl('https://www.dl.dropboxusercontent.com/s/2vkb4s1q6xm7j1w/correct2.mp3?dl=0'),
          clova.SpeechBuilder.createSpeechText('正解です。'),
        ];
        // 正解数カウントアップ
        correct = Number(correct) + 1;
      } else {
        speechArray = [
          clova.SpeechBuilder.createSpeechUrl('https://www.dl.dropboxusercontent.com/s/d6cqnydyfqbdgao/incorrect1.mp3?dl=0'),
          clova.SpeechBuilder.createSpeechText('残念、違います。'),
          clova.SpeechBuilder.createSpeechText(`答えは${jsonData[currentQuestion]['answer']}です。`),
        ];
        // 不正解数カウントアップ
        incorrect = Number(incorrect) + 1;
      }
      // LINE BOT送信
      speechArray.push(clova.SpeechBuilder.createSpeechText(`動物鳴き声クイズボットから、${jsonData[currentQuestion]['answer']}の詳細情報を送信します。`));
      const { userId } = responseHelper.getUser();
      await sendLineBot(userId, currentQuestion);

      // 値保持
      responseHelper.setSessionAttributes({
        'question': nextQuestion,
        'correct': correct,
        'incorrect': incorrect,
      });

      if (nextQuestion < MAX_QUESTION) {
        // 問題取得
        speechArrayNextStep = getQuestionSpeechList(nextQuestion);
      } else {
        // 結果
        if (correct === MAX_QUESTION) {
          speechArrayNextStep = [
            clova.SpeechBuilder.createSpeechUrl('https://www.dl.dropboxusercontent.com/s/ct1kak7abnjeppu/trumpet1.mp3?dl=0'),
            clova.SpeechBuilder.createSpeechText('おめでとうございます！全問正解です。'),
          ];
        } else if (correct === 0) {
          speechArrayNextStep = [
            clova.SpeechBuilder.createSpeechText('全問不正解です。'),
          ];
        } else {
          speechArrayNextStep = [
            clova.SpeechBuilder.createSpeechText(`${correct}問正解です。`),
          ];
        }
        speechArrayNextStep.push(clova.SpeechBuilder.createSpeechText('またクイズをしに遊びに来てくださいね。'));
        responseHelper.endSession();
      }

      speech = speechArray.concat(speechArrayNextStep);
      responseHelper.setSpeechList(speech);
      responseHelper.setReprompt(getRepromptMsg(clova.SpeechBuilder.createSpeechText(msg)));

      break;
  }
};

const clovaSkillHandler = clova.Client
  .configureSkill()

  // 起動時に喋る
  .onLaunchRequest(launchHandler)

  // ユーザーからの発話が来たら反応する箇所
  .onIntentRequest(intentHandler)

  // 終了時
  .onSessionEndedRequest(async (responseHelper : clova.Context) => {
    console.log('onSessionEndedRequest');
  })
  .handle();

function getRepromptMsg(speechInfo : clova.Clova.SpeechInfoText) {
  const speechObject = {
    type: 'SimpleSpeech',
    values: speechInfo,
  };

  return speechObject;
}

function getGuideSpeech(reqSessionAttributes : any) {
  const helpMsg : clova.Clova.SpeechInfoObject[] = [clova.SpeechBuilder.createSpeechText('クイズの説明をします。問題を五つ出題するので、なんの動物か分かったら、動物の名前を言ってくださいね。')];
  // 問題取得
  const speechArrayQuestion : clova.Clova.SpeechInfoObject[] = getQuestionSpeechList(reqSessionAttributes.question);
  const speech = helpMsg.concat(speechArrayQuestion);

  return speech;
}

function getQuestionSpeechList(questionNo : number) : clova.Clova.SpeechInfoObject[] {
  const arr = [
    clova.SpeechBuilder.createSpeechText(`${questionNo + 1}問目です。`),
    clova.SpeechBuilder.createSpeechUrl('https://www.dl.dropboxusercontent.com/s/gecnb42lb1otwzh/question1.mp3?dl=0'),
    clova.SpeechBuilder.createSpeechText('この鳴き声は、なんの動物でしょう？'),
    clova.SpeechBuilder.createSpeechUrl(jsonData[questionNo]['soundUrl']),
  ];

  return arr;
}

async function sendLineBot(userId : string, questionNo : number) {
  await client.pushMessage(userId, [
    {
      type: 'flex',
      altText: '正解の動物を送信しました',
      contents:
      {
        'type': 'bubble',
        'hero': {
          'type': 'image',
          'url': jsonData[questionNo]['imageUrl'],
          'size': 'full',
          'aspectRatio': '20:13',
          'aspectMode': 'cover',
          'action': {
            'type': 'uri',
            'label': '動物の写真',
            'uri': jsonData[questionNo]['imageUrl'],
          },
        },
        'body': {
          'type': 'box',
          'layout': 'vertical',
          'spacing': 'md',
          'contents': [
            {
              'type': 'text',
              'text': jsonData[questionNo]['answer'],
              'size': 'xl',
              'weight': 'bold',
            },
          ],
        },
        'footer': {
          'type': 'box',
          'layout': 'vertical',
          'contents': [
            {
              'type': 'button',
              'style': 'primary',
              'color': '#905c44',
              'action': {
                'type': 'uri',
                'label': '詳細を見る',
                'uri': jsonData[questionNo]['wikiUrl'],
              },
            },
          ],
        },
      },
    },
  ]).then(() => {
    console.log('LINE Success');
  }).catch((err : Error) => {
    console.log('LINE Error');
    console.log(err);
  });
}

const app = express();

const clovaMiddleware = clova.Middleware({ applicationId: process.env.EXTENSION_ID || '<your-extention-id>' });
app.post('/clova', clovaMiddleware, (clovaSkillHandler as RequestHandler));
app.post('/test', bodyParser.json(), (clovaSkillHandler as RequestHandler));

module.exports = app;
