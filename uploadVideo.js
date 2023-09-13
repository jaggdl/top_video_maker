// ES6 Module Syntax
import { google } from 'googleapis';
import fs from 'fs';
import readline from 'readline';

// Load client secrets from a file.
export async function uploadVideo(filePath, title, description) {
  try {
    const content = fs.readFileSync('credentials.json');
    await authorize(JSON.parse(content), filePath, title, description);
  } catch (err) {
    console.error('Error loading client secret file:', err);
  }
}

// Create an OAuth2 client with the given credentials
async function authorize(credentials, filePath, title, description) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  try {
    const token = fs.readFileSync('token.json');
    oAuth2Client.setCredentials(JSON.parse(token));
    await upload(oAuth2Client, filePath, title, description);
  } catch (err) {
    getAccessToken(oAuth2Client, filePath, title, description);
  }
}

// Get and store new token after prompting for user authorization
function getAccessToken(oAuth2Client, filePath, title, description) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/youtube.upload'],
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, async (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFileSync('token.json', JSON.stringify(token));
      await upload(oAuth2Client, filePath, title, description);
    });
  });
}

// Upload the video
async function upload(auth, filePath, title, description) {
  const youtube = google.youtube({ version: 'v3', auth });
  const params = {
    resource: {
      // Video title and description
      snippet: {
        title,
        description,
      },
      // I set to unlisted for tests
      status: {
        privacyStatus: 'unlisted',
      },
    },
    media: {
      body: fs.createReadStream(filePath),
    },
  };

  try {
    const response = await youtube.videos.insert({
      part: 'snippet,status',
      requestBody: params.resource,
      media: params.media,
    });

    console.log(response.data);
  } catch (err) {
    console.error(err);
  }
}
