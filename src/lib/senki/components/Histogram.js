import { AnimProvider } from "../base/anim.js";
import { Group } from "../base/object.js";
import { Rect, SenkiText } from "../base/shape.js";

export default class Histogram extends Group {
  data = [];
  height = 500;
  width = 1000;
  space = 5;
  minItemWidth = 5;
  maxItemWidth = 50;
  textMarginButtom = 10;

  cell = {
    maxV: 0,
    width: 0,
    fullWidth: 0,
    realHalfSpace: 0,
    left: 0,
    preTargets: [],
    newTargets: [],
  };

  constructor(data, args, x, y) {
    super(x, y);

    Object.assign(this, args);

    this.updateCellProfile("init", 0, data);

    this.init();
  }

  init() {
    const len = this.data.length;
    for (let i = 0; i < len; i++)
      setTimeout(() => {
        this.in(i);
      }, (len - i - 1) * 400 + (i * i * 1.25) / len);
  }

  in(idx, v) {
    if (v !== undefined) this.updateCellProfile("add", idx, v);

    const direction = !v ? true : idx > this.data.length / 2 ? false : true;

    const rect = new Rect(
      { width: this.cell.width, height: this.cell.newTargets[idx].h },
      this.cell.realHalfSpace,
      0
    );
    rect.name = "rect";

    const text = new SenkiText(this.data[idx], this.cell.fullWidth / 2, 0);
    text.name = "text";

    const group = this.cell.newTargets[idx].item;

    group.add(rect);
    group.add(text);

    this.children.push(group);

    rect.useAnimProvider(
      "h",
      new AnimProvider({
        to: this.cell.newTargets[idx].h,
      })
    );

    text.useAnimProvider(
      "y",
      new AnimProvider({
        to: this.cell.newTargets[idx].h + this.textMarginButtom,
      })
    );

    group.useAnimProvider(
      "x",
      new AnimProvider({
        from: direction ? this.cell.left : this.width - this.cell.left,
        to: this.cell.newTargets[idx].x,
      })
    );

    if (v) this.autoCreateMoveAnimation(idx);
  }

  out(idx) {
    this.updateCellProfile("del", idx);

    const direction = idx > this.data.length / 2 ? false : true;

    const outItem = this.cell.preTargets[idx].item;
    const rect = outItem.findChildByName("rect");
    const text = outItem.findChildByName("text");

    rect.useAnimProvider(
      "o",
      new AnimProvider({ from: 1, to: 0, type: "ease-in" })
    );

    text.useAnimProvider(
      "o",
      new AnimProvider({ from: 1, to: 0, type: "ease-in" })
    );

    outItem.useAnimProvider(
      "x",
      new AnimProvider(
        {
          from: outItem.position.x,
          to: direction ? this.cell.left : this.width - this.cell.left,
        },
        () => {
          this.removeChild(outItem);
        }
      )
    );

    this.autoCreateMoveAnimation();
  }

  set(idx, v) {
    this.data[idx] = v;
    this.cell.newTargets[idx].item.findChildByName("text").content = v;
    this.updateCellProfile();
    this.autoCreateMoveAnimation();
  }

  swap(idx1, idx2) {
    const group1 = this.cell.newTargets[idx1].item;
    const group2 = this.cell.newTargets[idx2].item;

    const rect1 = group1.findChildByName("rect");
    const rect2 = group2.findChildByName("rect");
    const text1 = group1.findChildByName("text");
    const text2 = group2.findChildByName("text");

    const rc1 = rect1.fillColor;
    const rc2 = rect2.fillColor;
    const tc1 = text1.color;
    const tc2 = text2.color;

    rect1.fillColor = "#ff0000";
    rect2.fillColor = "#ff0000";
    text1.color = "#ff0000";
    text2.color = "#ff0000";

    group1.useAnimProvider(
      "x",
      new AnimProvider(
        { from: group1.position.x, to: group2.position.x },
        () => {
          rect1.fillColor = rc1;
          text1.color = tc1;
        }
      )
    );
    group2.useAnimProvider(
      "x",
      new AnimProvider(
        { from: group2.position.x, to: group1.position.x },
        () => {
          rect2.fillColor = rc2;
          text2.color = tc2;
        }
      )
    );

    const tempN = this.cell.newTargets[idx1];
    this.cell.newTargets[idx1] = this.cell.newTargets[idx2];
    this.cell.newTargets[idx2] = tempN;

    const tempV = this.data[idx1];
    this.data[idx1] = this.data[idx2];
    this.data[idx2] = tempV;
  }

  flag(idx, color) {
    const group = this.cell.newTargets[idx].item;
    const rect = group.findChildByName("rect");
    const text = group.findChildByName("text");
    const rc = rect.fillColor;
    const tc = text.color;
    rect.fillColor = color;
    text.color = color;
    return function () {
      rect.fillColor = rc;
      text.color = tc;
    };
  }

  updateCellProfile(flag, idx, v) {
    if (flag === "init") {
      this.data = v;
    } else if (flag === "add") {
      this.data.splice(idx, 0, v);
      console.log(this.data);
    } else if (flag === "del") {
      this.data.splice(idx, 1);
    }

    this.cell.preTargets = this.cell.newTargets;

    const len = this.data.length;

    this.cell.maxV = this.data.reduce((max, it) => Math.max(max, it), 0);

    this.cell.fullWidth = Math.min(
      this.maxItemWidth + this.space,
      this.width / len
    );

    this.cell.width = Math.max(
      this.minItemWidth,
      this.cell.fullWidth - this.space
    );
    this.cell.realHalfSpace = (this.cell.fullWidth - this.cell.width) / 2;

    if (this.cell.realHalfSpace < 0)
      return console.error("初始化失败，数据量过大，空间不足，请增大 width");

    this.cell.left = (this.width - this.cell.fullWidth * len) / 2;

    if (flag === "init")
      this.cell.newTargets = this.data.map(() => ({
        item: new Group(this.cell.left - this.cell.fullWidth, 0),
      }));
    else if (flag === "add") {
      this.cell.newTargets = this.cell.preTargets.slice();
      this.cell.newTargets.splice(idx, 0, {
        item: new Group(this.cell.left - this.cell.fullWidth, 0),
      });
    } else if (flag === "del") {
      this.cell.newTargets = this.cell.preTargets.filter((_, i) => i !== idx);
    }

    this.cell.newTargets.forEach((t, idx) => {
      t.x = idx * this.cell.fullWidth + this.cell.left;
      t.h = (this.data[idx] / this.cell.maxV) * this.height;
    });
  }

  autoCreateMoveAnimation(offIdx) {
    const len = this.data.length;
    const newTargets = this.cell.newTargets;

    for (let i = 0; i < len; i++) {
      if (i === offIdx) continue;
      const newT = newTargets[i];
      const group = newT.item;
      const rect = group.findChildByName("rect");
      const text = group.findChildByName("text");

      group.useAnimProvider(
        "x",
        new AnimProvider({ from: group.position.x, to: newT.x })
      );

      rect.useAnimProvider(
        "h",
        new AnimProvider({ from: rect.height, to: newT.h })
      );

      text.useAnimProvider(
        "y",
        new AnimProvider({
          from: text.position.y,
          to: newT.h + this.textMarginButtom,
        })
      );
    }
  }
}
