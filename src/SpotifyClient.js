const url = require('url')
const http = require('http')
const querystring = require('querystring')
const SpotifyWebApi = require('spotify-web-api-node')

const oauthCallback = async ({ port }) =>
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

class SpotifyClient {
  constructor ({ accessToken, refreshToken }) {
    this.spotifyApi = new SpotifyWebApi()
    this.spotifyApi.setAccessToken(accessToken)
    this.spotifyApi.setRefreshToken(refreshToken)
  }

  async loadAllPlaylists ({ username }) {
    let playlists = []
    const limit = 50
    const appendNextPlaylists = async ({ offset }) => {
      const { body } = await this.spotifyApi.getUserPlaylists(username, { limit, offset })
      playlists = playlists.concat(body.items)
      return !body.next ? { playlists } : appendNextPlaylists({ offset: offset + limit })
    }
    return appendNextPlaylists({ offset: 0 })
  }
}

module.exports = SpotifyClient
module.exports.getSpotifyClient = async ({ clientId, clientSecret, scopes }) => {
  const PORT = 9000

  // credentials are optional
  const spotifyApi = new SpotifyWebApi({
    clientId,
    clientSecret,
    redirectUri: `http://localhost:${PORT}/callback`
  })

  // Create the authorization URL
  const authorizeURL = spotifyApi.createAuthorizeURL(scopes/*, state */)
  console.log(`open this URL to give your permission:\n👉 ${authorizeURL}\n`)

  const { code } = await oauthCallback({ port: PORT })
  const { body } = await spotifyApi.authorizationCodeGrant(code)
  const tokens = { accessToken: body['access_token'], refreshToken: body['refresh_token'] }
  const spotify = new SpotifyClient(tokens)

  return {
    ...tokens,
    spotify,
    spotifyApi: spotify.spotifyApi
  }
}
