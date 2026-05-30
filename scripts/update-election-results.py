import sys, io, json, unicodedata
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

OFFICIAL = [
    ('Auckland Central',      'Chlöe Swarbrick',       'Green',     3896),
    ('Banks Peninsula',       'Vanessa Weenink',        'National',   396),
    ('Bay of Plenty',         'Tom Rutherford',         'National', 15405),
    ('Botany',                'Christopher Luxon',      'National', 16323),
    ('Christchurch Central',  'Duncan Webb',            'Labour',    1841),
    ('Christchurch East',     'Reuben Davidson',        'Labour',    2397),
    ('Coromandel',            'Scott Simpson',          'National', 17349),
    ('Dunedin',               'Rachel Brooking',        'Labour',    7980),
    ('East Coast',            'Dana Kirkpatrick',       'National',  3199),
    ('East Coast Bays',       'Erica Stanford',         'National', 20353),
    ('Epsom',                 'David Seymour',          'ACT',       8142),
    ('Hamilton East',         'Ryan Hamilton',          'National',  5060),
    ('Hamilton West',         'Tama Potaka',            'National',  6488),
    ('Hutt South',            'Chris Bishop',           'National',  1332),
    ('Ilam',                  'Hamish Campbell',        'National',  7830),
    ('Invercargill',          'Penny Simmonds',         'National',  9874),
    ('Kaikoura',              'Stuart Smith',           'National', 11412),
    ('Kaipara ki Mahurangi',  'Chris Penk',             'National', 19459),
    ('Kelston',               'Carmel Sepuloni',        'Labour',    4396),
    ('Mana',                  'Barbara Edmonds',        'Labour',    7324),
    ('Mangere',               'Lemauga Lydia Sosene',   'Labour',   11712),
    ('Manurewa',              'Arena Williams',         'Labour',    7113),
    ('Maungakiekie',          'Greg Fleming',           'National',  4617),
    ('Mt Albert',             'Helen White',            'Labour',      20),
    ('Mt Roskill',            'Carlos Cheung',          'National',  1564),
    ('Napier',                'Katie Nimon',            'National',  8909),
    ('Nelson',                'Rachel Boyack',          'Labour',      29),
    ('New Lynn',              'Paulo Garcia',           'National',  1013),
    ('New Plymouth',          'David MacLeod',          'National',  6991),
    ('North Shore',           'Simon Watts',            'National', 16330),
    ('Northcote',             'Dan Bidois',             'National',  9270),
    ('Northland',             'Grant McCallum',         'National',  6087),
    ('Ohariu',                'Greg O\'Connor',         'Labour',    1260),
    ('Otaki',                 'Tim Costley',            'National',  6271),
    ('Pakuranga',             'Simeon Brown',           'National', 18710),
    ('Palmerston North',      'Tangi Utikere',          'Labour',    3087),
    ('Panmure-Otahuhu',       'Jenny Salesa',           'Labour',    7970),
    ('Papakura',              'Judith Collins',         'National', 13519),
    ('Port Waikato',          None,                     None,           0),
    ('Rangitata',             'James Meager',           'National', 10846),
    ('Rangitikei',            'Suze Redmayne',          'National',  9785),
    ('Remutaka',              'Chris Hipkins',          'Labour',    8859),
    ('Rongotai',              'Julie Anne Genter',      'Green',     2717),
    ('Rotorua',               'Todd McClay',            'National',  8923),
    ('Selwyn',                'Nicola Grigg',           'National', 19782),
    ('Southland',             'Joseph Mooney',          'National', 17211),
    ('Taieri',                'Ingrid Leary',           'Labour',    1443),
    ('Takanini',              'Rima Nakhle',            'National',  8775),
    ('Tamaki',                'Brooke van Velden',      'ACT',       4158),
    ('Taranaki-King Country', 'Barbara Kuriger',        'National', 14355),
    ('Taupo',                 'Louise Upston',          'National', 16505),
    ('Tauranga',              'Sam Uffindell',          'National',  9370),
    ('Te Atatu',              'Phil Twyford',           'Labour',     131),
    ('Tukituki',              'Catherine Wedd',         'National', 10118),
    ('Upper Harbour',         'Cameron Brewer',         'National', 11192),
    ('Waikato',               'Tim van de Molen',       'National', 18548),
    ('Waimakariri',           'Matt Doocey',            'National', 13010),
    ('Wairarapa',             'Mike Butterick',         'National',  2816),
    ('Waitaki',               'Miles Anderson',         'National', 12151),
    ('Wellington Central',    'Tamatha Paul',           'Green',     6066),
    ('West Coast-Tasman',     'Maureen Pugh',           'National',  1017),
    ('Whanganui',             'Carl Bates',             'National',  5512),
    ('Whangaparaoa',          'Mark Mitchell',          'National', 23376),
    ('Whangarei',             'Shane Reti',             'National', 11424),
    ('Wigram',                'Megan Woods',            'Labour',    1179),
]

MAORI_OFFICIAL = [
    ('Hauraki-Waikato',  'Hana-Rawhiti Maipi-Clarke', 'Te Pati Maori',  2911),
    ('Ikaroa-Rawiti',    'Cushla Tangaere-Manuel',     'Labour',         2874),
    ('Tamaki Makaurau',  'Takutai Tarsh Kemp',         'Te Pati Maori',     4),
    ('Te Tai Hauauru',   'Debbie Ngarewa-Packer',      'Te Pati Maori',  9162),
    ('Te Tai Tokerau',   'Mariameno Kapa-Kingi',       'Te Pati Maori',   517),
    ('Te Tai Tonga',     'Takuta Ferris',              'Te Pati Maori',  2824),
    ('Waiariki',         'Rawiri Waititi',             'Te Pati Maori', 15891),
]

# 2023 name (ASCII-normed) -> 2025 boundary name (with proper Unicode)
NAME_2023_TO_2025 = {
    'bay of plenty':      'Mt Maunganui',
    'east coast':         'East Cape',
    'kelston':            'Glendene',
    'mana':               'Kenepuru',
    'ohariu':             'Wellington North',
    'otaki':              'Kapiti',
    'panmure-otahuhu':    'Otahuhu',   # will norm-match Ōtāhuhu
    'rongotai':           'Wellington Bays',
    'te atatu':           'Henderson',
    'new lynn':           'Waitakere',  # will norm-match Waitākere
    'wellington central': None,         # no 2025 equivalent; skip
}

def norm(s):
    s = s.replace('–', '-').replace('—', '-')
    return unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode().lower().strip()

with open('public/data/election-results-2023.json', encoding='utf-8') as f:
    current = json.load(f)

# Build norm-keyed index of current 2025-named electorates (for totalVotesCast etc.)
cur_by_norm = {norm(k): v for k, v in current['electorates'].items()}

# Also build a map from norm(2025 name) -> actual 2025 key
key_by_norm = {norm(k): k for k in current['electorates']}

new_elects = {}

for (name23_ascii, mp, party, margin_votes) in OFFICIAL:
    n = norm(name23_ascii)
    name25_ascii = NAME_2023_TO_2025.get(n)
    if name25_ascii is None and n in NAME_2023_TO_2025:
        print(f'SKIP: {name23_ascii}')
        continue

    # Find the actual 2025 key in current dict
    lookup = norm(name25_ascii) if name25_ascii else n
    name25_key = key_by_norm.get(lookup)
    if not name25_key:
        print(f'NO MATCH: {name23_ascii!r} -> lookup {lookup!r}')
        continue

    cur = cur_by_norm.get(norm(name25_key), {})
    total_cast = cur.get('totalVotesCast') or cur.get('validTotal')
    margin_pct = round(margin_votes / total_cast * 100, 1) if total_cast and margin_votes else None

    entry = {
        'type': 'general',
        'mp': mp,
        'party': party,
        'margin': margin_pct,
        'partyVote': {},
        'turnout':        cur.get('turnout'),
        'winnerPct':      cur.get('winnerPct'),
        'masterRoll':     cur.get('masterRoll'),
        'electoralPop':   cur.get('electoralPop'),
        'validTotal':     cur.get('validTotal'),
        'totalVotesCast': cur.get('totalVotesCast'),
    }
    if norm(name23_ascii) != norm(name25_key):
        entry['name2023'] = name23_ascii
    new_elects[name25_key] = entry

for (name23_ascii, mp, party, margin_votes) in MAORI_OFFICIAL:
    n = norm(name23_ascii)
    name25_key = key_by_norm.get(n)
    if not name25_key:
        print(f'MAORI NO MATCH: {name23_ascii!r}')
        continue
    cur = cur_by_norm.get(n, {})
    total_cast = cur.get('totalVotesCast') or cur.get('validTotal')
    margin_pct = round(margin_votes / total_cast * 100, 1) if total_cast and margin_votes else None

    # Fix party name to use proper Unicode
    party_unicode = party.replace('Te Pati Maori', 'Te Pāti Māori')
    new_elects[name25_key] = {
        'type': 'maori', 'mp': mp, 'party': party_unicode, 'margin': margin_pct,
        'partyVote': {},
        'turnout':      cur.get('turnout'),
        'winnerPct':    cur.get('winnerPct'),
        'masterRoll':   cur.get('masterRoll'),
        'electoralPop': cur.get('electoralPop'),
    }

out = {'national': current['national'], 'electorates': new_elects}
with open('public/data/election-results-2023.json', 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=2)

gen   = {k: v for k, v in new_elects.items() if v['type'] == 'general'}
maori = {k: v for k, v in new_elects.items() if v['type'] == 'maori'}
print(f'Written: {len(gen)} general + {len(maori)} Maori = {len(new_elects)} total')

checks = ['Ilam', 'Wellington Bays', 'Tamaki', 'Wellington North', 'Kapiti',
          'Waitakere', 'West Coast-Tasman', 'Tāmaki', 'Waitākere']
for name in checks:
    key = key_by_norm.get(norm(name))
    v = new_elects.get(key) if key else None
    if v:
        print(f'  {key}: {v["mp"]} ({v["party"]}) margin {v["margin"]}%')
    else:
        print(f'  {name}: NOT FOUND (key={key})')
