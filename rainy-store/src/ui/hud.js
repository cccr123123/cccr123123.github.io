// HUD：准星/交互提示、购物篮、消息、对话面板、小票
export class HUD {
  constructor() {
    const $ = (id) => document.getElementById(id);
    this.el = {
      crosshair: $('crosshair'),
      prompt: $('prompt'),
      promptText: $('prompt-text'),
      promptHint: $('prompt-hint'),
      cart: $('cart'),
      cartList: $('cart-list'),
      cartTotal: $('cart-total'),
      cartCount: $('cart-count'),
      wallet: $('wallet'),
      msg: $('message'),
      dialogue: $('dialogue'),
      dlgName: $('dlg-name'),
      dlgText: $('dlg-text'),
      dlgOptions: $('dlg-options'),
      pay: $('pay-bar'),
      payTotal: $('pay-total'),
      receipt: $('receipt'),
      receiptBody: $('receipt-body'),
      receiptTotal: $('receipt-total'),
      receiptChange: $('receipt-change'),
      receiptWallet: $('receipt-wallet'),
      fade: $('fade'),
    };
    this.msgTimer = 0;
    this.playerPos = null;
  }

  /* ------------------------------------------------------ 准星提示 */
  setPrompt(text, hint) {
    const { prompt, promptText, promptHint, crosshair } = this.el;
    if (!prompt) return;
    if (text) {
      promptText.textContent = text;
      promptHint.textContent = hint || '';
      hint ? promptHint.classList.remove('hide') : promptHint.classList.add('hide');
      prompt.classList.add('show');
      crosshair && crosshair.classList.add('active');
    } else {
      prompt.classList.remove('show');
      crosshair && crosshair.classList.remove('active');
    }
  }

  /* ------------------------------------------------------ 购物篮 */
  updateCart(cart, wallet) {
    const { cartList, cartTotal, cartCount, wallet: w } = this.el;
    if (cartTotal) {
      const sum = cart.reduce((s, c) => s + c.goods.price, 0);
      cartTotal.textContent = `${sum}円`;
      cartCount.textContent = cart.length;
      cartList.innerHTML = cart
        .map(
          (c) =>
            `<li><span class="ci-name">${c.goods.name}</span><span class="ci-price">${c.goods.price}円</span></li>`
        )
        .join('');
      const el = document.getElementById('cart');
      el && el.classList.toggle('show', cart.length > 0);
    }
    if (w) w.textContent = `${wallet}円`;
  }

  /* ------------------------------------------------------ 消息 */
  showMessage(text, dur = 2.2) {
    const { msg } = this.el;
    if (!msg) return;
    msg.textContent = text;
    msg.classList.add('show');
    this.msgTimer = dur;
  }

  /* ------------------------------------------------------ 对话 */
  showDialogue(name, text, options) {
    const { dialogue, dlgName, dlgText, dlgOptions } = this.el;
    if (!dialogue) return;
    dlgName.textContent = name;
    dlgText.textContent = text;
    dlgOptions.innerHTML = '';
    dlgOptions.classList.remove('show');
    dialogue.classList.add('show');
  }

  setDialogueText(text) {
    if (this.el.dlgText) this.el.dlgText.textContent = text;
  }

  showDialogueOptions(labels) {
    const { dlgOptions } = this.el;
    if (!dlgOptions) return;
    dlgOptions.innerHTML = labels
      .map((l, i) => `<button class="dlg-opt" data-i="${i}"><b>${i + 1}</b>${l}</button>`)
      .join('');
    dlgOptions.classList.add('show');
  }

  hideDialogue() {
    const { dialogue } = this.el;
    if (dialogue) dialogue.classList.remove('show');
  }

  /* ------------------------------------------------------ 付款提示 */
  showPay(total) {
    const { pay, payTotal } = this.el;
    if (!pay) return;
    payTotal.textContent = `${total}円`;
    pay.classList.add('show');
  }

  hidePay() {
    const { pay } = this.el;
    if (pay) pay.classList.remove('show');
  }

  /* ------------------------------------------------------ 小票 */
  showReceipt({ lines, total, change, wallet }) {
    const { receipt, receiptBody, receiptTotal, receiptChange, receiptWallet } = this.el;
    if (!receipt) return;
    receiptBody.innerHTML = lines
      .map((l) => `<li>${l}</li>`)
      .join('');
    receiptTotal.textContent = `${total}円`;
    receiptChange.textContent = `${change}円`;
    receiptWallet.textContent = `${wallet}円`;
    receipt.classList.add('show');
    this.hidePay();
  }

  hideReceipt() {
    const { receipt } = this.el;
    if (receipt) receipt.classList.remove('show');
  }

  /* ------------------------------------------------------ 淡入淡出 */
  fadeTo(opacity, duration = 0.6) {
    const { fade } = this.el;
    if (!fade) return;
    fade.style.transition = `opacity ${duration}s ease`;
    fade.style.opacity = String(opacity);
  }

  update(dt) {
    if (this.msgTimer > 0) {
      this.msgTimer -= dt;
      if (this.msgTimer <= 0 && this.el.msg) this.el.msg.classList.remove('show');
    }
  }
}
