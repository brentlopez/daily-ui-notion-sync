import { init } from './gmail-plugin.js';
import * as jsdom from 'jsdom';
import { gmail_v1 } from 'googleapis';
import * as fs from 'fs';


const { JSDOM } = jsdom;
var mess = [];

export async function run(callback) {
  await getDailyUiMessages(await init(), callback);
}

/**
 * Lists the labels in the user's account.
 *
 * @param {gmail_v1} gmail An authorized OAuth2 client.
 */
async function getDailyUiMessages(gmail, callback) {
  mess = await getCachedMessages();
  if (mess.length > 0) {
    callback(Array.from(mess, getGalleryDataFromMessage))
    return;
  }

  var messageList = await gmail.users.messages.list({
    userId: 'me',
    q: 'subject:("Daily UI ::") from:hello@dailyui.co'
  })
    .catch(err => console.log('The API returned an error: ' + err));

  if(!messageList) return;

  const messages = messageList.data.messages;
  if (messages.length) {
    console.log('Messages:');

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      await sleep(50);
      var fullMessage = await gmail.users.messages.get(
        { userId: 'me', id: message.id }
      )
        .catch(err => console.log('The API returned an error: ' + err));

      if(!fullMessage) return;


      var subj = getDailyUiNumber(fullMessage.data);
      if ((subj === -1) && !(i == messages.length - 1)) return;

      if (subj && subj.length > 0) {
        mess.push(fullMessage.data);
      }

      if (i == messages.length - 1) {
        mess = mess.sort((a, b) => {
          return parseInt(getDailyUiNumber(a)) - parseInt(getDailyUiNumber(b));
        });

        //mess.forEach(m => console.log(getGalleryDataFromMessage(m)));  
        const gallery = Array.from(mess, getGalleryDataFromMessage);
        cacheMessages(gallery);
        callback(gallery)
      }
    }
  } else {
    console.log('No messages found.');
  }
}

function getSubject(message) {
  return message.payload.headers.find(h => h.name === "Subject").value;
}

function getDailyUiNumber(message) {
  const subj = getSubject(message).replace(/^\D+/g, '');
  if (subj.length >= 3) {
    return subj.substr(0, 3);
  }

  return -1;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getGalleryDataFromMessage(message) {
  const body = message.payload;

  var thing = readOgMessages(message)
  if (thing) {
    return thing;
  } else {
    var htmlBody = body.parts.find(p => p.mimeType === 'text/html').body.data;

    var dom = new JSDOM(Buffer.from(htmlBody, 'base64'));

    const document = dom.window.document;
    const bodyEl = document.body;

    const titleEl = bodyEl.querySelector('h1 span span:nth-of-type(2)');
    const promptEl = bodyEl.querySelector('span > span > em');

    return {
      prommpt: promptEl?.innerHTML,
      title: titleEl?.innerHTML,
      number: getDailyUiNumber(message)
    };
  }


}

function readOgMessages(message) {
  if (parseInt(getDailyUiNumber(message)) === 51) {
    console.log('');
  }
  const body = message.payload;
  var html = body.parts.find(p => p.mimeType === 'text/plain').body.data;
  let buff = Buffer.from(html, 'base64');
  html = buff.toString();

  var lines = html.split(/(?:\r\n|\r|\n)/g);

  let readTitle = false;
  let readPrompt = false;

  let title;
  let prompt;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];


    if (title && prompt) {
      break;
    }

    if (!line || line.length === 0) continue;

    if (readTitle) {
      readTitle = false;
      title = line;
    }

    if (readPrompt) {
      readPrompt = false;
      prompt = line;
    }

    if (line.includes('**')) {
      readTitle = true;
    }

    if (line.includes("Design Hint")) {
      readPrompt = true;
    }
  }

  if (!title || !prompt) {
    return null;
  }

  return {
    prommpt: prompt,
    title: title,
    number: getDailyUiNumber(message)
  };
}

function cacheMessages(gallery) {
  fs.promises.writeFile('.cache', JSON.stringify(gallery))
    .then(() => {
      console.log('Cached messages stored in .cache')
    });
}

async function getCachedMessages() {
  return await fs.promises.readFile('.cache', 'ascii')
    .then(cache => {
      console.log('Caching messages in .cache')
      mess = JSON.parse(cache);
      return mess;
    })
    .catch(err => {
      console.log('No .cache found.')
      return [];
    })
}