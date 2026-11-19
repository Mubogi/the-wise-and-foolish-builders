/**
 * data.js — the content engine.
 * Every dilemma, foundation stone, and storm is authored here, separate from
 * simulation and rendering, so the game can be taught and studied from the data.
 */

/* ------------------------------------------------------------------
   Foundation stones: the seven hidden pilings driven into bedrock.
   Each piling has its own "rock" track built by hidden obedience.
   ------------------------------------------------------------------ */
export const PILINGS = [
  {
    id: 'prayer',
    name: 'Secret Prayer',
    icon: '✦',
    color: '#8fb8e8',
    verse: 'Matthew 6:6 — "But when you pray, go into your room and shut the door and pray to your Father who is in secret."',
    principle:
      'Prayer that no one applauds is the deepest piling. It holds the house when public ministry collapses, because it was never resting on the crowd in the first place.',
  },
  {
    id: 'integrity',
    name: 'Integrity',
    icon: '◈',
    color: '#e0c069',
    verse: 'Proverbs 11:3 — "The integrity of the upright guides them, but the crookedness of the treacherous destroys them."',
    principle:
      'Integrity is doing the honest thing when a shortcut would never be noticed. It costs hours now and saves the whole structure later.',
  },
  {
    id: 'repentance',
    name: 'Repentance',
    icon: '↺',
    color: '#c98fd0',
    verse: '1 John 1:9 — "If we confess our sins, he is faithful and just to forgive us our sins."',
    principle:
      'Repentance clears the sand. A house is not ruined by the crack that is confessed and repaired; it is ruined by the crack that is hidden and painted over.',
  },
  {
    id: 'forgiveness',
    name: 'Forgiveness',
    icon: '❦',
    color: '#8fd8c0',
    verse: 'Ephesians 4:32 — "Be kind to one another, tenderhearted, forgiving one another, as God in Christ forgave you."',
    principle:
      'Unforgiveness is a termite in the beams. Forgiving when you were clearly wronged is one of the hardest digs a builder ever makes.',
  },
  {
    id: 'generosity',
    name: 'Sacrificial Generosity',
    icon: '◍',
    color: '#e8a96f',
    verse: 'Matthew 6:3-4 — "But when you give to the needy, do not let your left hand know what your right hand is doing."',
    principle:
      'Giving that is recorded for an audience builds nothing underground. Giving that is secret pours concrete into the footing.',
  },
  {
    id: 'promises',
    name: 'Kept Promises',
    icon: '⚓',
    color: '#9fb4d8',
    verse: 'Psalm 15:4 — "...who swears to his own hurt and does not change."',
    principle:
      'A promise kept at personal cost is a steel rebar. It is invisible in the finished wall and it is the reason the wall stands.',
  },
  {
    id: 'scripture',
    name: 'Costly Obedience',
    icon: '☩',
    color: '#d8b98f',
    verse: 'Luke 6:48 — "He is like a man building a house, who dug deep and laid the foundation on the rock."',
    principle:
      'Obedience when Scripture is expensive — when it costs money, status, or a relationship — is the deepest dig of all. Luke says the man "dug deep."',
  },
];

export const PILING_BY_ID = Object.fromEntries(PILINGS.map((p) => [p.id, p]));

/* ------------------------------------------------------------------
   Dilemmas.
   Each choice carries effects:
     hours      — time & energy spent
     rock       — { pilingId: amount }  depth added to that piling
     sand       — sand added
     influence  — outward structure added
     stress     — immediate strain on the structure (cracks risk)
   ------------------------------------------------------------------ */
export const DILEMMAS = [
  {
    id: 'rumor',
    tag: 'Reputation',
    title: 'A False Rumor Spreads',
    body: 'Someone in your circle is repeating something about you that is not true. Three people have already asked you about it. The story is spreading faster than the truth can walk.',
    choices: [
      {
        key: 'A',
        title: 'Defend your name loudly and publicly',
        desc: 'Correct the record in the group chat, then in person, then again. You will be vindicated — and you will spend the whole day on it.',
        effects: { hours: 3, influence: 10, sand: 2, stress: 1 },
        result:
          'You won the argument and lost the day. The record is corrected; the sand is a little deeper. Defending a reputation is not sin — but doing it instead of praying is a shortcut, and shortcuts settle.',
        tone: 'sand',
      },
      {
        key: 'B',
        title: 'Forgive, pray, and walk in truth quietly',
        desc: 'You tell the truth to those who ask, refuse to retaliate, and take the hurt to God instead of to the timeline.',
        effects: { hours: 2, rock: { forgiveness: 14, prayer: 10 }, influence: 2 },
        result:
          'You drove a piling into bedrock. Forgiveness when you were plainly wronged is one of the deepest digs available to a human being, and nobody saw it happen. That is the point.',
        tone: 'rock',
      },
      {
        key: 'C',
        title: 'Let it go entirely and say nothing',
        desc: 'Ignore it. Move on. Don\'t think about it, don\'t pray about it, just bury it.',
        effects: { hours: 0, sand: 3, stress: 2 },
        result:
          'Burying is not forgiving. Unprocessed hurt settles into the fill under the slab, and it will move when the water rises.',
        tone: 'sand',
      },
    ],
  },
  {
    id: 'shortcut',
    tag: 'Work',
    title: 'The Deadline and the Shortcut',
    body: 'Your project is behind. A colleague shows you a way to cut a corner that no one will ever audit — reusing someone else\'s report, skipping the verification step, rounding the numbers. "Everybody does it," she says.',
    choices: [
      {
        key: 'A',
        title: 'Take the shortcut and ship on time',
        desc: 'You finish early. The client is delighted. The corner is invisible.',
        effects: { hours: 2, influence: 17, sand: 6 },
        result:
          'Invisible corners are still corners. Outward structure rose fast; the fill beneath it is now six units softer. Speed without character is exactly what Jesus called building on sand.',
        tone: 'sand',
      },
      {
        key: 'B',
        title: 'Wait, do it honestly, and deliver late',
        desc: 'You tell the client the truth about the timeline and do the work properly. It costs you the bonus.',
        effects: { hours: 5, rock: { integrity: 18, promises: 6 }, influence: 7 },
        result:
          'You lost the bonus and gained a piling. Integrity is doing the honest thing when the dishonest thing is undetectable — which means it is only ever built in secret.',
        tone: 'rock',
      },
    ],
  },
  {
    id: 'secretgift',
    tag: 'Money',
    title: 'A Need You Could Meet',
    body: 'You learn that a family in your community is about to lose their housing. You have enough to cover two months of their rent. You also have a public platform where generosity would be noticed and celebrated.',
    choices: [
      {
        key: 'A',
        title: 'Give quietly, tell no one',
        desc: 'You transfer the money through a third party and never mention it again — not even to your closest friend.',
        effects: { hours: 1, rock: { generosity: 20, prayer: 4 }, influence: 0 },
        result:
          'Your left hand did not know what your right hand was doing. Nothing visible changed. Everything underground did.',
        tone: 'rock',
      },
      {
        key: 'B',
        title: 'Give publicly to inspire others',
        desc: 'You post about it. Others may indeed be moved to give — and your name is attached to the gift forever.',
        effects: { hours: 2, rock: { generosity: 6 }, influence: 19, sand: 3 },
        result:
          'Some good was done, and some of the reward was collected immediately. Jesus\' warning about trumpets is not a warning about generosity — it is a warning about which ledger you are building.',
        tone: 'mixed',
      },
      {
        key: 'C',
        title: 'Promise to help later when things are easier',
        desc: 'Money is tight. You mean well. You add it to the list.',
        effects: { hours: 0, sand: 4, stress: 1 },
        result:
          '"Later" is the most common material in a sand foundation. The intention was real; the piling was not poured.',
        tone: 'sand',
      },
    ],
  },
  {
    id: 'familyprayer',
    tag: 'Family',
    title: 'The Meeting or the Bedtime',
    body: 'Your ministry or career has a crucial evening meeting. It is also the one night your child asked you, for three weeks running, to be there at bedtime. Both are good things. Only one happens.',
    choices: [
      {
        key: 'A',
        title: 'Go to the meeting — the work matters',
        desc: 'You are needed. You will be seen. Your child will understand eventually.',
        effects: { hours: 3, influence: 22, sand: 4 },
        result:
          'The public testimony grew. Something quieter was deferred. Jesus warned that a house can look magnificent above ground while the ground beneath it is being neglected.',
        tone: 'sand',
      },
      {
        key: 'B',
        title: 'Stay home and keep the promise',
        desc: 'You send a deputy, miss the spotlight, and read three books about a bear.',
        effects: { hours: 2, rock: { promises: 16, prayer: 6 }, influence: 2 },
        result:
          'Nobody at the meeting noticed. A seven-year-old did. A promise kept to a person who cannot advance your career is one of the purest digs there is.',
        tone: 'rock',
      },
    ],
  },
  {
    id: 'conflict',
    tag: 'Conflict',
    title: 'The Brother Who Was Wrong',
    body: 'A close friend spoke sharply to you in front of others and has not apologized. You have rehearsed the perfect response. You are, factually, in the right.',
    choices: [
      {
        key: 'A',
        title: 'Confront him — you are right and he should know',
        desc: 'You lay out the facts, win the exchange, and wait for the apology you are owed.',
        effects: { hours: 3, influence: 5, sand: 4, stress: 2 },
        result:
          'Being right is not the same as being built on rock. You won the point and added sand to the footing.',
        tone: 'sand',
      },
      {
        key: 'B',
        title: 'Go to him privately and seek peace first',
        desc: 'You begin with your own fault, ask forgiveness for your part, and leave the outcome with God.',
        effects: { hours: 3, rock: { forgiveness: 14, repentance: 8 }, influence: 5 },
        result:
          'Matthew 18 in practice. You took the lower seat and the footing got deeper. Reconciliation is slow, expensive, and structurally load-bearing.',
        tone: 'rock',
      },
      {
        key: 'C',
        title: 'Withdraw quietly and avoid him',
        desc: 'No conflict, no conversation. You simply stop being available.',
        effects: { hours: 0, sand: 3, stress: 1 },
        result:
          'Avoidance is not peace. It is a crack painted over and called a wall.',
        tone: 'sand',
      },
    ],
  },
  {
    id: 'prayerlife',
    tag: 'Discipline',
    title: 'The Morning Nobody Sees',
    body: 'You have a 6:00 a.m. alarm and a demanding day ahead. The house is silent. Nobody will ever know whether you got up.',
    choices: [
      {
        key: 'A',
        title: 'Get up, open Scripture, and pray',
        desc: 'Forty-five minutes in the dark with a lamp and a text. No one is watching.',
        effects: { hours: 2, rock: { prayer: 16, scripture: 10 } },
        result:
          'This is the dig Luke describes. No plaque, no post, no witness — and yet every storm in this game is survivable because of hours like this one.',
        tone: 'rock',
      },
      {
        key: 'B',
        title: 'Sleep — you will pray later in the day',
        desc: 'Rest is real, and later is a real plan.',
        effects: { hours: 0, influence: 2, sand: 2 },
        result:
          'Rest is not sin. But "later" rarely becomes a piling. Grace remains; the hole simply stays undug.',
        tone: 'sand',
      },
    ],
  },
  {
    id: 'coverup',
    tag: 'Integrity',
    title: 'The Mistake You Could Hide',
    body: 'You made a real error that cost your team money. Only you know the cause. A plausible alternative explanation is sitting right there, and everyone is already half-convinced of it.',
    choices: [
      {
        key: 'A',
        title: 'Confess it fully and take the consequence',
        desc: 'You tell the truth to the people affected, offer to make it right, and accept the damage to your standing.',
        effects: { hours: 3, rock: { repentance: 18, integrity: 12 }, influence: -7, sand: -3 },
        result:
          'Repentance clears fill. You are less impressive today and more trustworthy in a year. 1 John 1:9 is not a slogan; it is a load calculation.',
        tone: 'rock',
      },
      {
        key: 'B',
        title: 'Let the other explanation stand',
        desc: 'You say nothing. It is not exactly a lie.',
        effects: { hours: 0, influence: 10, sand: 8, stress: 2 },
        result:
          'A hidden crack. Every storm in this game will find it, because storms always find what is buried.',
        tone: 'sand',
      },
    ],
  },
  {
    id: 'generosityTime',
    tag: 'Generosity',
    title: 'The Unseen Hours',
    body: 'A neighbor is moving house alone on Saturday. You have a free day, and no one from your church will ever know you spent it there instead of on your own visible projects.',
    choices: [
      {
        key: 'A',
        title: 'Spend the day carrying boxes',
        desc: 'Six hours of unglamorous service for someone who cannot repay you.',
        effects: { hours: 6, rock: { generosity: 16, promises: 6 }, influence: 2 },
        result:
          'Sacrificial generosity, unrewarded and unposted. The concrete went in wet and set hard.',
        tone: 'rock',
      },
      {
        key: 'B',
        title: 'Send money instead and keep your day',
        desc: 'A generous gift, honestly given, and your Saturday stays yours.',
        effects: { hours: 1, rock: { generosity: 7 }, influence: 5 },
        result:
          'Still generosity. A shorter piling is not no piling — but the game measures depth, not intentions.',
        tone: 'mixed',
      },
    ],
  },
  {
    id: 'flattery',
    tag: 'People-Pleasing',
    title: 'The Room That Wants a Lie',
    body: 'You are asked, in front of a group that expects a certain answer, whether a decision was wise. You believe it was not. Agreement would cost nothing. Honesty would cost the room.',
    choices: [
      {
        key: 'A',
        title: 'Agree — keep the peace and the warmth',
        desc: 'You say what the room wants. Everyone leaves happy.',
        effects: { hours: 0, influence: 14, sand: 5 },
        result:
          'People-pleasing is sand poured with a smile. The warmth was real, and so was the softening.',
        tone: 'sand',
      },
      {
        key: 'B',
        title: 'Speak the truth in love and accept the cost',
        desc: 'You are gentle, specific, and honest. Two people are annoyed with you by evening.',
        effects: { hours: 2, rock: { integrity: 16, scripture: 6 }, influence: 5 },
        result:
          'Truth spoken kindly is a piling. Truth avoided kindly is sand with better manners.',
        tone: 'rock',
      },
    ],
  },
  {
    id: 'forgiveDebt',
    tag: 'Mercy',
    title: 'The Debt You Are Owed',
    body: 'Someone owes you a significant amount and has stopped responding. You have the paperwork. You could recover it — legally, justly, and completely.',
    choices: [
      {
        key: 'A',
        title: 'Forgive the debt entirely',
        desc: 'You cancel it, tell them so, and refuse to bring it up again.',
        effects: { hours: 1, rock: { forgiveness: 20, generosity: 10 }, influence: -5 },
        result:
          'You absorbed the loss yourself. That is what forgiveness costs, and it is why it is bedrock work rather than decoration.',
        tone: 'rock',
      },
      {
        key: 'B',
        title: 'Pursue it fairly and firmly',
        desc: 'You follow the proper process. It is just and it is legal.',
        effects: { hours: 3, influence: 7, sand: 2 },
        result:
          'Justice is not sin. But the game is honest about which choice dug deeper, and this one mostly used hours on the surface.',
        tone: 'mixed',
      },
    ],
  },
  {
    id: 'sabbath',
    tag: 'Rhythm',
    title: 'The Seventh Day',
    body: 'Everything is urgent. You could work through the day of rest and gain a full week of output. Your body is asking. Your soul is quieter than that.',
    choices: [
      {
        key: 'A',
        title: 'Rest, worship, and trust the limits',
        desc: 'You stop. You worship. You trust that the world holds without you for one day.',
        effects: { hours: 1, rock: { scripture: 12, prayer: 8 }, influence: -2 },
        result:
          'Sabbath is a structural declaration that you are not the load-bearing wall. Trust is a foundation material.',
        tone: 'rock',
      },
      {
        key: 'B',
        title: 'Push through — the work is the point',
        desc: 'You gain a week of output and lose something you cannot name.',
        effects: { hours: 4, influence: 17, sand: 4, stress: 1 },
        result:
          'More visible output, more hidden strain. The house got taller and the footing did not get deeper.',
        tone: 'sand',
      },
    ],
  },
];

/* ------------------------------------------------------------------
   Free actions — small, repeatable, cost only time.
   ------------------------------------------------------------------ */
export const FREE_ACTIONS = [
  {
    id: 'pray',
    label: 'Pray in secret',
    cost: 1,
    effects: { rock: { prayer: 8 } },
    log: 'You shut the door and prayed where no one could see.',
  },
  {
    id: 'dig',
    label: 'Dig deeper (hard obedience)',
    cost: 3,
    effects: { rock: { scripture: 12, integrity: 4 } },
    log: 'You dug through a hard place instead of pouring over it.',
  },
  {
    id: 'repent',
    label: 'Confess and clear sand',
    cost: 2,
    effects: { rock: { repentance: 12 }, sand: -6 },
    log: 'You named the thing you had been hiding. Some fill came out with it.',
  },
  {
    id: 'serve',
    label: 'Serve unseen',
    cost: 2,
    effects: { rock: { generosity: 9 }, influence: 2 },
    log: 'You served someone who will never be able to repay you.',
  },
  {
    id: 'mend',
    label: 'Keep a costly promise',
    cost: 3,
    effects: { rock: { promises: 12, forgiveness: 4 } },
    log: 'You kept your word when breaking it would have been easier.',
  },
];

/* ------------------------------------------------------------------
   Storms — the testing waves of Matthew 7:25-27.
   `power` is the raw force. Each storm leans on particular weaknesses:
     sandWeight  — how much soft fill it punishes
     stressFocus — which structural stress it amplifies
   ------------------------------------------------------------------ */
export const STORMS = [
  {
    id: 'financial',
    name: 'Financial Loss',
    sub: 'The wind beats against the house',
    power: 1.0,
    sandWeight: 1.1,
    verse: 'Matthew 6:19-20 — "Do not lay up for yourselves treasures on earth... but lay up for yourselves treasures in heaven."',
    reflection:
      'Loss reveals what a life was actually resting on. A house built on income shakes when income shakes; a house built on the Rock can lose the income and remain.',
  },
  {
    id: 'sickness',
    name: 'Sickness & Grief',
    sub: 'The rain falls and the floods come',
    power: 1.15,
    sandWeight: 1.0,
    verse: 'Psalm 46:1-2 — "God is our refuge and strength, a very present help in trouble."',
    reflection:
      'Grief tests whether your comfort was built on circumstances or on God. Deep pilings do not stop the rain; they hold the floor above the water.',
  },
  {
    id: 'persecution',
    name: 'Persecution',
    sub: 'The storm strikes the exposed walls',
    power: 1.25,
    sandWeight: 1.25,
    verse: 'Matthew 5:11-12 — "Blessed are you when others revile you and persecute you... rejoice and be glad."',
    reflection:
      'Persecution targets the visible structure. A testimony built for applause has nothing left when the applause turns to opposition.',
  },
  {
    id: 'temptation',
    name: 'Temptation',
    sub: 'The flood rises against the foundation',
    power: 1.1,
    sandWeight: 1.45,
    verse: '1 Corinthians 10:13 — "God is faithful, and he will not let you be tempted beyond your ability."',
    reflection:
      'Temptation finds every hidden crack. It is the most efficient inspector of a foundation, because it tests precisely what you thought was buried.',
  },
  {
    id: 'conflict',
    name: 'Church Conflict',
    sub: 'The winds of division blow',
    power: 1.2,
    sandWeight: 1.2,
    verse: 'Ephesians 4:3 — "Eager to maintain the unity of the Spirit in the bond of peace."',
    reflection:
      'Conflict tests whether your relationships were built on being right or on being reconciled. Forgiven people tend to survive fights.',
  },
];

/* ------------------------------------------------------------------
   Seasons: 5 seasons × 4 days = 20 days. A storm lands on the last day.
   ------------------------------------------------------------------ */
export const SEASONS = [
  { name: 'Season of Beginnings', note: 'A quiet stretch. Nobody is watching yet.' },
  { name: 'Season of Increase', note: 'Work is growing. So is the temptation to hurry.' },
  { name: 'Season of Testing', note: 'The forecast turns. Watch the horizon.' },
  { name: 'Season of Sifting', note: 'What is loose will be found.' },
  { name: 'Season of Harvest', note: 'The final storm. Everything hidden is revealed.' },
];

export const DAYS_PER_SEASON = 4;

/* ------------------------------------------------------------------
   Reflection guide — 3 questions per storm for classes and families.
   ------------------------------------------------------------------ */
export const REFLECTIONS = [
  'Which part of your life right now is "above ground" — visible to others — and which part is the piling nobody sees?',
  'Where have you been pouring sand over a crack instead of digging it out? What would confession actually cost you this week?',
  'Who in your life could shelter under your foundation during a storm — and what would it take to be strong enough to hold them?',
];

export const VERSE_TICKER = [
  'Everyone who hears these words of mine and puts them into practice is like a wise man who built his house on the rock. — Matthew 7:24',
  'The rain fell, the floods came, and the winds blew and beat on that house, but it did not fall, because it had been founded on the rock. — Matthew 7:25',
  'Everyone who hears these words of mine and does not do them is like a foolish man who built his house on the sand. — Matthew 7:26',
  'He is like a man building a house, who dug deep and laid the foundation on the rock. — Luke 6:48',
  'No one can lay a foundation other than that which is laid, which is Jesus Christ. — 1 Corinthians 3:11',
  'Each one\'s work will become manifest, for the Day will disclose it, because it will be revealed by fire. — 1 Corinthians 3:13',
  'Gold, silver, precious stones — or wood, hay, straw. The fire will test what sort of work each one has done. — 1 Corinthians 3:12-13',
  'Therefore everyone who hears these words of mine and puts them into practice — that is the whole game. — Matthew 7:24',
];

export const HELP_HTML = `
  <p class="lead">You are building one house. Above ground it looks like a life: work, family, ministry, reputation. Below ground is where the storms actually decide the outcome.</p>
  <div class="verse">"Everyone then who hears these words of mine and does them will be like a wise man who built his house on the rock."<cite>Matthew 7:24</cite></div>
  <h3>How to play</h3>
  <ul>
    <li><strong>Spend your hours.</strong> Each day you have a limited budget of time and energy. Choose dilemma cards from the deck to spend them.</li>
    <li><strong>Dig pilings.</strong> Hidden obedience — secret prayer, integrity, repentance, forgiveness, generosity, kept promises, costly obedience — drives pilings deep into the bedrock. These are what hold in a storm.</li>
    <li><strong>Watch the sand.</strong> Shortcuts, people-pleasing, hypocrisy, and unconfessed sin pile up soft fill. The higher it is, the more the house shakes.</li>
    <li><strong>Read the forecast.</strong> A storm lands at the end of every season. The readiness meter tells you how exposed you are.</li>
    <li><strong>Survive and reflect.</strong> After each storm you get a reflection guide. If the house cracks, grace lets you clear the sand and rebuild deeper.</li>
  </ul>
  <h3>Scoring</h3>
  <p>Your final standing is not your reputation — it is the depth of your foundation compared to the height of your structure. A tall house on deep rock shelters neighbors. A tall house on sand becomes a warning sign.</p>
  <h3>Shortcuts</h3>
  <p><span class="muted"><strong>1-9</strong> open a dilemma card · <strong>Space</strong> advance day · <strong>B</strong> blueprint log · <strong>R</strong> reflect · <strong>S</strong> save · <strong>L</strong> load · <strong>Esc</strong> close</span></p>
`;
