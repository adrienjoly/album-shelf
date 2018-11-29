require('dotenv').config() // load env vars from .env
const common = require('./common')

const renderArtists = (artists) => artists.map(artist => artist.name).join(', ')

;(async () => {
  const spotify = await common.authToSpotify() // may read and/or update .spotify-session.json.

  // search album
  const query = process.argv[2] || await common.askQuestion('Name of album: ')
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
  const number = await common.askQuestion('Number of album: ')
  console.warn()

  // generate YAML
  if (albums[number]) {
    console.log() // print an empty line
    common.dumpAlbumToStdout({ album: albums[number] })
    console.warn(`✅  Exported 1 album`)
  } else {
    console.warn(`ℹ️  No album was selected`)
  }

  // done.
  process.exit(0)
})().catch(err => {
  console.error(err.stack || err)
})
