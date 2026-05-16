// Update days 1-7 with real scripture, life lessons, and mark has_content=true
const fs = require('fs');

const devotionals = JSON.parse(fs.readFileSync('assets/devotionals.json', 'utf-8'));

const dayData = [
  {
    scripture: 'Genesis 1:1 · John 1:1-3 · Colossians 1:16 · Hebrews 11:3',
    scripture_block: 'In the beginning, God created the heavens and the earth. The earth was without form and void, and darkness was over the face of the deep. And the Spirit of God was hovering over the face of the waters. And God said, "Let there be light," and there was light.',
    scripture_ref: 'Genesis 1:1-3',
    excerpt: 'Before the first day, there was no first day. Before the heavens and the earth, there was no "before." Time itself is a creature. God spoke it into existence.',
    life_lesson: 'The universe is not an accident, and you are not either. Begin each day remembering that the Creator who spoke light into darkness is sovereign over everything that follows.',
    has_content: true
  },
  {
    scripture: 'Genesis 1:26-28 · Psalm 8:3-5 · Colossians 1:15 · James 3:9',
    scripture_block: 'Then God said, "Let Us make man in Our image, after Our likeness. And let them have dominion over the fish of the sea and over the birds of the heavens and over the livestock and over all the earth and over every creeping thing that creeps on the earth." So God created man in His own image, in the image of God He created him; male and female He created them.',
    scripture_ref: 'Genesis 1:26-27',
    excerpt: 'Genesis 1:26 drops into the creation account like a thunderclap. The triune God declares His intention to create something unlike everything else: a being in His own image.',
    life_lesson: 'Every person you meet today bears the stamp of their Maker. Treat them accordingly — not because they have earned dignity, but because they are dignity, image of the living God.',
    has_content: true
  },
  {
    scripture: 'Genesis 2:1-3 · Exodus 31:13 · Mark 2:27 · Hebrews 4:9-10',
    scripture_block: 'Thus the heavens and the earth were finished, and all the host of them. And on the seventh day God finished His work that He had done, and He rested on the seventh day from all His work that He had done. So God blessed the seventh day and made it holy, because on it God rested from all His work that He had done in creation.',
    scripture_ref: 'Genesis 2:1-3',
    excerpt: 'God finished His work. Then He rested. He was making a point — the seventh day was a deliberate pause, a full stop at the end of a perfect creation.',
    life_lesson: 'You are not a machine. Your value is not your output. God built rest into creation itself — honor it, and remember that the world does not run on your effort.',
    has_content: true
  },
  {
    scripture: 'Genesis 2:15 · Psalm 147:4 · 1 Corinthians 10:31 · Colossians 3:23',
    scripture_block: 'The LORD God took the man and put him in the garden of Eden to work it and keep it.',
    scripture_ref: 'Genesis 2:15',
    excerpt: 'Creation was not finished on the sixth day. Before sin entered the world, before cursed ground and sweaty brow, there was work. Adam was a gardener. His labor was not punishment. It was partnership.',
    life_lesson: 'Your work matters to God. Whether you code, clean, teach, or parent — all of it is kingdom work when done in faith. There is no secular-sacred divide in God\'s economy.',
    has_content: true
  },
  {
    scripture: 'Genesis 3:1-7 · Genesis 3:15 · 1 John 2:16 · Romans 5:12 · 1 Corinthians 15:22',
    scripture_block: 'Now the serpent was more crafty than any other beast of the field that the LORD God had made. He said to the woman, "Did God actually say, \'You shall not eat of any tree in the garden\'?"',
    scripture_ref: 'Genesis 3:1',
    excerpt: 'Genesis 3 explains every headline, every broken relationship, every war, every funeral. The serpent\'s strategy was not to deny God\'s existence — it was to question God\'s generosity.',
    life_lesson: 'Temptation always frames obedience as loss and sin as gain. The lie hasn\'t changed since Eden: God is holding out on you. The truth: every command of God is a hedge of protection around something precious.',
    has_content: true
  },
  {
    scripture: 'Genesis 4:1-16 · Genesis 4:26 · Hebrews 11:4 · 1 John 3:12',
    scripture_block: 'The LORD said to Cain, "Why are you angry, and why has your face fallen? If you do well, will you not be accepted? And if you do not do well, sin is crouching at the door. Its desire is contrary to you, but you must rule over it."',
    scripture_ref: 'Genesis 4:6-7',
    excerpt: 'The first murder happened one generation from Eden. Cain chose resentment over repentance, homicide over humility. Sin is pictured as a predator — coiled, waiting, hostile.',
    life_lesson: 'Sin is not passive weakness. It is an active predator seeking mastery. You either rule over it, or it rules over you. The first sign sin is winning is resentment toward someone God has blessed.',
    has_content: true
  },
  {
    scripture: 'Genesis 6:5-8 · Genesis 6:13-22 · Hebrews 11:7 · 1 Peter 3:20-21 · Matthew 24:37-39',
    scripture_block: 'The LORD saw that the wickedness of man was great in the earth, and that every intention of the thoughts of his heart was only evil continually. And the LORD regretted that He had made man on the earth, and it grieved Him to His heart.',
    scripture_ref: 'Genesis 6:5-6',
    excerpt: 'By Genesis 6, every intention of human thought was "only evil continually" — three intensifiers stacked to eliminate any loophole. But Noah found favor. Grace in the midst of judgment.',
    life_lesson: 'Noah built a boat on dry land for 120 years because he believed God\'s word about a future he had never seen. Faith acts on God\'s warning long before the rain starts falling.',
    has_content: true
  }
];

dayData.forEach((data, i) => {
  Object.assign(devotionals[i], data);
});

fs.writeFileSync('assets/devotionals.json', JSON.stringify(devotionals, null, 2) + '\n');
console.log('Updated days 1-7 in devotionals.json');
console.log(`Total entries: ${devotionals.length}`);
console.log(`Entries with content: ${devotionals.filter(d => d.has_content).length}`);
