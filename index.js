import run from './daily-ui-email-parser.js';
import {addItem} from './notion-plugin.js';

await Promise.all((await run()).map(async message => {
  await addItem(message.number, message.title, message.prompt)
}))

// TODO: check for duplicates
// TODO: format messages better

