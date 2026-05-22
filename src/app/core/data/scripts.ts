export type GroupId = 'east' | 'sea' | 'indic' | 'me' | 'eu';

export interface ScriptInfo {
  id: string;
  group: GroupId;
  nameIt: string;
  nameEn: string;
  region: string;
  regionEn: string;
  lang: string;
  samples: string;
  sample: string;
  era: string;
  blurb: string;
}

export interface GroupInfo {
  id: GroupId;
  nameIt: string;
  nameEn: string;
  sample: string;
}

export const SCRIPTS: ReadonlyArray<ScriptInfo> = [
  { id: 'hiragana',   group: 'east',  nameIt: 'Hiragana',     nameEn: 'Hiragana',    region: 'Giappone',         regionEn: 'Japan',          lang: 'Giapponese',                 samples: 'あいうえおかきくけこさしすせそなのよはまね', sample: 'あ', era: 'IX sec. d.C.', blurb: 'Sillabario fonetico giapponese, sviluppato a partire da forme corsive di caratteri cinesi. Si distingue per le linee morbide e tondeggianti.' },
  { id: 'katakana',   group: 'east',  nameIt: 'Katakana',     nameEn: 'Katakana',    region: 'Giappone',         regionEn: 'Japan',          lang: 'Giapponese',                 samples: 'アイウエオカキクケコサシスセソタチツテト', sample: 'ア', era: 'IX sec. d.C.', blurb: 'Sillabario giapponese usato soprattutto per parole straniere e onomatopee. Forme angolari, derivate da frammenti di caratteri cinesi.' },
  { id: 'hanzi',      group: 'east',  nameIt: 'Cinese',       nameEn: 'Chinese',     region: 'Cina',             regionEn: 'China',          lang: 'Cinese',                     samples: '字人山川木日月火水土中文字心目耳手', sample: '字', era: '~1200 a.C.', blurb: 'Caratteri logografici, ciascuno rappresenta una sillaba o un’idea. Migliaia di glifi in uso quotidiano.' },
  { id: 'hangul',     group: 'east',  nameIt: 'Coreano',      nameEn: 'Korean',      region: 'Corea',            regionEn: 'Korea',          lang: 'Coreano',                    samples: '가나다라마바사아자차카타파하한국글', sample: '한', era: '1443 d.C.', blurb: 'Alfabeto coreano (Hangul), inventato per essere imparato in un giorno. I caratteri si compongono in blocchi sillabici.' },

  { id: 'thai',       group: 'sea',   nameIt: 'Thailandese',  nameEn: 'Thai',        region: 'Thailandia',       regionEn: 'Thailand',       lang: 'Thai',                       samples: 'กขคงจฉชญฎฏฐดตถทนบปผพภมยรลวสหอ', sample: 'ก', era: '1283 d.C.', blurb: 'Abugida thailandese: lettere consonantiche con segni vocalici sopra, sotto e a lato. Tipici i “loop” iniziali.' },
  { id: 'lao',        group: 'sea',   nameIt: 'Lao',          nameEn: 'Lao',         region: 'Laos',             regionEn: 'Laos',           lang: 'Lao',                        samples: 'ກຂຄງຈສຊຍດຕຖທນບປຜຝພຟມຍຣລວຫອຮ', sample: 'ກ', era: 'XIV sec.', blurb: 'Imparentato col thai, con forme un po’ piu’ tondeggianti. Pochi grafemi rispetto al thai.' },
  { id: 'khmer',      group: 'sea',   nameIt: 'Khmer',        nameEn: 'Khmer',       region: 'Cambogia',         regionEn: 'Cambodia',       lang: 'Khmer',                      samples: 'កខគឃងចឆជឈញដឋឌណតថទធនបផពភមយរលវសហអ', sample: 'ក', era: 'VII sec.', blurb: 'Alfabeto della Cambogia, derivato dall’antica scrittura Pallava. Si riconosce per la complessita’ verticale dei subscript.' },

  { id: 'devanagari', group: 'indic', nameIt: 'Devanagari',   nameEn: 'Devanagari',  region: 'India / Nepal',    regionEn: 'India / Nepal',  lang: 'Hindi, Sanscrito, Nepalese', samples: 'अआइईउऊऋएऐओऔकखगघचछजझञटठडढणतथदधनपफबभमयरलवशषसह', sample: 'य', era: '~VII sec.', blurb: 'Scrittura piu’ diffusa del subcontinente indiano. Riconoscibile dalla linea orizzontale superiore (शिरोरेखा) che lega le lettere.' },
  { id: 'bengali',    group: 'indic', nameIt: 'Bengalese',    nameEn: 'Bengali',     region: 'Bengala',          regionEn: 'Bengal',         lang: 'Bengalese, Assamese',        samples: 'অআইঈউঊঋএঐওঔকখগঘঙচছজঝঞটঠডঢণতথদধনপফবভমযরলশষসহ', sample: 'অ', era: '~XI sec.', blurb: 'Anch’essa con linea superiore, ma con curve piu’ morbide e archi caratteristici rispetto al devanagari.' },
  { id: 'tamil',      group: 'indic', nameIt: 'Tamil',        nameEn: 'Tamil',       region: 'Tamil Nadu',       regionEn: 'Tamil Nadu',     lang: 'Tamil',                      samples: 'அஆஇஈஉஊஎஏஐஒஓகஙசஞடணதநபமயரலவழளறன', sample: 'அ', era: '~III sec. a.C.', blurb: 'Linee tonde, niente linea superiore, pochi conjunct. Una delle scritture piu’ antiche ancora in uso.' },
  { id: 'gurmukhi',   group: 'indic', nameIt: 'Gurmukhi',     nameEn: 'Gurmukhi',    region: 'Punjab',           regionEn: 'Punjab',         lang: 'Punjabi',                    samples: 'ਅਆਇਈਉਊਏਐਓਔਕਖਗਘਙਚਛਜਝਞਟਠਡਢਣਤਥਦਧਨਪਫਬਭਮਯਰਲਵਸ਼ਸਹ', sample: 'ਪ', era: 'XVI sec.', blurb: 'Sviluppata per la liturgia sikh. Linea superiore presente; forme piu’ squadrate del devanagari.' },

  { id: 'arabic',     group: 'me',    nameIt: 'Arabo',        nameEn: 'Arabic',      region: 'Arabia',           regionEn: 'Arabia',         lang: 'Arabo, Persiano, Urdu',      samples: 'اببتثجحخدذرزسشصضطظعغفقكلمنهوي', sample: 'ش', era: 'IV sec. d.C.', blurb: 'Scrittura cursiva da destra a sinistra. Quasi tutte le lettere cambiano forma a seconda della posizione (iniziale/mediale/finale/isolata).' },
  { id: 'hebrew',     group: 'me',    nameIt: 'Ebraico',      nameEn: 'Hebrew',      region: 'Israele',          regionEn: 'Israel',         lang: 'Ebraico, Yiddish',           samples: 'אבגדהוזחטיכלמנסעפצקרשת', sample: 'א', era: '~III sec. a.C.', blurb: 'Da destra a sinistra. Lettere squadrate, alcune con forma diversa quando finali (es. מ / ם).' },

  { id: 'greek',      group: 'eu',    nameIt: 'Greco',        nameEn: 'Greek',       region: 'Grecia',           regionEn: 'Greece',         lang: 'Greco',                      samples: 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩαβγδεζηθικλμνξοπρστυφχψω', sample: 'Ω', era: '~VIII sec. a.C.', blurb: 'Antenata diretta di latino e cirillico. Riconoscibile da Φ, Ψ, Ω e dalle minuscole tonde.' },
  { id: 'cyrillic',   group: 'eu',    nameIt: 'Cirillico',    nameEn: 'Cyrillic',    region: 'Russia / Slavi',   regionEn: 'Russia / Slavs', lang: 'Russo, Ucraino, Bulgaro',    samples: 'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ', sample: 'Ж', era: 'IX sec. d.C.', blurb: 'Derivata dal greco onciale. Caratteri distintivi: Ж, Я, Ы, Ю.' },
  { id: 'armenian',   group: 'eu',    nameIt: 'Armeno',       nameEn: 'Armenian',    region: 'Armenia',          regionEn: 'Armenia',        lang: 'Armeno',                     samples: 'ԱԲԳԴԵԶԷԸԹԺԻԼԽԾԿՀՁՂՃՄՅՆՇՈՉՊՋՌՍՎՏՐՑՒՓՔ', sample: 'Հ', era: '405 d.C.', blurb: 'Creata da Mesrop Mashtots. Linee verticali marcate e archi caratteristici.' },
  { id: 'georgian',   group: 'eu',    nameIt: 'Georgiano',    nameEn: 'Georgian',    region: 'Georgia',          regionEn: 'Georgia',        lang: 'Georgiano',                  samples: 'აბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰ', sample: 'ლ', era: '~IV sec.', blurb: 'Mkhedruli, l’alfabeto moderno. Linee tondeggianti, niente maiuscole/minuscole.' },
];

export const GROUPS: ReadonlyArray<GroupInfo> = [
  { id: 'east',  nameIt: 'Asia orientale',   nameEn: 'East Asian',       sample: '字' },
  { id: 'sea',   nameIt: 'Sud-est asiatico', nameEn: 'Southeast Asian',  sample: 'ก' },
  { id: 'indic', nameIt: 'Indiane',          nameEn: 'Indic',            sample: 'य' },
  { id: 'me',    nameIt: 'Mediorientali',    nameEn: 'Middle Eastern',   sample: 'ش' },
  { id: 'eu',    nameIt: 'Europee',          nameEn: 'European',         sample: 'Ω' },
];

export const ALL_SCRIPT_IDS: ReadonlyArray<string> = SCRIPTS.map((s) => s.id);

export function scriptById(id: string): ScriptInfo | undefined {
  return SCRIPTS.find((s) => s.id === id);
}

export function scriptsByGroup(gid: GroupId): ScriptInfo[] {
  return SCRIPTS.filter((s) => s.group === gid);
}
