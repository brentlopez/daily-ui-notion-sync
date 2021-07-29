import run from './daily-ui-email-parser.js';
import {addItem} from './notion-plugin.js';

run()
  .then(m => {
    m.forEach(async message => {
      await addItem(message)
    });
  })
  .catch(err => {
    console.log(err);
  });



// TODO: check for duplicates
// TODO: format messages better

