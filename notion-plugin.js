import { Client } from "@notionhq/client"

const notion = new Client({ auth: process.env.NOTION_KEY })
const databaseId = process.env.NOTION_DATABASE_ID;

export async function addItem({ number, title, prompt }) {
    return notion.pages
        .create({
            parent: { database_id: databaseId },
            properties: {
                title: {
                    type: "title",
                    title: [
                        {
                            text: { content: number + ": " + title }
                        }
                    ]
                },
                Tags: {
                    type: "multi_select",
                    multi_select: [
                        {
                            name: "To Do"
                        }
                    ]
                },
                Completed: {
                    type: "checkbox",
                    checkbox: false
                }
            },
            children: [
                heading_1("Prompt"),
                paragraph((prompt && prompt.length > 0) ? prompt : "N/A"),
                paragraph(""),
                heading_1("Design"),
                paragraph("[SUMMARY]"),
                paragraph("")
            ]
        })
        .then(pcr => console.log("Success! Entry added."))
        .catch(err => console.error(err.body))
}

function heading_1(text){
    return {
        object: 'block',
        type: 'heading_1',
        heading_1: {
            text: [
                {
                    type: 'text',
                    text: {
                        content: text
                    }
                }
            ]
        }
    }
}

function paragraph(text){
    return {
        object: 'block',
        type: 'paragraph',
        paragraph: {
            text: [
                {
                    type: 'text',
                    text: {
                        content: text
                    }
                }
            ]
        }
    }
}