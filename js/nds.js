// Liest NDS-ROMs und -Spielstände der 4. Generation (Diamant/Perl/Platin/HeartGold/SoulSilver) und der 5. Generation
// (Schwarz/Weiß/Schwarz 2/Weiß 2), auch ROM-Hacks mit gleichem Aufbau (z. B. Renegade Platinum, Blaze Black 2).
// ROM: Dateisystem (NitroFS) -> NARC-Archive -> Basiswerte, Attacken, Lernsets, Trainer, Texte. Spielstand: wie PKHeX.
// Quellen der Formate: pokeplatinum/pokeheartgold (Decompilation), Universal Pokémon Randomizer ZX, PKHeX.
(function () {
  'use strict';
  var G3 = window.GEN3;

  function u16(b, o) { return b[o] | (b[o + 1] << 8); }
  function u32(b, o) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; }
  function ascii(b, o, n) { var s = ''; for (var i = 0; i < n; i++) s += String.fromCharCode(b[o + i]); return s; }
  function bytesOf(buf) { return buf instanceof Uint8Array ? buf : new Uint8Array(buf); }

  // ======================= text =======================
  // Gen 4 character table (0x000–0x1EC, as PKHeX) and the Korean block from 0x400
  var G4TAB = ["","　","ぁ","あ","ぃ","い","ぅ","う","ぇ","え","ぉ","お","か","が","き","ぎ","く","ぐ","け","げ","こ","ご","さ","ざ","し","じ","す","ず","せ","ぜ","そ","ぞ","た","だ","ち","ぢ","っ","つ","づ","て","で","と","ど","な","に","ぬ","ね","の","は","ば","ぱ","ひ","び","ぴ","ふ","ぶ","ぷ","へ","べ","ぺ","ほ","ぼ","ぽ","ま","み","む","め","も","ゃ","や","ゅ","ゆ","ょ","よ","ら","り","る","れ","ろ","わ","を","ん","ァ","ア","ィ","イ","ゥ","ウ","ェ","エ","ォ","オ","カ","ガ","キ","ギ","ク","グ","ケ","ゲ","コ","ゴ","サ","ザ","シ","ジ","ス","ズ","セ","ゼ","ソ","ゾ","タ","ダ","チ","ヂ","ッ","ツ","ヅ","テ","デ","ト","ド","ナ","ニ","ヌ","ネ","ノ","ハ","バ","パ","ヒ","ビ","ピ","フ","ブ","プ","ヘ","ベ","ペ","ホ","ボ","ポ","マ","ミ","ム","メ","モ","ャ","ヤ","ュ","ユ","ョ","ヨ","ラ","リ","ル","レ","ロ","ワ","ヲ","ン","０","１","２","３","４","５","６","７","８","９","Ａ","Ｂ","Ｃ","Ｄ","Ｅ","Ｆ","Ｇ","Ｈ","Ｉ","Ｊ","Ｋ","Ｌ","Ｍ","Ｎ","Ｏ","Ｐ","Ｑ","Ｒ","Ｓ","Ｔ","Ｕ","Ｖ","Ｗ","Ｘ","Ｙ","Ｚ","ａ","ｂ","ｃ","ｄ","ｅ","ｆ","ｇ","ｈ","ｉ","ｊ","ｋ","ｌ","ｍ","ｎ","ｏ","ｐ","ｑ","ｒ","ｓ","ｔ","ｕ","ｖ","ｗ","ｘ","ｙ","ｚ","","！","？","、","。","…","・","／","「","」","『","』","（","）","♂","♀","＋","ー","×","÷","＝","～","：","；","．","，","♠","♣","♥","♦","★","◎","○","□","△","◇","＠","♪","％","☀","☁","☂","☃","①","②","③","④","⑤","⑥","⑦","円","♈","♉","♊","♋","♌","♍","♎","♏","←","↑","↓","→","►","&","0","1","2","3","4","5","6","7","8","9","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z","a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z","À","Á","Â","Ã","Ä","Å","Æ","Ç","È","É","Ê","Ë","Ì","Í","Î","Ï","Ð","Ñ","Ò","Ó","Ô","Õ","Ö","×","Ø","Ù","Ú","Û","Ü","Ý","Þ","ß","à","á","â","ã","ä","å","æ","ç","è","é","ê","ë","ì","í","î","ï","ð","ñ","ò","ó","ô","õ","ö","÷","ø","ù","ú","û","ü","ý","þ","ÿ","Œ","œ","Ş","ş","ª","º","ᵉʳ","ʳᵉ","ʳ","$","¡","¿","!","?",",",".","…","·","/","‘","'","“","”","„","«","»","(",")","♂","♀","+","-","*","#","=","&","~",":",";","⑯","⑰","⑱","⑲","⑳","⑴","⑵","⑶","⑷","⑸","@","⑹","%","⑺","⑻","⑼","⑽","⑾","⑿","⒀","⒁","⒂","⒃","⒄"," ","⒅","⒆","⒇","⒈","⒉","⒊","⒋","⒌","⒍","°","_","＿","⒎","⒏"];
  var G4KO = "\u0000가각간\u0000갈\u0000\u0000감갑\u0000\u0000\u0000강\u0000\u0000\u0000갚\u0000개객\u0000갤\u0000\u0000\u0000\u0000갱갸\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000거\u0000건\u0000걸\u0000검겁\u0000\u0000\u0000\u0000\u0000\u0000\u0000게\u0000겔\u0000\u0000겟\u0000\u0000\u0000격\u0000\u0000\u0000결\u0000\u0000\u0000\u0000경\u0000계\u0000\u0000\u0000\u0000고\u0000곤\u0000골\u0000\u0000\u0000곰\u0000\u0000공\u0000과\u0000관\u0000\u0000\u0000\u0000\u0000광\u0000\u0000\u0000\u0000\u0000\u0000괴\u0000\u0000\u0000\u0000\u0000\u0000\u0000교\u0000\u0000\u0000\u0000구\u0000군굳굴굵\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000권\u0000\u0000\u0000\u0000\u0000귀\u0000\u0000\u0000\u0000\u0000\u0000규\u0000\u0000그\u0000근\u0000글\u0000금급\u0000\u0000\u0000기\u0000\u0000\u0000길\u0000김깁깃깅\u0000\u0000까깍\u0000\u0000\u0000\u0000깜깝\u0000\u0000\u0000\u0000깨\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000꺽\u0000\u0000\u0000\u0000껍껏\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000꼬\u0000\u0000\u0000꼴\u0000\u0000\u0000\u0000\u0000꽃\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000꾸\u0000\u0000꿀\u0000꿈\u0000\u0000\u0000\u0000꿔\u0000\u0000\u0000꿰\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000끈\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000끼\u0000\u0000\u0000\u0000\u0000\u0000\u0000나\u0000낚난\u0000날낡\u0000남\u0000\u0000\u0000\u0000\u0000\u0000\u0000낳내\u0000\u0000\u0000냄\u0000\u0000\u0000냉\u0000\u0000\u0000\u0000\u0000냥너\u0000\u0000\u0000널\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000네\u0000\u0000\u0000\u0000\u0000넷\u0000\u0000\u0000\u0000\u0000\u0000념\u0000\u0000\u0000\u0000\u0000\u0000노녹논놀\u0000놈\u0000\u0000농\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000뇽누\u0000눈\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000느\u0000는늘\u0000\u0000\u0000\u0000\u0000능\u0000늪\u0000\u0000\u0000니닉닌\u0000\u0000\u0000\u0000\u0000\u0000\u0000다닥\u0000단\u0000달\u0000\u0000\u0000\u0000담\u0000닷\u0000당\u0000\u0000\u0000대\u0000댄\u0000\u0000\u0000\u0000\u0000\u0000\u0000더덕\u0000던\u0000\u0000\u0000\u0000\u0000\u0000\u0000덩\u0000\u0000데\u0000\u0000델\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000도독돈\u0000돌\u0000\u0000\u0000\u0000\u0000동\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000두둑둔\u0000둠\u0000\u0000둥\u0000뒀\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000드\u0000\u0000\u0000들\u0000\u0000\u0000\u0000등\u0000디\u0000딘\u0000딜\u0000딥딧\u0000\u0000\u0000따딱\u0000딸\u0000\u0000\u0000\u0000땅\u0000때\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000떨\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000또\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000뚜뚝\u0000뚤뚫\u0000\u0000\u0000뛰\u0000\u0000\u0000\u0000\u0000뜨\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000띠\u0000\u0000\u0000\u0000\u0000\u0000라락란랄람\u0000\u0000\u0000랑\u0000\u0000\u0000래\u0000랜\u0000램랩\u0000\u0000랭\u0000\u0000\u0000\u0000\u0000러럭런\u0000\u0000\u0000\u0000\u0000렁\u0000레렉렌\u0000\u0000\u0000렛\u0000려력\u0000\u0000\u0000\u0000\u0000\u0000령례\u0000\u0000\u0000로록\u0000롤\u0000롭\u0000롱\u0000\u0000\u0000\u0000뢰\u0000\u0000\u0000\u0000\u0000\u0000료\u0000\u0000\u0000\u0000룡루\u0000\u0000룰룸\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000류륙\u0000\u0000\u0000\u0000\u0000\u0000르\u0000른\u0000름\u0000\u0000\u0000\u0000\u0000릎리릭린릴림\u0000릿링마막만\u0000\u0000말\u0000\u0000맘\u0000맛망맞\u0000\u0000매맥맨\u0000\u0000맵\u0000\u0000맹\u0000\u0000\u0000\u0000\u0000머먹\u0000멀\u0000\u0000\u0000\u0000멍\u0000\u0000메\u0000멘멜멤\u0000멧\u0000\u0000\u0000\u0000면멸\u0000\u0000명\u0000\u0000모목\u0000몬\u0000\u0000몸\u0000\u0000몽\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000무묵묶문\u0000물\u0000\u0000\u0000\u0000\u0000뭉\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000뮤\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000미믹민\u0000밀\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000바박\u0000\u0000반받발\u0000\u0000밟밤밥\u0000방\u0000배백밴\u0000뱀\u0000뱃\u0000\u0000\u0000\u0000\u0000\u0000\u0000버벅번\u0000벌\u0000범법\u0000\u0000\u0000베\u0000벤\u0000벨\u0000\u0000\u0000\u0000\u0000\u0000벽변별\u0000\u0000\u0000병\u0000\u0000\u0000보복\u0000본볼봄\u0000\u0000봉\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000부북분\u0000불\u0000\u0000붐\u0000\u0000붕\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000뷰\u0000\u0000\u0000\u0000\u0000브\u0000\u0000블\u0000\u0000\u0000비\u0000빈빌\u0000빔\u0000\u0000빙\u0000빛\u0000\u0000\u0000빨\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000뺨뻐\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000뼈\u0000\u0000\u0000\u0000\u0000\u0000뽀\u0000\u0000\u0000뽐\u0000\u0000\u0000\u0000\u0000뿌\u0000\u0000뿔뿜\u0000뿡\u0000\u0000쁘쁜\u0000\u0000\u0000삐\u0000\u0000\u0000\u0000\u0000\u0000\u0000사\u0000\u0000산\u0000살\u0000\u0000삼\u0000\u0000\u0000상\u0000새색\u0000\u0000샘\u0000\u0000\u0000생샤\u0000\u0000\u0000\u0000\u0000\u0000\u0000섀\u0000\u0000\u0000\u0000서석\u0000\u0000선\u0000설\u0000\u0000\u0000\u0000섯\u0000성\u0000세섹\u0000셀\u0000\u0000\u0000\u0000\u0000셔\u0000\u0000셜\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000소속\u0000손솔\u0000솜\u0000\u0000송\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000쇠\u0000\u0000\u0000\u0000\u0000쇼\u0000\u0000\u0000\u0000\u0000숏\u0000수숙순숟술숨\u0000\u0000숭\u0000\u0000숲\u0000\u0000쉐\u0000\u0000쉘\u0000\u0000쉬\u0000\u0000\u0000\u0000\u0000\u0000\u0000슈\u0000\u0000\u0000\u0000슝스\u0000\u0000슬\u0000\u0000습\u0000승시식신\u0000실싫심\u0000싯\u0000\u0000싸\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000쌩\u0000\u0000\u0000썬\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000쏘\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000쐐\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000쓰\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000씨\u0000\u0000\u0000\u0000\u0000\u0000\u0000아악안\u0000않알\u0000\u0000\u0000암압\u0000\u0000\u0000\u0000앞애액앤\u0000\u0000앱\u0000\u0000앵야약\u0000\u0000\u0000\u0000\u0000\u0000양\u0000\u0000\u0000\u0000\u0000\u0000어억언\u0000\u0000얼\u0000\u0000엄업없\u0000\u0000엉\u0000\u0000\u0000에\u0000\u0000엘엠\u0000\u0000\u0000여역\u0000연열\u0000\u0000염\u0000\u0000\u0000\u0000영\u0000\u0000\u0000예\u0000\u0000\u0000\u0000\u0000\u0000오옥온\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000옹\u0000와\u0000\u0000왈\u0000\u0000\u0000\u0000왕\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000요\u0000\u0000\u0000\u0000\u0000\u0000용우\u0000운울\u0000\u0000움\u0000\u0000웅워\u0000원\u0000\u0000\u0000\u0000\u0000웨\u0000\u0000\u0000\u0000웹\u0000위\u0000윈\u0000\u0000\u0000\u0000\u0000유육윤\u0000\u0000\u0000\u0000\u0000\u0000으\u0000은을\u0000음\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000의\u0000\u0000\u0000\u0000이\u0000인일\u0000\u0000\u0000임입\u0000있잉\u0000잎자작잔\u0000\u0000잘\u0000잠\u0000\u0000\u0000장\u0000재\u0000\u0000\u0000잼\u0000\u0000\u0000쟁쟈\u0000\u0000\u0000\u0000\u0000쟝\u0000\u0000\u0000저적전절\u0000점\u0000\u0000정\u0000제\u0000젠젤젬\u0000\u0000\u0000져\u0000\u0000\u0000\u0000\u0000\u0000\u0000조\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000좋\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000죤\u0000주죽\u0000줄\u0000\u0000\u0000\u0000\u0000중\u0000\u0000\u0000쥐\u0000\u0000\u0000\u0000\u0000\u0000쥬\u0000\u0000\u0000즈\u0000즌\u0000\u0000\u0000\u0000\u0000지직진\u0000질\u0000\u0000집짓징짖\u0000\u0000짜짝\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000짱째\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000쪼\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000찌찍\u0000\u0000\u0000찝\u0000\u0000\u0000차\u0000\u0000\u0000\u0000참\u0000\u0000\u0000창\u0000채\u0000\u0000\u0000챔\u0000\u0000\u0000챙챠\u0000\u0000\u0000\u0000\u0000처\u0000천철\u0000첩\u0000\u0000청체\u0000\u0000\u0000\u0000\u0000\u0000\u0000쳐\u0000\u0000\u0000\u0000\u0000초\u0000\u0000\u0000\u0000촙\u0000총\u0000\u0000\u0000\u0000최\u0000\u0000\u0000\u0000\u0000\u0000쵸\u0000추축\u0000출춤\u0000\u0000충\u0000\u0000\u0000\u0000취\u0000\u0000\u0000\u0000\u0000\u0000츄\u0000\u0000\u0000\u0000츠\u0000\u0000\u0000\u0000\u0000\u0000\u0000치\u0000친\u0000칠\u0000침\u0000\u0000\u0000카\u0000칸칼캄\u0000\u0000\u0000캐\u0000\u0000\u0000\u0000\u0000\u0000\u0000캥\u0000\u0000\u0000커\u0000\u0000\u0000컬\u0000\u0000컷\u0000컹케\u0000켄켈\u0000\u0000켓\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000코\u0000콘콜콤\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000쾌\u0000\u0000\u0000\u0000쿠\u0000쿤\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000퀴퀵퀸\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000크\u0000큰클\u0000\u0000\u0000키킥\u0000킬\u0000\u0000\u0000킹타탁탄탈\u0000탐\u0000\u0000\u0000탕태택\u0000\u0000\u0000\u0000\u0000\u0000탱\u0000\u0000터\u0000턴털\u0000텀\u0000\u0000\u0000텅테텍\u0000텔\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000토톡톤\u0000톰톱\u0000통\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000투\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000튀\u0000\u0000\u0000\u0000\u0000\u0000튜\u0000\u0000\u0000\u0000트\u0000튼\u0000틀\u0000틈\u0000\u0000\u0000\u0000\u0000\u0000\u0000티틱\u0000틸\u0000\u0000\u0000\u0000파\u0000\u0000판팔\u0000팜\u0000\u0000\u0000팡\u0000패팩팬\u0000\u0000\u0000\u0000\u0000팽\u0000\u0000퍼퍽펀펄펌\u0000\u0000\u0000\u0000페펙펜\u0000\u0000\u0000펫\u0000\u0000편\u0000\u0000\u0000\u0000평\u0000\u0000\u0000\u0000포폭폰폴\u0000\u0000\u0000퐁\u0000\u0000\u0000\u0000표\u0000\u0000\u0000\u0000푸\u0000푼\u0000풀\u0000품\u0000\u0000풍\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000프\u0000플픔\u0000\u0000피픽핀필\u0000\u0000\u0000핑하학한할핥함합핫항해\u0000핸\u0000햄\u0000햇\u0000행\u0000향허\u0000헌\u0000\u0000험\u0000\u0000\u0000헤\u0000\u0000헬\u0000\u0000\u0000\u0000\u0000\u0000\u0000혈\u0000\u0000\u0000\u0000형혜\u0000\u0000\u0000호혹혼홀\u0000\u0000\u0000\u0000홍\u0000화\u0000환활\u0000\u0000\u0000\u0000\u0000\u0000\u0000회\u0000\u0000\u0000\u0000\u0000\u0000효\u0000\u0000\u0000\u0000후\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000휘\u0000\u0000\u0000\u0000휩\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000흉\u0000흑흔\u0000\u0000\u0000흙\u0000흡\u0000\u0000\u0000희흰\u0000\u0000\u0000\u0000히\u0000\u0000힐힘";
  function g4char(c) {
    if (c < G4TAB.length) return G4TAB[c];
    if (c >= 0x400 && c - 0x400 < G4KO.length) { var ch = G4KO.charAt(c - 0x400); return ch === '\u0000' ? '' : ch; }
    return '';
  }
  // Gen 4 string from a save (u16 codes until 0xFFFF)
  function g4str(u8, off, max) {
    var s = '';
    for (var i = 0; i < max && off + i * 2 + 1 < u8.length; i++) {
      var c = u16(u8, off + i * 2);
      if (c === 0xFFFF || c === 0) break;
      s += g4char(c);
    }
    return s;
  }
  var G5MAP = { 0x2467: '×', 0x2468: '÷', 0x246C: '…', 0x246D: '♂', 0x246E: '♀' };
  function g5char(c) { return G5MAP[c] || (c >= 0x20 && c < 0xD800 || c >= 0xE000 && c < 0xF000 || c > 0xFF00 && c < 0xFFF0 ? String.fromCharCode(c) : ''); }
  // Gen 5 string from a save (UTF-16 until 0xFFFF or 0)
  function g5str(u8, off, max) {
    var s = '';
    for (var i = 0; i < max && off + i * 2 + 1 < u8.length; i++) {
      var c = u16(u8, off + i * 2);
      if (c === 0xFFFF || c === 0) break;
      s += g5char(c);
    }
    return s;
  }
  // 9-bit packed text (rare, marked by 0xF100)
  function unpack9(codes) {
    var out = [], acc = 0, bits = 0;
    for (var i = 1; i < codes.length; i++) {
      acc |= codes[i] << bits; bits += 16;
      while (bits >= 9) { var v = acc & 0x1FF; acc >>>= 9; bits -= 9; if (v === 0x1FF) return out; out.push(v); }
    }
    return out;
  }
  function g4decode(codes) {
    if (codes[0] === 0xF100) codes = unpack9(codes);
    var s = '';
    for (var i = 0; i < codes.length; i++) {
      var c = codes[i];
      if (c === 0xFFFF) break;
      if (c === 0xFFFE) { i += 1 + (codes[i + 2] || 0) + 1; s += ' '; continue; } // variable: code, count, args
      if (c === 0xE000 || c === 0x25BC || c === 0x25BD) { s += ' '; continue; }
      s += g4char(c);
    }
    return s.replace(/\s+/g, ' ').trim();
  }
  function g5decode(codes) {
    if (codes[0] === 0xF100) codes = unpack9(codes);
    var s = '';
    for (var i = 0; i < codes.length; i++) {
      var c = codes[i];
      if (c === 0xFFFF) break;
      if (c === 0xF000) { i += 1 + (codes[i + 2] || 0) + 1; s += ' '; continue; }
      if (c === 0xFFFE || c === 0xF001) { s += ' '; continue; }
      s += g5char(c);
    }
    return s.replace(/\s+/g, ' ').trim();
  }
  // a message file of Gen 4 (keys per entry, pokeplatinum src/message.c)
  function g4texts(f) {
    if (!f || f.length < 4) return [];
    var n = u16(f, 0), key = (u16(f, 2) * 0x2FD) & 0xFFFF, out = [];
    if (4 + n * 8 > f.length) return [];
    for (var i = 0; i < n; i++) {
      var k2 = (key * (i + 1)) & 0xFFFF, rk = (k2 | (k2 << 16)) >>> 0;
      var off = (u32(f, 4 + i * 8) ^ rk) >>> 0, len = (u32(f, 8 + i * 8) ^ rk) >>> 0;
      if (off + len * 2 > f.length || len > 0x4000) { out.push(''); continue; }
      var ck = (0x91BD3 * (i + 1)) & 0xFFFF, codes = new Array(len);
      for (var j = 0; j < len; j++) { codes[j] = u16(f, off + j * 2) ^ ck; ck = (ck + 0x493D) & 0xFFFF; }
      out.push(g4decode(codes));
    }
    return out;
  }
  // a message file of Gen 5 (first language section; each entry keyed from its last character)
  function g5texts(f) {
    if (!f || f.length < 16) return [];
    var nSec = u16(f, 0), n = u16(f, 2), out = [];
    if (!nSec) return [];
    var so = u32(f, 12);
    if (so + 4 + n * 8 > f.length) return [];
    for (var j = 0; j < n; j++) {
      var e = so + 4 + j * 8, p = so + u32(f, e), len = u16(f, e + 4);
      if (!len || p + len * 2 > f.length) { out.push(''); continue; }
      var key = u16(f, p + (len - 1) * 2) ^ 0xFFFF, codes = new Array(len);
      for (var k = len - 1; k >= 0; k--) { codes[k] = u16(f, p + k * 2) ^ key; key = ((key >>> 3) | (key << 13)) & 0xFFFF; }
      out.push(g5decode(codes));
    }
    return out;
  }

  // ======================= NDS file system and archives =======================
  function isNds(buf) {
    var u8 = bytesOf(buf);
    return u8.length > 0x200 && u16(u8, 0x15C) === 0xCF56;
  }
  // file by path (e.g. "a/0/1/6" or "poketool/personal/personal.narc") from the NitroFS name table
  function nitroFile(u8, path) {
    var fnt = u32(u8, 0x40), fat = u32(u8, 0x48), parts = path.split('/'), dir = 0;
    for (var i = 0; i < parts.length; i++) {
      var e = fnt + dir * 8, p = fnt + u32(u8, e), fid = u16(u8, e + 4), next = -1;
      for (var guard = 0; guard < 65536; guard++) {
        var b = u8[p++];
        if (!b) break;
        var len = b & 0x7F, name = ascii(u8, p, len);
        p += len;
        if (b & 0x80) { var sub = u16(u8, p); p += 2; if (name === parts[i] && i < parts.length - 1) { next = sub & 0xFFF; break; } }
        else { if (name === parts[i] && i === parts.length - 1) { var s = u32(u8, fat + fid * 8), en = u32(u8, fat + fid * 8 + 4); return en > s && en <= u8.length ? u8.subarray(s, en) : null; } fid++; }
      }
      if (next < 0) return null;
      dir = next;
    }
    return null;
  }
  // LZ10/LZ11 (some hacks compress archives)
  function lzDecompress(src) {
    var type = src[0], size = (src[1] | (src[2] << 8) | (src[3] << 16)) >>> 0, p = 4;
    if (!size) { size = u32(src, 4); p = 8; }
    if (size > 0x4000000) return null;
    var out = new Uint8Array(size), o = 0;
    while (o < size && p < src.length) {
      var flags = src[p++];
      for (var bit = 7; bit >= 0 && o < size; bit--) {
        if (!(flags & (1 << bit))) { out[o++] = src[p++]; continue; }
        var len, disp;
        if (type === 0x10) { var b1 = src[p++], b2 = src[p++]; len = (b1 >> 4) + 3; disp = (((b1 & 0xF) << 8) | b2) + 1; }
        else {
          var a = src[p++], ind = a >> 4;
          if (ind === 0) { var x = src[p++], y = src[p++]; len = ((a << 4) | (x >> 4)) + 0x11; disp = (((x & 0xF) << 8) | y) + 1; }
          else if (ind === 1) { var x1 = src[p++], x2 = src[p++], x3 = src[p++]; len = (((a & 0xF) << 12) | (x1 << 4) | (x2 >> 4)) + 0x111; disp = (((x2 & 0xF) << 8) | x3) + 1; }
          else { var z = src[p++]; len = ind + 1; disp = (((a & 0xF) << 8) | z) + 1; }
        }
        if (disp > o) return null;
        for (var k = 0; k < len && o < size; k++) { out[o] = out[o - disp]; o++; }
      }
    }
    return out;
  }
  // files of a NARC archive
  function narc(f) {
    if (!f) return null;
    if (ascii(f, 0, 4) !== 'NARC' && (f[0] === 0x10 || f[0] === 0x11)) { var d = lzDecompress(f); if (d) f = d; }
    if (ascii(f, 0, 4) !== 'NARC') return null;
    var p = u16(f, 12) || 0x10, frames = {};
    for (var i = 0; i < 3 && p + 8 <= f.length; i++) { var size = u32(f, p + 4); frames[ascii(f, p, 4)] = p; if (size < 8) break; p += size; }
    var fatb = frames.BTAF, fimg = frames.GMIF;
    if (fatb == null || fimg == null) return null;
    var n = u32(f, fatb + 8), base = fimg + 8, files = [];
    for (var k = 0; k < n; k++) {
      var s = u32(f, fatb + 12 + k * 8), e = u32(f, fatb + 16 + k * 8);
      files.push(base + e <= f.length && e >= s ? f.subarray(base + s, base + e) : new Uint8Array(0));
    }
    return files;
  }

  // ======================= games =======================
  var GAME4 = {
    ADA: ['Diamant', 'Diamond', 'DP'], APA: ['Perl', 'Pearl', 'DP'], CPU: ['Platin', 'Platinum', 'Pt'],
    IPK: ['HeartGold', 'HeartGold', 'HGSS'], IPG: ['SoulSilver', 'SoulSilver', 'HGSS']
  };
  var GAME5 = { IRB: ['Schwarz', 'Black', 'BW'], IRA: ['Weiß', 'White', 'BW'], IRE: ['Schwarz 2', 'Black 2', 'B2W2'], IRD: ['Weiß 2', 'White 2', 'B2W2'] };
  var LANGS = { D: 'DE', E: 'EN', O: 'EN', P: 'EN', F: 'FR', I: 'IT', S: 'ES', J: 'JP', K: 'KO' };
  // archives and text banks (trainer names, trainer classes, moves, abilities, items) per game type and region
  var FILES = {
    DP: { personal: 'poketool/personal/personal.narc', moves: 'poketool/waza/waza_tbl.narc', learn: 'poketool/personal/wotbl.narc',
      trdata: 'poketool/trainer/trdata.narc', trpoke: 'poketool/trainer/trpoke.narc', text: 'msgdata/msg.narc',
      bank: { U: [559, 560, 588, 552, 344], J: [550, 551, 575, 544, 341], K: [552, 553, 577, 546, 342] } },
    Pt: { personal: 'poketool/personal/pl_personal.narc', moves: 'poketool/waza/pl_waza_tbl.narc', learn: 'poketool/personal/wotbl.narc',
      trdata: 'poketool/trainer/trdata.narc', trpoke: 'poketool/trainer/trpoke.narc', text: 'msgdata/pl_msg.narc',
      bank: { U: [618, 619, 647, 610, 392], J: [611, 612, 636, 604, 390], K: [612, 613, 637, 605, 390] } },
    HGSS: { personal: 'a/0/0/2', moves: 'a/0/1/1', learn: 'a/0/3/3', trdata: 'a/0/5/5', trpoke: 'a/0/5/6', text: 'a/0/2/7',
      bank: { U: [729, 730, 750, 720, 222], J: [719, 720, 739, 711, 219], K: [723, 724, 743, 715, 220] } },
    BW: { personal: 'a/0/1/6', moves: 'a/0/2/1', learn: 'a/0/1/8', trdata: 'a/0/9/2', trpoke: 'a/0/9/3', text: 'a/0/0/2',
      bank: { U: [190, 191, 203, 182, 54], J: [190, 191, 204, 182, 54] } },
    B2W2: { personal: 'a/0/1/6', moves: 'a/0/2/1', learn: 'a/0/1/8', trdata: 'a/0/9/1', trpoke: 'a/0/9/2', text: 'a/0/0/2',
      bank: { U: [382, 383, 403, 374, 64] } }
  };
  // Gen 4 trainer class genders (0 male, 1 female, 2 pair), needed for the PID of trainer Pokémon
  var CLASS_GENDER = {"dp":[0,1,0,1,0,1,0,1,1,0,1,0,0,1,0,0,0,1,1,0,0,1,1,2,0,1,1,0,0,0,1,2,0,1,0,1,1,0,0,0,1,0,0,1,0,1,0,2,0,0,1,0,0,0,1,0,1,0,0,0,0,1,0,0,0,0,1,0,0,1,2,0,1,0,1,0,1,1,1,0,1,0,2,0,1,1,0,1,1,1,1,0,1,0,1,0,1,0],"pt":[0,1,0,1,0,1,0,1,1,0,1,0,0,1,0,0,0,1,1,0,0,1,1,2,0,1,1,0,0,0,1,2,0,1,0,1,1,0,0,0,1,0,0,1,0,1,0,2,0,0,1,0,0,0,1,0,1,0,0,0,0,1,0,0,0,0,1,0,0,1,2,0,1,0,1,0,1,1,1,0,1,0,2,0,1,1,0,1,1,1,1,0,1,0,1,0,1,0,1,1,0,1,0,0,1],"hg":[0,1,0,1,0,1,0,1,1,0,1,0,0,1,0,0,0,1,1,0,0,1,1,0,0,1,1,0,0,0,1,0,0,1,0,1,1,0,0,0,1,0,0,1,0,1,0,1,0,0,1,0,0,0,1,0,1,0,0,0,0,1,1,0,0,0,0,1,0,0,1,0,0,0,1,0,1,1,0,0,1,0,1,0,1,1,0,1,1,2,1,0,1,0,1,0,1,0,0,1,0,1,0,1,0,1,1,1,0,0,0,0,2,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0]};
  // Gen 4 personal entries of the alternate forms: [first index, base species, number of forms]
  var FORMS4 = [[496, 386, 3], [499, 413, 2], [501, 487, 1], [502, 492, 1], [503, 479, 5]];

  function typeMap(gen, t) {
    if (gen === 4) return t <= 17 ? t : 0;
    return t <= 8 ? t : t <= 17 ? t + 1 : 0;
  }

  function parseRom(buf) {
    var u8 = bytesOf(buf);
    if (!isNds(u8)) throw new Error('rom:notnds');
    var code = ascii(u8, 0x0C, 4), title = ascii(u8, 0, 12).replace(/\0+$/, '');
    var g4 = GAME4[code.slice(0, 3)], g5 = GAME5[code.slice(0, 3)];
    if (!g4 && !g5) throw new Error('rom:ndsgame:' + code);
    var gen = g4 ? 4 : 5, info = g4 || g5, type = info[2], F = FILES[type];
    var region = code.charAt(3) === 'J' ? 'J' : code.charAt(3) === 'K' ? 'K' : 'U';
    var rom = { gen: gen, code: code, title: title, game: info[0], gameEn: info[1], lang: LANGS[code.charAt(3)] || '', type: type, warnings: [],
      species: [], moves: [], learnsets: [], trainers: [], classNames: [], items: [], names: { moves: [], abilities: [] } };
    function arc(path) { var f = nitroFile(u8, path); return f ? narc(f) : null; }
    var personal = arc(code.slice(0, 3) === 'APA' ? 'poketool/personal_pearl/personal.narc' : F.personal) || arc(F.personal);
    var moves = arc(F.moves), learn = arc(F.learn), trdata = arc(F.trdata), trpoke = arc(F.trpoke), text = arc(F.text);
    if (!personal || !moves) throw new Error('rom:ndsdata:' + code);

    // ---- species ----
    var maxNat = gen === 4 ? 493 : 649;
    function spec(d, nat) {
      if (!d || d.length < 0x18) return null;
      var s = { bs: [d[0], d[1], d[2], d[3], d[4], d[5]], types: [typeMap(gen, d[6]), typeMap(gen, d[7])], nat: nat };
      if (gen === 4) { s.gender = d[16]; s.friendship = d[18]; s.growth = d[19]; s.abilities = [d[22], d[23]]; }
      else { s.gender = d[0x12]; s.friendship = d[0x14]; s.growth = d[0x15]; s.abilities = [d[0x18], d[0x19], d[0x1A]]; if (d.length >= 0x28) s.weight = u16(d, 0x26) / 10; }
      return s;
    }
    rom.species[0] = spec(personal[0], 0) || { bs: [1, 1, 1, 1, 1, 1], types: [0, 0], abilities: [0], nat: 0, growth: 0, friendship: 70 };
    for (var i = 1; i <= maxNat && i < personal.length; i++) rom.species[i] = spec(personal[i], i);
    if (gen === 4) {
      FORMS4.forEach(function (f) {
        var base = rom.species[f[1]];
        if (!base) return;
        for (var k = 0; k < f[2]; k++) {
          var idx = f[0] + k, s = idx < personal.length ? spec(personal[idx], f[1]) : null;
          if (!s) break;
          rom.species[idx] = s; (base.forms = base.forms || []).push(idx);
        }
      });
    } else {
      for (var b = 1; b <= maxNat && b < personal.length; b++) {
        var d = personal[b];
        if (!d || d.length < 0x22) continue;
        var cnt = d[0x20], first = u16(d, 0x1C);
        if (cnt < 2 || !first || first >= personal.length) continue;
        var fl = [];
        for (var k2 = 1; k2 < cnt && first + k2 - 1 < personal.length; k2++) {
          var fi = first + k2 - 1, fs = spec(personal[fi], b);
          if (fs) { rom.species[fi] = fs; fl.push(fi); }
        }
        if (fl.length) rom.species[b].forms = fl;
      }
    }

    // ---- moves ----
    for (var m = 1; m < moves.length; m++) {
      var md = moves[m];
      if (!md || md.length < (gen === 4 ? 12 : 21)) continue;
      if (gen === 4) {
        var rg = u16(md, 8);
        rom.moves[m] = { power: md[3], type: typeMap(4, md[4]), acc: md[5], pp: md[6], cat: md[2] <= 2 ? md[2] : 2, priority: (md[10] << 24) >> 24,
          target: rg & 4 ? 'foes' : rg & 8 ? 'all' : rg & 0x10 ? 'user' : 'single', crit: 0, hits: null, chance: md[7], effect: u16(md, 0) };
      } else {
        var hmin = md[7] & 0xF, hmax = md[7] >> 4, tg = md[20];
        rom.moves[m] = { power: md[3], type: typeMap(5, md[0]), acc: md[4], pp: md[5], cat: md[2] === 1 ? 0 : md[2] === 2 ? 1 : 2, priority: (md[6] << 24) >> 24,
          target: tg === 4 ? 'all' : tg === 5 ? 'foes' : tg === 7 ? 'user' : 'single', crit: md[14], hits: hmax > 1 ? [hmin || hmax, hmax] : null,
          chance: Math.max(md[10], md[15], md[27] || 0, md[28] || 0, md[29] || 0), effect: u16(md, 16) }; // chance of a side effect (condition, flinch, stat change)
      }
    }

    // ---- learnsets (level-up moves) ----
    if (learn) {
      for (var l = 1; l < learn.length && l < rom.species.length; l++) {
        var ld = learn[l], ls = [];
        if (gen === 4) {
          for (var q = 0; q + 1 < ld.length; q += 2) { var v = u16(ld, q); if (v === 0xFFFF) break; ls.push([v >> 9, v & 0x1FF]); }
        } else {
          for (var q2 = 0; q2 + 3 < ld.length; q2 += 4) { var mv = u16(ld, q2); if (mv === 0xFFFF) break; ls.push([u16(ld, q2 + 2), mv]); }
        }
        rom.learnsets[l] = ls;
      }
    } else rom.warnings.push('learnsets');

    // ---- texts ----
    var banks = F.bank[region] || F.bank.U, readText = gen === 4 ? g4texts : g5texts, cache = {};
    function bank(n) { if (!text || n < 0 || n >= text.length) return []; return cache[n] || (cache[n] = readText(text[n])); }
    var trCount = trdata ? trdata.length : 0;
    var names = bank(banks[0]), classes = bank(banks[1]);
    // hacks with more trainers: the name bank has one entry per trainer, the class bank follows it
    if (trCount && (names.length < trCount || names.length > trCount + 40) && text) {
      for (var tb = 0; tb < text.length; tb++) {
        var cand = bank(tb);
        if (cand.length >= trCount && cand.length <= trCount + 2 && bank(tb + 1).length >= 30) { names = cand; classes = bank(tb + 1); break; }
      }
    }
    rom.classNames = classes;
    rom.names.moves = bank(banks[2]);
    rom.names.abilities = bank(banks[3]);
    rom.items = bank(banks[4]).map(function (n) { return { name: n }; });
    if (!names.length) rom.warnings.push('names');
    if (gen === 4) rom.classGender = CLASS_GENDER[type === 'DP' ? 'dp' : type === 'Pt' ? 'pt' : 'hg'];

    // ---- trainers ----
    if (trdata && trpoke) {
      for (var t = 1; t < trdata.length && t < trpoke.length; t++) {
        var h = trdata[t], pk = trpoke[t];
        if (!h || h.length < 20) continue;
        var flags = h[0], cnt2 = h[3], hasMoves = !!(flags & 1), hasItem = !!(flags & 2);
        if (!cnt2 || cnt2 > 6) continue;
        var items = [];
        for (var it = 0; it < 4; it++) { var iv = u16(h, 4 + it * 2); if (iv) items.push(iv); }
        // record: Gen 4 = 6 bytes (+ item, + 4 moves) and in Pt/HGSS 2 more at the end (ball seal); Gen 5 = 8 bytes (+ item, + moves)
        var extra = (hasItem ? 2 : 0) + (hasMoves ? 8 : 0), head = gen === 5 ? 8 : 6, tail = gen === 5 || type === 'DP' ? 0 : 2;
        var size = Math.floor(pk.length / cnt2);
        if (gen === 4 && (size - extra - head === 0 || size - extra - head === 2)) tail = size - extra - head;
        var rec = head + extra + tail, party = [];
        for (var n = 0; n < cnt2 && (n + 1) * rec <= pk.length; n++) {
          var o = n * rec, pm = { iv: pk[o], level: u16(pk, o + 2) & 0xFF };
          if (gen === 4) { var sv = u16(pk, o + 4); pm.species = sv & 0x3FF; pm.form = sv >> 10; if (type === 'HGSS') pm.genderAbility = pk[o + 1]; }
          else { pm.species = u16(pk, o + 4); pm.form = u16(pk, o + 6); pm.genderAbility = pk[o + 1]; }
          var p2 = o + head;
          pm.item = 0;
          if (hasItem) { pm.item = u16(pk, p2); p2 += 2; }
          pm.moves = null;
          if (hasMoves) { pm.moves = [u16(pk, p2), u16(pk, p2 + 2), u16(pk, p2 + 4), u16(pk, p2 + 6)]; }
          if (!pm.species || !rom.species[pm.species] || !pm.level) continue;
          party.push(pm);
        }
        if (!party.length) continue;
        var dbl = gen === 4 ? u32(h, 16) !== 0 : h[2] !== 0;
        rom.trainers.push({ id: t, cls: h[1], name: names[t] || '', double: dbl, items: items, custom: hasMoves, party: party });
      }
    }
    if (!rom.trainers.length) rom.warnings.push('trainers');
    return rom;
  }

  // ======================= Pokémon in saves (PK4 / PK5) =======================
  var BLOCK_POS = [0, 1, 2, 3, 0, 1, 3, 2, 0, 2, 1, 3, 0, 3, 1, 2, 0, 2, 3, 1, 0, 3, 2, 1, 1, 0, 2, 3, 1, 0, 3, 2, 2, 0, 1, 3, 3, 0, 1, 2, 2, 0, 3, 1, 3, 0, 2, 1,
    1, 2, 0, 3, 1, 3, 0, 2, 2, 1, 0, 3, 3, 1, 0, 2, 2, 3, 0, 1, 3, 2, 0, 1, 1, 2, 3, 0, 1, 3, 2, 0, 2, 1, 3, 0, 3, 1, 2, 0, 2, 3, 1, 0, 3, 2, 1, 0,
    0, 1, 2, 3, 0, 1, 3, 2, 0, 2, 1, 3, 0, 3, 1, 2, 0, 2, 3, 1, 0, 3, 2, 1, 1, 0, 2, 3, 1, 0, 3, 2];
  function crypt(d, start, end, seed) {
    for (var i = start; i + 1 < end; i += 2) {
      seed = (Math.imul(seed, 0x41C64E6D) + 0x6073) >>> 0;
      var k = seed >>> 16;
      d[i] ^= k & 0xFF; d[i + 1] ^= k >>> 8;
    }
  }
  function decodePk(u8, off, party, gen) {
    var len = party ? (gen === 4 ? 236 : 220) : 136;
    if (off < 0 || off + len > u8.length) return null;
    var pid = u32(u8, off), chk = u16(u8, off + 6);
    if (u16(u8, off + 4) !== 0 || (!pid && !chk)) return null;
    var e = u8.slice(off, off + len);
    crypt(e, 8, 136, chk);
    var sum = 0;
    for (var i = 8; i < 136; i += 2) sum = (sum + u16(e, i)) & 0xFFFF;
    if (sum !== chk) return null;
    var d = new Uint8Array(len), sv = (pid >>> 13) & 31;
    d.set(e.subarray(0, 8));
    for (var b = 0; b < 4; b++) { var src = BLOCK_POS[sv * 4 + b]; d.set(e.subarray(8 + src * 32, 8 + src * 32 + 32), 8 + b * 32); }
    if (party) { d.set(e.subarray(136), 136); crypt(d, 136, len, pid); }
    var species = u16(d, 8);
    if (!species || species > (gen === 4 ? 493 : 649)) return null;
    var iv = u32(d, 0x38), nickd = !!(iv >>> 31);
    var mon = {
      pid: pid, otid: u32(d, 0x0C), species: species, form: d[0x40] >> 3, item: u16(d, 0x0A), exp: u32(d, 0x10), friendship: d[0x14], ability: d[0x15],
      moves: [u16(d, 0x28), u16(d, 0x2A), u16(d, 0x2C), u16(d, 0x2E)].filter(function (x) { return x > 0; }),
      evs: { hp: d[0x18], atk: d[0x19], def: d[0x1A], spe: d[0x1B], spa: d[0x1C], spd: d[0x1D] },
      ivs: { hp: iv & 31, atk: (iv >>> 5) & 31, def: (iv >>> 10) & 31, spe: (iv >>> 15) & 31, spa: (iv >>> 20) & 31, spd: (iv >>> 25) & 31 },
      egg: !!((iv >>> 30) & 1), nature: gen === 5 && d[0x41] < 25 ? d[0x41] : pid % 25, hidden: gen === 5 ? !!(d[0x42] & 1) : false,
      nick: nickd ? (gen === 4 ? g4str(d, 0x48, 11) : g5str(d, 0x48, 11)) : '', metLevel: d[0x84] & 0x7F, gen: gen
    };
    if (party) {
      mon.status = u32(d, 0x88); mon.level = d[0x8C]; mon.hp = u16(d, 0x8E);
      mon.stats = { hp: u16(d, 0x90), atk: u16(d, 0x92), def: u16(d, 0x94), spe: u16(d, 0x96), spa: u16(d, 0x98), spd: u16(d, 0x9A) };
      if (mon.level < 1 || mon.level > 100 || !mon.stats.hp || mon.hp > mon.stats.hp) return null;
    }
    return mon;
  }

  // ======================= save files =======================
  function crc16(u8, start, end) {
    var top = 0xFF, bot = 0xFF;
    for (var i = start; i < end; i++) {
      var x = (u8[i] ^ top) & 0xFF;
      x ^= x >> 4;
      top = (bot ^ (x >> 3) ^ (x << 4)) & 0xFF;
      bot = (x ^ (x << 5)) & 0xFF;
    }
    return (top << 8) | bot;
  }
  var G4_GAMES = [
    { id: 'DP', name: 'Diamant/Perl', nameEn: 'Diamond/Pearl', gSize: 0xC100, sStart: 0xC100, sSize: 0x121E0, trainer: 0x64, party: 0x98 },
    { id: 'Pt', name: 'Platin', nameEn: 'Platinum', gSize: 0xCF2C, sStart: 0xCF2C, sSize: 0x121E4, trainer: 0x68, party: 0xA0 },
    { id: 'HGSS', name: 'HeartGold/SoulSilver', nameEn: 'HeartGold/SoulSilver', gSize: 0xF628, sStart: 0xF700, sSize: 0x12310, trainer: 0x64, party: 0x98 }
  ];
  function footerOk(u8, end, size) {
    var magic = u32(u8, end - 0x08);
    return u32(u8, end - 0x0C) === size && (magic === 0x20060623 || magic === 0x20070903);
  }
  // which partition (0 or 0x40000) holds the newer copy of a block
  function newer(a, b) {
    if (a === 0xFFFFFFFF && b !== 0xFFFFFFFE) return 1;
    if (b === 0xFFFFFFFF && a !== 0xFFFFFFFE) return 0;
    return b > a ? 1 : a > b ? 0 : -1;
  }
  function activeBlock(u8, begin, len) {
    var okA = footerOk(u8, begin + len, len), okB = footerOk(u8, 0x40000 + begin + len, len);
    if (okA !== okB) return okA ? 0 : 0x40000;
    var o = begin + len - 0x14, r = newer(u32(u8, o), u32(u8, o + 0x40000));
    if (r < 0) r = newer(u32(u8, o + 4), u32(u8, o + 4 + 0x40000));
    return r === 1 ? 0x40000 : 0;
  }
  function parseG4(u8) {
    if (u8.length < 0x80000) return null;
    var g = null;
    G4_GAMES.some(function (x) { if (footerOk(u8, 0x40000 + x.gSize, x.gSize) || footerOk(u8, x.gSize, x.gSize)) { g = x; return true; } return false; });
    if (!g) return null;
    var gb = activeBlock(u8, 0, g.gSize), sb = activeBlock(u8, g.sStart, g.sSize) + g.sStart;
    var res = { kind: 'sav', gen: 4, game: g.id, gameName: g.name, gameNameEn: g.nameEn, party: [], boxes: [], boxNames: [],
      trainer: { name: g4str(u8, gb + g.trainer, 8), tid: u16(u8, gb + g.trainer + 0x10), sid: u16(u8, gb + g.trainer + 0x12) } };
    if (g.id === 'HGSS') { var ver = u8[gb + g.trainer + 0x1C]; if (ver === 7) res.gameName = res.gameNameEn = 'HeartGold'; if (ver === 8) res.gameName = res.gameNameEn = 'SoulSilver'; }
    var cnt = u8[gb + g.party - 4];
    for (var i = 0; i < Math.min(cnt, 6); i++) { var m = decodePk(u8, gb + g.party + i * 236, true, 4); if (m) res.party.push(m); }
    var hg = g.id === 'HGSS', boxStart = hg ? 0 : 4, stride = hg ? 0x1000 : 0xFF0, namesAt = hg ? 0x12008 : 0x11EE4;
    res.currentBox = u8[sb + (hg ? 0x12000 : 0)];
    for (var b = 0; b < 18; b++) {
      for (var s = 0; s < 30; s++) { var bm = decodePk(u8, sb + boxStart + b * stride + s * 136, false, 4); if (bm) { bm.box = b; bm.slot = s; res.boxes.push(bm); } }
      res.boxNames.push(g4str(u8, sb + namesAt + b * 0x28, 20));
    }
    return res;
  }
  function parseG5(u8) {
    if (u8.length < 0x80000) return null;
    var b2 = crc16(u8, 0x25F00, 0x25F94) === u16(u8, 0x25FA2), bw = !b2 && crc16(u8, 0x23F00, 0x23F8C) === u16(u8, 0x23F9A);
    if (!b2 && !bw) return null;
    var ver = u8[0x1941F], NAMES5 = { 20: ['Weiß', 'White'], 21: ['Schwarz', 'Black'], 22: ['Weiß 2', 'White 2'], 23: ['Schwarz 2', 'Black 2'] };
    var nm = NAMES5[ver] || (b2 ? ['Schwarz 2/Weiß 2', 'Black 2/White 2'] : ['Schwarz/Weiß', 'Black/White']);
    var res = { kind: 'sav', gen: 5, game: b2 ? 'B2W2' : 'BW', gameName: nm[0], gameNameEn: nm[1], party: [], boxes: [], boxNames: [],
      trainer: { name: g5str(u8, 0x19404, 8), tid: u16(u8, 0x19414), sid: u16(u8, 0x19416) }, currentBox: u8[0] };
    var cnt = u8[0x18E04];
    for (var i = 0; i < Math.min(cnt, 6); i++) { var m = decodePk(u8, 0x18E08 + i * 220, true, 5); if (m) res.party.push(m); }
    for (var b = 0; b < 24; b++) {
      for (var s = 0; s < 30; s++) { var bm = decodePk(u8, 0x400 + b * 0x1000 + s * 136, false, 5); if (bm) { bm.box = b; bm.slot = s; res.boxes.push(bm); } }
      res.boxNames.push(g5str(u8, 0x04 + 0x28 * b, 10));
    }
    return res;
  }
  // a raw DS save (strips DeSmuME footer, Action-Replay header; larger files are tried in 512 KB parts)
  function parseSav(u8) {
    var cands = [];
    if (u8.length === 0x80000 + 0x7A && ascii(u8, u8.length - 16, 16) === '|-DESMUME SAVE-|') cands.push(u8.subarray(0, 0x80000));
    if (u8.length === 0x80000 + 0xA4) cands.push(u8.subarray(0xA4));
    if (u8.length >= 0x80000) { cands.push(u8.subarray(0, 0x80000)); if (u8.length >= 0x100000) cands.push(u8.subarray(0x80000, 0x100000)); }
    for (var i = 0; i < cands.length; i++) { var r = parseG4(cands[i]) || parseG5(cands[i]); if (r) return r; }
    return null;
  }
  // savestates (best effort): finds checksummed Pokémon in the emulator's RAM copy
  function scanState(u8, gen) {
    var party = [], box = [], seen = {};
    for (var p = 0; p + 136 <= u8.length; p += 4) {
      if (u8[p + 4] || u8[p + 5] || !(u8[p] | u8[p + 1] | u8[p + 2] | u8[p + 3])) continue;
      var bm = decodePk(u8, p, false, gen);
      if (!bm) continue;
      var pm = decodePk(u8, p, true, gen);
      if (pm) { pm.at = p; party.push(pm); continue; }
      var key = bm.pid + ':' + bm.species + ':' + bm.exp;
      if (seen[key]) continue;
      seen[key] = 1; bm.box = -1; bm.slot = 0; box.push(bm);
    }
    if (!party.length && !box.length) return null;
    var size = gen === 4 ? 236 : 220, groups = [], g = null;
    party.sort(function (a, b) { return a.at - b.at; }).forEach(function (m) {
      if (g && m.at === g[g.length - 1].at + size && g.length < 6) g.push(m); else { g = [m]; groups.push(g); }
    });
    groups.sort(function (a, b) { return b.length - a.length; });
    var team = groups[0] || [], inTeam = {};
    team.forEach(function (m) { inTeam[m.pid] = 1; });
    var ot = team.length ? team[0].otid : 0;
    return { kind: 'state', gen: gen, trainer: { name: '', tid: ot & 0xFFFF, sid: ot >>> 16 }, party: team,
      boxes: box.filter(function (m) { return !inTeam[m.pid]; }), boxNames: [] };
  }
  // resolves to the save or null; without a ROM only real DS saves are recognized
  function parseSave(buf, rom) {
    var u8 = bytesOf(buf), sav = parseSav(u8);
    if (sav || !rom) return Promise.resolve(sav);
    return G3.blobsOf(u8).then(function (blobs) {
      var best = null;
      blobs.forEach(function (b) {
        var s = parseSav(b) || scanState(b, rom.gen);
        if (s && (!best || s.party.length + s.boxes.length > best.party.length + best.boxes.length)) best = s;
      });
      return best;
    });
  }

  window.NDS = { isNds: isNds, parseRom: parseRom, parseSave: parseSave, parseSav: parseSav, decodePk: decodePk, crypt: crypt, crc16: crc16,
    g4str: g4str, g5str: g5str, g4char: g4char, g4texts: g4texts, g5texts: g5texts, narc: narc, nitroFile: nitroFile, lzDecompress: lzDecompress, BLOCK_POS: BLOCK_POS };
})();
