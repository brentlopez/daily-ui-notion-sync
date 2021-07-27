import * as fs from 'fs';
import readline from 'readline-promise';
//import { gmail } from "googleapis/build/src/apis/gmail";
import { google } from 'googleapis';
const OAuth2Client = google.auth.OAuth2;


// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

export default async function initGmail() {
    // Load client secrets from a local file.
    let content = await fs.promises.readFile('credentials.json', 'ascii')

    // if(content.error){
    //     console.log('Error loading client secret file:', err);
    //     return;
    // }

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
    return fs.promises.readFile(TOKEN_PATH, 'ascii')
        .then(t => {
            oAuth2Client.setCredentials(JSON.parse(t));
            return oAuth2Client;
        })
        .catch(async err => {
            await getNewToken(oAuth2Client);
            return oAuth2Client;
        })
        .then(() => {
            return oAuth2Client;
        });
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
    const rl = readline.default.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    let code = await rl.questionAsync('Enter the code from that page here: ')
    
    rl.close();
    let tok = await oAuth2Client.getToken(code)
        .catch(err => console.error('Error retrieving access token', err));

    tok = tok["tokens"];

    oAuth2Client.setCredentials(tok);
    // Store the token to disk for later program executions
    return fs.promises.writeFile(TOKEN_PATH, JSON.stringify(tok))
        .then(() => {
            console.log('Token stored to', TOKEN_PATH);
        })
        .catch(console.error);
}