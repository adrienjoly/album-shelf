// Note: I had to register a Spotify app first
// cf https://developer.spotify.com/documentation/general/guides/app-settings/

require('dotenv').config() // load env vars from .env
const util = require('util')
const readline = require('readline')
const async = require('async')
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

const detectAlbumFromTracks = async ({ playlist, playlistTracks }) => {
  const albumIds = playlistTracks.items.map(item => item.track.album.id)
  const allTrackFromSameAlbum = (new Set(albumIds)).size === 1
  const album = allTrackFromSameAlbum && playlistTracks.items[0].track.album
  const isFullAlbum = album && (album.total_tracks === playlistTracks.items.length)
  return {
    playlist: {
      id: playlist.id,
      name: playlist.name,
      total_tracks: playlist.tracks.total
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

(async () => {
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

  // fetch user's playlists
  const username = (await spotify.getMe()).id
  let { playlists } = await spotify.loadAllPlaylists({ username })
  // console.log(JSON.stringify(playlists, null, 2))

  // detecting playlists that are albums
  // playlists = playlists.slice(0, 2) // TODO: remove this line
  const playlistsWithTracks = await util.promisify(async.mapSeries)(playlists, async playlist => {
    const { body } = await spotify.getPlaylistTracks({ url: playlist.tracks.href })
    const { album } = await detectAlbumFromTracks({ playlist, playlistTracks: body })
    console.log(`${album ? '✅' : '🗒'} ${playlist.name} (${playlist.tracks.total})`)
  })

  // done.
  process.exit(0)
})().catch(err => {
  console.trace(err)
})
