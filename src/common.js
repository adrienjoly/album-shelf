const readline = require('readline')
const yaml = require('js-yaml')
const util = require('util')
const async = require('async')
const SpotifyClient = require('./SpotifyClient')

const mapSeriesAsync = (items, asyncItemHandler) =>
  util.promisify(async.mapSeries)(items, asyncItemHandler)

const DEFAULT_SCOPES = [
  // 'user-library-read',
  'user-follow-read',
  'playlist-read-private',
  'playlist-read-collaborative'
]

const dumpAlbumToStdout = ({ album }) => console.log(yaml.dump([{
  title: album.name,
  artist: album.artistName,
  release_date: album.release_date,
  img: album.images[0].url,
  url: `https://open.spotify.com/album/${album.id}`
}]))

function askQuestion (query) {
  // credits: https://stackoverflow.com/a/50890409/592254
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stderr
  })
  return new Promise(resolve => rl.question(query, ans => {
    rl.close()
    resolve(ans)
  }))
}

/**
 * Auth to spotify account => return spotify api client.
 * This function may read and/or update .spotify-session.json.
 */
async function authToSpotify ({ scopes = DEFAULT_SCOPES } = {}) {
  const spotifyClient = await SpotifyClient.getSpotifyClientFromSessionFileIfPossible({
    scopes,
    clientId: process.env.SPOTIFY_CLIENT_ID || await askQuestion('Spotify client id: '),
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET || await askQuestion('Spotify client secret: ')
  })
  if (spotifyClient && spotifyClient.accessToken) {
    await SpotifyClient.saveSpotifySessionFile(spotifyClient)
  }
  return spotifyClient.spotify
}

module.exports = {
  mapSeriesAsync,
  dumpAlbumToStdout,
  askQuestion,
  authToSpotify
}
