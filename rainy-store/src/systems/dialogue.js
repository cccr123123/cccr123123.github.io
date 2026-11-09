// 对话：预设话题树 + 打字机文本
// 店员人设：凌晨便利店的女店员，语气温柔、有点困
export const CLERK_NAME = '小葵';

export const DIALOGUE = {
  root: {
    text: 'いらっしゃいませ～……啊，这么大的雨，辛苦了。慢慢看就好。',
    options: [
      { label: '推荐点什么？', next: 'recommend' },
      { label: '今天雨真大', next: 'weather' },
      { label: '关东煮还有吗？', next: 'oden' },
      { label: '你一个人看店吗？', next: 'lonely' },
      { label: '没什么，我自己看看', next: 'bye' },
    ],
  },

  recommend: {
    text: '这个点的话……我推荐热乎的关东煮，还有今天下午刚到的鲑鱼饭团。咖啡机也刚加满豆子。',
    options: [
      { label: '那就来串关东煮', next: 'oden_buy' },
      { label: '饭团在哪个位置？', next: 'location' },
      { label: '我自己逛逛', next: 'bye' },
    ],
  },

  weather: {
    text: '从傍晚一直下到现在呢。门口那块地有点滑，您进来的时候小心台阶。',
    options: [
      { label: '你回家方便吗', next: 'commute' },
      { label: '其实我挺喜欢这个雨声', next: 'rain_sound' },
      { label: '嗯，谢谢提醒', next: 'bye' },
    ],
  },

  oden: {
    text: '有的有的，萝卜和鸡蛋都煮透了。一串一百块，要给您盛一份吗？',
    options: [
      { label: '来两串', next: 'oden_buy' },
      { label: '下次吧', next: 'bye' },
    ],
  },

  oden_buy: {
    text: '好嘞——萝卜和鸡蛋给您装好了。趁热吃哦，汤很烫。',
    action: 'giveOden',
    options: [
      { label: '谢谢', next: 'thanks' },
      { label: '那我再去看看别的', next: 'bye' },
    ],
  },

  location: {
    text: '靠里那排冷柜，左边第二层。对了，饭团旁边还有三明治。',
    options: [
      { label: '好的，我去看看', next: 'bye' },
      { label: '咖啡也在那边吗？', next: 'coffee' },
    ],
  },

  coffee: {
    text: '咖啡在最里面那台机器上。要热的还是冰的？热的话我帮您按一下。',
    options: [
      { label: '热的，谢谢', next: 'coffee_yes' },
      { label: '我自己来就好', next: 'bye' },
    ],
  },

  coffee_yes: {
    text: '好～等它滴完大概二十秒。机器声音有点吵，别介意。',
    options: [
      { label: '没事，正好听听雨', next: 'rain_sound' },
      { label: '谢谢', next: 'thanks' },
    ],
  },

  lonely: {
    text: '嗯……凌晨这个点，一般就只有我和雨声。偶尔会有加完班的人进来买杯咖啡。',
    options: [
      { label: '不困吗', next: 'sleepy' },
      { label: '辛苦了', next: 'thanks' },
    ],
  },

  sleepy: {
    text: '困啊……不过看到有客人推门进来，就精神了。大概是职业习惯吧。',
    options: [
      { label: '给你添麻烦了', next: 'thanks' },
      { label: '那我慢慢逛', next: 'bye' },
    ],
  },

  commute: {
    text: '我住后面两条街，走回去十分钟。雨太大的话，就在店里等一等——反正也不差这点时间。',
    options: [
      { label: '挺好的', next: 'bye' },
      { label: '那我不耽误你了', next: 'thanks' },
    ],
  },

  rain_sound: {
    text: '对吧？我有时候会故意把店里的音乐关小，就听雨声。反正这个点也没人来管。',
    options: [
      { label: '确实很治愈', next: 'thats_nice' },
      { label: '谢谢你的推荐', next: 'bye' },
    ],
  },

  thats_nice: {
    text: '对吧～所以下雨天我也不太讨厌上班。就是别漏水就好。',
    options: [
      { label: '那我先逛了', next: 'bye' },
      { label: '辛苦了', next: 'thanks' },
    ],
  },

  thanks: {
    text: '啊，谢谢您～需要什么随时叫我。',
    options: [{ label: '好的', next: 'bye' }],
  },

  bye: {
    text: '好的，慢慢逛～结账的时候在收银台叫我就行。',
    options: [],
  },
};

export class DialogueSystem {
  constructor({ hud, clerk, shop, audio, controls, interactor }) {
    this.hud = hud;
    this.clerk = clerk;
    this.shop = shop;
    this.audio = audio;
    this.controls = controls;
    this.interactor = interactor;
    this.open = false;
    this.node = null;
    this.nodeId = 'root';
    this.text = '';
    this.typing = false;
    this.typeIdx = 0;
    this.typeTimer = 0;
    this.charsPerSec = 34;
  }

  start() {
    if (this.open) return;
    this.open = true;
    this.controls.enabled = false;
    this.interactor && (this.interactor.paused = true);
    if (this.clerk) {
      this.clerk.setTalking(true);
      this.clerk.setLookTarget(this.hud.playerPos || null);
    }
    this.audio && this.audio.uiOpen();
    this.goto('root');
  }

  close() {
    this.open = false;
    this.controls.enabled = true;
    this.interactor && (this.interactor.paused = false);
    if (this.clerk) this.clerk.setTalking(false);
    this.hud.hideDialogue();
    this.audio && this.audio.uiClose();
  }

  goto(id) {
    const node = DIALOGUE[id];
    if (!node) {
      this.close();
      return;
    }
    this.nodeId = id;
    this.node = node;
    this.text = node.text;
    this.typeIdx = 0;
    this.typeTimer = 0;
    this.typing = true;

    if (node.action && this.shop) {
      if (node.action === 'giveOden') this.shop.giveSpecial('oden_skewer', 2);
    }

    this.hud.showDialogue(CLERK_NAME, '', []);
    if (this.clerk) this.clerk.nod();
  }

  /** 打字机推进 / 跳过 / 有选项时选第一个 */
  advance() {
    if (!this.open) return;
    if (this.typing) {
      this.typeIdx = this.text.length;
      this.typing = false;
      this.hud.setDialogueText(this.text);
      this._showOptions();
      return;
    }
    // 有选项时按 E = 选第一个（最常用，避免「按 E 没反应」）
    if (this.node.options && this.node.options.length) {
      this.choose(0);
      return;
    }
    this.close();
  }

  choose(index) {
    if (!this.open || this.typing) return;
    const opt = this.node.options[index];
    if (!opt) return;
    this.audio && this.audio.uiSelect();
    if (opt.next) this.goto(opt.next);
    else this.close();
  }

  _showOptions() {
    if (!this.node || !this.node.options || !this.node.options.length) return;
    this.hud.showDialogueOptions(this.node.options.map((o) => o.label));
  }

  update(dt) {
    if (!this.open || !this.typing) return;
    this.typeTimer += dt;
    const target = Math.floor(this.typeTimer * this.charsPerSec);
    if (target > this.typeIdx) {
      this.typeIdx = Math.min(this.text.length, target);
      this.hud.setDialogueText(this.text.slice(0, this.typeIdx));
      if (this.typeIdx >= this.text.length) {
        this.typing = false;
        this._showOptions();
      }
    }
  }
}
