require('dotenv').config() // load env vars from .env
const readline = require('readline')
const yaml = require('js-yaml')
const SpotifyClient = require('./SpotifyClient')

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

const renderArtists = (artists) => artists.map(artist => artist.name).join(', ')

const dumpAlbumToStdout = ({ album }) => console.log(yaml.dump([{
  title: album.name,
  artist: renderArtists(album.artists),
  release_date: album.release_date,
  img: album.images[0].url,
  url: `https://open.spotify.com/album/${album.id}`
}]))

;(async () => {
  // auth to spotify account => get spotify api client
  const spotifyClient = await SpotifyClient.getSpotifyClientFromSessionFileIfPossible({
    scopes: [
      'playlist-read-private',
      'playlist-read-collaborative',
      'user-follow-read'
    ],
    clientId: process.env.SPOTIFY_CLIENT_ID || await askQuestion('Spotify client id: '),
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET || await askQuestion('Spotify client secret: ')
  })
  if (spotifyClient && spotifyClient.accessToken) {
    await SpotifyClient.saveSpotifySessionFile(spotifyClient)
  }
  const { spotify } = spotifyClient

  // search album
  const query = process.argv[2] || await askQuestion('Name of album: ')
  console.warn(`🔍  Searching "${query}"...`)
  const { body } = await spotify.search({ query, types: ['album'] })

  // display results
  const albums = (body.albums || {}).items
  if (!(albums || []).length) {
    console.warn(`ℹ️  No albums were found.`)
    process.exit(0)
  } else {
    albums.forEach((album, i) =>
      console.warn(`${i}.\t${album.name} - ${renderArtists(album.artists)}`)
    )
  }

  // pick album from list
  const number = await askQuestion('Number of album: ')
  console.warn()

  // generate YAML
  if (albums[number]) {
    console.log() // print an empty line
    dumpAlbumToStdout({ album: albums[number] })
    console.warn(`✅  Exported 1 album`)
  } else {
    console.warn(`ℹ️  No album was selected`)
  }

  // done.
  process.exit(0)
})().catch(err => {
  console.error(err.stack || err)
})
