require('dotenv').config() // load env vars from .env
const common = require('./common')

;(async () => {
  const spotify = await common.authToSpotify() // may read and/or update .spotify-session.json.

  // fetch user's playlists
  const username = (await spotify.getMe()).id
  const nbPlaylists = await spotify.countSavedAlbums({ username })
  console.warn(`username: ${username}`)
  console.warn(`Exporting ${nbPlaylists} saved albums, to stdout...`)

  let { albums } = await spotify.loadAllSavedAlbums({ username })

  albums.forEach(entry => common.dumpAlbumToStdout({ album: entry.album }))

  console.warn()
  console.warn(`✅  Done exporting ${albums.length} saved albums to stdin!`)
  console.warn()

  // done.
  process.exit(0)
})().catch(err => {
  console.error(err.stack || err)
})
