const clova = require('@line/clova-cek-sdk-nodejs');
//const line = require('@line/bot-sdk');
const express = require('express');
const jsonData = require('./data.json');
require('dotenv').config();

const MAX_QUESTION = 5;
const msg = '動物を答えてください。';

/*
const client = new line.Client({
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.CHANNEL_SECRET
});
*/

const clovaSkillHandler = clova.Client
  .configureSkill()

  //起動時に喋る
  .onLaunchRequest(responseHelper => {
    console.log('onLaunchRequest');
    
    responseHelper.setSimpleSpeech(clova.SpeechBuilder.createSpeechText('こんにちは！鳴き声クイズへようこそ。クイズの説明を聞きますか？'));
    responseHelper.setReprompt(getRepromptMsg(clova.SpeechBuilder.createSpeechText('クイズの説明を聞きますか？')));

    responseHelper.setSessionAttributes({ "question": 0, "correct": 0, "incorrect": 0 });
  })

  //ユーザーからの発話が来たら反応する箇所
  .onIntentRequest(async responseHelper => {
    const intent = responseHelper.getIntentName();
    var reqSessionAttributes = responseHelper.getSessionAttributes();
    console.log('Intent:' + intent);
    switch (intent) {
      case 'Clova.GuideIntent':
        var speech = getGuideSpeech(reqSessionAttributes);
        responseHelper.setSpeechList(speech);
        responseHelper.setReprompt(getRepromptMsg(clova.SpeechBuilder.createSpeechText(msg)));
        break;
      case 'Clova.YesIntent':
        var speech = getGuideSpeech(reqSessionAttributes);
        responseHelper.setSpeechList(speech);
        responseHelper.setReprompt(getRepromptMsg(clova.SpeechBuilder.createSpeechText(msg)));
        break;
      case 'Clova.NoIntent':
        // 問題取得
        var speech = getQuestionSpeechList(0);
        responseHelper.setSpeechList(speech);
        responseHelper.setReprompt(getRepromptMsg(clova.SpeechBuilder.createSpeechText(msg)));
        break;
      case 'QuizIntent':
        const slots = responseHelper.getSlots();
        console.log(slots);
        var currentQuestion = parseInt(reqSessionAttributes.question);
        var nextQuestion = parseInt(currentQuestion) + 1;
        var correct = parseInt(reqSessionAttributes.correct);
        var incorrect = parseInt(reqSessionAttributes.incorrect);
        var speechArray = [];
        var speechArrayNextStep = [];
        
        // 正解か不正解
        if (jsonData[currentQuestion]["answer"] === slots.animal) {
          speechArray = [
            clova.SpeechBuilder.createSpeechUrl('https://www.dl.dropboxusercontent.com/s/2vkb4s1q6xm7j1w/correct2.mp3?dl=0'),
            clova.SpeechBuilder.createSpeechText('正解です。')
          ];
          // 正解数カウントアップ
          correct = parseInt(correct) + 1;
        } else {
          speechArray = [
            clova.SpeechBuilder.createSpeechUrl('https://www.dl.dropboxusercontent.com/s/d6cqnydyfqbdgao/incorrect1.mp3?dl=0'),
            clova.SpeechBuilder.createSpeechText('残念、違います。'),
            clova.SpeechBuilder.createSpeechText(`答えは${jsonData[currentQuestion]["answer"]}です。`)
          ];
          // 不正解数カウントアップ
          incorrect = parseInt(incorrect) + 1;
        }
        // LINE BOT送信
        speechArray.push(clova.SpeechBuilder.createSpeechText(`動物鳴き声クイズボットから、${jsonData[currentQuestion]["answer"]}の詳細情報を送信します。`));
        const { userId } = responseHelper.getUser();
        //sendLineBot(userId, currentQuestion);
    
        // 値保持
        responseHelper.setSessionAttributes({
          "question": nextQuestion,
          "correct": correct,
          "incorrect": incorrect
        });
        
        if (nextQuestion < MAX_QUESTION) {
          // 問題取得
          speechArrayNextStep = getQuestionSpeechList(nextQuestion);
        } else {
          // 結果
          if (correct === MAX_QUESTION) {
            speechArrayNextStep = [
              clova.SpeechBuilder.createSpeechUrl('https://www.dl.dropboxusercontent.com/s/ct1kak7abnjeppu/trumpet1.mp3?dl=0'),
              clova.SpeechBuilder.createSpeechText('おめでとうございます！全問正解です。')
            ];
          }else if(correct === 0){
            speechArrayNextStep = [
              clova.SpeechBuilder.createSpeechText('全問不正解です。')
            ];
          }else{
            speechArrayNextStep = [
              clova.SpeechBuilder.createSpeechText(`${correct}問正解です。`)
            ];
          }
          speechArrayNextStep.push(clova.SpeechBuilder.createSpeechText('またクイズをしに遊びに来てくださいね。'));
          responseHelper.endSession();
        }
        
        var speech = speechArray.concat(speechArrayNextStep);
        responseHelper.setSpeechList(speech);
        responseHelper.setReprompt(getRepromptMsg(clova.SpeechBuilder.createSpeechText(msg)));
        
        break;
    }
  })

  //終了時
  .onSessionEndedRequest(async responseHelper => {
    console.log('onSessionEndedRequest');
  })
  .handle();

function getRepromptMsg(speechInfo){
  const speechObject = {
    type: 'SimpleSpeech',
    values: speechInfo,
  };
  return speechObject
}

function getGuideSpeech(reqSessionAttributes){
  var helpMsg = [clova.SpeechBuilder.createSpeechText('クイズの説明をします。問題を五つ出題するので、なんの動物か分かったら、動物の名前を言ってくださいね。')];
  // 問題取得
  var speechArrayQuestion = getQuestionSpeechList(reqSessionAttributes.question);
  var speech = helpMsg.concat(speechArrayQuestion);
  return speech;  
}  

function getQuestionSpeechList(questionNo){
  var arr = [
    clova.SpeechBuilder.createSpeechText(`${questionNo + 1}問目です。`),
    clova.SpeechBuilder.createSpeechUrl('https://www.dl.dropboxusercontent.com/s/gecnb42lb1otwzh/question1.mp3?dl=0'),
    clova.SpeechBuilder.createSpeechText('この鳴き声は、なんの動物でしょう？'),
    clova.SpeechBuilder.createSpeechUrl(jsonData[questionNo]["soundUrl"])
  ];
  
  return arr;
}  

/*
// Flex Message に置き換えてみよう！
function sendLineBot(userId, questionNo){
  client.pushMessage(userId, [
    {
        "type":"text",
        "text":"Hello, world"
        }
  ]).then(() => {
    console.log('LINE Success')
  }).catch((err) => {
    //console.log('LINE Error')
    //console.log(err)
  })
}
*/

const app = new express();
const port = process.env.PORT || 3000;

const clovaMiddleware = clova.Middleware({ applicationId: process.env.EXTENSION_ID });
app.post('/clova', clovaMiddleware, clovaSkillHandler);

app.listen(port, () => console.log(`Server running on ${port}`));
