// Note: I had to register a Spotify app first
// cf https://developer.spotify.com/documentation/general/guides/app-settings/

require('dotenv').config() // load env vars from .env
const url = require('url')
const http = require('http')
const querystring = require('querystring')
const readline = require('readline')
const SpotifyWebApi = require('spotify-web-api-node')

var SCOPES = ['user-read-private']

const oauthCallback = async ({ port = 9000 }) =>
  new Promise((resolve, reject) => {
    let server
    const onRequest = (request, response) => {
      // console.debug(`request received on ${request.url}`)
      response.writeHead(200, { 'Content-Type': 'text/plain' })
      response.write('Thanks! You can now go back to album-shelf.')
      response.end()
      resolve(querystring.parse(url.parse(request.url).query))
      server.close()
      setImmediate(() => server.emit('close')) // releases the port, cf https://stackoverflow.com/a/36830072/592254
      // console.debug(`oauthCallback server was shut down as expected.`)
    }
    server = http.createServer(onRequest).listen(port)
    // console.debug(`oauthCallback server has started on port ${port}.`)
  })

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

const loadAllPlaylists = async ({ spotifyApi, username }) => {
  let playlists = []
  const limit = 50
  const appendNextPlaylists = async ({ offset }) => {
    const { body } = await spotifyApi.getUserPlaylists(username, { limit, offset })
    playlists = playlists.concat(body.items)
    return !body.next ? { playlists } : appendNextPlaylists({ offset: offset + limit })
  }
  return appendNextPlaylists({ offset: 0 })
}

(async () => {
  const port = 9000

  // credentials are optional
  const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID || await askQuestion('Spotify client id: '),
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET || await askQuestion('Spotify client secret: '),
    redirectUri: `http://localhost:${port}/callback`
  })

  // Create the authorization URL
  const authorizeURL = spotifyApi.createAuthorizeURL(SCOPES/*, state */)
  console.log(`open this URL to give your permission:\n👉 ${authorizeURL}\n`)

  const { code } = await oauthCallback({ port })
  const { body } = await spotifyApi.authorizationCodeGrant(code)
  spotifyApi.setAccessToken(body['access_token'])
  spotifyApi.setRefreshToken(body['refresh_token'])

  const username = process.env.SPOTIFY_USERNAME || await askQuestion('Spotify username: ')
  const { playlists } = await loadAllPlaylists({ spotifyApi, username })
  console.log(playlists)
})().catch(err => { console.error(err) })
