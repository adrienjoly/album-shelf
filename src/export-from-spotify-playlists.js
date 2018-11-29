// Note: I had to register a Spotify app first
// cf https://developer.spotify.com/documentation/general/guides/app-settings/

require('dotenv').config() // load env vars from .env
const util = require('util')
const async = require('async')
const common = require('./common')

const detectAlbumFromTracks = async ({ playlist, playlistTracks }) => {
  const albumIds = playlistTracks.items.map(item => item.track.album.id)
  const allTrackFromSameAlbum = (new Set(albumIds)).size === 1
  const album = allTrackFromSameAlbum && playlistTracks.items[0].track.album
  const isFullAlbum = album && (album.total_tracks === playlistTracks.items.length)
  return {
    playlist: {
      id: playlist.id,
      name: playlist.name
    },
    album: isFullAlbum && {
      id: album.id,
      name: album.name,
      artistName: album.artists.map(artist => artist.name).join(', '),
      release_date: album.release_date,
      images: album.images
    }
  }
}

;(async () => {
  const spotify = await common.authToSpotify()

  // fetch user's playlists
  const username = (await spotify.getMe()).id
  const nbPlaylists = await spotify.countPlaylists({ username })
  console.warn(`username: ${username}`)
  console.warn(`Exporting albums from ${nbPlaylists} playlists, to stdout...`)
  let { playlists } = await spotify.loadAllPlaylists({ username })

  // exporting albums from playlists
  const processedPlaylists = await util.promisify(async.mapSeries)(playlists, async playlist => {
    const { body } = await spotify.getPlaylistTracks({ url: playlist.tracks.href })
    const { album } = await detectAlbumFromTracks({ playlist, playlistTracks: body })
    console.warn(`   ${album ? '☑' : '☐'}  ${playlist.name} (${playlist.tracks.total})`)
    if (album) common.dumpAlbumToStdout({ album })
    return { playlist, album }
  })

  const nonAlbums = processedPlaylists.filter(({ album }) => !album)

  console.warn()
  console.warn(`✅  Done processing ${processedPlaylists.length} / ${nbPlaylists} playlists!`)
  console.warn(`   => Extracted ${processedPlaylists.length - nonAlbums.length} albums to stdin`)
  console.warn()
  console.warn(`ℹ️  The following ${nonAlbums.length} playlists are not albums:`)
  console.warn(nonAlbums
    .map(({ playlist }) => `   ☐ ${playlist.name} (${playlist.tracks.total})`)
    .join('\n')
  )

  // done.
  process.exit(0)
})().catch(err => {
  console.error(err.stack || err)
})
