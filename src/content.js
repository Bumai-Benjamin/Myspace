// ─────────────────────────────────────────────────────────────
// CONTENT — edit this file to change what the site shows.
// Each roll is one "project". The first take is the cover used on
// the film strip. Photo files live in /public/photos/full and /thumb
// (same file name). Camera data was read from each photo's EXIF.
//
// caption: your words about ONE photo. Shown under "This frame" when
// that photo is open. Leave it '' to hide the block for that photo.
// ─────────────────────────────────────────────────────────────
export const SITE = {
  name: 'BENITIA',      // logo + film-edge printing
  stock: '400',         // printed after the name on the film edge
  code: 'BT-36',        // little code printed on the edge
};

export const ROLLS = [
  {
    "slug": "golden-hour-drive",
    "title": "GOLDEN HOUR DRIVE",
    "note": "Three sunsets seen through a windscreen, months apart. The road changes, the light does not.",
    "takes": [
      {
        "id": "5686",
        "w": 1600,
        "h": 1200,
        "iso": 1600,
        "f": "2.4",
        "shutter": "1/45",
        "date": "03.11.2026",
        "camera": "iPhone 14",
        "caption": "Sunset through the windscreen, one phone screen glowing in the back seat."
      },
      {
        "id": "4796",
        "w": 900,
        "h": 1600,
        "iso": 640,
        "f": "2.4",
        "shutter": "1/60",
        "date": "03.09.2026",
        "camera": "iPhone 14",
        "caption": ""
      },
      {
        "id": "5130",
        "w": 900,
        "h": 1600,
        "iso": 125,
        "f": "1.5",
        "shutter": "1/121",
        "date": "26.09.2026",
        "camera": "iPhone 14",
        "caption": ""
      }
    ]
  },
  {
    "slug": "late-lunch",
    "title": "LATE LUNCH",
    "note": "One afternoon in a green booth. Four frames, two drinks, nobody in a hurry.",
    "takes": [
      {
        "id": "5443",
        "w": 900,
        "h": 1600,
        "iso": 250,
        "f": "1.5",
        "shutter": "1/50",
        "date": "20.10.2026",
        "camera": "iPhone 14",
        "caption": ""
      },
      {
        "id": "5437",
        "w": 900,
        "h": 1600,
        "iso": 400,
        "f": "1.5",
        "shutter": "1/35",
        "date": "20.10.2026",
        "camera": "iPhone 14",
        "caption": ""
      },
      {
        "id": "5438",
        "w": 900,
        "h": 1600,
        "iso": 400,
        "f": "1.5",
        "shutter": "1/35",
        "date": "20.10.2026",
        "camera": "iPhone 14",
        "caption": ""
      },
      {
        "id": "5439",
        "w": 900,
        "h": 1600,
        "iso": 160,
        "f": "1.5",
        "shutter": "1/50",
        "date": "20.10.2026",
        "camera": "iPhone 14",
        "caption": ""
      }
    ]
  },
  {
    "slug": "pink-sky",
    "title": "PINK SKY",
    "note": "The few minutes when the sky goes pink and everyone stops to look up.",
    "takes": [
      {
        "id": "5876",
        "w": 900,
        "h": 1600,
        "iso": 125,
        "f": "1.5",
        "shutter": "1/50",
        "date": "24.11.2026",
        "camera": "iPhone 14",
        "caption": ""
      },
      {
        "id": "6840",
        "w": 1200,
        "h": 1600,
        "iso": 500,
        "f": "1.5",
        "shutter": "1/46",
        "date": "03.11.2026",
        "camera": "iPhone 18 Pro Max",
        "caption": ""
      }
    ]
  },
  {
    "slug": "moon-and-dusk",
    "title": "MOON AND DUSK",
    "note": "A full moon over the gravel and the last blue light before it.",
    "takes": [
      {
        "id": "5881",
        "w": 1200,
        "h": 1600,
        "iso": 1600,
        "f": "1.5",
        "shutter": "1/2",
        "date": "24.11.2026",
        "camera": "iPhone 14",
        "caption": ""
      },
      {
        "id": "5690",
        "w": 900,
        "h": 1600,
        "iso": 320,
        "f": "1.5",
        "shutter": "1/60",
        "date": "03.11.2026",
        "camera": "iPhone 14",
        "caption": ""
      }
    ]
  },
  {
    "slug": "passenger-seat",
    "title": "PASSENGER SEAT",
    "note": "Two rides, two views from the seat beside the driver.",
    "takes": [
      {
        "id": "5771",
        "w": 1600,
        "h": 1200,
        "iso": 400,
        "f": "1.5",
        "shutter": "1/60",
        "date": "09.11.2026",
        "camera": "iPhone 14",
        "caption": ""
      },
      {
        "id": "5675",
        "w": 900,
        "h": 1600,
        "iso": 40,
        "f": "1.5",
        "shutter": "1/259",
        "date": "03.11.2026",
        "camera": "iPhone 14",
        "caption": ""
      }
    ]
  },
  {
    "slug": "pool-hall",
    "title": "POOL HALL",
    "note": "A Thursday afternoon at the table. Two shots, one of them lined up properly.",
    "takes": [
      {
        "id": "5808",
        "w": 900,
        "h": 1600,
        "iso": 80,
        "f": "2.4",
        "shutter": "1/99",
        "date": "13.11.2026",
        "camera": "iPhone 14",
        "caption": ""
      },
      {
        "id": "5807",
        "w": 900,
        "h": 1600,
        "iso": 50,
        "f": "1.5",
        "shutter": "1/374",
        "date": "13.11.2026",
        "camera": "iPhone 14",
        "caption": ""
      }
    ]
  },
  {
    "slug": "the-couch",
    "title": "THE COUCH",
    "note": "Three frames from an older phone, on a leather couch in good daylight.",
    "takes": [
      {
        "id": "5066",
        "w": 1194,
        "h": 1600,
        "iso": null,
        "f": null,
        "shutter": null,
        "date": null,
        "camera": null,
        "caption": ""
      },
      {
        "id": "5067",
        "w": 1194,
        "h": 1600,
        "iso": null,
        "f": null,
        "shutter": null,
        "date": null,
        "camera": null,
        "caption": ""
      },
      {
        "id": "5062",
        "w": 1194,
        "h": 1600,
        "iso": null,
        "f": null,
        "shutter": null,
        "date": null,
        "camera": null,
        "caption": ""
      }
    ]
  },
  {
    "slug": "neon",
    "title": "NEON",
    "note": "Under the yellow sign, everyone filming everyone else.",
    "takes": [
      {
        "id": "5263",
        "w": 1600,
        "h": 900,
        "iso": 640,
        "f": "1.5",
        "shutter": "1/30",
        "date": "03.10.2026",
        "camera": "iPhone 14",
        "caption": ""
      }
    ]
  },
  {
    "slug": "try-ons",
    "title": "TRY-ONS",
    "note": "A wall of sunglasses and a reflection that would not stay out of the shot.",
    "takes": [
      {
        "id": "5373",
        "w": 900,
        "h": 1600,
        "iso": 32,
        "f": "1.5",
        "shutter": "1/129",
        "date": "13.10.2026",
        "camera": "iPhone 14",
        "caption": ""
      }
    ]
  },
  {
    "slug": "after-hours",
    "title": "AFTER HOURS",
    "note": "Late work, a heart made of hands and a laptop worn as a hat.",
    "takes": [
      {
        "id": "5742",
        "w": 1200,
        "h": 1600,
        "iso": 250,
        "f": "1.5",
        "shutter": "1/50",
        "date": "05.11.2026",
        "camera": "iPhone 14",
        "caption": ""
      },
      {
        "id": "5001",
        "w": 1200,
        "h": 1600,
        "iso": 1600,
        "f": "1.9",
        "shutter": "1/16",
        "date": "23.09.2026",
        "camera": "iPhone 14",
        "caption": ""
      }
    ]
  },
  {
    "slug": "slow-evenings",
    "title": "SLOW EVENINGS",
    "note": "Two evenings that ended horizontal.",
    "takes": [
      {
        "id": "4926",
        "w": 1200,
        "h": 1600,
        "iso": 100,
        "f": "2.4",
        "shutter": "1/43",
        "date": "17.09.2026",
        "camera": "iPhone 14",
        "caption": ""
      },
      {
        "id": "5825",
        "w": 1600,
        "h": 1200,
        "iso": 500,
        "f": "1.5",
        "shutter": "1/25",
        "date": "16.11.2026",
        "camera": "iPhone 14",
        "caption": ""
      }
    ]
  },
  {
    "slug": "filters",
    "title": "FILTERS",
    "note": "The frames that got stickers, sunglasses and a borrowed moustache.",
    "takes": [
      {
        "id": "4982",
        "w": 900,
        "h": 1600,
        "iso": null,
        "f": null,
        "shutter": null,
        "date": null,
        "camera": null,
        "caption": ""
      },
      {
        "id": "5875",
        "w": 720,
        "h": 1280,
        "iso": null,
        "f": null,
        "shutter": null,
        "date": null,
        "camera": null,
        "caption": ""
      },
      {
        "id": "4984",
        "w": 900,
        "h": 1600,
        "iso": null,
        "f": null,
        "shutter": null,
        "date": null,
        "camera": null,
        "caption": ""
      }
    ]
  }
];

// MUSIC — the playlists in the soundtrack drawer (spinning record, bottom right).
// Paste PUBLIC Spotify playlist links (Share → Copy link). name = text on the chip.
export const MUSIC = {
  // cover is optional; without it the site asks Spotify for the cover art
  playlists: [
    { name: "Indie🚼", url: 'https://open.spotify.com/playlist/3aBrlMzTXJc3vqSWkAX46w', cover: 'https://image-cdn-ak.spotifycdn.com/image/ab67706c0000da84d98f722d2d39ff7619d5e22a' },
    { name: "Afro", url: 'https://open.spotify.com/playlist/10m1KGbttbUM5ol2TsixJ4', cover: 'https://image-cdn-ak.spotifycdn.com/image/ab67706c0000da846f7ce4fb4ff38119cefbebae' },
    { name: "Let’s go deep", url: 'https://open.spotify.com/playlist/3phNIsGordrK2ED4ybj6kZ', cover: 'https://mosaic.scdn.co/300/ab67616d00001e02353052e2ba12c9f97667525aab67616d00001e025c30f277e2c556f59b06c0f4ab67616d00001e0297adf3a43e5721fecb0a628eab67616d00001e02e42dc2937cf7fb5dd56947b2' },
    { name: "Blues 🚠", url: 'https://open.spotify.com/playlist/59CIO1xJfZveqcG2BUZtYT', cover: 'https://mosaic.scdn.co/300/ab67616d00001e024bc05e5b1e506a6acea17148ab67616d00001e025b7a6cabbcb9fe150966563cab67616d00001e02cc2ef2810c85fde8ec60cbc4ab67616d00001e02dc60cf9a010f86354e6735dd' },
    { name: "If you like this kiss me🎨", url: 'https://open.spotify.com/playlist/2jMdR4lIMr8c2M8UoaXzvd', cover: 'https://image-cdn-fa.spotifycdn.com/image/ab67706c0000da84c49dfe9cea91f3a9e47adfaa' },
    { name: "2a.m voyage🛀", url: 'https://open.spotify.com/playlist/03IeqAJh7z4GRIsMz51UJq', cover: 'https://image-cdn-ak.spotifycdn.com/image/ab67706c0000da8420a8b08c023a36958350fdcf' },
    { name: "What is happening", url: 'https://open.spotify.com/playlist/2kK3HHkx08d1FUmwysR4xG', cover: 'https://mosaic.scdn.co/300/ab67616d00001e025041b31f5a83457a8abd24deab67616d00001e027594ad720d7d75b30cc27505ab67616d00001e02afb02532f81972de184446abab67616d00001e02cec8c6bda8595fd52949891e' },
    { name: "BackThen", url: 'https://open.spotify.com/playlist/2kE3uup4utkbqOEnxyvV5e', cover: 'https://mosaic.scdn.co/300/ab67616d00001e025ad6fe821abedcd5e168f0e7ab67616d00001e028ff337e03d66d3da60e643a9ab67616d00001e02a52d0d8eccaa3f8921fbc29aab67616d00001e02e80cec8dfa5c9b5410618d8f' },
    { name: "New beginnings", url: 'https://open.spotify.com/playlist/4OX66FiDijqo5MlWTVoy1g' },
    { name: "Waist movement", url: 'https://open.spotify.com/playlist/51pkGMfzwe59EqEjdTfThR', cover: 'https://mosaic.scdn.co/300/ab67616d00001e020dd543b2587a6e8339515255ab67616d00001e020fe673891c29e46d15250043ab67616d00001e0276177fa0fa43d1d0bd9f0952ab67616d00001e02858785803750a872fb06fc9f' },
    { name: "Yachty 🛥️", url: 'https://open.spotify.com/playlist/3MnYTKEbGHJ3RiDwECaUde', cover: 'https://mosaic.scdn.co/300/ab67616d00001e0222c1ed233b0cf05345c29844ab67616d00001e025328c0cd8a6e36d2db440cabab67616d00001e0269a55478b66127cc62fedfa7ab67616d00001e029a0cbe7c93bc691f48f356ed' },
    { name: "🤘🏾🎸", url: 'https://open.spotify.com/playlist/47kNVlg7zzI5MAMg9taPUO', cover: 'https://i.scdn.co/image/ab67616d00001e026236778a208a15eb71079601' },
    { name: "Rock on the low", url: 'https://open.spotify.com/playlist/3cZ8beWgUGPQzE4adYw3VR', cover: 'https://mosaic.scdn.co/300/ab67616d00001e022b7bf864e7d5891878fbe41dab67616d00001e024227ecc26ca8bf1c09374171ab67616d00001e02b7ae984342eb0ef61b6781b2ab67616d00001e02d4d51209cb3d7da6b500918f' },
    { name: "Flow state", url: 'https://open.spotify.com/playlist/13PXeE2wuzGDJjQxkOrZHE', cover: 'https://i.scdn.co/image/ab67616d00001e02c61adbb5db3191376d7cde7a' },
    { name: "Yuhhh", url: 'https://open.spotify.com/playlist/7Gw9VeFbT2lS2bVrBtAU6d', cover: 'https://i.scdn.co/image/ab67616d00001e026a7e6ceda5e779fbb6ec1ba8' },
    { name: "Tron", url: 'https://open.spotify.com/playlist/19rzWADiCofGsx2Bkq59sv', cover: 'https://mosaic.scdn.co/300/ab67616d00001e023334c4cb108491bb678c07cdab67616d00001e0234728867efe405eb291581b6ab67616d00001e026810bf21ebf1f511857172e4ab67616d00001e02c1522814d0a38d17eeb9415e' },
  ],
};
