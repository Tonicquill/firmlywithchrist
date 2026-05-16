// Generate 365-entry devotionals.json with metadata from NLM themes
const fs = require('fs');

const monthDefs = [
  { name: 'January', days: 31, theme: 'God of Beginnings & Sovereign Purpose', doctrine: 'Divine Sovereignty', season: 'ordinary' },
  { name: 'February', days: 28, theme: 'God of Deliverance & Substitutionary Atonement', doctrine: 'Substitutionary Atonement', season: 'lent' },
  { name: 'March', days: 31, theme: 'God of Instruction & Sufficiency', doctrine: 'Sola Scriptura', season: 'lent' },
  { name: 'April', days: 30, theme: 'God of Conquest & Transformation', doctrine: 'Total Depravity & New Nature', season: 'easter' },
  { name: 'May', days: 31, theme: 'God of Kingship & Divine Identity', doctrine: 'Lordship Salvation', season: 'ordinary' },
  { name: 'June', days: 30, theme: 'God of the Spirit & the Church', doctrine: 'Regeneration', season: 'ordinary' },
  { name: 'July', days: 31, theme: 'God of Restoration & Citizenship', doctrine: 'Divine Sovereignty in History', season: 'ordinary' },
  { name: 'August', days: 31, theme: 'God of Providence & Suffering', doctrine: 'Divine Providence', season: 'ordinary' },
  { name: 'September', days: 30, theme: 'God of Grace & Gospel Unity', doctrine: 'Sola Gratia', season: 'ordinary' },
  { name: 'October', days: 31, theme: 'God of Holiness & Worthy Walk', doctrine: 'Progressive Sanctification', season: 'ordinary' },
  { name: 'November', days: 30, theme: 'God of the New Covenant & Perseverance', doctrine: 'Perseverance of the Saints', season: 'ordinary' },
  { name: 'December', days: 31, theme: 'God of Consummation & Eternal Kingdom', doctrine: 'Glorification', season: 'advent' }
];

const seasonLabels = {
  ordinary: 'Ordinary Time',
  lent: 'Lent',
  easter: 'Eastertide',
  advent: 'Advent'
};

// Theme-specific daily subtopics
const monthlySubtopics = {
  'God of Beginnings & Sovereign Purpose': [
    'Creation ex nihilo', 'Image of God', 'The Sabbath rest', 'God names and orders',
    'Covenant with Adam', 'The Fall', 'The first promise', 'Sin spreads',
    'The flood and judgment', 'Noah\'s covenant', 'Babel scattered', 'Call of Abram',
    'Covenant promises', 'Faith counted righteous', 'Sodom and Gomorrah', 'Isaac the promised son',
    'Sacrifice of Isaac', 'A wife for Isaac', 'Jacob and Esau', 'The stairway to heaven',
    'Wrestling with God', 'Joseph sold', 'Joseph in prison', 'Joseph exalted',
    'Sovereignty over evil', 'The genealogy of the King', 'The virgin birth', 'Visit of the Magi',
    'Flight to Egypt', 'Baptism of Christ', 'Temptation in the wilderness'
  ],
  'God of Deliverance & Substitutionary Atonement': [
    'Moses born', 'The burning bush', 'I AM who I AM', 'Plagues begin',
    'Power over Pharaoh\'s gods', 'The Passover lamb', 'Out of Egypt', 'Crossing the Red Sea',
    'Song of deliverance', 'Manna from heaven', 'Water from the rock', 'The covenant at Sinai',
    'The Ten Commandments', 'The tabernacle', 'The golden calf', 'Moses intercedes',
    'The glory of the Lord', 'The sin offering', 'Atonement and blood', 'The scapegoat',
    'The year of Jubilee', 'The bronze serpent', 'Balaam\'s prophecy', 'Sermon on the Mount',
    'The Beatitudes', 'Salt and light', 'The Lord\'s Prayer', 'The Great Commission'
  ],
  'God of Instruction & Sufficiency': [
    'The Shema', 'Teach your children', 'Not by bread alone', 'The blessing and the curse',
    'Choose life', 'Moses dies, Joshua rises', 'All Scripture is God-breathed', 'The Word as sword',
    'Renew your mind', 'Meditate day and night', 'Rahab\'s faith', 'Crossing Jordan',
    'Walls of Jericho', 'The sin of Achan', 'The Gibeonite deception', 'The sun stands still',
    'Cities of refuge', 'Caleb inherits', 'Choose this day', 'Deborah and Barak',
    'Gideon\'s fleece', 'Gideon\'s 300', 'Jephthah\'s vow', 'Samson\'s birth',
    'Samson and Delilah', 'Ruth\'s loyalty', 'Boaz the redeemer', 'Hannah\'s prayer',
    'Samuel hears God', 'The ark captured', 'The Lord is my shepherd (Psalm 23)'
  ],
  'God of Conquest & Transformation': [
    'Give us a king', 'Saul anointed', 'Saul rejected', 'David anointed',
    'David and Goliath', 'Jonathan\'s friendship', 'David spares Saul', 'The death of Saul',
    'David becomes king', 'The ark brought to Jerusalem', 'The Davidic covenant', 'Bathsheba and Nathan',
    'Absalom\'s rebellion', 'David\'s mighty men', 'Solomon asks for wisdom', 'Solomon builds the temple',
    'The dedication', 'The Queen of Sheba', 'Solomon falls', 'The kingdom divides',
    'Elijah and the widow', 'Elijah on Carmel', 'The still small voice', 'Naboth\'s vineyard',
    'Elijah taken up', 'Elisha\'s double portion', 'The floating ax head', 'Naaman healed',
    'The unseen army', 'Joash the boy king', 'Hezekiah\'s prayer'
  ],
  'God of Kingship & Divine Identity': [
    'Isaiah\'s vision', 'Here am I, send me', 'A virgin shall conceive', 'Unto us a child is born',
    'The suffering servant', 'The Word became flesh', 'The Lamb of God', 'Water to wine',
    'Nicodemus at night', 'The woman at the well', 'The nobleman\'s son', 'Healing at Bethesda',
    'I am the bread of life', 'I am the light of the world', 'The man born blind', 'I am the good shepherd',
    'I am the resurrection', 'Lazarus raised', 'The triumphal entry', 'The foot washing',
    'I am the way, truth, life', 'The true vine', 'The high priestly prayer', 'The arrest',
    'Peter\'s denial', 'Before Pilate', 'The crucifixion', 'It is finished',
    'The resurrection', 'Doubting Thomas', 'Feed my sheep'
  ],
  'God of the Spirit & the Church': [
    'The ascension', 'The upper room', 'Pentecost', 'Peter\'s sermon at Pentecost',
    'The lame man healed', 'Ananias and Sapphira', 'The apostles arrested', 'Stephen full of faith',
    'Stephen\'s martyrdom', 'Philip and the Ethiopian', 'Saul\'s conversion', 'Saul in Damascus',
    'Peter and Cornelius', 'The Gentile Pentecost', 'Peter freed from prison', 'Paul\'s first journey',
    'The Jerusalem council', 'Paul and Silas in prison', 'The Philippian jailer', 'Paul at Athens',
    'Apollos instructed', 'The riot at Ephesus', 'Paul\'s farewell', 'Paul arrested',
    'Before Agrippa', 'Shipwrecked', 'Paul in Rome', 'The fruit of the Spirit',
    'The armor of God', 'In Christ'
  ],
  'God of Restoration & Citizenship': [
    'Rebuild the temple', 'Ezra the scribe', 'Nehemiah prays', 'Nehemiah inspects the walls',
    'Rebuilding begins', 'Opposition from Sanballat', 'The wall completed', 'Ezra reads the law',
    'The people weep and rejoice', 'Covenant renewal', 'Esther becomes queen', 'If I perish',
    'Mordecai honored', 'The wicked fall', 'No condemnation', 'More than conquerors',
    'The golden chain', 'Living sacrifices', 'The body of Christ', 'The governing authorities',
    'The weak and the strong', 'The God of peace', 'Greet one another', 'The mystery revealed',
    'The wisdom of God', 'Build with care', 'This world is passing away', 'The Lord\'s table',
    'The resurrection body', 'Our citizenship is in heaven', 'A new creation'
  ],
  'God of Providence & Suffering': [
    'Job\'s calamity', 'Job and his friends', 'Where were you?', 'The Lord restores Job',
    'The fear of the Lord', 'Vanity of vanities', 'A time for everything', 'Remember your Creator',
    'God sets the solitary in families', 'The Lord is my shepherd (Psalm 23)', 'Out of the depths',
    'The Lord is my light', 'As the deer pants', 'God is our refuge and strength',
    'Create in me a clean heart', 'Bless the Lord, O my soul', 'Unless the Lord builds',
    'By the rivers of Babylon', 'How good and pleasant', 'The cross is folly',
    'Christ crucified', 'Your body is a temple', 'The Lord\'s Supper', 'Spiritual gifts',
    'The love chapter', 'The firstfruits of resurrection', 'Our labor is not in vain',
    'The God of all comfort', 'Treasure in jars of clay', 'A thorn in the flesh',
    'Examine yourselves'
  ],
  'God of Grace & Gospel Unity': [
    'Saved by grace through faith', 'Alive in Christ', 'One in Christ', 'The middle wall broken',
    'Walk worthy', 'Speaking the truth in love', 'Put off the old man', 'Walk in love',
    'Walk as children of light', 'Husbands and wives', 'The whole armor of God', 'No other gospel',
    'Paul confronts Peter', 'Justified by faith', 'Sons of God', 'Fruit of the Spirit',
    'Bear one another\'s burdens', 'Sow to the Spirit', 'Boast only in the cross',
    'The mind of Christ', 'God highly exalted Him', 'Press toward the goal', 'Rejoice always',
    'Think on these things', 'I can do all things', 'Complete in Christ', 'Rooted and built up',
    'Christ is all and in all', 'Put on the new man', 'Let the peace of Christ rule'
  ],
  'God of Holiness & Worthy Walk': [
    'The weeping prophet', 'Jeremiah\'s call', 'The potter\'s house', 'The new covenant',
    'Jeremiah in the cistern', 'Faithful in Babylon', 'The fiery furnace', 'The handwriting on the wall',
    'Daniel in the lions\' den', 'The Ancient of Days', 'Fight the good fight', 'A worker approved',
    'All Scripture is God-breathed', 'Preach the word', 'The crown of righteousness',
    'Sound doctrine', 'Adorn the doctrine', 'Our blessed hope', 'The great God and Savior',
    'Not by works of righteousness', 'Good works and generosity', 'Run with endurance',
    'Looking to Jesus', 'The great cloud of witnesses', 'Lay aside every weight',
    'The discipline of the Lord', 'Do not grow weary', 'Faith is the substance',
    'By faith they conquered', 'The peaceable fruit', 'A kingdom that cannot be shaken'
  ],
  'God of the New Covenant & Perseverance': [
    'A new heart', 'The valley of dry bones', 'The river of life', 'A holy jealousy',
    'The Lord will roar from Zion', 'Seek the Lord and live', 'The day of the Lord',
    'A plumb line', 'Jonah runs', 'Jonah\'s prayer from the deep', 'Jonah preaches',
    'Micah\'s prophecy', 'What the Lord requires', 'The Sun of Righteousness',
    'God is a very present help (Habakkuk)', 'The just shall live by faith', 'Count it all joy',
    'Trials produce patience', 'Be doers of the word', 'Faith without works is dead',
    'The tongue is a fire', 'Wisdom from above', 'Draw near to God',
    'Resist the devil', 'The prayer of faith', 'Saved through suffering (1 Peter)',
    'Precious blood of Christ', 'A chosen generation', 'Suffering for righteousness',
    'The Shepherd and Overseer'
  ],
  'God of Consummation & Eternal Kingdom': [
    'Hosea\'s love', 'The Lord woos Israel', 'Locust judgment and promise (Joel)',
    'The Spirit poured out', 'The Lord is in her midst (Zephaniah)', 'Consider your ways (Haggai)',
    'The glory of the latter house', 'Be strong and work (Zechariah)', 'The King comes on a donkey',
    'The Branch', 'The Alpha and Omega', 'The throne room of heaven', 'Worthy is the Lamb',
    'The seals opened', 'The great multitude', 'The seven trumpets', 'The kingdom proclaimed',
    'The two witnesses', 'The woman and the dragon', 'War in heaven', 'The beast and the mark',
    'Babylon is fallen', 'The marriage supper of the Lamb', 'Hallelujah!',
    'The rider on the white horse', 'The thousand years', 'The great white throne',
    'A new heaven and new earth', 'No more tears', 'The river of life',
    'Come, Lord Jesus!'
  ]
};

const devotionalEntries = [];
let dayNum = 0;

monthDefs.forEach((month, monthIndex) => {
  const subtopics = monthlySubtopics[month.theme];
  for (let d = 0; d < month.days; d++) {
    dayNum++;
    const topic = subtopics[d] || `${month.theme} — Reflection ${d + 1}`;
    const padded = String(dayNum).padStart(3, '0');
    const isLastOfMonth = (d === month.days - 1);

    // Determine check-in type
    let checkInType = null;
    if (isLastOfMonth) checkInType = 'Monthly';
    if (dayNum === 90 || dayNum === 181 || dayNum === 273) checkInType = 'Quarterly';
    if (dayNum === 365) checkInType = 'Yearly';

    devotionalEntries.push({
      day: dayNum,
      title: topic,
      month: month.name,
      month_index: monthIndex + 1,
      season: month.season,
      season_label: seasonLabels[month.season],
      theme: month.theme,
      doctrine: month.doctrine,
      scripture: 'TBD',
      scripture_block: null,
      scripture_ref: null,
      excerpt: `Day ${dayNum}: ${topic} — ${month.theme}. A daily Reformed devotional reading.`,
      life_lesson: null,
      check_in_type: checkInType,
      check_in: null,
      url: `devotional/day/${padded}/`,
      slug: `day-${padded}`,
      has_content: false
    });
  }
});

fs.mkdirSync('assets', { recursive: true });
fs.writeFileSync('assets/devotionals.json', JSON.stringify(devotionalEntries, null, 2) + '\n');
console.log(`Generated ${devotionalEntries.length} devotional entries in assets/devotionals.json`);

// Log special days
const specialDays = devotionalEntries.filter(d => d.check_in_type);
console.log(`\nSpecial check-in days (${specialDays.length}):`);
specialDays.forEach(d => console.log(`  Day ${d.day} (${d.month}): ${d.check_in_type} Check-in`));
