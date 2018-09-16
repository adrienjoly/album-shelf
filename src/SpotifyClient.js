const fs = require('fs')
const util = require('util')
const url = require('url')
const http = require('http')
const querystring = require('querystring')
const SpotifyWebApi = require('spotify-web-api-node')

const SESSION_FILENAME = '.spotify-session.json'

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

  async getMe () {
    this.me = this.me || (await this.spotifyApi.getMe()).body
    return this.me
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

  async getPlaylistTracks ({ url }) {
    const RE_PL_URL = /https:\/\/api.spotify.com\/v1\/playlists\/([a-zA-Z0-9]+)\/tracks/
    const plId = RE_PL_URL.exec(url)[1]
    return this.spotifyApi.getPlaylistTracks(plId)
  }
}

/**
 * get a spotify client by asking user to auth on spotify.com and provide permissions
 * @param {Object} p - (compound parameters)
 * @param {String} p.clientId - Spotify app's client ID
 * @param {String} p.clientSecret - Spotify app's client secret
 * @param {Array} p.scopes - List of permissions required by the app
 * @returns {Object} - contains { spotify, spotifyApi, accessToken, refreshToken }
 */
const getSpotifyClient = async ({ clientId, clientSecret, scopes }) => {
  const PORT = 9000

  // credentials are optional
  const spotifyApi = new SpotifyWebApi({
    clientId,
    clientSecret,
    redirectUri: `http://localhost:${PORT}/callback`
  })

  // Create the authorization URL
  const authorizeURL = spotifyApi.createAuthorizeURL(scopes/*, state */)
  console.warn(`open this URL to give your permission:\n👉 ${authorizeURL}\n`)

  const { code } = await oauthCallback({ port: PORT })
  const { body } = await spotifyApi.authorizationCodeGrant(code)
  const tokens = { accessToken: body['access_token'], refreshToken: body['refresh_token'] }
  const spotify = new SpotifyClient(tokens)
  await spotify.getMe() // just to make sure that the session is not expired (statusCode 401)

  return {
    ...tokens,
    spotify,
    spotifyApi: spotify.spotifyApi
  }
}

/**
 * save a spotify session to `.spotify-session`, for faster next access
 * @param {Object} p - (compound parameters)
 * @param {String} p.accessToken - as returned by Spotify after successful auth
 * @returns {Object} - contains { spotify, spotifyApi, accessToken, refreshToken }
*/
const saveSpotifySessionFile = ({ accessToken }) =>
  util.promisify(fs.writeFile)(SESSION_FILENAME, JSON.stringify({ accessToken }), 'utf8')

/**
 * get a spotify client by loading an access token from `.spotify-session`
 * @returns {Object} - contains { spotify, spotifyApi, accessToken, refreshToken }
 */
const getSpotifyClientFromSessionFile = async () => {
  const tokens = require(`${process.cwd()}/${SESSION_FILENAME}`)
  const spotify = new SpotifyClient(tokens)
  await spotify.getMe() // just to make sure that the session is not expired (statusCode 401)
  return {
    ...tokens,
    spotify,
    spotifyApi: spotify.spotifyApi
  }
}

/**
 * get a spotify client by loading an access token from `.spotify-session`, or using getSpotifyClient()
 * @param {Object} p - (compound parameters)
 * @param {String} p.clientId - Spotify app's client ID
 * @param {String} p.clientSecret - Spotify app's client secret
 * @param {Array} p.scopes - List of permissions required by the app
 * @returns {Object} - contains { spotify, spotifyApi, accessToken, refreshToken }
 */
const getSpotifyClientFromSessionFileIfPossible = ({ clientId, clientSecret, scopes }) =>
  getSpotifyClientFromSessionFile()
    .catch(() => getSpotifyClient({ clientId, clientSecret, scopes }))

module.exports = {
  ...SpotifyClient,
  getSpotifyClient,
  saveSpotifySessionFile,
  getSpotifyClientFromSessionFile,
  getSpotifyClientFromSessionFileIfPossible
}
