import * as fs from 'fs';
import * as readline from 'readline';
//import { gmail } from "googleapis/build/src/apis/gmail";
import { google } from 'googleapis';
const OAuth2Client = google.auth.OAuth2;


// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

export async function init() {
    // Load client secrets from a local file.
    let content = await fs.promises.readFile('credentials.json')

    if(content.error){
        console.log('Error loading client secret file:', err);
        return;
    }

    let auth = await authorize(JSON.parse(content));
    return google.gmail({ version: 'v1', auth });
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 */
async function authorize(credentials) {
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new OAuth2Client(
        client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    let token = await fs.promises.readFile(TOKEN_PATH);

    if(token.error){
        await getNewToken(oAuth2Client);
        return;
    }

    oAuth2Client.setCredentials(JSON.parse(token));

    return oAuth2Client;
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {OAuth2Client} oAuth2Client The OAuth2 client to get token for.
 */
async function getNewToken(oAuth2Client) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', async (code) => {
        rl.close();
        await oAuth2Client.getToken(code)
            .then(async token => {
                oAuth2Client.setCredentials(token);
                // Store the token to disk for later program executions
                await fs.promises.writeFile(TOKEN_PATH, JSON.stringify(token))
                    .then(() => {
                        console.log('Token stored to', TOKEN_PATH);
                    })
                    .catch(console.error);
            })
            .catch(err => console.error('Error retrieving access token', err));
    });
}