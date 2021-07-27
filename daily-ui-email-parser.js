import initGmail from './gmail-plugin.js';
import * as jsdom from 'jsdom';
import { gmail_v1 } from 'googleapis';
import * as fs from 'fs';

const { JSDOM } = jsdom;

let mess = [];

export default async function run() {
  return getDailyUiMessages(await initGmail());
}

/**
 * Lists the labels in the user's account.
 *
 * @param {gmail_v1} gmail An authorized OAuth2 client.
 */
async function getDailyUiMessages(gmail) {
  mess = await getCachedMessages();
  if (mess.length > 0) return mess;

  const messageList = await gmail.users.messages.list({
    userId: 'me',
    q: 'subject:("Daily UI ::") from:hello@dailyui.co'
  })
    .catch(err => console.log('The API returned an error: ' + err));

  if (!messageList) return [];

  const messages = messageList.data.messages;
  if (messages.length) {
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];

      // Wait 50 ms to not hit rate limit
      await sleep(50);

      const fullMessage = await gmail.users.messages.get(
        { userId: 'me', id: message.id }
      )
        .catch(err => console.log('The API returned an error: ' + err));

      if (!fullMessage) continue;


      const subj = getDailyUiNumber(fullMessage.data);
      if ((subj === -1) && !(i == messages.length - 1)) continue;
      if (subj && subj.length > 0) mess.push(fullMessage.data)

      if (i == messages.length - 1) {
        mess = mess.sort((a, b) => {
          return parseInt(getDailyUiNumber(a)) - parseInt(getDailyUiNumber(b));
        });

        const gallery = mess.map(getGalleryDataFromMessage);
        return cacheMessages(gallery);
      }
    }
  } else {
    console.log('No messages found.');
    return [];
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
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getGalleryDataFromMessage(message) {
  const ogMessages = readOgMessages(message)
  if (ogMessages) return ogMessages;

  const body = message.payload;
  const htmlBody = body.parts.find(p => p.mimeType === 'text/html').body.data;
  const dom = new JSDOM(Buffer.from(htmlBody, 'base64'));
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

function readOgMessages(message) {
  const body = message.payload;
  let html = body.parts.find(p => p.mimeType === 'text/plain').body.data;
  let buff = Buffer.from(html, 'base64');

  const lines = buff.toString().split(/(?:\r\n|\r|\n)/g);

  let readTitle = false, readPrompt = false;
  let title, prompt;

  for (let i = 0; i < lines.length; i++) {
    if (title && prompt) break;

    const line = lines[i];
    if (!line || line.length === 0) continue;

    if (readTitle) {
      readTitle = false;
      title = line;
    }

    if (readPrompt) {
      readPrompt = false;
      prompt = line;
    }

    readTitle = line.includes('**');
    readPrompt = line.includes("Design Hint");
  }

  if (!title || !prompt) return null;

  return {
    prommpt: prompt,
    title: title,
    number: getDailyUiNumber(message)
  };
}

async function cacheMessages(gallery) {
  const json = JSON.stringify(gallery);
  return await fs.promises.writeFile('.cache', json)
    .then(() => {
      console.log('Cached messages stored in .cache')
      return json;
    });
}

async function getCachedMessages() {
  return fs.promises.readFile('.cache', 'ascii')
    .then(cache => {
      console.log('Loading messages from .cache')
      mess = JSON.parse(cache);
      return mess;
    })
    .catch(err => {
      console.log('No .cache found.')
      return [];
    })
}