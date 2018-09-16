// Note: I had to register a Spotify app first
// cf https://developer.spotify.com/documentation/general/guides/app-settings/

require('dotenv').config() // load env vars from .env
const readline = require('readline')
const SpotifyClient = require('./SpotifyClient')

function askQuestion (query) {
  // credits: https://stackoverflow.com/a/50890409/592254
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  return new Promise(resolve => rl.question(query, ans => {
    rl.close()
    resolve(ans)
  }))
}

(async () => {
  // auth to spotify account => get spotify api client
  const { spotify } = await SpotifyClient.getSpotifyClient({
    scopes: ['user-read-private'],
    clientId: process.env.SPOTIFY_CLIENT_ID || await askQuestion('Spotify client id: '),
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET || await askQuestion('Spotify client secret: ')
  })
  // fetch and print user's playlists
  const username = process.env.SPOTIFY_USERNAME || await askQuestion('Spotify username: ')
  const { playlists } = await spotify.loadAllPlaylists({ username })
  console.log(JSON.stringify(playlists, null, 2))
  // done.
  process.exit(0)
})().catch(err => { console.error(err) })
