import { CATEGORIES, DECK, SPREADS } from './deck.js?v=20261007-spreads-1';
import { MAX_SPREAD_CARDS } from './spreads.js?v=20261007-spreads-1';

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
  const selectedSpread = Object.hasOwn(SPREADS, spreadId ?? '') ? SPREADS[spreadId] : SPREADS.single;
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

function positionFocus(spread, index) {
  const note = spread.positionNotes?.[index];
  return note ? `这个牌位关注的是：${note}` : '';
}

function spreadSynthesis(spread, cards) {
  const ref = index => {
    const card = cards[index];
    if (!card) return `“${spread.positions[index]}”`;
    const keyword = card.keywords?.[0] ?? '需要留意的线索';
    return `“${spread.positions[index]} · ${card.name ?? '塔罗牌'}${card.reversed === true ? '逆位' : '正位'}”的${keyword}`;
  };
  const summaries = {
    single: () => `从${ref(0)}中，选一条与你今天真实经历相符的提醒，试一个小行动，再看它有没有帮助。`,
    three: () => `先用${ref(0)}描述眼前的处境，再用${ref(1)}补上容易漏看的线索，让${ref(2)}回应这条线索，形成一次能够检查结果的尝试。`,
    relationship: () => `把${ref(0)}放进${ref(1)}所对应的真实互动中，用${ref(2)}准备一句具体请求；对方是否愿意回应，要通过实际沟通确认。`,
    timeline: () => `比较${ref(0)}与${ref(1)}，找出一个延续的模式和一项已经改变的条件，再把${ref(2)}用于近期可调整的行动。它不是已经确定的未来。`,
    choice: () => `先确认${ref(0)}是否符合自己的优先级。用同一标准比较${ref(1)}和${ref(3)}，再核对${ref(2)}与${ref(4)}对应的真实投入，补齐信息后自己决定。`,
    'relationship-deep': () => `将${ref(0)}与${ref(1)}放在一起核对，看看${ref(2)}是否对应具体的表达难点；用${ref(3)}限定自己能承担的范围，再让${ref(4)}成为一次双方都能拒绝的交流邀请。`,
    'career-path': () => `从${ref(0)}对照${ref(1)}，找一个具体差距。用${ref(2)}回应${ref(3)}中的现实条件，再将${ref(4)}缩成一项有完成标准的小实践。`,
    'study-plan': () => `用${ref(0)}明确想掌握什么，核对${ref(1)}已有的基础与${ref(2)}实际出现的卡点，再试${ref(3)}对应的一种短练习，借${ref(4)}安排自测并调整方法。`,
    'inner-growth': () => `先看${ref(0)}是否贴近此刻感受，再核实${ref(1)}对应的真实需要；借${ref(2)}找到可用支持，让${ref(3)}成为当前精力能承受的一次温和尝试。`,
    week: () => `这七张牌可用作连续七天的弹性安排：${cards.map((_, index) => ref(index)).join('；')}。每天只选一项适合实际情况的观察或行动，第 4 天调整、第 6 天恢复、第 7 天回顾，安排随现实反馈改变。`,
    blockage: () => `从${ref(0)}追到${ref(1)}，用真实例子核对反复的模式；选${ref(2)}中的一项可控变化，借${ref(3)}获得支持，再把${ref(4)}变成一次可检查的小试验。`,
    'celtic-cross': () => `先合看${ref(0)}与${ref(1)}的核心张力，再对照${ref(2)}与${ref(3)}的目标和根基；比较${ref(4)}、${ref(5)}中的条件变化，将${ref(6)}与${ref(7)}联系自己的回应和可用支持。用${ref(8)}核对期待与事实，再让${ref(9)}汇成一项可调整行动；发展方向仍取决于现实条件。`,
  };
  return summaries[spread.id]?.() ?? '先留意牌意中与你实际经历相符的部分，再决定是否采用这条提醒。';
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
      id: card.id,
      reversed,
      title: `${position} · ${card.name ?? '塔罗牌'}${reversed ? '（逆位）' : '（正位）'}`,
      text: `${positionFrame(position)}${interpretation || fallback} ${topicLink(card.suit, context.domain)} ${positionFocus(spread, index)} ${card.advice ?? context.action}`,
    };
  });
  const synthesis = spreadSynthesis(spread, cards);
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
  if (!Array.isArray(value.cards) || value.cards.length < 1 || value.cards.length > MAX_SPREAD_CARDS) return false;
  if (Object.hasOwn(options, 'cards') && (!Array.isArray(options.cards) || value.cards.length !== options.cards.length)) return false;
  if (Object.hasOwn(options, 'spread')) {
    const spreadId = typeof options.spread === 'string' ? options.spread : options.spread?.id;
    const spread = Object.hasOwn(SPREADS, spreadId ?? '') ? SPREADS[spreadId] : null;
    if (!spread || value.cards.length !== spread.positions.length) return false;
  }
  if (!value.cards.every((card, index) => card && card.index === index + 1 && text(card.title) && text(card.text))) return false;
  // Legacy local journals predate identity fields. API results and new local results
  // can opt into exact identity validation without discarding those saved readings.
  if (options.strictCards && (!Array.isArray(options.cards) || !value.cards.every((card, index) =>
    card.id === options.cards[index]?.id && typeof card.reversed === 'boolean'
      && card.reversed === options.cards[index]?.reversed))) return false;
  return Array.isArray(value.guidance) && value.guidance.length >= 1 && value.guidance.length <= 5 && value.guidance.every(text);
}
