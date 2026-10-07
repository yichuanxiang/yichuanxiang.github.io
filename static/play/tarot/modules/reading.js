import { CATEGORIES, DECK, SPREADS } from './deck.js';

const deckById = new Map(DECK.map(card => [card.id, card]));

function cardMeaning(card) {
  const original = deckById.get(card.id);
  return card.reversed === true
    ? card.reversedMeaning ?? card.reversedText ?? card.meanings?.reversed ?? original?.reversed
    : card.upright ?? original?.upright;
}

const contexts = {
  general: {
    domain: 'general',
    frame: '可以先把注意力放在你能影响的一件事上。',
    action: '选一个十分钟以内可以开始的小行动，之后再看真实反馈。',
    reflection: '如果今天只改变一件小事，什么会让你更接近自己的需要？',
  },
  love: {
    domain: 'love',
    frame: '关系中的线索来自实际互动，清楚表达与相互尊重会让选择更踏实。',
    action: '用“我感到……我需要……”表达一次需求，给对方回应的空间。',
    reflection: '怎样的实际互动会让你感到被尊重，同时也尊重对方的边界？',
  },
  career: {
    domain: 'career',
    frame: '把目标与现有时间、能力和资源放在一起，能看清下一步的大小。',
    action: '为目标设一个小里程碑，写下完成标准和检查时间。',
    reflection: '哪一项能力、信息或支持，可以让你的下一步更可靠？',
  },
  growth: {
    domain: 'growth',
    frame: '先看见自己的感受与需要，再选择适合当前精力的步幅。',
    action: '记录今天的感受与触发点，为自己安排一次具体的照顾。',
    reflection: '你正在用什么标准要求自己，这个标准是否留出了恢复与学习的空间？',
  },
};

function resolveInput({ question = '', category = 'general', spread = 'single', cards = [] } = {}) {
  const categoryId = typeof category === 'string' ? category : category?.id;
  const selectedCategory = CATEGORIES.find(item => item.id === categoryId) ?? CATEGORIES[0];
  const spreadId = typeof spread === 'string' ? spread : spread?.id;
  const selectedSpread = SPREADS[spreadId] ?? SPREADS.single;
  const selectedCards = Array.isArray(cards) ? cards.slice(0, selectedSpread.positions.length) : [];
  const cleanQuestion = String(question ?? '').trim().slice(0, 800);
  return { question: cleanQuestion, category: selectedCategory, spread: selectedSpread, cards: selectedCards };
}

function excerpt(question, maximum = 58) {
  return question.length > maximum ? `${question.slice(0, maximum)}…` : question;
}

function relatedContext(question, category) {
  // A chosen category remains the primary context. Wording can add a more concrete focus.
  if (/考试|考研|学习|学业|复习/.test(question)) {
    return { ...contexts.career, frame: '面对学习与考试，可以把复习计划、精力和可验证的进步放在一起看。', action: '选一个薄弱知识点做短练习，根据错题调整下一轮复习。' };
  }
  if (/工作|事业|求职|面试|转行|创业/.test(question)) {
    return { ...contexts.career, frame: '面对工作中的选择，岗位信息、个人能力与投入成本值得分别核对。', action: '补齐一项关键的工作信息，或完成一个能获得反馈的小任务。' };
  }
  if (/关系|感情|恋爱|喜欢|复合|分手|他爱|她爱|伴侣/.test(question)) {
    return contexts.love;
  }
  return contexts[category.id];
}

function positionFrame(position) {
  const frames = {
    '此刻的提醒': '把它当作观察当下的一扇小窗：',
    '当前处境': '在“当前处境”的位置，这张牌邀请你辨认眼前的模式：',
    '值得关注': '在“值得关注”的位置，这张牌把注意力带到可能被忽略的一面：',
    '下一步行动': '在“下一步行动”的位置，这张牌提供一种可以尝试的做法：',
    '我的需要': '在“我的需要”的位置，先从自己的感受与边界出发：',
    '关系中的互动': '在“关系中的互动”的位置，观察发生过的行为与沟通：',
    '可以尝试的方向': '在“可以尝试的方向”的位置，让调整落到双方能够讨论的小事：',
  };
  return frames[position] ?? `在“${position}”的位置，留意这样的线索：`;
}

function topicLink(suit, domain) {
  const links = {
    general: {
      major: '把这条线索与你正在经历的变化放在一起看。',
      wands: '留意你的行动节奏，以及哪些投入仍值得继续。',
      cups: '留意感受背后的需要，以及可以获得的支持。',
      swords: '把感受与事实分开，有助于看清选择。',
      pentacles: '从时间、精力和日常条件中找一个可调整的地方。',
    },
    love: {
      major: '联系这次关系提问，可以先辨认你希望建立怎样的相处方式。',
      wands: '在关系中，留意靠近的节奏是否尊重双方的意愿。',
      cups: '在关系中，把感受说清楚，再观察彼此的回应。',
      swords: '在关系中，事实、表达与边界比猜测对方的心意更可靠。',
      pentacles: '在关系中，关注日常投入与照顾是否符合双方的需要。',
    },
    career: {
      major: '联系你的方向问题，先看看目标是否与你真正看重的事一致。',
      wands: '把行动意愿转成小任务，实际反馈能帮助你调整方向。',
      cups: '留意你对目标的真实感受，以及合作与学习中的沟通。',
      swords: '用可核对的信息与清楚的标准支持这次选择。',
      pentacles: '把时间、资源与练习安排写清楚，下一步会更具体。',
    },
    growth: {
      major: '联系你的成长提问，观察这个模式怎样影响你对自己的看法。',
      wands: '尝试与恢复都需要空间，选择当前精力能承受的节奏。',
      cups: '先认真承认感受，再寻找适合你的照顾与表达方式。',
      swords: '检查你对自己的评价，是否有足够的事实与温度。',
      pentacles: '让成长落在一个能持续的小习惯里，慢慢观察变化。',
    },
  };
  return links[domain]?.[suit] ?? links.general.major;
}

export function generateReading(input = {}) {
  const { question, category, spread, cards } = resolveInput(input);
  const context = relatedContext(question, category);
  const questionText = question ? `关于“${excerpt(question)}”，` : '带着你此刻想到的事，';
  const reversedCount = cards.filter(card => card.reversed === true).length;
  const cardReadings = cards.map((card, index) => {
    const position = spread.positions[index];
    const reversed = card.reversed === true;
    // A drawn card's boolean `reversed` replaces the source deck's interpretation string.
    const interpretation = cardMeaning(card);
    const fallback = '留意这张牌带给你的感受，并用现实中的信息核对它与你的问题有哪些联系。';
    return {
      index: index + 1,
      title: `${position} · ${card.name ?? '塔罗牌'}${reversed ? '（逆位）' : '（正位）'}`,
      text: `${positionFrame(position)}${interpretation || fallback} ${topicLink(card.suit, context.domain)} ${card.advice ?? context.action}`,
    };
  });
  const synthesis = cards.length > 1
    ? `把“${spread.positions[0]}”与“${spread.positions[cards.length - 1]}”放在一起看：先辨认${cards[0]?.keywords?.[0] ?? '当前需要'}，再用${cards[cards.length - 1]?.keywords?.[0] ?? '一次小尝试'}的方式寻找反馈。`
    : '先留意牌意中与你实际经历相符的部分，再决定是否采用这条提醒。';
  return {
    title: question ? `回应你的${category.id === 'love' ? '关系' : category.id === 'career' ? '方向' : '此刻'}提问` : '为此刻留一束光',
    intro: `我是露娜，陪你慢慢看看这次的牌。${questionText}${context.frame} 牌面可以帮助整理想法，答案仍需要结合你的真实处境与判断。`,
    cards: cardReadings,
    guidance: [
      synthesis,
      context.action,
      reversedCount > 0 ? '逆位可以看作需要调整节奏或重新检查的提示。选择一条有帮助的线索就足够。' : '给行动一个观察期限，依据实际结果调整下一步。',
    ],
    reflection: `${question ? `回到“${excerpt(question, 40)}”：` : ''}${context.reflection}`,
  };
}

export function validateReading(value, options = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const text = item => typeof item === 'string' && item.trim().length > 0 && item.length <= 6000;
  if (!['title', 'intro', 'reflection'].every(key => text(value[key]))) return false;
  if (!Array.isArray(value.cards) || value.cards.length < 1 || value.cards.length > 3) return false;
  if (Array.isArray(options.cards) && value.cards.length !== options.cards.length) return false;
  if (!value.cards.every((card, index) => card && card.index === index + 1 && text(card.title) && text(card.text))) return false;
  return Array.isArray(value.guidance) && value.guidance.length >= 1 && value.guidance.length <= 5 && value.guidance.every(text);
}
