import { Client } from "@notionhq/client"
import {run} from './daily-ui-email-parser.js';

const notion = new Client({ auth: process.env.NOTION_KEY })
const databaseId = process.env.NOTION_DATABASE_ID

await run(mess => {
  mess.forEach(async message => {
    await addItem(message.number, message.title, message.prompt)
  });
});

// TODO: check for duplicates
// TODO: cache message results
// TODO: format messages better

async function addItem(number, title, prompt) {
  try {
    await notion.request({
      path: "pages",
      method: "POST",
      body: {
        parent: { database_id: databaseId },
        properties: {
          title: { 
            title:[
              {
                "text": {
                  "content": number + " " + title
                }
              }
            ]
          }
        }
      },
    })
    console.log("Success! Entry added.")
  } catch (error) {
    console.error(error.body)
  }
}

//addItem("Yurts in Big Sur, California")





